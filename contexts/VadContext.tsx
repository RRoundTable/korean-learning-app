"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { VadEngine, type VadState } from "@/lib/audio/vad/VadEngine"

type VadContextValue = {
  lastUtterance: { url: string; durationMs: number } | null
  error: string | null
  start: () => Promise<void>
  stop: () => void
}

const VadContext = createContext<VadContextValue | null>(null)

export function VadProvider({ children }: { children: React.ReactNode }) {
  const engineRef = useRef<VadEngine | null>(null)
  const [lastUtterance, setLastUtterance] = useState<{ url: string; durationMs: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const engine = new VadEngine({}, {
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

  const value = useMemo<VadContextValue>(() => ({
    lastUtterance,
    error,
    start,
    stop,
  }), [lastUtterance, error, start, stop])

  return <VadContext.Provider value={value}>{children}</VadContext.Provider>
}

export function useVadContext() {
  const ctx = useContext(VadContext)
  if (!ctx) throw new Error("useVadContext must be used within a VadProvider")
  return ctx
}
