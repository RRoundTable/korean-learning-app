"use client"

import React from "react"

export type RawTask = {
  ko: string
  en?: string
}

export type Scenario = {
  id: string | number
  title: string
  titleEn?: string
  description?: string
  descriptionEn?: string
  emoji?: string
  tasks?: RawTask[]
}

export type LearningTask = {
  id: string
  ko: string
  en?: string
  status: "pending" | "success" | "failed"
}

type Progress = {
  completed: number
  total: number
}

type LearningContextValue = {
  scenario: Scenario | null
  tasks: LearningTask[]
  lastTaskSuccesses: boolean[]
  currentTaskIndex: number
  currentTask: LearningTask | null
  progress: Progress
  isListening: boolean
  isAgentSpeaking: boolean
  sessionId: string
  attempts: number
  setListening: (on: boolean) => void
  setAgentSpeaking: (on: boolean) => void
  setScenario: (s: Scenario | null) => void
  markCurrentTaskSuccess: () => void
  markCurrentTaskFailed: () => void
  gotoNextTask: () => void
  incrementAttempts: () => void
  reset: () => void
  saveProgress: () => void
  loadProgress: () => void
  latchTaskSuccesses: (successes: boolean[]) => void
}

const LearningContext = React.createContext<LearningContextValue | null>(null)

function toLearningTasks(raw?: RawTask[]): LearningTask[] {
  const list = Array.isArray(raw) ? raw : []
  return list.map((t, idx) => ({ id: `t-${idx}`, ko: t.ko, en: t.en, status: "pending" }))
}

