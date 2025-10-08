"use client"
/*
  Minimal VAD engine: loads silero ONNX, consumes frames from AudioWorklet,
  emits events for UI and returns utterance WAV blobs without STT.
*/
import type * as OrtNS from "onnxruntime-web"
import { defaultVadConfig, type VadConfig } from "./VadConfig.ts"
import { encodeWavPCM16 } from "./wav.ts"

export type VadEvents = {
  onLevel?: (rms: number) => void
  onProbability?: (p: number) => void
  onSpeechStart?: () => void
  onSpeechEnd?: (data: { wav: Blob; durationMs: number; sampleRate: number }) => void
  onError?: (e: unknown) => void
  onStateChange?: (state: VadState) => void
}

export type VadState =
  | "idle"
  | "ready"
  | "listening"
  | "capturing"
  | "ended"

let ortModule: typeof OrtNS | null = null
async function getOrt(): Promise<typeof OrtNS> {
  if (!ortModule) {
    ortModule = await import("onnxruntime-web")
  }
  return ortModule
}

export class VadEngine {
  private config: VadConfig
  private events: VadEvents
  private session?: OrtNS.InferenceSession
  private useEnergyFallback = false
  private inputName?: string
  private srInputName?: string
  private stateInputName?: string
  private probOutputName?: string
  private stateOutputName?: string
  private rnnStateTensor?: OrtNS.Tensor
  private audioContext?: AudioContext
  private workletNode?: AudioWorkletNode
  private state: VadState = "idle"
  private frameMs: number
  private frameSamples: number

  private probabilitySmoother: number[] = []
  private probabilitySmootherSize = 5

  private isSpeech = false
  private activeFrames = 0
  private silenceFrames = 0
  private prefixFramesWindow: Float32Array[] = []
  private capturedFrames: Float32Array[] = []
  private capturedSamples = 0
  private speakingGate = false

  constructor(config?: Partial<VadConfig>, events?: VadEvents) {
    this.config = { ...defaultVadConfig, ...(config ?? {}) }
    this.events = events ?? {}
    this.frameMs = this.config.frameMs
    this.frameSamples = Math.round((this.config.sampleRateTarget * this.frameMs) / 1000)
  }

  getState() {
    return this.state
  }

  setSpeakingGate(on: boolean) {
    this.speakingGate = on
  }

  private setState(next: VadState) {
    this.state = next
    this.events.onStateChange?.(next)
  }

  async init(modelUrl = "/models/silero-vad.onnx") {
    try {
      const { InferenceSession } = await getOrt()
      this.session = await InferenceSession.create(modelUrl, {
        executionProviders: ["wasm"],
      })
      // heuristics for common silero-vad signatures
      const inputs = this.session.inputNames ?? []
      const outputs = this.session.outputNames ?? []
      this.inputName = inputs.find(n => /input|waveform|audio/i.test(n)) ?? inputs[0]
      this.srInputName = inputs.find(n => /sr|sample.?rate/i.test(n))
      this.stateInputName = inputs.find(n => /state|h.*c|hidden/i.test(n))
      this.stateOutputName = outputs.find(n => /state|h.*c|hidden/i.test(n))
      this.probOutputName = outputs.find(n => /prob|output|speech|score/i.test(n))

      // initialize RNN state if required
      if (this.stateInputName && !this.rnnStateTensor) {
        this.rnnStateTensor = this.buildInitialStateTensor()
      }
    } catch (e) {
      this.useEnergyFallback = true
      this.events.onError?.(e)
    } finally {
      this.setState("ready")
    }
  }

