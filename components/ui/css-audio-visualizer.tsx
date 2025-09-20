// CSS 기반 오디오 시각화 (VAD 렌더링과 분리)

'use client'

import React from 'react'
import { motion } from 'framer-motion'

interface CSSAudioVisualizerProps {
  isActive: boolean
  variant?: 'bars' | 'pulse' | 'wave'
  className?: string
}

export function CSSAudioVisualizer({ 
  isActive, 
  variant = 'bars',
  className = "" 
}: CSSAudioVisualizerProps) {
  
  if (variant === 'bars') {
    return (
      <div className={`flex items-center justify-center gap-1 py-4 ${className}`}>
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className={`w-1 bg-primary rounded-full transition-all duration-300 ${
              isActive 
                ? `animate-pulse h-${4 + (i % 4) * 2}` 
                : 'h-2'
            }`}
            style={{
              animationDelay: `${i * 100}ms`,
              animationDuration: `${800 + (i * 200)}ms`
            }}
          />
        ))}
      </div>
    )
  }

  if (variant === 'pulse') {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        <motion.div
          animate={isActive ? {
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5]
          } : {}}
          transition={{
            duration: 1.5,
            repeat: isActive ? Infinity : 0,
            ease: "easeInOut"
          }}
          className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center"
        >
          <motion.div
            animate={isActive ? {
              scale: [1, 1.1, 1]
            } : {}}
            transition={{
              duration: 1,
              repeat: isActive ? Infinity : 0,
              ease: "easeInOut",
              delay: 0.2
            }}
            className="w-8 h-8 rounded-full bg-primary/40"
          />
        </motion.div>
      </div>
    )
  }

  if (variant === 'wave') {
    return (
      <div className={`flex items-center justify-center gap-0.5 ${className}`}>
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className={`w-0.5 bg-gradient-to-t from-primary to-primary/50 rounded-full transition-all duration-500 ${
              isActive 
                ? 'h-8 animate-bounce' 
                : 'h-2'
            }`}
            style={{
              animationDelay: `${i * 50}ms`,
              animationDuration: `${600 + (i * 100)}ms`
            }}
          />
        ))}
      </div>
    )
  }

  return null
}

// 정적 레벨 미터 (VAD 데이터 없이 동작)
export function StaticLevelMeter({ 
  isActive, 
  className = "" 
}: { 
  isActive: boolean
  className?: string 
}) {
  return (
    <div className={`flex items-end justify-center gap-1 h-12 ${className}`}>
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className={`w-1 bg-gradient-to-t from-green-400 to-blue-500 rounded-full transition-all duration-300 ${
            isActive 
              ? `h-${2 + (i % 3) * 2} animate-pulse` 
              : 'h-1'
          }`}
          style={{
            animationDelay: `${i * 150}ms`,
            animationDuration: `${1000 + (i * 200)}ms`
          }}
        />
      ))}
    </div>
  )
}

// 마이크 버튼용 시각적 피드백
export function MicrophoneVisualFeedback({ 
  isListening, 
  isSpeaking,
  className = "" 
}: { 
  isListening: boolean
  isSpeaking: boolean
  className?: string 
}) {
  return (
    <>
      {/* 외부 링 - 청취 중 */}
      {isListening && (
        <motion.div
          className="absolute inset-0 -m-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="w-28 h-28 rounded-full border-2 border-blue-400/30 animate-pulse" />
          <div className="absolute inset-2 rounded-full border-2 border-green-400/20 animate-pulse" 
               style={{ animationDelay: '0.3s', animationDuration: '2s' }} />
        </motion.div>
      )}
      
      {/* 측면 레벨 미터 */}
      {isListening && (
        <>
          <div className="absolute -left-16 top-1/2 transform -translate-y-1/2">
            <StaticLevelMeter isActive={isSpeaking} />
          </div>
          <div className="absolute -right-16 top-1/2 transform -translate-y-1/2">
            <StaticLevelMeter isActive={isSpeaking} />
          </div>
        </>
      )}
    </>
  )
}
