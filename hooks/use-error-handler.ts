// 에러 처리 훅

'use client'

import { useState, useCallback, useRef } from 'react'
import { AppError, ErrorState, ErrorType, createError, isRetryableError, calculateRetryDelay } from '@/lib/types/errors'

interface UseErrorHandlerOptions {
  maxRetries?: number
  onError?: (error: AppError) => void
  onRetrySuccess?: (error: AppError) => void
  onRetryFailed?: (error: AppError) => void
}

export function useErrorHandler(options: UseErrorHandlerOptions = {}) {
  const [errorState, setErrorState] = useState<ErrorState>({
    errors: [],
    isRetrying: false,
    retryAttempt: 0,
    lastError: null
  })

  const retryTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map())

  // 에러 추가
  const addError = useCallback((
    type: ErrorType,
    message: string,
    details?: string,
    context?: Record<string, any>
  ) => {
    const error = createError(type, message, details, context)
    
    setErrorState(prev => ({
      ...prev,
      errors: [...prev.errors.slice(-9), error], // 최대 10개 에러 유지
      lastError: error
    }))

    options.onError?.(error)
    console.error(`[${type.toUpperCase()}] ${message}`, { details, context })
    
    return error
  }, [options])

  // 에러 제거
  const removeError = useCallback((errorId: string) => {
    setErrorState(prev => ({
      ...prev,
      errors: prev.errors.filter(e => e.id !== errorId),
      lastError: prev.lastError?.id === errorId ? null : prev.lastError
    }))
    
    // 재시도 타이머 정리
    const timeout = retryTimeouts.current.get(errorId)
    if (timeout) {
      clearTimeout(timeout)
      retryTimeouts.current.delete(errorId)
    }
  }, [])

  // 모든 에러 제거
  const clearErrors = useCallback(() => {
    // 모든 재시도 타이머 정리
    retryTimeouts.current.forEach(timeout => clearTimeout(timeout))
    retryTimeouts.current.clear()
    
    setErrorState({
      errors: [],
      isRetrying: false,
      retryAttempt: 0,
      lastError: null
    })
  }, [])

  // 재시도 실행
  const retryOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    errorId: string
  ): Promise<T> => {
    const error = errorState.errors.find(e => e.id === errorId)
    if (!error || !isRetryableError(error)) {
      throw new Error('Operation cannot be retried')
    }

    setErrorState(prev => ({
      ...prev,
      isRetrying: true,
      retryAttempt: error.retryCount + 1
    }))

    // 재시도 카운트 증가
    const updatedError = { ...error, retryCount: error.retryCount + 1 }
    setErrorState(prev => ({
      ...prev,
      errors: prev.errors.map(e => e.id === errorId ? updatedError : e),
      lastError: prev.lastError?.id === errorId ? updatedError : prev.lastError
    }))

    try {
      const result = await operation()
      
      // 성공 시 에러 제거
      removeError(errorId)
      setErrorState(prev => ({ ...prev, isRetrying: false, retryAttempt: 0 }))
      
      options.onRetrySuccess?.(updatedError)
      console.log(`[RETRY SUCCESS] ${error.type}: ${error.message}`)
      
      return result
    } catch (retryError) {
      setErrorState(prev => ({ ...prev, isRetrying: false, retryAttempt: 0 }))
      
      if (isRetryableError(updatedError)) {
        // 자동 재시도 스케줄링
        const delay = calculateRetryDelay(updatedError.retryCount)
        const timeout = setTimeout(() => {
          retryOperation(operation, errorId).catch(() => {
            // 최종 실패 시 에러 상태 업데이트
            options.onRetryFailed?.(updatedError)
          })
        }, delay)
        
        retryTimeouts.current.set(errorId, timeout)
        console.log(`[RETRY SCHEDULED] ${error.type} in ${delay}ms (attempt ${updatedError.retryCount + 1}/${updatedError.maxRetries})`)
      } else {
        options.onRetryFailed?.(updatedError)
        console.error(`[RETRY FAILED] ${error.type}: Max retries exceeded`)
      }
      
      throw retryError
    }
  }, [errorState.errors, removeError, options])

  // 수동 재시도 (사용자 액션)
  const manualRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    errorId: string
  ): Promise<T> => {
    // 자동 재시도 타이머 취소
    const timeout = retryTimeouts.current.get(errorId)
    if (timeout) {
      clearTimeout(timeout)
      retryTimeouts.current.delete(errorId)
    }

    return retryOperation(operation, errorId)
  }, [retryOperation])

  // 에러 래핑된 작업 실행
  const executeWithErrorHandling = useCallback(async <T>(
    operation: () => Promise<T>,
    errorType: ErrorType,
    context?: Record<string, any>
  ): Promise<T> => {
    try {
      return await operation()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const details = error instanceof Error ? error.stack : undefined
      
      const appError = addError(errorType, message, details, context)
      
      // 자동 재시도가 가능한 경우 스케줄링
      if (isRetryableError(appError)) {
        const delay = calculateRetryDelay(0)
        const timeout = setTimeout(() => {
          retryOperation(operation, appError.id).catch(() => {
            // 자동 재시도 실패는 이미 처리됨
          })
        }, delay)
        
        retryTimeouts.current.set(appError.id, timeout)
        console.log(`[AUTO RETRY SCHEDULED] ${errorType} in ${delay}ms`)
      }
      
      throw error
    }
  }, [addError, retryOperation])

  return {
    // 상태
    errors: errorState.errors,
    isRetrying: errorState.isRetrying,
    retryAttempt: errorState.retryAttempt,
    lastError: errorState.lastError,
    hasErrors: errorState.errors.length > 0,
    
    // 액션
    addError,
    removeError,
    clearErrors,
    manualRetry,
    executeWithErrorHandling,
    
    // 헬퍼
    canRetry: (errorId: string) => {
      const error = errorState.errors.find(e => e.id === errorId)
      return error ? isRetryableError(error) : false
    },
    getRetryDelay: (errorId: string) => {
      const error = errorState.errors.find(e => e.id === errorId)
      return error ? calculateRetryDelay(error.retryCount) : 0
    }
  }
}
