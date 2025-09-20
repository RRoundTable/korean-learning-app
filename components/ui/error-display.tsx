// 에러 표시 컴포넌트

'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, RefreshCw, X, Wifi, Mic, MessageSquare, Volume2, Network } from 'lucide-react'
import { Button } from './button'
import { Card, CardContent } from './card'
import { AppError, getErrorDisplayInfo, ErrorType } from '@/lib/types/errors'

interface ErrorDisplayProps {
  error: AppError
  onRetry?: () => void
  onDismiss?: () => void
  isRetrying?: boolean
  className?: string
}

const ERROR_ICONS: Record<ErrorType, React.ComponentType<{ className?: string }>> = {
  stt: Mic,
  chat: MessageSquare,
  tts: Volume2,
  vad: Mic,
  network: Network,
  unknown: AlertTriangle
}

export function ErrorDisplay({ 
  error, 
  onRetry, 
  onDismiss, 
  isRetrying = false,
  className = "" 
}: ErrorDisplayProps) {
  const displayInfo = getErrorDisplayInfo(error)
  const IconComponent = ERROR_ICONS[error.type]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={className}
    >
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* 에러 아이콘 */}
            <motion.div
              animate={isRetrying ? { rotate: 360 } : {}}
              transition={{ duration: 1, repeat: isRetrying ? Infinity : 0, ease: "linear" }}
              className="flex-shrink-0 w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center mt-0.5"
            >
              <IconComponent className="w-4 h-4 text-destructive" />
            </motion.div>

            {/* 에러 내용 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-medium text-destructive text-sm">
                    {displayInfo.title}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {displayInfo.description}
                  </p>
                  {error.details && (
                    <details className="mt-2">
                      <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                        기술적 세부사항
                      </summary>
                      <pre className="text-xs text-muted-foreground mt-1 bg-muted/30 p-2 rounded border overflow-x-auto">
                        {error.details}
                      </pre>
                    </details>
                  )}
                </div>

                {/* 닫기 버튼 */}
                {onDismiss && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onDismiss}
                    className="p-1 h-auto text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* 액션 버튼들 */}
              <div className="flex items-center gap-2 mt-3">
                {displayInfo.canRetry && onRetry && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRetry}
                    disabled={isRetrying}
                    className="text-xs h-8 px-3"
                  >
                    <motion.div
                      animate={isRetrying ? { rotate: 360 } : {}}
                      transition={{ duration: 1, repeat: isRetrying ? Infinity : 0, ease: "linear" }}
                      className="mr-1.5"
                    >
                      <RefreshCw className="w-3 h-3" />
                    </motion.div>
                    {isRetrying ? '재시도 중...' : displayInfo.retryText}
                  </Button>
                )}

                <span className="text-xs text-muted-foreground">
                  {displayInfo.timeAgo}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

interface ErrorListProps {
  errors: AppError[]
  onRetry?: (errorId: string) => void
  onDismiss?: (errorId: string) => void
  isRetrying?: boolean
  maxVisible?: number
  className?: string
}

export function ErrorList({ 
  errors, 
  onRetry, 
  onDismiss, 
  isRetrying = false,
  maxVisible = 3,
  className = ""
}: ErrorListProps) {
  const visibleErrors = errors.slice(-maxVisible)

  if (visibleErrors.length === 0) return null

  return (
    <div className={`space-y-2 ${className}`}>
      <AnimatePresence>
        {visibleErrors.map((error, index) => (
          <ErrorDisplay
            key={error.id}
            error={error}
            onRetry={() => onRetry?.(error.id)}
            onDismiss={() => onDismiss?.(error.id)}
            isRetrying={isRetrying}
          />
        ))}
      </AnimatePresence>

      {errors.length > maxVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => onDismiss && errors.slice(0, -maxVisible).forEach(e => onDismiss(e.id))}
          >
            +{errors.length - maxVisible}개 더 (모두 지우기)
          </Button>
        </motion.div>
      )}
    </div>
  )
}

interface ErrorToastProps {
  error: AppError | null
  onRetry?: () => void
  onDismiss?: () => void
  isRetrying?: boolean
}

export function ErrorToast({ error, onRetry, onDismiss, isRetrying }: ErrorToastProps) {
  if (!error) return null

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="fixed top-4 right-4 z-50 w-80"
    >
      <ErrorDisplay
        error={error}
        onRetry={onRetry}
        onDismiss={onDismiss}
        isRetrying={isRetrying}
      />
    </motion.div>
  )
}
