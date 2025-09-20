// 에러 처리 타입 정의

export type ErrorType = 'stt' | 'chat' | 'tts' | 'vad' | 'network' | 'unknown'

export interface AppError {
  id: string
  type: ErrorType
  message: string
  details?: string
  timestamp: Date
  retryCount: number
  maxRetries: number
  isRetryable: boolean
  context?: Record<string, any>
}

export interface RetryConfig {
  maxRetries: number
  baseDelay: number // milliseconds
  maxDelay: number // milliseconds
  backoffMultiplier: number
  retryableErrors: ErrorType[]
}

export interface ErrorState {
  errors: AppError[]
  isRetrying: boolean
  retryAttempt: number
  lastError: AppError | null
}

// 기본 재시도 설정
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableErrors: ['stt', 'chat', 'tts', 'network']
}

// 에러 메시지 매핑
export const ERROR_MESSAGES: Record<ErrorType, { title: string; description: string }> = {
  stt: {
    title: '음성 인식 오류',
    description: '음성을 텍스트로 변환하는 중 문제가 발생했습니다.'
  },
  chat: {
    title: '대화 처리 오류', 
    description: 'AI와의 대화를 처리하는 중 문제가 발생했습니다.'
  },
  tts: {
    title: '음성 합성 오류',
    description: '텍스트를 음성으로 변환하는 중 문제가 발생했습니다.'
  },
  vad: {
    title: '음성 감지 오류',
    description: '마이크를 통한 음성 감지에 문제가 발생했습니다.'
  },
  network: {
    title: '네트워크 오류',
    description: '서버와의 연결에 문제가 발생했습니다.'
  },
  unknown: {
    title: '알 수 없는 오류',
    description: '예상치 못한 문제가 발생했습니다.'
  }
}

// 에러 유틸리티 함수들
export const createError = (
  type: ErrorType,
  message: string,
  details?: string,
  context?: Record<string, any>
): AppError => ({
  id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  type,
  message,
  details,
  timestamp: new Date(),
  retryCount: 0,
  maxRetries: DEFAULT_RETRY_CONFIG.maxRetries,
  isRetryable: DEFAULT_RETRY_CONFIG.retryableErrors.includes(type),
  context
})

export const isRetryableError = (error: AppError): boolean => {
  return error.isRetryable && error.retryCount < error.maxRetries
}

export const calculateRetryDelay = (retryCount: number, config = DEFAULT_RETRY_CONFIG): number => {
  const delay = config.baseDelay * Math.pow(config.backoffMultiplier, retryCount)
  return Math.min(delay, config.maxDelay)
}

export const getErrorDisplayInfo = (error: AppError) => {
  const baseInfo = ERROR_MESSAGES[error.type] || ERROR_MESSAGES.unknown
  return {
    ...baseInfo,
    canRetry: isRetryableError(error),
    retryText: error.retryCount > 0 
      ? `재시도 ${error.retryCount}/${error.maxRetries}`
      : '재시도',
    timeAgo: formatTimeAgo(error.timestamp)
  }
}

const formatTimeAgo = (date: Date): string => {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  
  if (diffSeconds < 60) return `${diffSeconds}초 전`
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}분 전`
  return `${Math.floor(diffSeconds / 3600)}시간 전`
}
