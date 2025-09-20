// 진행도 추적 훅

'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { 
  SessionProgress, 
  TaskProgress, 
  ProgressUpdate, 
  TaskStatus,
  SessionStatus,
  calculateProgress,
  getNextTask,
  checkTaskCompletion,
  getAchievementLevel,
  ProgressMetrics
} from '@/lib/types/progress'
import { Scenario, LearningTask } from '@/lib/scenarios'

interface UseProgressTrackerOptions {
  scenario: Scenario
  sessionId?: string
  maxAttemptsPerTask?: number
  onTaskComplete?: (taskId: string, score: number) => void
  onTaskFail?: (taskId: string, attempts: number) => void
  onSessionComplete?: (metrics: ProgressMetrics) => void
}

export function useProgressTracker(options: UseProgressTrackerOptions) {
  const {
    scenario,
    sessionId = `session-${Date.now()}`,
    maxAttemptsPerTask = 3,
    onTaskComplete,
    onTaskFail,
    onSessionComplete
  } = options

  // 세션 진행도 상태
  const [session, setSession] = useState<SessionProgress>(() => {
    const initialTasks: TaskProgress[] = scenario.tasks.map(task => ({
      taskId: task.id,
      status: 'pending' as TaskStatus,
      attempts: 0,
      maxAttempts: maxAttemptsPerTask,
      timeSpent: 0,
      errors: []
    }))

    // 첫 번째 작업을 진행 중으로 설정
    if (initialTasks.length > 0) {
      initialTasks[0].status = 'in_progress'
    }

    return {
      sessionId,
      scenarioId: scenario.id,
      status: 'in_progress' as SessionStatus,
      startedAt: new Date(),
      currentTaskIndex: 0,
      totalTasks: scenario.tasks.length,
      tasks: initialTasks,
      overallScore: 0,
      totalTimeSpent: 0,
      conversationHistory: []
    }
  })

  // 현재 작업 추적
  const taskStartTimes = useRef<Map<string, number>>(new Map())
  const [currentMetrics, setCurrentMetrics] = useState<ProgressMetrics>(() => 
    calculateProgress(session)
  )

  // 메트릭스 업데이트 (session 변경 시에만)
  useEffect(() => {
    const metrics = calculateProgress(session)
    setCurrentMetrics(metrics)
  }, [session])

  // 세션 완료 체크 (별도 useEffect로 분리하여 무한 루프 방지)
  useEffect(() => {
    if (session.status === 'in_progress') {
      const allTasksCompleted = session.tasks.every(task => 
        task.status === 'completed' || task.status === 'failed' || task.status === 'skipped'
      )
      
      if (allTasksCompleted) {
        const metrics = calculateProgress(session)
        setSession(prev => ({
          ...prev,
          status: 'completed',
          completedAt: new Date(),
          overallScore: metrics.averageScore
        }))
        
        onSessionComplete?.(metrics)
      }
    }
  }, [session.tasks, session.status, onSessionComplete])

  // 작업 시작
  const startTask = useCallback((taskId: string) => {
    const startTime = Date.now()
    taskStartTimes.current.set(taskId, startTime)

    setSession(prev => ({
      ...prev,
      tasks: prev.tasks.map(task => 
        task.taskId === taskId 
          ? { ...task, status: 'in_progress' as TaskStatus }
          : task
      )
    }))

    console.log(`📋 Task started: ${taskId}`)
  }, [])

  // 작업 완료 처리
  const completeTask = useCallback((
    taskId: string, 
    result: { 
      taskStatus: 'success' | 'partial' | 'failed'
      score?: number
      feedback?: string 
    }
  ) => {
    const startTime = taskStartTimes.current.get(taskId) || Date.now()
    const timeSpent = Date.now() - startTime
    taskStartTimes.current.delete(taskId)

    setSession(prev => {
      const taskIndex = prev.tasks.findIndex(t => t.taskId === taskId)
      if (taskIndex === -1) return prev

      const currentTask = prev.tasks[taskIndex]
      const updatedTask = {
        ...currentTask,
        attempts: currentTask.attempts + 1,
        timeSpent: currentTask.timeSpent + timeSpent
      }

      // 완료 조건 검사
      const completion = checkTaskCompletion(updatedTask, result)
      
      if (completion.shouldComplete) {
        updatedTask.status = 'completed'
        updatedTask.score = result.score || 5
        updatedTask.completedAt = new Date()
        updatedTask.feedback = result.feedback
        
        console.log(`✅ Task completed: ${taskId} (Score: ${updatedTask.score})`)
        onTaskComplete?.(taskId, updatedTask.score)
        
      } else if (completion.shouldFail) {
        updatedTask.status = 'failed'
        updatedTask.feedback = result.feedback || `최대 시도 횟수(${updatedTask.maxAttempts})를 초과했습니다.`
        
        console.log(`❌ Task failed: ${taskId} (Attempts: ${updatedTask.attempts})`)
        onTaskFail?.(taskId, updatedTask.attempts)
        
      } else if (completion.shouldContinue) {
        // 상태는 in_progress 유지
        console.log(`🔄 Task continuing: ${taskId} (Attempts: ${updatedTask.attempts})`)
      }

      const updatedTasks = [...prev.tasks]
      updatedTasks[taskIndex] = updatedTask

      // 다음 작업 활성화 (현재 작업이 완료되거나 실패한 경우)
      if (updatedTask.status === 'completed' || updatedTask.status === 'failed') {
        const nextTaskIndex = taskIndex + 1
        if (nextTaskIndex < updatedTasks.length) {
          updatedTasks[nextTaskIndex].status = 'in_progress'
          console.log(`➡️ Next task activated: ${updatedTasks[nextTaskIndex].taskId}`)
        }
      }

      return {
        ...prev,
        tasks: updatedTasks,
        currentTaskIndex: updatedTask.status === 'completed' || updatedTask.status === 'failed' 
          ? Math.min(taskIndex + 1, prev.totalTasks - 1)
          : prev.currentTaskIndex,
        totalTimeSpent: prev.totalTimeSpent + timeSpent
      }
    })
  }, [onTaskComplete, onTaskFail])

  // 작업 건너뛰기
  const skipTask = useCallback((taskId: string, reason?: string) => {
    setSession(prev => ({
      ...prev,
      tasks: prev.tasks.map((task, index) => {
        if (task.taskId === taskId) {
          const nextTaskIndex = index + 1
          // 다음 작업 활성화
          if (nextTaskIndex < prev.tasks.length) {
            prev.tasks[nextTaskIndex].status = 'in_progress'
          }
          
          return {
            ...task,
            status: 'skipped' as TaskStatus,
            feedback: reason || '사용자가 건너뛰었습니다.'
          }
        }
        return task
      }),
      currentTaskIndex: prev.currentTaskIndex + 1
    }))

    console.log(`⏭️ Task skipped: ${taskId} (${reason || 'No reason'})`)
  }, [])

  // 대화 기록 추가
  const addConversationEntry = useCallback((
    role: 'user' | 'assistant',
    text: string,
    taskId: string
  ) => {
    setSession(prev => ({
      ...prev,
      conversationHistory: [
        ...prev.conversationHistory,
        {
          role,
          text,
          timestamp: new Date(),
          taskId
        }
      ]
    }))
  }, [])

  // 에러 기록
  const recordError = useCallback((taskId: string, error: string) => {
    setSession(prev => ({
      ...prev,
      tasks: prev.tasks.map(task => 
        task.taskId === taskId 
          ? { ...task, errors: [...task.errors, error] }
          : task
      )
    }))
  }, [])

  // 현재 작업 가져오기 - useMemo로 최적화
  const currentTask = useMemo((): LearningTask | null => {
    const currentTaskId = getNextTask(session)
    if (!currentTaskId) return null
    
    return scenario.tasks.find(task => task.id === currentTaskId) || null
  }, [session, scenario.tasks])

  // 현재 작업 진행도 가져오기 - useMemo로 최적화
  const currentTaskProgress = useMemo((): TaskProgress | null => {
    if (!currentTask) return null
    
    return session.tasks.find(task => task.taskId === currentTask.id) || null
  }, [session.tasks, currentTask])

  // 세션 리셋
  const resetSession = useCallback(() => {
    taskStartTimes.current.clear()
    
    const initialTasks: TaskProgress[] = scenario.tasks.map(task => ({
      taskId: task.id,
      status: 'pending' as TaskStatus,
      attempts: 0,
      maxAttempts: maxAttemptsPerTask,
      timeSpent: 0,
      errors: []
    }))

    if (initialTasks.length > 0) {
      initialTasks[0].status = 'in_progress'
    }

    setSession({
      sessionId: `session-${Date.now()}`,
      scenarioId: scenario.id,
      status: 'in_progress',
      startedAt: new Date(),
      currentTaskIndex: 0,
      totalTasks: scenario.tasks.length,
      tasks: initialTasks,
      overallScore: 0,
      totalTimeSpent: 0,
      conversationHistory: []
    })
  }, [scenario, maxAttemptsPerTask])

  // 성취도 레벨
  const achievementLevel = getAchievementLevel(currentMetrics)

  return {
    // 상태
    session,
    metrics: currentMetrics,
    achievementLevel,
    isSessionComplete: session.status === 'completed',
    
    // 현재 작업 정보
    currentTask,
    currentTaskProgress,
    
    // 액션
    startTask,
    completeTask,
    skipTask,
    addConversationEntry,
    recordError,
    resetSession,
    
    // 헬퍼
    getTaskProgress: (taskId: string) => session.tasks.find(t => t.taskId === taskId),
    isTaskCompleted: (taskId: string) => session.tasks.find(t => t.taskId === taskId)?.status === 'completed',
    getCompletedTasks: () => session.tasks.filter(t => t.status === 'completed'),
    getRemainingTasks: () => session.tasks.filter(t => t.status === 'pending'),
  }
}
