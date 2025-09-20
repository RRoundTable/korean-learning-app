"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { VadState } from "@/lib/audio/vad/VadEngine"

// 개발 모드에서 ONNX 없이 테스트하기 위한 Mock VAD
class MockVadEngine {
  private state: VadState = "idle"
  private events: any = {}
  private isRunning = false
  private levelInterval?: NodeJS.Timeout
  private speakingGateActive = false
  
  constructor(config: any, events: any) {
    this.events = events
  }
  
  async init() {
    console.log('🧪 Mock VAD Engine initialized')
    this.state = "ready"
    this.events.onStateChange?.("ready")
  }
  
  async start() {
    console.log('🎤 Mock VAD Engine started')
    this.state = "listening"
    this.isRunning = true
    this.events.onStateChange?.("listening")
    
    // 모의 레벨 데이터 생성 - 최적화된 버전 (300ms 간격)
    this.levelInterval = setInterval(() => {
      if (this.isRunning) {
        const mockLevel = Math.random() * 0.5
        this.events.onLevel?.(mockLevel)
        this.events.onProbability?.(mockLevel * 2)
      }
    }, 300) // 100ms → 300ms로 변경하여 렌더링 빈도 감소
    
    // 5초 후 모의 발화 생성
        setTimeout(() => {
          if (this.isRunning && !this.speakingGateActive) {
            console.log('🎤 Mock speech detected')
            this.events.onSpeechStart?.()

            setTimeout(() => {
              // Speaking Gate가 활성화되면 음성 처리 중단
              if (this.speakingGateActive) {
                console.log('🔇 Speech blocked by Speaking Gate')
                return
              }

              // 더 현실적인 모의 WAV blob 생성 (최소한의 WAV 헤더 포함)
              const createMockWav = (durationMs: number) => {
            const sampleRate = 16000
            const samples = Math.floor(sampleRate * durationMs / 1000)
            const buffer = new ArrayBuffer(44 + samples * 2)
            const view = new DataView(buffer)
            
            // WAV 헤더 생성 (최소한)
            const writeString = (offset: number, str: string) => {
              for (let i = 0; i < str.length; i++) {
                view.setUint8(offset + i, str.charCodeAt(i))
              }
            }
            
            writeString(0, 'RIFF')
            view.setUint32(4, 36 + samples * 2, true)
            writeString(8, 'WAVE')
            writeString(12, 'fmt ')
            view.setUint32(16, 16, true)
            view.setUint16(20, 1, true)
            view.setUint16(22, 1, true)
            view.setUint32(24, sampleRate, true)
            view.setUint32(28, sampleRate * 2, true)
            view.setUint16(32, 2, true)
            view.setUint16(34, 16, true)
            writeString(36, 'data')
            view.setUint32(40, samples * 2, true)
            
            // 모의 오디오 데이터 (사인파)
            for (let i = 0; i < samples; i++) {
              const sample = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.1
              view.setInt16(44 + i * 2, sample * 32767, true)
            }
            
            return new Blob([buffer], { type: 'audio/wav' })
          }
          
          const mockWav = createMockWav(2000)
          this.events.onSpeechEnd?.({ 
            wav: mockWav, 
            durationMs: 2000, 
            sampleRate: 16000 
          })
        }, 2000)
      }
    }, 5000)
  }
  
  stop() {
    console.log('🛑 Mock VAD Engine stopped')
    this.isRunning = false
    this.state = "idle"
    if (this.levelInterval) {
      clearInterval(this.levelInterval)
    }
    this.events.onStateChange?.("idle")
  }
  
  setSpeakingGate(on: boolean) {
    console.log('🔇 Mock Speaking Gate:', on ? 'ON (blocking speech)' : 'OFF (allowing speech)')
    this.speakingGateActive = on
  }
  
  getState() {
    return this.state
  }
}

export function useVad() {
  const engineRef = useRef<MockVadEngine | null>(null)
  const [state, setState] = useState<VadState>("idle")
  const [level, setLevel] = useState(0)
  const [probability, setProbability] = useState(0)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [lastUtterance, setLastUtterance] = useState<{ url: string; durationMs: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [speakingGateActive, setSpeakingGateActive] = useState(false)
  
  // 레벨 업데이트 throttling을 위한 ref
  const lastLevelUpdate = useRef(0)
  const lastProbabilityUpdate = useRef(0)

  // Throttled level update functions - 더 관대한 throttling
  const throttledSetLevel = useCallback((newLevel: number) => {
    const now = Date.now()
    if (now - lastLevelUpdate.current > 250) { // 250ms throttle
      lastLevelUpdate.current = now
      setLevel(newLevel)
    }
  }, [])
  
  const throttledSetProbability = useCallback((newProbability: number) => {
    const now = Date.now()
    if (now - lastProbabilityUpdate.current > 250) { // 250ms throttle
      lastProbabilityUpdate.current = now
      setProbability(newProbability)
    }
  }, [])

  useEffect(() => {
    try {
      const engine = new MockVadEngine({}, {
        onStateChange: setState,
        onLevel: throttledSetLevel,
        onProbability: throttledSetProbability,
        onSpeechStart: () => setIsSpeaking(true),
        onSpeechEnd: ({ wav, durationMs }) => {
          setIsSpeaking(false)
          const url = URL.createObjectURL(wav)
          setLastUtterance({ url, durationMs })
        },
        onError: (e) => setError(e instanceof Error ? e.message : String(e)),
      })
      engineRef.current = engine
      engine.init().catch((e) => setError(e instanceof Error ? e.message : String(e)))
    } catch (e) {
      setError(`VAD initialization failed: ${e instanceof Error ? e.message : String(e)}`)
    }
    
    return () => {
      engineRef.current?.stop()
      engineRef.current = null
    }
  }, [throttledSetLevel, throttledSetProbability])

  const start = useCallback(async () => {
    try {
      await engineRef.current?.start()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  const stop = useCallback(() => {
    engineRef.current?.stop()
  }, [])

  const setSpeakingGate = useCallback((on: boolean) => {
    console.log('🔇 Setting Speaking Gate:', on ? 'ACTIVE (blocking VAD)' : 'INACTIVE (allowing VAD)')
    setSpeakingGateActive(on)
    engineRef.current?.setSpeakingGate(on)
  }, [])

  return {
    state,
    level,
    probability,
    isSpeaking,
    lastUtterance,
    error,
    speakingGateActive,
    start,
    stop,
    setSpeakingGate,
  }
}
