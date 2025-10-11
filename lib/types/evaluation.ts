// 평가 입력 타입
export interface EvaluationInput {
  scenarioInfo: {
    title: string
    task: string
    description: string
  }
  chatHistory: Array<{
    role: "assistant" | "feedback" | "user"
    content: string
    timestamp?: string
  }>
  completedTasks: Array<{
    id: string
    ko: string
    en?: string
    completedAt: string
  }>
}

// 평가 응답 타입
export interface EvaluationResponse {
  axes: {
    task: { score: number }
    grammar: { score: number; error_examples: string[] }
    lexicon: { score: number; error_examples: string[] }
    pragmatics: { score: number; error_examples: string[] }
  }
}

// 평가 축별 정보
export interface EvaluationAxis {
  key: keyof EvaluationResponse['axes']
  name: string
  description: string
  color: string
}

// 레벨 정보
export interface LevelInfo {
  level: 'L1' | 'L2' | 'L3' | 'L4'
  name: string
  description: string
  color: string
  bgColor: string
}

// 종합 레벨 계산 결과
export interface OverallLevel {
  level: 'L1' | 'L2' | 'L3' | 'L4'
  average: number
  color: string
  bgColor: string
}

// 평가 축별 상수
export const EVALUATION_AXES: EvaluationAxis[] = [
  {
    key: 'task',
    name: '과제 달성도',
    description: 'Task Achievement',
    color: 'text-blue-600'
  },
  {
    key: 'grammar',
    name: '문법',
    description: 'Grammar',
    color: 'text-green-600'
  },
  {
    key: 'lexicon',
    name: '어휘·정확도',
    description: 'Lexicon & Accuracy',
    color: 'text-purple-600'
  },
  {
    key: 'pragmatics',
    name: '상황·예절',
    description: 'Pragmatics',
    color: 'text-orange-600'
  }
]

// 레벨별 상수
export const LEVEL_INFO: Record<'L1' | 'L2' | 'L3' | 'L4', LevelInfo> = {
  L1: {
    level: 'L1',
    name: '기초',
    description: 'Basic',
    color: 'text-red-600',
    bgColor: 'bg-red-50'
  },
  L2: {
    level: 'L2',
    name: '초급',
    description: 'Beginner',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50'
  },
  L3: {
    level: 'L3',
    name: '중급',
    description: 'Intermediate',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50'
  },
  L4: {
    level: 'L4',
    name: '고급',
    description: 'Advanced',
    color: 'text-green-600',
    bgColor: 'bg-green-50'
  }
}

// 종합 레벨 계산 함수
export const calculateOverallLevel = (scores: {
  task: number
  grammar: number
  lexicon: number
  pragmatics: number
}): OverallLevel => {
  const average = (scores.task + scores.grammar + scores.lexicon + scores.pragmatics) / 4
  
  if (average >= 3.5) {
    return {
      level: 'L4',
      average,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    }
  }
  if (average >= 2.5) {
    return {
      level: 'L3',
      average,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    }
  }
  if (average >= 1.5) {
    return {
      level: 'L2',
      average,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    }
  }
  return {
    level: 'L1',
    average,
    color: 'text-red-600',
    bgColor: 'bg-red-50'
  }
}

// 점수별 색상 클래스
export const getScoreColor = (score: number): string => {
  if (score >= 3.5) return 'text-green-600'
  if (score >= 2.5) return 'text-yellow-600'
  if (score >= 1.5) return 'text-orange-600'
  return 'text-red-600'
}

// 점수별 배경 색상 클래스
export const getScoreBgColor = (score: number): string => {
  if (score >= 3.5) return 'bg-green-50'
  if (score >= 2.5) return 'bg-yellow-50'
  if (score >= 1.5) return 'bg-orange-50'
  return 'bg-red-50'
}
