// 진행도 추적 타입 정의

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped'
export type SessionStatus = 'not_started' | 'in_progress' | 'completed' | 'abandoned'

export interface TaskProgress {
  taskId: string
  status: TaskStatus
  attempts: number
  maxAttempts: number
  score?: number
  completedAt?: Date
  timeSpent: number // milliseconds
  feedback?: string
  errors: string[]
}

export interface SessionProgress {
  sessionId: string
  scenarioId: string
  status: SessionStatus
  startedAt: Date
  completedAt?: Date
  currentTaskIndex: number
  totalTasks: number
  tasks: TaskProgress[]
  overallScore: number
  totalTimeSpent: number
  conversationHistory: {
    role: 'user' | 'assistant'
    text: string
    timestamp: Date
    taskId: string
  }[]
}

export interface ProgressMetrics {
  completionRate: number // 0-100
  averageScore: number // 0-10
  totalTimeSpent: number // milliseconds
  successfulTasks: number
  failedTasks: number
  skippedTasks: number
  currentStreak: number
  bestStreak: number
}

export interface ProgressUpdate {
  type: 'task_start' | 'task_complete' | 'task_fail' | 'task_skip' | 'session_complete'
  taskId?: string
  score?: number
  feedback?: string
  error?: string
  timestamp: Date
}

// 진행도 계산 유틸리티
export const calculateProgress = (session: SessionProgress): ProgressMetrics => {
  const completedTasks = session.tasks.filter(t => t.status === 'completed')
  const failedTasks = session.tasks.filter(t => t.status === 'failed')
  const skippedTasks = session.tasks.filter(t => t.status === 'skipped')
  
  const completionRate = (completedTasks.length / session.totalTasks) * 100
  const averageScore = completedTasks.length > 0 
    ? completedTasks.reduce((sum, task) => sum + (task.score || 0), 0) / completedTasks.length
    : 0
  
  // 연속 성공 계산
  let currentStreak = 0
  let bestStreak = 0
  let tempStreak = 0
  
  for (let i = session.tasks.length - 1; i >= 0; i--) {
    const task = session.tasks[i]
    if (task.status === 'completed') {
      if (i === session.tasks.length - 1) currentStreak++
      tempStreak++
      bestStreak = Math.max(bestStreak, tempStreak)
    } else {
      if (i === session.tasks.length - 1) currentStreak = 0
      tempStreak = 0
    }
  }
  
  return {
    completionRate,
    averageScore,
    totalTimeSpent: session.totalTimeSpent,
    successfulTasks: completedTasks.length,
    failedTasks: failedTasks.length,
    skippedTasks: skippedTasks.length,
    currentStreak,
    bestStreak
  }
}

// 다음 작업 결정 로직
export const getNextTask = (session: SessionProgress): string | null => {
  const currentTask = session.tasks[session.currentTaskIndex]
  
  if (!currentTask) return null
  
  // 현재 작업이 완료되지 않았다면 현재 작업 유지
  if (currentTask.status === 'pending' || currentTask.status === 'in_progress') {
    return currentTask.taskId
  }
  
  // 현재 작업이 완료되었다면 다음 작업으로
  if (session.currentTaskIndex < session.totalTasks - 1) {
    return session.tasks[session.currentTaskIndex + 1].taskId
  }
  
  // 모든 작업 완료
  return null
}

// 작업 완료 조건 검사
export const checkTaskCompletion = (
  taskProgress: TaskProgress,
  turnResult: { taskStatus: 'success' | 'partial' | 'failed'; score?: number }
): { shouldComplete: boolean; shouldFail: boolean; shouldContinue: boolean } => {
  
  if (turnResult.taskStatus === 'success') {
    return { shouldComplete: true, shouldFail: false, shouldContinue: false }
  }
  
  if (turnResult.taskStatus === 'failed') {
    // 최대 시도 횟수 초과 시 실패
    if (taskProgress.attempts >= taskProgress.maxAttempts) {
      return { shouldComplete: false, shouldFail: true, shouldContinue: false }
    }
    // 아직 시도 기회가 남아있으면 계속
    return { shouldComplete: false, shouldFail: false, shouldContinue: true }
  }
  
  // partial 상태는 계속 진행
  return { shouldComplete: false, shouldFail: false, shouldContinue: true }
}

// 성취도 레벨 계산
export const getAchievementLevel = (metrics: ProgressMetrics): {
  level: number
  title: string
  description: string
  nextLevelProgress: number
} => {
  const score = metrics.averageScore
  const completion = metrics.completionRate
  const streak = metrics.currentStreak
  
  // 종합 점수 계산 (0-100)
  const overallScore = (score * 4) + (completion * 0.3) + (streak * 2)
  
  let level = 1
  let title = '초보자'
  let description = '한국어 회화를 시작했습니다!'
  
  if (overallScore >= 80) {
    level = 5
    title = '전문가'
    description = '완벽한 한국어 회화 실력을 보여주고 있습니다!'
  } else if (overallScore >= 60) {
    level = 4
    title = '숙련자'
    description = '자연스러운 한국어 회화가 가능합니다!'
  } else if (overallScore >= 40) {
    level = 3
    title = '중급자'
    description = '기본적인 회화를 잘 구사합니다!'
  } else if (overallScore >= 20) {
    level = 2
    title = '입문자'
    description = '한국어 회화에 익숙해지고 있습니다!'
  }
  
  const nextLevelThreshold = level * 20
  const currentLevelThreshold = (level - 1) * 20
  const nextLevelProgress = ((overallScore - currentLevelThreshold) / (nextLevelThreshold - currentLevelThreshold)) * 100
  
  return {
    level,
    title,
    description,
    nextLevelProgress: Math.min(100, Math.max(0, nextLevelProgress))
  }
}
