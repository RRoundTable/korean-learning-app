"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Volume2, Languages, Eye, Bookmark, Mic, X, ArrowUp, Settings, Lightbulb, Loader2 } from "lucide-react"
import { useLearningContext } from "@/contexts/LearningContext"
import { apiClient } from "@/lib/api"

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
  const [score, setScore] = useState<number | null>(null)
  const [currentlyRecordingMessageId, setCurrentlyRecordingMessageId] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [hintTranslateEn, setHintTranslateEn] = useState<string | null>(null)
  const [isHintPlaying, setIsHintPlaying] = useState(false)
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
    try {
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
        await processAudio(audioBlob)
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
          role: scenario.role,
          userRole: scenario.userRole,
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

      // Step 3: Fire both assistant(non-stream) and metadata in parallel
      const assistantPromise = apiClient.chatAssistant(chatPayload)
      const metadataPromise = apiClient.chatMetadata(chatPayload)

      // When assistant arrives, render and TTS by sentence
      ;(async () => {
        try {
          const { text, translateEn } = await assistantPromise
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

          setAgentSpeaking(false)
          setMessages(prev => prev.concat([{ id: `user-waiting-${Date.now()}`, role: "user", text: "", isWaiting: true }]))
        } catch (e) {
          console.error("Assistant error", e)
          setAgentSpeaking(false)
        }
      })()

      // Handle metadata when it arrives
      let turnResult: { success?: boolean; nextTaskId?: string | null; score?: number; hint?: string | null; hintTranslateEn?: string | null; currentTaskId?: string } | undefined
      try {
        turnResult = await metadataPromise
      } catch (e) {
        turnResult = undefined
      }

      // Handle task progress based on metadata
      if (turnResult?.success) {
        markCurrentTaskSuccess()
        setTimeout(() => {
          gotoNextTask()
          saveProgress()
          
          // Check if all tasks are completed
          if (currentTaskIndex >= progress.total - 1) {
            setTimeout(() => {
              alert("축하합니다! 모든 과제를 완료했습니다! 🎉")
            }, 1000)
          }
        }, 1500)
      } else {
        // Increment attempts for failed attempts
        incrementAttempts()
      }

      // Set hint if provided
      if (turnResult?.hint) {
        setHint(turnResult.hint)
        setHintTranslateEn(turnResult.hintTranslateEn || null)
      }
      
      // Show score if provided
      if (turnResult?.score !== undefined) {
        setScore(turnResult.score)
        setTimeout(() => setScore(null), 3000) // Clear after 3 seconds
      }
    } catch (error) {
      console.error("Error processing audio:", error)
      setIsProcessing(false) // 에러 시에도 반드시 해제
      alert(error instanceof Error ? error.message : "오디오 처리 중 오류가 발생했습니다.")
    }
  }

  const handleMicPress = () => {
    if (isAgentSpeaking) {
      // Don't allow recording while agent is speaking
      return
    }
    
    if (isRecording) {
      stopRecording()
    } else if (!isProcessing) {
      startRecording()
    }
  }

  const handleTranslation = () => {
    setShowTranslation(!showTranslation)
  }

  const handleHint = () => {
    setShowHint(!showHint)
  }

  const handleSave = () => {
    setIsSaved(!isSaved)
  }

  const playHintTts = async () => {
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <Button variant="ghost" size="sm" onClick={onBack} className="p-2">
          <X className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold text-balance">{scenario.title}</h1>
        <Button variant="ghost" size="sm" className="p-2">
          <Settings className="w-5 h-5" />
        </Button>
      </div>

      {/* Progress */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            Tasks ({progress.completed}/{progress.total} completed)
          </span>
          <div className="flex gap-1">
            {Array.from({ length: progress.total }).map((_, i) => (
              <motion.div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i < progress.completed ? "bg-primary" : "bg-muted"
                }`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.1 }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Current Task */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentTaskIndex}
          className="px-4 py-3 bg-muted/30"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-start gap-3">
            <motion.div
              className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5"
              animate={{ scale: currentTask?.status === "success" ? [1, 1.2, 1] : 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="w-2 h-2 rounded-full bg-primary-foreground"></div>
            </motion.div>
            <p className="text-sm font-medium">{currentTask?.ko || "새로 사귄 친구에 대해 질문을 해보세요"}</p>
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
                          {message.text && !message.isWaiting && (
                            <p className="font-medium">{message.text}</p>
                          )}
                          {message.text && message.isWaiting && isProcessing && (
                            <p className="font-medium opacity-70">{message.text}</p>
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

      {/* Score Display */}
      <AnimatePresence>
        {score !== null && (
          <motion.div
            className="px-4 pb-2"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <div className="max-w-2xl mx-auto flex justify-center">
              <div className={`px-4 py-2 rounded-full text-sm font-bold ${
                score >= 80 
                  ? "bg-green-100 text-green-800 border border-green-200"
                  : score >= 60
                  ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                  : "bg-red-100 text-red-800 border border-red-200"
              }`}>
                점수: {score}/100
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                    {hint && (
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
                  onClick={stopRecording}
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
        </div>
      </div>
    </div>
  )
}
