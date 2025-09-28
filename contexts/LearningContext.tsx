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
}

const LearningContext = React.createContext<LearningContextValue | null>(null)

function toLearningTasks(raw?: RawTask[]): LearningTask[] {
  const list = Array.isArray(raw) ? raw : []
  return list.map((t, idx) => ({ id: `t-${idx}`, ko: t.ko, en: t.en, status: "pending" }))
}

export function LearningProvider({ children, initialScenario }: { children: React.ReactNode; initialScenario?: Scenario | null }) {
  const [scenario, setScenarioState] = React.useState<Scenario | null>(initialScenario ?? null)
  const [tasks, setTasks] = React.useState<LearningTask[]>(toLearningTasks(initialScenario?.tasks))
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
    setAttempts(0)
  }, [initialScenario])


  const currentTask = React.useMemo(() => {
    if (!tasks.length) return null
    return tasks[Math.min(currentTaskIndex, tasks.length - 1)] ?? null
  }, [tasks, currentTaskIndex])

  const progress: Progress = React.useMemo(() => {
    const total = tasks.length
    const completed = tasks.filter(t => t.status === "success").length
    return { completed, total }
  }, [tasks])

  const markCurrentTaskSuccess = React.useCallback(() => {
    setTasks(prev => prev.map((t, idx) => (idx === currentTaskIndex ? { ...t, status: "success" } : t)))
  }, [currentTaskIndex])

  const markCurrentTaskFailed = React.useCallback(() => {
    setTasks(prev => prev.map((t, idx) => (idx === currentTaskIndex ? { ...t, status: "failed" } : t)))
  }, [currentTaskIndex])

  const gotoNextTask = React.useCallback(() => {
    setCurrentTaskIndex(prev => Math.min(prev + 1, Math.max(0, tasks.length - 1)))
  }, [tasks.length])

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
  }, [])

  const reset = React.useCallback(() => {
    setTasks(prev => prev.map(t => ({ ...t, status: "pending" })))
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
    }),
    [scenario, tasks, currentTaskIndex, currentTask, progress, isListening, isAgentSpeaking, sessionId, attempts, setScenario, markCurrentTaskSuccess, markCurrentTaskFailed, gotoNextTask, incrementAttempts, reset, saveProgress, loadProgress]
  )

  return <LearningContext.Provider value={value}>{children}</LearningContext.Provider>
}

export function useLearningContext() {
  const ctx = React.useContext(LearningContext)
  if (!ctx) throw new Error("useLearningContext must be used within a LearningProvider")
  return ctx
}