export function LearningProvider({ children, initialScenario }: { children: React.ReactNode; initialScenario?: Scenario | null }) {
  function normalizeSuccesses(input: boolean[] | undefined, total: number): boolean[] {
    const base = Array.isArray(input) ? input.slice(0, total) : []
    if (process.env.NODE_ENV !== "production") {
      if (Array.isArray(input) && input.length !== total) {
        console.warn(`[Learning] task_success length mismatch. incoming=${input.length}, expected=${total}`)
      }
    }
    if (base.length < total) {
      return base.concat(new Array(total - base.length).fill(false))
    }
    return base
  }
  const [scenario, setScenarioState] = React.useState<Scenario | null>(initialScenario ?? null)
  const [tasks, setTasks] = React.useState<LearningTask[]>(toLearningTasks(initialScenario?.tasks))
  const [lastTaskSuccesses, setLastTaskSuccesses] = React.useState<boolean[]>([])
  const [currentTaskIndex, setCurrentTaskIndex] = React.useState(0)
  const [isListening, setIsListening] = React.useState(false)
  const [isAgentSpeaking, setIsAgentSpeaking] = React.useState(false)
  const [sessionId] = React.useState(() => `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)
  const [attempts, setAttempts] = React.useState(0)

  React.useEffect(() => {
    // Keep provider in sync if parent changes initialScenario
    setScenarioState(initialScenario ?? null)
    setTasks(toLearningTasks(initialScenario?.tasks))
    setCurrentTaskIndex(0)
    setLastTaskSuccesses(new Array(initialScenario?.tasks?.length || 0).fill(false))
    setAttempts(0)
  }, [initialScenario])


  const currentTask = React.useMemo(() => {
    if (!tasks.length) return null
    return tasks[Math.min(currentTaskIndex, tasks.length - 1)] ?? null
  }, [tasks, currentTaskIndex])

  const progress: Progress = React.useMemo(() => {
    const total = tasks.length
    const normalized = normalizeSuccesses(lastTaskSuccesses, total)
    const completed = normalized.filter(Boolean).length
    return { completed, total }
  }, [tasks.length, lastTaskSuccesses])

  const markCurrentTaskSuccess = React.useCallback(() => {
    setLastTaskSuccesses(prev => {
      const total = tasks.length
      const normalized = normalizeSuccesses(prev, total)
      const updated = normalized.slice()
      if (currentTaskIndex >= 0 && currentTaskIndex < total) updated[currentTaskIndex] = true
      return updated
    })
  }, [currentTaskIndex, tasks.length])

  const markCurrentTaskFailed = React.useCallback(() => {
    setLastTaskSuccesses(prev => {
      const total = tasks.length
      const normalized = normalizeSuccesses(prev, total)
      const updated = normalized.slice()
      if (currentTaskIndex >= 0 && currentTaskIndex < total) updated[currentTaskIndex] = false
      return updated
    })
  }, [currentTaskIndex, tasks.length])

  // Normalize and latch successes; then recompute currentTaskIndex
  const latchTaskSuccesses = React.useCallback((successes: boolean[]) => {
    setLastTaskSuccesses(prev => {
      const total = tasks.length
      const normalizedIncoming = normalizeSuccesses(successes, total)
      const normalizedPrev = normalizeSuccesses(prev, total)
      const merged = normalizedPrev.map((v, i) => v || normalizedIncoming[i] === true)
      return merged
    })

    setCurrentTaskIndex(() => {
      const total = tasks.length
      const normalized = normalizeSuccesses(successes, total)
      const idx = normalized.findIndex(v => v === false)
      return idx === -1 ? Math.max(0, total - 1) : idx
    })
  }, [tasks.length])

  const gotoNextTask = React.useCallback(() => {
    setCurrentTaskIndex(() => {
      const total = tasks.length
      const normalized = normalizeSuccesses(lastTaskSuccesses, total)
      const idx = normalized.findIndex(v => v === false)
      return idx === -1 ? Math.max(0, total - 1) : idx
    })
  }, [tasks.length, lastTaskSuccesses])

  const incrementAttempts = React.useCallback(() => {
    setAttempts(prev => prev + 1)
  }, [])

  const saveProgress = React.useCallback(() => {
    // Progress saving disabled - no localStorage usage
  }, [])

  const loadProgress = React.useCallback(() => {
    // Progress loading disabled - no localStorage usage
  }, [])

  const setScenario = React.useCallback((s: Scenario | null) => {
    setScenarioState(s)
    setTasks(toLearningTasks(s?.tasks))
    setCurrentTaskIndex(0)
    setLastTaskSuccesses(new Array(s?.tasks?.length || 0).fill(false))
  }, [])

  const reset = React.useCallback(() => {
    setLastTaskSuccesses(prev => new Array(tasks.length).fill(false))
    setCurrentTaskIndex(0)
    setIsListening(false)
    setIsAgentSpeaking(false)
    setAttempts(0)
    
    // No localStorage clearing needed - no localStorage usage
  }, [])

  // Load progress disabled - no localStorage usage

  // Auto-save progress disabled - no localStorage usage

  const value: LearningContextValue = React.useMemo(
    () => ({
      scenario,
      tasks,
      lastTaskSuccesses,
      currentTaskIndex,
      currentTask,
      progress,
      isListening,
      isAgentSpeaking,
      sessionId,
      attempts,
      setListening: setIsListening,
      setAgentSpeaking: setIsAgentSpeaking,
      setScenario,
      markCurrentTaskSuccess,
      markCurrentTaskFailed,
      gotoNextTask,
      incrementAttempts,
      reset,
      saveProgress,
      loadProgress,
      latchTaskSuccesses,
    }),
    [scenario, tasks, lastTaskSuccesses, currentTaskIndex, currentTask, progress, isListening, isAgentSpeaking, sessionId, attempts, setScenario, markCurrentTaskSuccess, markCurrentTaskFailed, gotoNextTask, incrementAttempts, reset, saveProgress, loadProgress, latchTaskSuccesses]
  )

  return <LearningContext.Provider value={value}>{children}</LearningContext.Provider>
}

export function useLearningContext() {
  const ctx = React.useContext(LearningContext)
  if (!ctx) throw new Error("useLearningContext must be used within a LearningProvider")
  return ctx
}


