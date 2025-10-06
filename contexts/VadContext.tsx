"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { VadEngine, type VadState } from "@/lib/audio/vad/VadEngine"

type VadContextValue = {
  state: VadState
  level: number
  probability: number
  isCapturing: boolean
  isSpeaking: boolean
  lastUtterance: { url: string; durationMs: number } | null
  error: string | null
  start: () => Promise<void>
  stop: () => void
  setSpeaking: (on: boolean) => void
}

const VadContext = createContext<VadContextValue | null>(null)

export function VadProvider({ children }: { children: React.ReactNode }) {
  const engineRef = useRef<VadEngine | null>(null)
  const [state, setState] = useState<VadState>("idle")
  const [level, setLevel] = useState(0)
  const [probability, setProbability] = useState(0)
  const [lastUtterance, setLastUtterance] = useState<{ url: string; durationMs: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSpeaking, setIsSpeaking] = useState(false)

  useEffect(() => {
    const engine = new VadEngine({}, {
      onStateChange: setState,
      onLevel: setLevel,
      onProbability: setProbability,
      onSpeechEnd: ({ wav, durationMs }) => {
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

  const setSpeaking = useCallback((on: boolean) => {
    try {
      engineRef.current?.setSpeakingGate(on)
    } catch {}
    setIsSpeaking(on)
  }, [])

  const value = useMemo<VadContextValue>(() => ({
    state,
    level,
    probability,
    isCapturing: state === "capturing",
    isSpeaking,
    lastUtterance,
    error,
    start,
    stop,
    setSpeaking,
  }), [state, level, probability, isSpeaking, lastUtterance, error, start, stop, setSpeaking])

  return <VadContext.Provider value={value}>{children}</VadContext.Provider>
}

export function useVadContext() {
  const ctx = useContext(VadContext)
  if (!ctx) throw new Error("useVadContext must be used within a VadProvider")
  return ctx
}
