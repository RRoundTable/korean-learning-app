"use client"

import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Volume2, Languages, Eye, Bookmark, Mic, X, ArrowUp, Settings, Lightbulb, Loader2 } from "lucide-react"
import { useLearningContext } from "@/contexts/LearningContext"
import { apiClient } from "@/lib/api"
import { EvaluationResultsPopup } from "@/components/evaluation-results-popup"
import { EvaluationLoading } from "@/components/ui/evaluation-loading"
import { useVad } from "@/hooks/use-vad"
import { evaluateKoreanLevel } from "@/lib/api/evaluation"
import { EvaluationInput, EvaluationResponse } from "@/lib/types/evaluation"

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
  displayText?: string // UI display용 (user의 경우 current task 제외한 원본)
  translation?: string
  translateEn?: string
  isWaiting?: boolean
  isCurrentlyRecording?: boolean
  isCancelled?: boolean
  isFeedback?: boolean
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
    latchTaskSuccesses,
  } = useLearningContext()

  const [showHintTranslation, setShowHintTranslation] = useState(false)
  const [showAssistantTranslation, setShowAssistantTranslation] = useState(false)
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
  const [isHintTranslating, setIsHintTranslating] = useState(false)
  const [hintTaskIndex, setHintTaskIndex] = useState<number | null>(null)
  const [isCancelled, setIsCancelled] = useState(false)
  const [cancelledMessageId, setCancelledMessageId] = useState<string | null>(null)
  const [showEvaluationPopup, setShowEvaluationPopup] = useState(false)
  const [evaluationData, setEvaluationData] = useState<EvaluationResponse | null>(null)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [textOnlyMode, setTextOnlyMode] = useState<boolean>(
    () => (typeof process !== "undefined" && process.env.NEXT_PUBLIC_TEXT_ONLY_CHAT === "true") || false
  )
  const [typedMessage, setTypedMessage] = useState<string>("")
  const [translatingMessageId, setTranslatingMessageId] = useState<string | null>(null)
  
  // 마이크 안내 관련 상태
  const [showInitialMicPrompt, setShowInitialMicPrompt] = useState(false)
  const [hasUserStartedRecording, setHasUserStartedRecording] = useState(false)
  
  // Show evaluation popup directly when all tasks are completed
  useEffect(() => {
    if (progress.total > 0 && progress.completed === progress.total) {
      handleEvaluation()
    }
  }, [progress.completed, progress.total])

  // 평가 API 호출 함수
  const handleEvaluation = async () => {
    if (isEvaluating) return
    
    try {
      setIsEvaluating(true)
      
      // 완료된 태스크 목록 생성
      const completedTasks = scenario.tasks?.slice(0, progress.completed).map((task: any, index: number) => ({
        id: `t-${index}`,
        ko: task.ko,
        en: task.en,
        completedAt: new Date().toISOString()
      })) || []

      // 채팅 히스토리 생성
      const chatHistory = messages
        .filter(msg => !msg.isWaiting && msg.text)
        .map(msg => ({
          role: msg.isFeedback ? "feedback" as const : msg.role,
          content: msg.text,
          timestamp: new Date().toISOString()
        }))

      // 평가 입력 데이터 구성
      const evaluationInput: EvaluationInput = {
        scenarioInfo: {
          title: scenario.title,
          task: scenario.description || "",
          description: scenario.description || ""
        },
        chatHistory,
        completedTasks
      }

      // 평가 API 호출
      const result = await evaluateKoreanLevel(evaluationInput)
      setEvaluationData(result)
      setShowEvaluationPopup(true)
      
    } catch (error) {
      console.error("Evaluation error:", error)
      alert("평가 중 오류가 발생했습니다. 다시 시도해주세요.")
    } finally {
      setIsEvaluating(false)
    }
  }
  
  // VAD 관련 상태 (UI에서 제거, 내부 처리만 유지)
  const [vadErrorMessage, setVadErrorMessage] = useState<string | null>(null)
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
  const vadUtterancesRef = useRef<Array<{ url: string; durationMs: number; timestamp: number }>>([])
  const recordingStartTimeRef = useRef<number>(0)
  
  // VAD 훅 초기화 (UI 상태 제거)
  const {
    lastUtterance: vadLastUtterance,
    error: vadError,
    start: vadStart,
    stop: vadStop,
  } = useVad()

  // Enable initial TTS autoplay for voice mode only
  const ENABLE_INITIAL_TTS = !textOnlyMode

  // VAD 발화 구간 처리 - UI 상태 제거로 리렌더링 완전 제거
  useEffect(() => {
    if (vadLastUtterance) {
      const utterance = {
        url: vadLastUtterance.url,
        durationMs: vadLastUtterance.durationMs,
        timestamp: Date.now()
      }
      
      // ref에만 저장 (UI 상태 업데이트 없음)
      vadUtterancesRef.current = [...vadUtterancesRef.current, utterance]
    }
  }, [vadLastUtterance])

  // VAD 에러 처리 - 리렌더링 최소화
  useEffect(() => {
    if (vadError) {
      // 에러는 즉시 처리하되, 상태 업데이트는 최소화
      console.error("❌ VAD Error:", vadError)
      setVadErrorMessage(vadError)
    }
  }, [vadError])

  // VAD 상태 변화 로깅 (제거 - 전송 시점에만 요약 출력)

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
          voice: scenario.ttsVoice || "nova",
          format: "mp3",
          instructions: scenario.ttsInstructions,
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
          audio.onended = () => {
            // Initial message TTS 완료 시 마이크 안내 표시
            if (!hasUserStartedRecording) {
              setShowInitialMicPrompt(true)
            }
            resolve()
          }
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
      
      // VAD 발화 구간 초기화 (UI 상태 제거)
      vadUtterancesRef.current = [] // ref만 초기화
      
      // 사용자가 첫 녹음을 시작하면 마이크 안내 숨김
      if (!hasUserStartedRecording) {
        setHasUserStartedRecording(true)
        setShowInitialMicPrompt(false)
      }
      
      // 발화 시작 시 힌트 자동 숨김
      if (showHint) {
        setShowHint(false)
      }

      // 현재 대기 중인 메시지 ID 찾기
      const waitingMessage = messages.find(msg => msg.role === "user" && msg.isWaiting)
      
      if (waitingMessage) {
        setCurrentlyRecordingMessageId(waitingMessage.id)
        
      }

      // VAD 시작
      try {
        await vadStart()
        setVadErrorMessage(null) // 에러 메시지 초기화
      } catch (vadError) {
        setVadErrorMessage(vadError instanceof Error ? vadError.message : String(vadError))
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
        
        // VAD 중지
        vadStop()
        
        // 취소 상태 확인하여 분기 처리 (ref 사용으로 최신 상태 참조)
        
        if (isCancelledRef.current) {
          // 취소된 경우: processAudio 호출하지 않음
          
          handleCancelledRecording()
        } else {
          // 정상 중단된 경우: VAD 발화 구간이 있으면 사용, 없으면 전체 오디오 사용
          
          
          // VAD 분석 결과 요약 출력 (UI 상태 제거로 단순화)
          const currentUtterances = vadUtterancesRef.current
          
          
          if (vadErrorMessage) {
            
          }
          
          
          if (currentUtterances.length > 0) {
            await processVadUtterances()
          } else {
            await processAudio(audioBlob)
          }
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
      setListening(true)
      setRecordingDuration(0)
      
      // 정확한 녹음 시작 시간 기록
      recordingStartTimeRef.current = Date.now()

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

  const processVadUtterances = async () => {
    setIsProcessing(true)
    
    try {
      const currentUtterances = vadUtterancesRef.current
      if (currentUtterances.length === 0) {
        throw new Error("발화 구간이 감지되지 않았습니다.")
      }

      // 발화 구간들을 시간 순서로 정렬
      const sortedUtterances = [...currentUtterances].sort((a, b) => a.timestamp - b.timestamp)
      
      // 각 발화 구간을 STT 처리
      const sttPromises = sortedUtterances.map(async (utterance) => {
        try {
          const response = await fetch(utterance.url)
          const blob = await response.blob()
          const sttResponse = await apiClient.stt(blob, { 
            language: "ko",
            prompt: "한국어 대화 연습" 
          })
          return sttResponse.text.trim()
        } catch (error) {
          console.error('STT error for utterance:', error)
          return ""
        }
      })

      const sttResults = await Promise.all(sttPromises)
      const combinedText = sttResults.filter(text => text.length > 0).join(" ")
      
      if (!combinedText) {
        throw new Error("음성을 인식할 수 없습니다. 다시 시도해주세요.")
      }

      // STT 완료 후 즉시 처리 상태 해제
      setIsProcessing(false)

      // Update user message
      
      setMessages(prev => {
        let messageUpdated = false
        const updatedMessages = prev.map(msg => {
          if (!messageUpdated && msg.role === "user" && msg.isWaiting) {
            
            messageUpdated = true
            return { ...msg, text: combinedText, isWaiting: false }
          }
          return msg
        })
        
        return updatedMessages
      })

      // 나머지 처리는 기존 processAudio와 동일
      await processChatLogic(combinedText)

    } catch (error) {
      console.error("Error processing VAD utterances:", error)
      setIsProcessing(false)
      alert(error instanceof Error ? error.message : "VAD 발화 구간 처리 중 오류가 발생했습니다.")
    }
  }

  const processChatLogic = async (userText: string) => {
    
    
    // Format user message with current task FIRST
    const taskKo = currentTask?.ko ?? (scenario?.tasks?.[currentTaskIndex]?.ko as string | undefined)
    
    const formattedUserMessage = taskKo 
      ? `current task: ${taskKo}, user_message: ${userText}`
      : userText
    
    
    // Update the last waiting message with the FORMATTED text (so it persists in memoryHistory)
    // Store raw userText in displayText for UI display
    setMessages(prev => {
      let messageUpdated = false
      return prev.map(msg => {
        if (!messageUpdated && msg.role === "user" && msg.isWaiting) {
          messageUpdated = true
          return { ...msg, text: formattedUserMessage, displayText: userText, isWaiting: false }
        }
        return msg
      })
    })
    
    // Step 2: Prepare shared conversation snapshot
    const memoryHistoryAll = messages
      .filter(msg => !msg.isWaiting && msg.text)
      .map(msg => ({ role: msg.role, text: msg.isFeedback ? `feedback: ${msg.text}` : msg.text }))
    // Drop the last user turn if it equals the raw userText, so the formatted userMessage becomes the final turn
    const memoryHistory = (() => {
      const last = memoryHistoryAll[memoryHistoryAll.length - 1]
      if (last && last.role === 'user' && String(last.text).trim() === String(userText).trim()) {
        return memoryHistoryAll.slice(0, -1)
      }
      return memoryHistoryAll
    })()

    const chatPayload = {
      sessionId,
      userMessage: formattedUserMessage,
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

    // Step 3: Assistant response (validated shape)
      let unifiedResponse: { 
        msg: string | null; 
        show_msg: boolean; 
        feedback: string | null;
        task_success?: boolean[];
      } | undefined
    
    try {
      // Single API call for unified response
      
      unifiedResponse = await apiClient.chatAssistant(chatPayload).catch((e) => {
        console.error("Assistant error", e)
        return { 
          msg: null, 
          show_msg: false, 
          feedback: "죄송합니다. 오류가 발생했습니다. 다시 시도해주세요.",
        }
      })

      // Handle unified response
      if (unifiedResponse?.show_msg && unifiedResponse?.msg) {
        // Show assistant message and play TTS
        setAgentSpeaking(true)
        setMessages(prev => {
          const newMessage = { 
            id: `assistant-${Date.now()}`, 
            role: "assistant" as const, 
            text: unifiedResponse?.msg!,
            translateEn: undefined // Will be handled by TTS translation if needed
          }
          return [...prev, newMessage]
        })

        // Assistant 응답 시 힌트 자동 숨김
        setShowHint(false)

        // Stream TTS for the entire text as a single audio stream
        try {
          const audioUrl = await apiClient.getOrCreateTtsObjectUrl(unifiedResponse.msg, {
            sessionId,
            voice: scenario.ttsVoice || "nova",
            format: "mp3",
            instructions: scenario.ttsInstructions,
          })
          const audio = new Audio(audioUrl)
          audioRef.current = audio
          await new Promise<void>((resolve) => {
            audio.onended = () => {
              setAgentSpeaking(false)
              resolve()
            }
            audio.onerror = () => {
              setAgentSpeaking(false)
              resolve()
            }
            audio.play().catch(() => {
              setAgentSpeaking(false)
              resolve()
            })
          })
        } catch (e) {
          console.error("TTS error:", e)
          setAgentSpeaking(false)
        }
      }

      // Latch per-task successes if provided and non-empty
      if (Array.isArray(unifiedResponse?.task_success) && unifiedResponse!.task_success!.length > 0) {
        latchTaskSuccesses(unifiedResponse!.task_success!)
      }

      // Show feedback message if available (regardless of show_msg value)
      if (unifiedResponse?.feedback) {
        const feedback = unifiedResponse.feedback
        setMessages(prev => prev.concat([{ 
          id: `feedback-${Date.now()}`, 
          role: "assistant", 
          text: feedback as string,
          isFeedback: true
        }]))
      }

    } catch (e) {
      console.error("Unified execution error", e)
      setAgentSpeaking(false)
    } finally {
      setMessages(prev => prev.concat([{ id: `user-waiting-${Date.now()}`, role: "user", text: "", isWaiting: true }]))
    }

    // Attempts increment: only if task_success exists and current task remains incomplete
    if (Array.isArray(unifiedResponse?.task_success) && unifiedResponse!.task_success!.length > currentTaskIndex) {
      const arr = unifiedResponse!.task_success!
      const stillIncomplete = arr[currentTaskIndex] === false
      if (stillIncomplete) incrementAttempts()
    }
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
      
      setMessages(prev => {
        let messageUpdated = false
        const updatedMessages = prev.map(msg => {
          // Update the first waiting user message (only once)
          if (!messageUpdated && msg.role === "user" && msg.isWaiting) {
            
            messageUpdated = true
            return { ...msg, text: userText, isWaiting: false }
          }
          return msg
        })
        
        return updatedMessages
      })

      // 나머지 처리는 공통 로직 사용
      await processChatLogic(userText)

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
      // Format user message with current task FIRST
      const taskKo = currentTask?.ko ?? (scenario?.tasks?.[currentTaskIndex]?.ko as string | undefined)
      
      const formattedUserMessage = taskKo 
        ? `current task: ${taskKo}, user_message: ${userText}`
        : userText
      

      // Update user message with the FORMATTED text (so it persists in memoryHistory)
      // Store raw userText in displayText for UI display
      setMessages(prev => {
        let messageUpdated = false
        const updatedMessages = prev.map(msg => {
          if (!messageUpdated && msg.role === "user" && msg.isWaiting) {
            messageUpdated = true
            return { ...msg, text: formattedUserMessage, displayText: userText, isWaiting: false }
          }
          return msg
        })
        return updatedMessages
      })

      // Prepare conversation snapshot
      const memoryHistoryAll = messages
        .filter(msg => !msg.isWaiting && msg.text)
        .map(msg => ({ role: msg.role, text: msg.isFeedback ? `feedback: ${msg.text}` : msg.text }))
      const memoryHistory = (() => {
        const last = memoryHistoryAll[memoryHistoryAll.length - 1]
        if (last && last.role === 'user' && String(last.text).trim() === String(userText).trim()) {
          return memoryHistoryAll.slice(0, -1)
        }
        return memoryHistoryAll
      })()

      const chatPayload = {
        sessionId,
        userMessage: formattedUserMessage,
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

      // Assistant response (validated shape)
      let unifiedResponse: { 
        msg: string | null; 
        show_msg: boolean; 
        feedback: string | null;
        task_success?: boolean[];
      } | undefined
      
      try {
        // Single API call for unified response
        
        unifiedResponse = await apiClient.chatAssistant(chatPayload).catch((e) => {
          console.error("Assistant error", e)
          return { 
            msg: null, 
            show_msg: false, 
            feedback: "죄송합니다. 오류가 발생했습니다. 다시 시도해주세요.",
          }
        })

        // Handle unified response
        if (unifiedResponse?.show_msg && unifiedResponse?.msg) {
          setAgentSpeaking(false)
          setMessages(prev => prev.concat([{ 
            id: `assistant-${Date.now()}`, 
            role: "assistant", 
            text: unifiedResponse?.msg!,
            translateEn: undefined
          }]))
          setShowHint(false)
        }

        // Show feedback message if available (regardless of show_msg value)
        if (unifiedResponse?.feedback) {
          const feedback = unifiedResponse.feedback
          setMessages(prev => prev.concat([{ 
            id: `feedback-${Date.now()}`, 
            role: "assistant", 
            text: feedback as string,
            isFeedback: true
          }]))
        }
        
        // Latch per-task successes if provided
        if (Array.isArray(unifiedResponse?.task_success)) {
          latchTaskSuccesses(unifiedResponse!.task_success!)
        }


      } catch (e) {
        console.error("Unified execution error", e)
        setAgentSpeaking(false)
      } finally {
        setMessages(prev => prev.concat([{ id: `user-waiting-${Date.now()}`, role: "user", text: "", isWaiting: true }]))
      }

      // Attempts increment: only if task_success exists and current task remains incomplete
      if (Array.isArray(unifiedResponse?.task_success)) {
        const arr = unifiedResponse!.task_success!
        const stillIncomplete = arr[currentTaskIndex] === false
        if (stillIncomplete) incrementAttempts()
      }

    } catch (error) {
      console.error("Error sending typed message:", error)
      alert(error instanceof Error ? error.message : "텍스트 처리 중 오류가 발생했습니다.")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleMicPress = useCallback(() => {
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
  }, [textOnlyMode, isAgentSpeaking, isRecording, isProcessing])


  const handleHint = useCallback(async () => {
    const next = !showHint
    setShowHint(next)
    if (!next) return
    
    // If we already have a hint for THIS task index, do not refetch
    if (hint && hintTaskIndex === currentTaskIndex) {
      
      return
    }
    try {
      setIsHintLoading(true)
      const memoryHistory = messages
        .filter(msg => !msg.isWaiting && msg.text)
        .map(msg => ({ 
          role: msg.role, 
          text: msg.isFeedback ? `feedback: ${msg.text}` : msg.text 
        }))
      const lastUserText = messages.findLast?.((m) => m.role === 'user' && !m.isWaiting && !!m.text)?.text || typedMessage || ''
      const taskKo = currentTask?.ko ?? (scenario?.tasks?.[currentTaskIndex]?.ko as string | undefined)
      const formattedHintUserMessage = taskKo 
        ? `current task: ${taskKo}, user_message: ${lastUserText}`
        : lastUserText

      const payload = {
        sessionId,
        userMessage: formattedHintUserMessage,
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
      
      const res = await apiClient.chatHint(payload as any)
      setHint(res.hint)
      setHintTranslateEn(res.hintTranslateEn || null)
      setHintTaskIndex(currentTaskIndex)
      
    } catch (e) {
      console.error("Hint request failed", e)
    } finally {
      setIsHintLoading(false)
    }
  }, [showHint, hint, hintTaskIndex, currentTaskIndex, messages, typedMessage, sessionId, scenario, progress, currentTask])

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
        voice: scenario.ttsVoice || "nova",
        format: "mp3",
        instructions: scenario.ttsInstructions,
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

  const handleEvaluationPopupClose = () => {
    setShowEvaluationPopup(false)
    setEvaluationData(null)
  }

  const handleMessageTranslationClick = async (messageId: string, text: string) => {
    if (translatingMessageId === messageId) return
    
    try {
      setTranslatingMessageId(messageId)
      const response = await apiClient.translate({ text, targetLanguage: "en" })
      
      // Update the message with translation
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, translateEn: response.translateEn, translation: response.translateEn }
          : msg
      ))
      // Ensure visibility even if global toggle was off
      setShowAssistantTranslation(true)
    } catch (error) {
      console.error("Translation error:", error)
    } finally {
      setTranslatingMessageId(null)
    }
  }

  const handleHintTranslationClick = async () => {
    if (!hint) return
    
    // 이미 번역이 있고 표시 중이면 토글
    if (hintTranslateEn && showHintTranslation) {
      setShowHintTranslation(false)
      return
    }
    
    // 번역이 없으면 API 호출
    if (!hintTranslateEn) {
      try {
        setIsHintTranslating(true)
        const response = await apiClient.translate({ 
          text: hint, 
          targetLanguage: "en" 
        })
        setHintTranslateEn(response.translateEn)
        setShowHintTranslation(true)
      } catch (error) {
        console.error("Hint translation error:", error)
      } finally {
        setIsHintTranslating(false)
      }
    } else {
      // 번역이 있으면 토글
      setShowHintTranslation(!showHintTranslation)
    }
  }


  const AudioVisualization = useMemo(() => (
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
  ), [])

  // Local header components: TaskRail

  const TaskRail = useMemo(() => (
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
          onClick={() => setShowAssistantTranslation(!showAssistantTranslation)}
          aria-pressed={showAssistantTranslation}
          title="Toggle translation"
        >
          <Languages className="w-4 h-4" />
        </Button>
      </div>
      {showAssistantTranslation && currentTask?.en && (
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
  ), [currentTask, progress, showAssistantTranslation, currentTaskIndex])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Sticky Header (Header + Task Rail) */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
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

        {/* Task Rail Header */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`task-rail-${currentTaskIndex}-${progress.completed}-${progress.total}`}
            className="px-4 py-3 bg-muted/20"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              {TaskRail}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Messages Container */}
      <div className="flex-1 px-4 py-6 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-4">
          <AnimatePresence>
            {messages.map((message) => {
              // 피드백 메시지는 가운데 정렬로 별도 렌더링
              if (message.isFeedback) {
                return (
                  <motion.div
                    key={message.id}
                    className="flex justify-center"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="max-w-[80%] md:max-w-[70%]">
                      <Card className="bg-amber-50 border-amber-200 border-2">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                            <span className="text-xs font-medium text-amber-700">Feedback</span>
                          </div>
                          <p className="text-sm font-medium text-amber-900">{message.text}</p>
                        </CardContent>
                      </Card>
                    </div>
                  </motion.div>
                )
              }
              
              // 일반 메시지 렌더링
              return (
                <motion.div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className={`max-w-[80%] md:max-w-[70%] ${message.role === "user" ? "order-2" : "order-1"}`}>
                  <Card className={`${
                    message.role === "user" 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-card"
                  }`}>
                    <CardContent className="p-4">
                      {message.role === "assistant" ? (
                        <>
                          <p className="font-medium mb-3">{message.text}</p>
                          {(showAssistantTranslation || !!message.translateEn) && (message.translation || message.translateEn) && (
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
                                    voice: scenario.ttsVoice || "nova",
                                    format: "mp3",
                                    instructions: scenario.ttsInstructions,
                                  })
                                  const audio = new Audio(audioUrl)
                                  audio.play().catch(() => {})
                                } catch {}
                              }}
                            >
                              <Volume2 className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="p-1.5 h-auto" 
                              onClick={() => handleMessageTranslationClick(message.id, message.text)}
                              disabled={translatingMessageId === message.id}
                            >
                              {translatingMessageId === message.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Languages className="w-4 h-4" />
                              )}
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
                              {AudioVisualization}
                            </>
                          )}
                          {isProcessing && (
                            <div className="flex items-center justify-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span className="text-sm opacity-70">Processing...</span>
                            </div>
                          )}
                          {message.text && !message.isWaiting && !message.isCancelled && (
                            <p className="font-medium">{message.displayText || message.text}</p>
                          )}
                          {message.text && message.isWaiting && isProcessing && (
                            <p className="font-medium opacity-70">{message.displayText || message.text}</p>
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
              )
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* VAD Error Display - 단순화 */}
      <AnimatePresence>
        {vadErrorMessage && (
          <motion.div
            className="px-4 pb-2"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="max-w-2xl mx-auto">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-white"></div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-900">음성 인식 경고</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      고급 음성 인식 기능이 비활성화되었습니다. 전체 오디오로 처리됩니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                    <p className="text-sm font-medium text-blue-900">Feedback</p>
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
                    {showHintTranslation && hintTranslateEn && (
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
                      onClick={handleHintTranslationClick}
                      disabled={isHintTranslating}
                    >
                      {isHintTranslating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Languages className="w-4 h-4" />
                      )}
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
                scale: isRecording ? [1, 1.1, 1] : showInitialMicPrompt ? [1, 1.05, 1] : 1,
              }}
              transition={{
                duration: 1,
                repeat: isRecording ? Infinity : showInitialMicPrompt ? Infinity : 0,
              }}
              className="relative"
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
                    : showInitialMicPrompt
                    ? "bg-primary hover:bg-primary/90 shadow-lg shadow-primary/50 ring-2 ring-primary/30"
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
              
              {/* 마이크 안내 메시지 */}
              <AnimatePresence>
                {showInitialMicPrompt && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                    className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 whitespace-nowrap text-sm font-medium"
                  >
                    Click the microphone to start conversation
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white dark:border-t-gray-800"></div>
                  </motion.div>
                )}
              </AnimatePresence>
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

      {/* Evaluation Loading Overlay */}
      <EvaluationLoading isVisible={isEvaluating} />

      {/* Evaluation Results Popup */}
      <EvaluationResultsPopup
        isOpen={showEvaluationPopup}
        onClose={handleEvaluationPopupClose}
        evaluationData={evaluationData}
        isLoading={isEvaluating}
      />
    </div>
  )
}
