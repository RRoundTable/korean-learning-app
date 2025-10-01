"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Volume2, Languages, Eye, Bookmark, Mic, X, ArrowUp, Settings, Lightbulb, Loader2 } from "lucide-react"
import { useLearningContext } from "@/contexts/LearningContext"
import { apiClient } from "@/lib/api"
import { SuccessPopup } from "@/components/success-popup"

interface ConversationPracticeProps {
  scenario: any
  onBack: () => void
  initialMessage?: {
    text: string
    translation: string
  }
}

interface Message {
  id: string
  role: "user" | "assistant"
  text: string
  translation?: string
  translateEn?: string
  isWaiting?: boolean
  isCurrentlyRecording?: boolean
  isCancelled?: boolean
}

export function ConversationPractice({ scenario, onBack, initialMessage }: ConversationPracticeProps) {
  const {
    currentTaskIndex,
    currentTask,
    progress,
    isListening,
    isAgentSpeaking,
    sessionId,
    attempts,
    setListening,
    setAgentSpeaking,
    markCurrentTaskSuccess,
    gotoNextTask,
    incrementAttempts,
    saveProgress,
  } = useLearningContext()

  const [showTranslation, setShowTranslation] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [feedback, setFeedback] = useState<string | null>(null)
  // score removed per new design (metadata split)
  const [currentlyRecordingMessageId, setCurrentlyRecordingMessageId] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [hintTranslateEn, setHintTranslateEn] = useState<string | null>(null)
  const [isHintPlaying, setIsHintPlaying] = useState(false)
  const [isHintLoading, setIsHintLoading] = useState(false)
  const [hintTaskIndex, setHintTaskIndex] = useState<number | null>(null)
  const [isCancelled, setIsCancelled] = useState(false)
  const [cancelledMessageId, setCancelledMessageId] = useState<string | null>(null)
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [textOnlyMode, setTextOnlyMode] = useState<boolean>(
    () => (typeof process !== "undefined" && process.env.NEXT_PUBLIC_TEXT_ONLY_CHAT === "true") || false
  )
  const [typedMessage, setTypedMessage] = useState<string>("")
  const [showGoal, setShowGoal] = useState<boolean>(false)
  const [messages, setMessages] = useState<Message[]>(() => {
    const defaultInitialMessage = {
      text: "안녕하세요! 저는 로빈이에요. 에이미 친구맞으세요?",
      translation: "Hi, I'm Robin! Are you Amy's friend?",
    }
    
    const initialMsg = initialMessage || scenario.initialMessage || defaultInitialMessage
    
    return [
      {
        id: "initial",
        role: "assistant",
        text: initialMsg.text,
        translation: initialMsg.translation,
      },
      {
        id: "user-waiting",
        role: "user",
        text: "",
        isWaiting: true,
      },
    ]
  })

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const hintAudioRef = useRef<HTMLAudioElement | null>(null)
  const isCancelledRef = useRef<boolean>(false)
  const hasPlayedInitialTtsRef = useRef<boolean>(false)

  // TEMP: disable initial TTS autoplay
  const ENABLE_INITIAL_TTS = false

  // Removed initialHint support: hints are fetched on demand

  // Play initial assistant message TTS on mount / when initial message changes
  useEffect(() => {
    if (!ENABLE_INITIAL_TTS) return
    if (hasPlayedInitialTtsRef.current) return

    // Determine initial message text following the same precedence as initial state
    const defaultInitialMessage = {
      text: "안녕하세요! 저는 로빈이에요. 에이미 친구맞으세요?",
      translation: "Hi, I'm Robin! Are you Amy's friend?",
    }
    const initialMsg = initialMessage || (scenario as any).initialMessage || defaultInitialMessage
    const text = initialMsg?.text
    if (!text) return

    let isActive = true
    ;(async () => {
      try {
        setAgentSpeaking(true)
        const audioUrl = await apiClient.getOrCreateTtsObjectUrl(text, {
          sessionId,
          voice: "nova",
          format: "mp3",
        })

        if (!isActive) return

        // Stop any existing audio
        if (audioRef.current) {
          try { audioRef.current.pause() } catch {}
        }

        const audio = new Audio(audioUrl)
        audioRef.current = audio
        hasPlayedInitialTtsRef.current = true

        await new Promise<void>((resolve) => {
          audio.onended = () => resolve()
          audio.onerror = () => resolve()
          audio.play().catch(() => resolve())
        })
      } catch {
        // noop – failures should not block interaction
      } finally {
        if (isActive) setAgentSpeaking(false)
      }
    })()

    return () => {
      isActive = false
    }
  }, [initialMessage?.text, sessionId, setAgentSpeaking, apiClient, scenario])

  // Recording functionality
  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop()
      }
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      if (hintAudioRef.current) {
        hintAudioRef.current.pause()
        hintAudioRef.current = null
      }
      // Clear audio cache on unmount
      apiClient.clearAudioCache()
    }
  }, [])

  const startRecording = async () => {
    if (textOnlyMode) return
    try {
      // 취소 상태 초기화
      setIsCancelled(false)
      setCancelledMessageId(null)
      isCancelledRef.current = false
      
      // 발화 시작 시 힌트 자동 숨김
      if (showHint) {
        setShowHint(false)
      }

      // 현재 대기 중인 메시지 ID 찾기
      const waitingMessage = messages.find(msg => msg.role === "user" && msg.isWaiting)
      console.log('Found waiting message:', waitingMessage)
      if (waitingMessage) {
        setCurrentlyRecordingMessageId(waitingMessage.id)
        console.log('Set currentlyRecordingMessageId to:', waitingMessage.id)
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      })

      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
        stream.getTracks().forEach(track => track.stop())
        
        // 취소 상태 확인하여 분기 처리 (ref 사용으로 최신 상태 참조)
        console.log('onstop event - isCancelledRef.current:', isCancelledRef.current)
        if (isCancelledRef.current) {
          // 취소된 경우: processAudio 호출하지 않음
          console.log('Recording was cancelled, skipping processAudio')
          handleCancelledRecording()
        } else {
          // 정상 중단된 경우: processAudio 호출
          console.log('Recording completed normally, calling processAudio')
          await processAudio(audioBlob)
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
      setListening(true)
      setRecordingDuration(0)

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1)
      }, 1000)
    } catch (error) {
      console.error("Error starting recording:", error)
      alert("마이크 접근 권한이 필요합니다.")
    }
  }

  const stopRecording = () => {
    if (textOnlyMode) return
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
    setIsRecording(false)
    setListening(false)
    setCurrentlyRecordingMessageId(null)
  }

  const handleCancelledRecording = () => {
    // 취소된 메시지 상태 업데이트
    if (currentlyRecordingMessageId) {
      setMessages(prev => prev.map(msg => 
        msg.id === currentlyRecordingMessageId 
          ? { ...msg, isCancelled: true, text: "녹음이 취소되었습니다" }
          : msg
      ))
      setCancelledMessageId(currentlyRecordingMessageId)
    }
    
    // 상태 초기화
    setIsRecording(false)
    setListening(false)
    setCurrentlyRecordingMessageId(null)
    setIsProcessing(false)
    
    // 3초 후 취소된 메시지 자동 제거
    setTimeout(() => {
      setMessages(prev => prev.filter(msg => msg.id !== currentlyRecordingMessageId))
      setCancelledMessageId(null)
    }, 3000)
  }

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true)
    
    try {
      // Step 1: STT - Convert audio to text
      const sttResponse = await apiClient.stt(audioBlob, { 
        language: "ko",
        prompt: "한국어 대화 연습" 
      })
      
      const userText = sttResponse.text.trim()
      if (!userText) {
        throw new Error("음성을 인식할 수 없습니다. 다시 시도해주세요.")
      }

      // STT 완료 후 즉시 처리 상태 해제
      setIsProcessing(false)

      // Update user message - find and update the waiting user message
      console.log('Updating message:', { currentlyRecordingMessageId, userText })
      setMessages(prev => {
        let messageUpdated = false
        const updatedMessages = prev.map(msg => {
          // Update the first waiting user message (only once)
          if (!messageUpdated && msg.role === "user" && msg.isWaiting) {
            console.log('Found message to update:', msg.id)
            messageUpdated = true
            return { ...msg, text: userText, isWaiting: false }
          }
          return msg
        })
        console.log('Updated messages:', updatedMessages)
        return updatedMessages
      })

      // Step 2: Prepare shared conversation snapshot
      const memoryHistory = messages
        .filter(msg => !msg.isWaiting && msg.text)
        .map(msg => ({ role: msg.role, text: msg.text }))

      const chatPayload = {
        sessionId,
        userMessage: userText,
        scenarioContext: {
          scenarioId: scenario.id,
          title: scenario.title,
          assistantRole: scenario.role,
          userRole: scenario.userRole,
          description: scenario.description,
          constraints: scenario.constraints || {},
          tasks: scenario.tasks?.map((task: any, idx: number) => ({
            id: `t-${idx}`,
            ko: task.ko,
            en: task.en,
          })) || [],
        },
        progress: {
          currentTaskIndex,
          completed: progress.completed,
          total: progress.total,
        },
        currentTask: currentTask ? {
          id: currentTask.id,
          ko: currentTask.ko,
          en: currentTask.en,
        } : undefined,
        memoryHistory,
      }

      // Step 3: Call assistant first, then metadata with assistantText
      let assistantText: string | undefined
      try {
        const { text, translateEn } = await apiClient.chatAssistant(chatPayload)
        assistantText = text
        // Display full assistant text at once
        setAgentSpeaking(true)
        setMessages(prev => prev.concat([{ 
          id: `assistant-${Date.now()}`, 
          role: "assistant", 
          text,
          translateEn: translateEn
        }]))

        // Assistant 응답 시 힌트 자동 숨김
        setShowHint(false)

        // Stream TTS for the entire text as a single audio stream
        try {
          const audioUrl = await apiClient.getOrCreateTtsObjectUrl(text, {
            sessionId,
            voice: "nova",
            format: "mp3",
          })
          const audio = new Audio(audioUrl)
          audioRef.current = audio
          await new Promise<void>((resolve) => {
            audio.onended = () => resolve()
            audio.onerror = () => resolve()
            audio.play().catch(() => resolve())
          })
        } catch {}
      } catch (e) {
        console.error("Assistant error", e)
      } finally {
        setAgentSpeaking(false)
        setMessages(prev => prev.concat([{ id: `user-waiting-${Date.now()}`, role: "user", text: "", isWaiting: true }]))
      }

      // Check success (sequential) – only if assistant succeeded
      let check: { success?: boolean } | undefined
      if (assistantText) {
        try {
          check = await apiClient.chatCheckSuccess({ ...chatPayload, assistantText })
        } catch (e) {
          check = undefined
        }
      }

      // Handle task progress based on check-success
      if (check?.success) {
        markCurrentTaskSuccess()
        setTimeout(() => {
          gotoNextTask()
          saveProgress()
          
          // Check if all tasks are completed
          if (currentTaskIndex >= progress.total - 1) {
            setTimeout(() => {
              setShowSuccessPopup(true)
            }, 1000)
          }
        }, 1500)
      } else {
        // Increment attempts for failed attempts
        incrementAttempts()
      }

    } catch (error) {
      console.error("Error processing audio:", error)
      setIsProcessing(false) // 에러 시에도 반드시 해제
      alert(error instanceof Error ? error.message : "오디오 처리 중 오류가 발생했습니다.")
    }
  }

  const sendTypedMessage = async (userText: string) => {
    if (!userText.trim()) return
    setIsProcessing(true)
    setTypedMessage("")

    try {
      // Update user message - find and update the waiting user message
      setMessages(prev => {
        let messageUpdated = false
        const updatedMessages = prev.map(msg => {
          if (!messageUpdated && msg.role === "user" && msg.isWaiting) {
            messageUpdated = true
            return { ...msg, text: userText, isWaiting: false }
          }
          return msg
        })
        return updatedMessages
      })

      // Prepare conversation snapshot
      const memoryHistory = messages
        .filter(msg => !msg.isWaiting && msg.text)
        .map(msg => ({ role: msg.role, text: msg.text }))

      const chatPayload = {
        sessionId,
        userMessage: userText,
        scenarioContext: {
          scenarioId: scenario.id,
          title: scenario.title,
          assistantRole: scenario.role,
          userRole: scenario.userRole,
          description: scenario.description,
          constraints: scenario.constraints || {},
          tasks: scenario.tasks?.map((task: any, idx: number) => ({
            id: `t-${idx}`,
            ko: task.ko,
            en: task.en,
          })) || [],
        },
        progress: {
          currentTaskIndex,
          completed: progress.completed,
          total: progress.total,
        },
        currentTask: currentTask ? {
          id: currentTask.id,
          ko: currentTask.ko,
          en: currentTask.en,
        } : undefined,
        memoryHistory,
      }

      // Assistant then metadata (sequential, no TTS in text-only mode)
      let assistantText: string | undefined
      try {
        const { text, translateEn } = await apiClient.chatAssistant(chatPayload)
        assistantText = text
        setAgentSpeaking(false)
        setMessages(prev => prev.concat([{ 
          id: `assistant-${Date.now()}`, 
          role: "assistant", 
          text,
          translateEn: translateEn,
        }]))
        setShowHint(false)
        setMessages(prev => prev.concat([{ id: `user-waiting-${Date.now()}`, role: "user", text: "", isWaiting: true }]))
      } catch (e) {
        console.error("Assistant error", e)
        setAgentSpeaking(false)
      }

      // Check-success handling (only if assistant succeeded)
      let check: { success?: boolean } | undefined
      if (assistantText) {
        try {
          check = await apiClient.chatCheckSuccess({ ...chatPayload, assistantText })
        } catch (e) {
          check = undefined
        }
      }

      if (check?.success) {
        markCurrentTaskSuccess()
        setTimeout(() => {
          gotoNextTask()
          saveProgress()
          if (currentTaskIndex >= progress.total - 1) {
            setTimeout(() => {
              setShowSuccessPopup(true)
            }, 1000)
          }
        }, 1500)
      } else {
        incrementAttempts()
      }

    } catch (error) {
      console.error("Error sending typed message:", error)
      setIsProcessing(false)
      alert(error instanceof Error ? error.message : "텍스트 처리 중 오류가 발생했습니다.")
    }
  }

  const handleMicPress = () => {
    if (textOnlyMode) return
    if (isAgentSpeaking) {
      // Don't allow recording while agent is speaking
      return
    }
    
    if (isRecording) {
      // 정상 중단 (취소 아님)
      setIsCancelled(false)
      isCancelledRef.current = false
      stopRecording()
    } else if (!isProcessing) {
      startRecording()
    }
  }

  const handleTranslation = () => {
    setShowTranslation(!showTranslation)
  }

  const handleHint = async () => {
    const next = !showHint
    setShowHint(next)
    if (!next) return
    console.log('[Hint] button clicked. showHint ->', next, 'currentTaskIndex:', currentTaskIndex)
    // If we already have a hint for THIS task index, do not refetch
    if (hint && hintTaskIndex === currentTaskIndex) {
      console.log('[Hint] using cached hint for task', hintTaskIndex)
      return
    }
    try {
      setIsHintLoading(true)
      const memoryHistory = messages
        .filter(msg => !msg.isWaiting && msg.text)
        .map(msg => ({ role: msg.role, text: msg.text }))
      const payload = {
        sessionId,
        userMessage: messages.findLast?.((m) => m.role === 'user' && !m.isWaiting && !!m.text)?.text || typedMessage || '',
        scenarioContext: {
          scenarioId: scenario.id,
          title: scenario.title,
          assistantRole: scenario.role,
          userRole: scenario.userRole,
          description: scenario.description,
          constraints: scenario.constraints || {},
          tasks: scenario.tasks?.map((task: any, idx: number) => ({ id: `t-${idx}`, ko: task.ko, en: task.en })) || [],
        },
        progress: {
          currentTaskIndex,
          completed: progress.completed,
          total: progress.total,
        },
        currentTask: currentTask ? {
          id: currentTask.id,
          ko: currentTask.ko,
          en: currentTask.en,
        } : undefined,
        memoryHistory,
      }
      console.log('[Hint] calling chatHint with payload')
      const res = await apiClient.chatHint(payload as any)
      setHint(res.hint)
      setHintTranslateEn(res.hintTranslateEn || null)
      setHintTaskIndex(currentTaskIndex)
      console.log('[Hint] received hint for task', currentTaskIndex)
    } catch (e) {
      console.error("Hint request failed", e)
    } finally {
      setIsHintLoading(false)
    }
  }

  const handleSave = () => {
    setIsSaved(!isSaved)
  }

  const playHintTts = async () => {
    if (textOnlyMode) return
    if (!hint || isHintPlaying) return
    
    try {
      setIsHintPlaying(true)
      // Fetch once and cache as Blob object URL
      const audioUrl = await apiClient.getOrCreateTtsObjectUrl(hint, {
        sessionId,
        voice: "nova",
        format: "mp3",
      })

      const audio = new Audio(audioUrl)
      hintAudioRef.current = audio
      
      await new Promise<void>((resolve) => {
        audio.onended = () => {
          setIsHintPlaying(false)
          resolve()
        }
        audio.onerror = () => {
          setIsHintPlaying(false)
          resolve()
        }
        audio.play().catch(() => {
          setIsHintPlaying(false)
          resolve()
        })
      })
    } catch (error) {
      console.error("Error playing hint TTS:", error)
      setIsHintPlaying(false)
    }
  }

  const handleSuccessPopupClose = () => {
    setShowSuccessPopup(false)
  }

  const handleSuccessPopupAnalyze = () => {
    // TODO: Implement conversation analysis functionality
    console.log("Analyze conversation")
    setShowSuccessPopup(false)
  }


  const AudioVisualization = () => (
    <div className="flex items-center justify-center gap-1 py-4">
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="w-1 bg-primary rounded-full animate-pulse"
          style={{
            height: `${Math.random() * 40 + 10}px`,
            animationDelay: `${i * 0.1}s`,
            animationDuration: "1s",
          }}
        />
      ))}
    </div>
  )

  // Local header components: GoalPanel and TaskRail
  const GoalPanel = ({ goal, goalEn }: { goal?: string; goalEn?: string }) => (
    <div className="flex-1 min-w-0 md:max-w-[60%]">
      <div className="flex items-center justify-end">
        <Button
          variant="ghost"
          size="sm"
          className="p-1.5 h-auto text-xs md:text-sm"
          onClick={() => setShowGoal((v) => !v)}
        >
          {showGoal ? "Hide Goal" : "Show Goal"}
        </Button>
      </div>
      <AnimatePresence initial={false}>
        {showGoal && (
          <motion.div
            key="goal-content"
            initial={{ opacity: 0, y: 6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -6, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-0.5"
          >
            <div className="text-sm md:text-lg font-semibold text-foreground line-clamp-2 break-words md:text-right">
              {goal || "Goal not provided yet"}
            </div>
            {showTranslation && goalEn && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="text-xs md:text-sm text-muted-foreground mt-0.5 md:text-right"
              >
                {goalEn}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )

  const TaskRail = () => (
    <div className="flex flex-col md:items-start gap-1 md:gap-2 md:pr-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="text-sm md:text-lg font-semibold text-foreground line-clamp-2 break-words">
          {currentTask?.ko || ""}
        </div>
        <span className="text-[11px] md:text-xs text-muted-foreground">
          ({progress.completed}/{progress.total})
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="p-1.5 h-auto"
          onClick={handleTranslation}
          aria-pressed={showTranslation}
          title="Toggle translation"
        >
          <Languages className="w-4 h-4" />
        </Button>
      </div>
      {showTranslation && currentTask?.en && (
        <div className="text-xs md:text-sm text-muted-foreground line-clamp-2 break-words">
          {currentTask.en}
        </div>
      )}
      {progress.total > 0 && (
        <div
          className="flex items-center gap-1.5 md:gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0"
          role="list"
          aria-label={`Task progress: ${progress.completed} of ${progress.total} completed`}
        >
          {Array.from({ length: progress.total }).map((_, index) => {
            const isCompleted = index < progress.completed
            const isCurrent = index === currentTaskIndex
            const base = "rounded-full"
            const size = "w-2.5 h-2.5 md:w-3 md:h-3"
            const color = isCompleted
              ? "bg-primary"
              : isCurrent
              ? "bg-primary/80 ring-2 ring-primary/30"
              : "bg-muted"
            return (
              <motion.div
                key={index}
                className={`${base} ${size} ${color}`}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
                aria-label={`Task ${index + 1} of ${progress.total}${isCurrent ? ", current" : isCompleted ? ", completed" : ""}`}
                role="listitem"
              />
            )
          })}
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <Button variant="ghost" size="sm" onClick={onBack} className="p-2">
          <X className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold text-balance">{scenario.title}</h1>
        <div className="flex items-center gap-2">
          <Button
            variant={textOnlyMode ? "default" : "ghost"}
            size="sm"
            className="p-2"
            onClick={() => setTextOnlyMode((v) => !v)}
            title="Toggle Text-only Chat Mode"
          >
            Text Mode
          </Button>
          <Button variant="ghost" size="sm" className="p-2">
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Goal + Task Rail Header */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`goal-rail-${currentTaskIndex}-${progress.completed}-${progress.total}`}
          className="px-4 py-3 border-b border-border bg-muted/20"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <TaskRail />
            <GoalPanel goal={scenario?.goal} goalEn={scenario?.goalEn} />
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Messages Container */}
      <div className="flex-1 px-4 py-6 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-4">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className={`max-w-[80%] md:max-w-[70%] ${message.role === "user" ? "order-2" : "order-1"}`}>
                  <Card className={`${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-card"}`}>
                    <CardContent className="p-4">
                      {message.role === "assistant" ? (
                        <>
                          <p className="font-medium mb-3">{message.text}</p>
                          {showTranslation && (message.translation || message.translateEn) && (
                            <motion.p
                              className="text-sm opacity-70 mb-3"
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                            >
                              {message.translateEn || message.translation}
                            </motion.p>
                          )}
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="p-1.5 h-auto"
                              onClick={async () => {
                                if (textOnlyMode) return
                                try {
                                  const audioUrl = await apiClient.getOrCreateTtsObjectUrl(message.text, {
                                    sessionId,
                                    voice: "nova",
                                    format: "mp3",
                                  })
                                  const audio = new Audio(audioUrl)
                                  audio.play().catch(() => {})
                                } catch {}
                              }}
                            >
                              <Volume2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="p-1.5 h-auto" onClick={handleTranslation}>
                              <Languages className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="p-1.5 h-auto">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`p-1.5 h-auto ml-auto ${isSaved ? "text-primary" : ""}`}
                              onClick={handleSave}
                            >
                              <Bookmark className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="text-center">
                          {message.isWaiting && !isRecording && !isProcessing && (
                            <div className="flex items-center justify-center">
                              <span className="text-sm opacity-70">Press Record</span>
                            </div>
                          )}
                          {isRecording && currentlyRecordingMessageId === message.id && (
                            <>
                              <span className="text-sm opacity-70 mb-2 block">
                                Recording... {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                              </span>
                              <AudioVisualization />
                            </>
                          )}
                          {isProcessing && (
                            <div className="flex items-center justify-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span className="text-sm opacity-70">Processing...</span>
                            </div>
                          )}
                          {message.text && !message.isWaiting && !message.isCancelled && (
                            <p className="font-medium">{message.text}</p>
                          )}
                          {message.text && message.isWaiting && isProcessing && (
                            <p className="font-medium opacity-70">{message.text}</p>
                          )}
                          {message.isCancelled && (
                            <motion.p 
                              className="font-medium text-muted-foreground italic"
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              transition={{ duration: 0.3 }}
                            >
                              {message.text}
                            </motion.p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Feedback Display */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            className="px-4 pb-2"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="max-w-2xl mx-auto">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-white"></div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">피드백</p>
                    <p className="text-sm text-blue-700 mt-1">{feedback}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Score Display removed per new design */}

      {showHint && (
        <motion.div
          className="px-4 pb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <div className="max-w-2xl mx-auto">
            <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="text-sm">
                    <span className="font-medium text-primary">TRY SAYING:</span>
                    <p className="mt-1">{hint || "힌트를 불러오는 중..."}</p>
                    {showTranslation && hintTranslateEn && (
                      <motion.p
                        className="text-sm opacity-70 mt-2"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        {hintTranslateEn}
                      </motion.p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-auto">
                    {hint && !textOnlyMode && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="p-1.5 h-auto"
                        onClick={playHintTts}
                        disabled={isHintPlaying}
                      >
                        {isHintPlaying ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Volume2 className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="p-1.5 h-auto"
                      onClick={handleTranslation}
                    >
                      <Languages className="w-4 h-4" />
                    </Button>
                    {isHintLoading && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      )}


      {/* Bottom Controls */}
      <div className="p-4 bg-background border-t border-border">
        <div className="max-w-2xl mx-auto">
          {!textOnlyMode ? (
          <div className="flex items-center justify-center gap-4">
            {isRecording && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <Button
                  variant="outline"
                  size="lg"
                  className="w-16 h-16 rounded-full bg-destructive/10 border-destructive/30 hover:bg-destructive/20"
                  onClick={() => {
                    console.log('Cancel button clicked')
                    setIsCancelled(true)
                    isCancelledRef.current = true
                    stopRecording()
                  }}
                  title="녹음 취소"
                >
                  <X className="w-6 h-6 text-destructive" />
                </Button>
              </motion.div>
            )}

            <motion.div
              animate={{
                scale: isRecording ? [1, 1.1, 1] : 1,
              }}
              transition={{
                duration: 1,
                repeat: isRecording ? Infinity : 0,
              }}
            >
              <Button
                size="lg"
                className={`w-20 h-20 rounded-full transition-all duration-300 ${
                  isRecording
                    ? "bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/25"
                    : isProcessing
                    ? "bg-yellow-500 hover:bg-yellow-600"
                    : isAgentSpeaking
                    ? "bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-500/25"
                    : "bg-primary hover:bg-primary/90"
                }`}
                onClick={handleMicPress}
                disabled={isProcessing || isAgentSpeaking}
              >
                {isProcessing ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : isAgentSpeaking ? (
                  <Volume2 className="w-8 h-8" />
                ) : isRecording ? (
                  <ArrowUp className="w-8 h-8" />
                ) : (
                  <Mic className="w-8 h-8" />
                )}
              </Button>
            </motion.div>

            {/* 힌트 버튼 - 새로 추가 */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Button
                variant="outline"
                size="lg"
                className={`w-16 h-16 rounded-full transition-all duration-300 ${
                  showHint 
                    ? "bg-primary/10 border-primary/30 hover:bg-primary/20" 
                    : "hover:bg-muted/50"
                }`}
                onClick={handleHint}
                disabled={isAgentSpeaking}
              >
                <Lightbulb className={`w-6 h-6 ${showHint ? "text-primary" : ""}`} />
              </Button>
            </motion.div>
          </div>
          ) : (
          <div className="flex items-center gap-2">
            <Input
              placeholder="Type your message in Korean..."
              value={typedMessage}
              onChange={(e) => setTypedMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const text = typedMessage.trim()
                  if (!text || isProcessing || isAgentSpeaking) return
                  ;(async () => {
                    await sendTypedMessage(text)
                  })()
                }
              }}
            />
            <Button
              onClick={async () => {
                const text = typedMessage.trim()
                if (!text || isProcessing || isAgentSpeaking) return
                await sendTypedMessage(text)
              }}
              disabled={!typedMessage.trim() || isProcessing || isAgentSpeaking}
            >
              Send
            </Button>
            <Button
              variant="outline"
              onClick={handleHint}
              disabled={isAgentSpeaking}
            >
              <Lightbulb className="w-4 h-4" />
            </Button>
          </div>
          )}
        </div>
      </div>

      {/* Success Popup */}
      <SuccessPopup
        isOpen={showSuccessPopup}
        onClose={handleSuccessPopupClose}
        onAnalyze={handleSuccessPopupAnalyze}
      />
    </div>
  )
}