  async start() {
    // If model failed to load, proceed with energy-based fallback
    if (!this.session) this.useEnergyFallback = true
    if (this.audioContext) return
    this.audioContext = new AudioContext()
    await this.audioContext.audioWorklet.addModule("/audio-worklets/vad-processor.js")

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    })
    const source = this.audioContext.createMediaStreamSource(stream)
    this.workletNode = new AudioWorkletNode(this.audioContext, "vad-processor")
    source.connect(this.workletNode)
    // Avoid routing microphone to speakers to prevent feedback/echo
    // If needed, connect to a zero-gain node instead of destination.
    this.workletNode.port.onmessage = (ev: MessageEvent) => {
      const data = ev.data
      if (data?.type === "frame") {
        const frame: Float32Array = data.frame
        const level: number = data.level
        this.events.onLevel?.(level)
        this.onFrame(frame)
      }
    }
    this.resetCollectors()
    // ensure input is not gated when starting to listen
    this.speakingGate = false
    this.setState("listening")
  }

  stop() {
    try {
      this.workletNode?.disconnect()
      this.audioContext?.close()
    } catch {}
    this.workletNode = undefined
    this.audioContext = undefined
    this.setState("idle")
  }

  private resetCollectors() {
    this.probabilitySmoother = []
    this.isSpeech = false
    this.activeFrames = 0
    this.silenceFrames = 0
    this.prefixFramesWindow = []
    this.capturedFrames = []
    this.capturedSamples = 0
  }

  private smooth(p: number): number {
    this.probabilitySmoother.push(p)
    if (this.probabilitySmoother.length > this.probabilitySmootherSize) this.probabilitySmoother.shift()
    const avg = this.probabilitySmoother.reduce((a, b) => a + b, 0) / this.probabilitySmoother.length
    return avg
  }

  private async inferProbability(frame: Float32Array): Promise<number> {
    if (!this.session || this.useEnergyFallback) {
      // energy-based fallback
      const rms = this.computeRms(frame)
      // heuristic scaling -> probability-ish
      const p = Math.max(0, Math.min(1, rms / 0.05))
      return p
    }
    const { Tensor } = await getOrt()
    const feeds: Record<string, OrtNS.Tensor> = {}
    const inputName = this.inputName ?? this.session.inputNames?.[0] ?? "input"
    feeds[inputName] = new Tensor("float32", frame, [1, frame.length])

    if (this.srInputName) {
      const srName = this.srInputName as string
      const meta = (this.session.inputMetadata as unknown as Record<string, { dimensions?: readonly (number | string)[]; type?: string }> | undefined)?.[srName]
      const sr = this.config.sampleRateTarget
      const dims = meta?.dimensions ?? []
      const wantsInt64 = (meta?.type ?? "").includes("int64")
      const shape: number[] = dims.length === 0 ? [] : [1]
      if (wantsInt64) {
        // @ts-ignore BigInt64Array existence differs per env
        const arr = new BigInt64Array([BigInt(sr)])
        feeds[srName] = new Tensor("int64", arr, shape)
      } else {
        // Prefer int64 for compatibility if meta.type is missing/unknown
        try {
          // @ts-ignore BigInt64Array existence differs per env
          const arr = new BigInt64Array([BigInt(sr)])
          feeds[srName] = new Tensor("int64", arr, shape)
        } catch {
          feeds[srName] = new Tensor("int32", Int32Array.of(sr), shape)
        }
      }
    }

    if (this.stateInputName) {
      const stateInName = this.stateInputName as string
      if (!this.rnnStateTensor) this.rnnStateTensor = this.buildInitialStateTensor()
      if (this.rnnStateTensor) {
        feeds[stateInName] = this.rnnStateTensor
      }
    }

    const outputs = await this.session.run(feeds)

    // update state if present
    if (this.stateOutputName) {
      const stateOutName = this.stateOutputName as string
      if ((outputs as any)[stateOutName]) {
        this.rnnStateTensor = (outputs as any)[stateOutName] as OrtNS.Tensor
      }
    }

    // choose probability-like output
    let probTensor: OrtNS.Tensor | undefined
    if (this.probOutputName) {
      const probName = this.probOutputName as string
      if ((outputs as any)[probName]) {
        probTensor = (outputs as any)[probName] as ort.Tensor
      }
    } else {
      // pick first non-state output
      const exclude = this.stateOutputName as string | undefined
      const outputsRecord = outputs as unknown as Record<string, ort.Tensor>
      const keys: string[] = Object.keys(outputsRecord)
      const firstKey = keys.find((k: string) => k !== exclude)
      if (firstKey !== undefined) {
        const key: string = firstKey
        probTensor = outputsRecord[key]
      }
    }
    const data = (probTensor?.data as Float32Array | undefined)
    let p = 0
    if (data && data.length > 0) {
      if (data.length === 1) {
        p = data[0]
      } else {
        // choose the largest score assuming it corresponds to speech probability
        let max = data[0]
        for (let i = 1; i < data.length; i++) if (data[i] > max) max = data[i]
        p = max
      }
    }
    // normalize/clamp to [0,1] defensively
    p = Math.max(0, Math.min(1, p))
    return p
  }

  private computeRms(frame: Float32Array): number {
    let sum = 0
    for (let i = 0; i < frame.length; i++) sum += frame[i] * frame[i]
    return Math.sqrt(sum / frame.length)
  }

  private buildInitialStateTensor(): ort.Tensor | undefined {
    if (!this.session || !this.stateInputName) return undefined
    const stateInName = this.stateInputName as string
    const meta = (this.session.inputMetadata as unknown as Record<string, { dimensions?: readonly (number | string)[] }> | undefined)?.[stateInName]
    const dims = (meta?.dimensions ?? []).slice()
    // Fallback sensible defaults if unknown dims
    // Expecting [2, 1, HIDDEN]
    if (dims.length !== 3) {
      return new ort.Tensor("float32", new Float32Array(2 * 1 * 128), [2, 1, 128])
    }
    const d0 = typeof dims[0] === "number" ? (dims[0] as number) : 2
    const d1 = typeof dims[1] === "number" ? (dims[1] as number) : 1
    const d2 = typeof dims[2] === "number" ? (dims[2] as number) : 128
    const size = d0 * d1 * d2
    const zeros = new Float32Array(size)
    return new ort.Tensor("float32", zeros, [d0, d1, d2])
  }

  private onFrameQueue: Promise<void> = Promise.resolve()

  private onFrame(frame: Float32Array) {
    // Gate input during speaking to avoid echo-triggered captures
    if (this.speakingGate) {
      this.events.onProbability?.(0)
      return
    }
    // serialize async inference to preserve order
    this.onFrameQueue = this.onFrameQueue.then(async () => {
      const p = await this.inferProbability(frame)
      const ps = this.smooth(p)
      this.events.onProbability?.(ps)

      // maintain prefix buffer
      this.prefixFramesWindow.push(frame)
      const maxPrefixFrames = Math.ceil(this.config.prefixPaddingMs / this.frameMs)
      if (this.prefixFramesWindow.length > maxPrefixFrames) this.prefixFramesWindow.shift()

      if (!this.isSpeech) {
        if (ps >= this.config.speechProbabilityThreshold) {
          this.activeFrames += 1
          if (this.activeFrames * this.frameMs >= this.config.startSpeechAfterMs) {
            this.isSpeech = true
            this.capturedFrames = [...this.prefixFramesWindow]
            this.capturedSamples = this.capturedFrames.length * this.frameSamples
            this.setState("capturing")
            this.events.onSpeechStart?.()
          }
        } else {
          this.activeFrames = 0
        }
      } else {
        // capturing
        this.capturedFrames.push(frame)
        this.capturedSamples += this.frameSamples
        if (ps < this.config.speechProbabilityThreshold) {
          this.silenceFrames += 1
        } else {
          this.silenceFrames = 0
        }

        const durationMs = (this.capturedSamples / this.config.sampleRateTarget) * 1000
        const overMax = durationMs >= this.config.maxUtteranceMs
        const silenceOver = this.silenceFrames * this.frameMs >= this.config.endSilenceAfterMs
        const overMin = durationMs >= this.config.minUtteranceMs

        if ((overMin && silenceOver) || overMax) {
          this.finishUtterance(durationMs)
        }
      }
    })
  }

  private finishUtterance(durationMs: number) {
    const flat = this.flatten(this.capturedFrames)
    const wavBuffer = encodeWavPCM16(flat, this.config.sampleRateTarget)
    const blob = new Blob([wavBuffer], { type: "audio/wav" })
    this.setState("ended")
    this.events.onSpeechEnd?.({ wav: blob, durationMs, sampleRate: this.config.sampleRateTarget })
    this.resetCollectors()
    this.setState("listening")
  }

  private flatten(frames: Float32Array[]): Float32Array {
    const total = frames.reduce((acc, f) => acc + f.length, 0)
    const out = new Float32Array(total)
    let offset = 0
    for (const f of frames) {
      out.set(f, offset)
      offset += f.length
    }
    return out
  }
}
