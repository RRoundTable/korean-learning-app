"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { VadEngine, type VadState } from "@/lib/audio/vad/VadEngine"
import { defaultVadConfig } from "@/lib/audio/vad/VadConfig"

export function useVad() {
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

  return {
    lastUtterance,
    error,
    start,
    stop,
  }
}
