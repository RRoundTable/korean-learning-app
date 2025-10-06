"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { VadEngine, type VadState } from "@/lib/audio/vad/VadEngine"
import { defaultVadConfig } from "@/lib/audio/vad/VadConfig"

export function useVad() {
  const engineRef = useRef<VadEngine | null>(null)
  const [state, setState] = useState<VadState>("idle")
  const [level, setLevel] = useState(0)
  const [probability, setProbability] = useState(0)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [lastUtterance, setLastUtterance] = useState<{ url: string; durationMs: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const engine = new VadEngine({}, {
      onStateChange: setState,
      onLevel: setLevel,
      onProbability: setProbability,
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
    return () => {
      engineRef.current?.stop()
      engineRef.current = null
    }
  }, [])

  const start = useCallback(async () => {
    await engineRef.current?.start()
  }, [])

  const stop = useCallback(() => {
    engineRef.current?.stop()
  }, [])

  const setSpeakingGate = useCallback((on: boolean) => {
    engineRef.current?.setSpeakingGate(on)
  }, [])

  return {
    state,
    level,
    probability,
    isSpeaking,
    lastUtterance,
    error,
    start,
    stop,
    setSpeakingGate,
  }
}
