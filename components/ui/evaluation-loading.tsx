'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Sparkles, Brain, Target, CheckCircle } from 'lucide-react'

interface EvaluationLoadingProps {
  isVisible: boolean
}

const loadingMessages = [
  "Evaluating your Korean language level...",
  "Please wait a moment...",
  "Analyzing your conversation skills...",
  "Processing your responses...",
  "Almost done..."
]

const loadingIcons = [
  Brain,
  Target,
  CheckCircle,
  Sparkles,
  Loader2
]

export function EvaluationLoading({ isVisible }: EvaluationLoadingProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)
  const [currentIconIndex, setCurrentIconIndex] = useState(0)

  useEffect(() => {
    if (!isVisible) return

    // Message cycling
    const messageInterval = setInterval(() => {
      setCurrentMessageIndex(prev => (prev + 1) % loadingMessages.length)
    }, 2500)

    // Icon cycling (slightly faster)
    const iconInterval = setInterval(() => {
      setCurrentIconIndex(prev => (prev + 1) % loadingIcons.length)
    }, 2000)

    return () => {
      clearInterval(messageInterval)
      clearInterval(iconInterval)
    }
  }, [isVisible])

  if (!isVisible) return null

  const CurrentIcon = loadingIcons[currentIconIndex]

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        role="dialog"
        aria-labelledby="evaluation-loading-title"
        aria-describedby="evaluation-loading-description"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 20 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex flex-col items-center justify-center p-8 bg-card rounded-2xl shadow-2xl border border-border/50 max-w-md mx-4"
        >
          {/* Main loading spinner */}
          <div className="relative mb-6">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 border-4 border-primary/20 rounded-full"
            >
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-full h-full border-4 border-transparent border-t-primary rounded-full"
              />
            </motion.div>
            
            {/* Central icon */}
            <motion.div
              key={currentIconIndex}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <CurrentIcon className="w-6 h-6 text-primary" />
            </motion.div>
          </div>

          {/* Loading message */}
          <div className="text-center">
            <h3 
              id="evaluation-loading-title"
              className="text-lg font-semibold text-foreground mb-2"
            >
              Korean Level Evaluation
            </h3>
            
            <AnimatePresence mode="wait">
              <motion.p
                key={currentMessageIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
                id="evaluation-loading-description"
                className="text-muted-foreground text-sm min-h-[1.5rem] flex items-center justify-center"
              >
                {loadingMessages[currentMessageIndex]}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Progress dots */}
          <div className="flex items-center gap-2 mt-6">
            {Array.from({ length: 5 }).map((_, index) => (
              <motion.div
                key={index}
                animate={{
                  scale: index === currentMessageIndex ? [1, 1.2, 1] : 1,
                  opacity: index === currentMessageIndex ? 1 : 0.4
                }}
                transition={{
                  duration: 0.6,
                  repeat: index === currentMessageIndex ? Infinity : 0,
                  repeatDelay: 0.3
                }}
                className="w-2 h-2 bg-primary rounded-full"
              />
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
