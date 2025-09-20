"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Volume2, Languages, Eye, Bookmark, Mic, X, ArrowUp, Settings, Lightbulb, Send } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useVad } from "@/hooks/use-vad"
import { useConversation } from "@/contexts/ConversationContext"
import { useAudioUI } from "@/hooks/use-audio-ui"
import { CSSAudioVisualizer, MicrophoneVisualFeedback } from "@/components/ui/css-audio-visualizer"
import type { Scenario } from "@/lib/scenarios"
import { runAllTests } from "@/lib/test-functions"
import { activeSTTService, activeChatService2, serviceInfo, getServerStatus } from "@/lib/config/api-config"
import { audioRecorder, convertWebMToWav } from "@/lib/test-audio"
import { activeTtsService } from "@/lib/services/tts-service"
import { useErrorHandler } from "@/hooks/use-error-handler"
import { ErrorList, ErrorToast } from "@/components/ui/error-display"
import { useProgressTracker } from "@/hooks/use-progress-tracker"
import { ProgressOverview, TaskListProgress, SessionComplete } from "@/components/ui/progress-display"

interface ConversationPracticeProps {
  scenario: Scenario
  onBack: () => void
}

export function ConversationPractice({ scenario, onBack }: ConversationPracticeProps) {
  const { state, dispatch, getCurrentTask, isTaskCompleted } = useConversation()
  const vad = useVad()
  const audioUI = useAudioUI()
  const [showTranslation, setShowTranslation] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showTestPanel, setShowTestPanel] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [testText, setTestText] = useState('')
  const [serverStatus, setServerStatus] = useState<{connected: boolean, url: string, timestamp: string} | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  // 에러 처리 훅
  const errorHandler = useErrorHandler({
    onError: (error) => {
      console.error(`[ERROR] ${error.type}:`, error.message)
      // 중요한 에러는 처리 상태 해제
      if (['stt', 'chat', 'tts'].includes(error.type)) {
        setIsProcessing(false)
        setIsPlaying(false)
      }
      // 에러를 진행도 추적에 기록
      const currentTaskId = progressTracker.currentTask?.id
      if (currentTaskId) {
        progressTracker.recordError(currentTaskId, error.message)
      }
    },
    onRetrySuccess: (error) => {
      console.log(`[RETRY SUCCESS] ${error.type}:`, error.message)
    },
    onRetryFailed: (error) => {
      console.error(`[RETRY FAILED] ${error.type}:`, error.message)
    }
  })

  // 진행도 추적 훅 - 콜백 최적화
  const onTaskComplete = React.useCallback((taskId: string, score: number) => {
    console.log(`🎯 Task completed: ${taskId} with score ${score}`)
    // 성공 피드백 표시 (필요시)
  }, [])

  const onTaskFail = React.useCallback((taskId: string, attempts: number) => {
    console.log(`💥 Task failed: ${taskId} after ${attempts} attempts`)
    // 실패 피드백 표시 (필요시)
  }, [])

  const onSessionComplete = React.useCallback((metrics: any) => {
    console.log(`🏆 Session completed! Metrics:`, metrics)
    // 세션 완료 축하 메시지
  }, [])

  const progressTracker = useProgressTracker({
    scenario,
    onTaskComplete,
    onTaskFail,
    onSessionComplete
  })

  const currentTask = getCurrentTask()
  
  // 서버 상태 체크
  const checkServer = async () => {
    const status = await getServerStatus()
    setServerStatus(status)
    console.log('🔍 Server Status:', status)
  }

  // 컴포넌트 마운트 시 서버 상태 확인
  useEffect(() => {
    if (showTestPanel) {
      checkServer()
    }
  }, [showTestPanel])

  // 테스트 함수
  const handleRunTests = async () => {
    console.log('🧪 Starting Component Tests...')
    await checkServer() // 서버 상태도 함께 체크
    const results = await runAllTests()
    alert('테스트 완료! 콘솔을 확인하세요.')
  }

  // 실제 음성 녹음 테스트
  const handleStartRecording = async () => {
    try {
      console.log('🎤 Starting real audio recording...')
      const initialized = await audioRecorder.initialize()
      
      if (!initialized) {
        alert('마이크 권한이 필요합니다. 브라우저 설정을 확인해주세요.')
        return
      }

      await audioRecorder.startRecording()
      setIsRecording(true)
      setRecordingDuration(0)

      // 녹음 시간 카운터
      const interval = setInterval(() => {
        setRecordingDuration(prev => prev + 1)
      }, 1000)

      // 5초 후 자동 정지
      setTimeout(async () => {
        clearInterval(interval)
        await handleStopRecording()
      }, 5000)

    } catch (error) {
      console.error('❌ Failed to start recording:', error)
      alert('녹음을 시작할 수 없습니다: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  const handleStopRecording = async () => {
    try {
      console.log('⏹️ Stopping recording...')
      const webmBlob = await audioRecorder.stopRecording()
      setIsRecording(false)
      setRecordingDuration(0)

      console.log('🔄 Converting to WAV...')
      const wavBlob = await convertWebMToWav(webmBlob)

      console.log('🎤 Testing STT with real audio...')
      setIsProcessing(true)

      const sttResult = await activeSTTService.transcribeSegment(wavBlob, {
        language: 'ko',
        prompt: '커피숍에서 주문하는 상황입니다.',
        durationMs: 5000
      })

      console.log('✅ Real STT Result:', sttResult)
      
      if (sttResult.text.trim()) {
        // STT 결과를 대화에 추가
        dispatch({ type: 'ADD_MESSAGE', payload: { role: 'user', text: sttResult.text } })
        
        // Chat API 테스트
        await testChatWithRealText(sttResult.text)
      } else {
        alert('음성을 인식하지 못했습니다. 다시 시도해주세요.')
        setIsProcessing(false)
      }

    } catch (error) {
      console.error('❌ Recording test failed:', error)
      alert('녹음 테스트 실패: ' + (error instanceof Error ? error.message : String(error)))
      setIsRecording(false)
      setIsProcessing(false)
    } finally {
      audioRecorder.cleanup()
    }
  }

  const testChatWithRealText = async (userText: string) => {
    try {
      console.log('🤖 Testing Chat API with real text:', userText)
      
      const currentTask = state.scenario.tasks.find(task => 
        task.id === state.userState.currentTaskId
      ) || state.scenario.tasks[0]
      
      const chatHistory = state.history.slice(-6).map(msg => ({
        role: msg.role,
        text: msg.text
      }))
      
      const turnResult = await activeChatService2.sendStructuredMessage(
        userText,
        state.scenario,
        currentTask,
        {
          sessionId: 'real-test-session',
          memoryHistory: chatHistory
        }
      )
      
      console.log('🎯 Real Chat Result:', turnResult)
      
          // 에이전트 응답 추가
          dispatch({ 
            type: 'ADD_MESSAGE', 
            payload: { 
              role: 'assistant', 
              text: turnResult.speech,
              ...(turnResult.feedback && { hint: turnResult.feedback })
            } 
          })
          
          // TTS로 에이전트 응답 재생 (에러 처리 포함)
          try {
            console.log('🔊 Starting TTS for agent response...')
            setIsPlaying(true)
            
            // Speaking Gate 활성화 (VAD 입력 차단)
            vad.setSpeakingGate(true)
            
            await errorHandler.executeWithErrorHandling(
              () => activeTtsService.speakText({
                sessionId: 'real-test-session',
                text: turnResult.speech,
                voice: 'alloy',
                format: 'mp3'
              }),
              'tts',
              { text: turnResult.speech.substring(0, 50) }
            )
            
            console.log('✅ TTS playback completed')
            setIsPlaying(false)
            
            // Speaking Gate 비활성화 (VAD 입력 허용)
            vad.setSpeakingGate(false)
            
          } catch (ttsError) {
            console.error('❌ TTS playback failed:', ttsError)
            setIsPlaying(false)
            // 에러 시에도 Speaking Gate 비활성화
            vad.setSpeakingGate(false)
          }
          
          // 작업 상태 업데이트
          if (turnResult.taskStatus === 'success' && turnResult.shouldEnd) {
            dispatch({ 
              type: 'UPDATE_TASK_STATUS', 
              payload: { 
                taskId: currentTask.id, 
                status: 'completed' 
              } 
            })
            console.log('🎉 Task completed with real API!')
          }

          setIsProcessing(false)
      
    } catch (error) {
      console.error('❌ Real Chat test failed:', error)
      dispatch({ type: 'ADD_MESSAGE', payload: { 
        role: 'assistant', 
        text: '죄송합니다. 응답 생성 중 오류가 발생했습니다: ' + (error instanceof Error ? error.message : String(error))
      } })
      setIsProcessing(false)
    }
  }

  // 텍스트로 Chat API 테스트
  const handleTestChatWithText = async () => {
    if (!testText.trim()) {
      alert('테스트할 텍스트를 입력해주세요.')
      return
    }

    setIsProcessing(true)
    await testChatWithRealText(testText.trim())
    setTestText('')
  }

  // TTS 단독 테스트
  const handleTestTts = async () => {
    if (!testText.trim()) {
      alert('TTS 테스트할 텍스트를 입력해주세요.')
      return
    }

    try {
      setIsPlaying(true)
      console.log('🔊 Testing TTS with text:', testText)
      
      // Speaking Gate 활성화 (VAD 입력 차단)
      vad.setSpeakingGate(true)
      
      await activeTtsService.speakText({
        sessionId: 'tts-test-session',
        text: testText,
        voice: 'alloy',
        format: 'mp3'
      })
      
      console.log('✅ TTS test completed')
      setIsPlaying(false)
      
      // Speaking Gate 비활성화 (VAD 입력 허용)
      vad.setSpeakingGate(false)
      
    } catch (error) {
      console.error('❌ TTS test failed:', error)
      alert('TTS 테스트 실패: ' + (error instanceof Error ? error.message : String(error)))
      setIsPlaying(false)
      // 에러 시에도 Speaking Gate 비활성화
      vad.setSpeakingGate(false)
    }
  }
  
  // VAD 이벤트를 AudioUI로 전달 (렌더링 트리거 안함)
  useEffect(() => {
    audioUI.updateVadData(vad.level, vad.probability, vad.isSpeaking)
  }, [vad.level, vad.probability, vad.isSpeaking, audioUI.updateVadData])

  // VAD 상태 변화를 AudioUI에 반영
  useEffect(() => {
    if (vad.state === 'listening') {
      audioUI.setAudioState('listening')
    } else if (vad.state === 'idle') {
      audioUI.setAudioState('idle')
    }
  }, [vad.state, audioUI.setAudioState])

  // 세그먼트 상태를 AudioUI에 반영
  useEffect(() => {
    audioUI.setHasSegments(state.segments.length > 0)
  }, [state.segments.length, audioUI.setHasSegments])

  // VAD 이벤트 처리 (발화 완료)
  useEffect(() => {
    if (vad.lastUtterance) {
      dispatch({
        type: 'ADD_SEGMENT',
        payload: {
          wavBlob: new Blob([]), // VAD에서 받은 wav blob 사용
          durationMs: vad.lastUtterance.durationMs
        }
      })
    }
  }, [vad.lastUtterance, dispatch])

  // VAD 상태와 컨텍스트 상태 동기화
  useEffect(() => {
    dispatch({ type: vad.state === 'listening' ? 'START_LISTENING' : 'STOP_LISTENING' })
  }, [vad.state, dispatch])

  // Speaking gate 관리
  useEffect(() => {
    vad.setSpeakingGate(state.isSpeaking)
  }, [state.isSpeaking, vad])

  // 메시지 타입 정의
  type MessageType = {
    id: string
    text: string
    isUser: boolean
    translation?: string
    isWaiting?: boolean
    hint?: string
  }

  // 메시지 생성 (히스토리 + 현재 상태) - 최적화된 버전
  const messages: MessageType[] = useMemo(() => [
    ...state.history.map((msg, idx) => ({
      id: `history-${idx}`,
      text: msg.text,
      isUser: msg.role === 'user',
      translation: msg.role === 'assistant' ? msg.text : undefined
    })),
    // 현재 사용자 입력 대기 상태
    {
      id: 'current-input',
      text: state.segments.map(s => s.sttText).filter(Boolean).join(' ') || '',
      isUser: true,
      isWaiting: state.segments.length === 0 && !state.isListening,
      hint: currentTask?.en || 'Try speaking in Korean'
    }
  ], [state.history, state.segments, state.isListening, currentTask?.en])

  const handleMicPress = async () => {
    if (vad.state === 'listening') {
      vad.stop()
    } else {
      await vad.start()
    }
  }

  const handleSendSegments = async () => {
    if (state.segments.length === 0) return
    
    setIsProcessing(true)
    try {
      console.log('🎤 Processing segments:', state.segments.length)
      
      // 1. STT API로 세그먼트들을 텍스트로 변환 (에러 처리 포함)
      const transcriptionResults = await errorHandler.executeWithErrorHandling(
        () => activeSTTService.transcribeSegments(
          state.segments.map(segment => ({
            id: segment.id,
            audioBlob: segment.wavBlob,
            durationMs: segment.durationMs
          })),
          {
            language: 'ko',
            prompt: `커피숍에서 주문하는 상황입니다. 다음 제약사항이 있습니다: 가격 제한 ${state.scenario.constraints.priceLimit}원, 금지 음료: ${state.scenario.constraints.bannedDrinks?.join(', ')}, 선호 음료: ${state.scenario.constraints.preferred?.join(', ')}`
          }
        ),
        'stt',
        { segmentsCount: state.segments.length }
      )
      
      // 2. STT 결과를 세그먼트에 업데이트
      transcriptionResults.forEach(result => {
        if (result.text && !result.error) {
          dispatch({
            type: 'UPDATE_SEGMENT_STT',
            payload: {
              segmentId: result.id,
              sttText: result.text
            }
          })
        }
      })
      
      // 3. 성공한 전사 결과들을 병합
      const userText = activeSTTService.mergeTranscriptions(transcriptionResults)
      
      if (userText.trim()) {
        console.log('📝 User message:', userText)
        dispatch({ type: 'ADD_MESSAGE', payload: { role: 'user', text: userText } })
        
        // 4. 구조화된 Chat API 호출
        try {
          console.log('🤖 Calling structured chat API...')
          
          const currentTask = state.scenario.tasks.find(task => 
            task.id === state.userState.currentTaskId
          ) || state.scenario.tasks[0]
          
          const chatHistory = state.history.slice(-6).map(msg => ({
            role: msg.role,
            text: msg.text
          }))
          
          const turnResult = await errorHandler.executeWithErrorHandling(
            () => activeChatService2.sendStructuredMessage(
              userText,
              state.scenario,
              currentTask,
              {
                sessionId: 'mock-session-id', // TODO: 실제 세션 ID 사용
                memoryHistory: chatHistory
              }
            ),
            'chat',
            { userText, taskId: currentTask.id }
          )
          
          console.log('🎯 Turn result:', turnResult)
          
          // 5. 에이전트 응답 추가
          dispatch({ 
            type: 'ADD_MESSAGE', 
            payload: { 
              role: 'assistant', 
              text: turnResult.speech,
              ...(turnResult.feedback && { hint: turnResult.feedback }),
              ...(turnResult.shouldEnd && { isWaiting: false })
            } 
          })
          
          // 6. 진행도 추적에 대화 기록
          progressTracker.addConversationEntry('user', userText, currentTask.id)
          progressTracker.addConversationEntry('assistant', turnResult.speech, currentTask.id)
          
          // 7. 진행도 추적으로 작업 완료 처리
          progressTracker.completeTask(currentTask.id, {
            taskStatus: turnResult.taskStatus,
            score: turnResult.score,
            feedback: turnResult.feedback
          })
          
          // 8. 기존 상태 관리도 유지 (호환성)
          if (turnResult.taskStatus === 'success' && turnResult.shouldEnd) {
            dispatch({ 
              type: 'UPDATE_TASK_STATUS', 
              payload: { 
                taskId: currentTask.id, 
                status: 'completed' 
              } 
            })
            console.log('🎉 Task completed!')
          } else if (turnResult.taskStatus === 'failed') {
            dispatch({ 
              type: 'UPDATE_TASK_STATUS', 
              payload: { 
                taskId: currentTask.id, 
                status: 'failed' 
              } 
            })
          }
          
          // TTS로 에이전트 응답 재생
          try {
            console.log('🔊 Starting TTS for agent response...')
            setIsPlaying(true)
            
            // Speaking Gate 활성화 (VAD 입력 차단)
            vad.setSpeakingGate(true)
            
            await errorHandler.executeWithErrorHandling(
              () => activeTtsService.speakText({
                sessionId: 'mock-session-id',
                text: turnResult.speech,
                voice: 'alloy',
                format: 'mp3'
              }),
              'tts',
              { text: turnResult.speech.substring(0, 50) }
            )
            
            console.log('✅ TTS playback completed')
            setIsPlaying(false)
            
            // Speaking Gate 비활성화 (VAD 입력 허용)
            vad.setSpeakingGate(false)
            
          } catch (ttsError) {
            console.error('❌ TTS playback failed:', ttsError)
            setIsPlaying(false)
            // 에러 시에도 Speaking Gate 비활성화
            vad.setSpeakingGate(false)
          }
          
          setIsProcessing(false)
          
        } catch (chatError) {
          console.error('❌ Chat API failed:', chatError)
          dispatch({ type: 'ADD_MESSAGE', payload: { 
            role: 'assistant', 
            text: '죄송합니다. 응답 생성 중 오류가 발생했습니다. 다시 시도해주세요.' 
          } })
          setIsProcessing(false)
        }
      } else {
        console.warn('⚠️ No valid transcription results')
        dispatch({ type: 'ADD_MESSAGE', payload: { 
          role: 'assistant', 
          text: '죄송합니다. 음성을 인식하지 못했습니다. 다시 시도해주세요.' 
        } })
        setIsProcessing(false)
      }
      
      // 4. 처리된 세그먼트들 정리
      dispatch({ type: 'CLEAR_SEGMENTS' })
      
    } catch (error) {
      console.error('❌ STT Processing failed:', error)
      dispatch({ type: 'ADD_MESSAGE', payload: { 
        role: 'assistant', 
        text: '음성 처리 중 오류가 발생했습니다. 다시 시도해주세요.' 
      } })
      setIsProcessing(false)
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

  // CSS 기반 오디오 시각화 (VAD 렌더링 의존성 제거)
  const AudioVisualization = React.memo(() => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <CSSAudioVisualizer 
        isActive={audioUI.isRecentlyActive()} 
        variant="wave" 
      />
    </motion.div>
  ))

  const SegmentsList = React.memo(() => (
    <div className="space-y-2 mb-4">
      {state.segments.map((segment, idx) => (
        <motion.div
          key={segment.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-2 bg-muted rounded-lg text-sm"
        >
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span>세그먼트 {idx + 1} ({Math.round(segment.durationMs / 1000)}초)</span>
          {segment.sttText && <span className="text-muted-foreground">: {segment.sttText}</span>}
        </motion.div>
      ))}
    </div>
  ))

  // 메시지 컴포넌트 최적화
  const MessageItem = React.memo(({ message, index }: { message: MessageType; index: number }) => (
    <motion.div
      key={message.id}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{
        duration: 0.2,
        ease: "easeOut"
      }}
      className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}
    >
      <div className={`max-w-[80%] md:max-w-[70%] ${message.isUser ? "order-2" : "order-1"}`}>
        <motion.div
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <Card className={`${message.isUser ? "bg-primary text-primary-foreground" : "bg-card"} 
            ${message.isUser ? "shadow-lg shadow-primary/20" : "shadow-md"} 
            transition-shadow duration-300`}>
            <CardContent className="p-4">
              {!message.isUser ? (
                <>
                  <p className="font-medium mb-3">{message.text}</p>
                  {showTranslation && <p className="text-sm opacity-70 mb-3">{message.translation}</p>}
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="p-1.5 h-auto">
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
                  {message.isWaiting && !state.isListening && state.segments.length === 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm opacity-70">Press Record</span>
                      <Button variant="ghost" size="sm" className="p-1.5 h-auto" onClick={handleHint}>
                        <Lightbulb className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  
                  {state.segments.length > 0 && (
                    <>
                      <SegmentsList />
                      <div className="flex items-center justify-center gap-2">
                        <Button 
                          onClick={handleSendSegments}
                          disabled={isProcessing}
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          <Send className="w-4 h-4" />
                          {isProcessing ? 'Processing...' : 'Send'}
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => dispatch({ type: 'CLEAR_SEGMENTS' })}
                          size="sm"
                        >
                          Clear
                        </Button>
                      </div>
                    </>
                  )}
                  
                  <AnimatePresence>
                    {state.isListening && (
                      <>
                        <span className="text-sm opacity-70 mb-2 block">Speak now...</span>
                        <AudioVisualization />
                      </>
                    )}
                  </AnimatePresence>
                  
                  {message.text && (
                    <p className="mt-2">{message.text}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  ))

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <Button variant="ghost" size="sm" onClick={onBack} className="p-2">
          <X className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold text-balance">{scenario.title}</h1>
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="p-2"
            onClick={() => setShowTestPanel(!showTestPanel)}
            title="테스트 패널"
          >
            🧪
          </Button>
          <Button variant="ghost" size="sm" className="p-2">
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Progress */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            Tasks ({state.progress.completed}/{state.progress.total} completed)
          </span>
          <Button variant="ghost" size="sm" className="p-1">
            <div className="flex flex-col gap-0.5">
              <div className="w-3 h-0.5 bg-current"></div>
              <div className="w-3 h-0.5 bg-current"></div>
            </div>
          </Button>
        </div>
      </div>

      {/* Test Panel */}
      <AnimatePresence>
        {showTestPanel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="px-4 py-3 bg-slate-100 border-b border-slate-300 overflow-hidden"
          >
          <div className="flex items-center justify-between">
          <div className="text-sm">
            <span className="font-bold text-slate-900">🧪 테스트 패널</span>
            <p className="text-slate-700 mt-1 font-medium">구현된 기능들을 테스트합니다</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRunTests}
              className="border-blue-400 text-blue-800 hover:bg-blue-100 bg-white font-medium"
            >
              전체 테스트 실행
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleStartRecording}
              disabled={isRecording || isProcessing}
              className="border-green-400 text-green-800 hover:bg-green-100 bg-white disabled:opacity-50 font-medium"
            >
              {isRecording ? `🔴 녹음중 (${recordingDuration}s)` : '🎤 실제 음성 테스트'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => vad.setSpeakingGate(!vad.speakingGateActive)}
              className="border-orange-400 text-orange-800 hover:bg-orange-100 bg-white font-medium"
            >
              {vad.speakingGateActive ? '🔇 Gate OFF' : '🎤 Gate ON'}
            </Button>
          </div>
        </div>
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="p-3 bg-white rounded border-2 border-slate-200 shadow-sm">
              <span className="font-bold text-slate-900">VAD 상태:</span> 
              <span className="ml-2 text-slate-700 font-medium">{vad.state}</span>
            </div>
            <div className="p-3 bg-white rounded border-2 border-slate-200 shadow-sm">
              <span className="font-bold text-slate-900">Speaking Gate:</span> 
              <span className="ml-2 text-slate-700 font-medium">
                {vad.speakingGateActive ? '🔇 차단 중' : '🎤 허용'}
              </span>
            </div>
            <div className="p-3 bg-white rounded border-2 border-slate-200 shadow-sm">
              <span className="font-bold text-slate-900">세그먼트:</span> 
              <span className="ml-2 text-slate-700 font-medium">{state.segments.length}개</span>
            </div>
            <div className="p-3 bg-white rounded border-2 border-slate-200 shadow-sm">
              <span className="font-bold text-slate-900">진행도:</span> 
              <span className="ml-2 text-slate-700 font-medium">{state.progress.completed}/{state.progress.total}</span>
            </div>
            <div className="p-3 bg-white rounded border-2 border-slate-200 shadow-sm">
              <span className="font-bold text-slate-900">히스토리:</span> 
              <span className="ml-2 text-slate-700 font-medium">{state.history.length}개</span>
            </div>
            <div className="p-3 bg-white rounded border-2 border-slate-200 shadow-sm">
              <span className="font-bold text-slate-900">TTS 상태:</span> 
              <span className="ml-2 text-slate-700 font-medium">
                {isPlaying ? '🔊 재생 중' : '⏹️ 정지'}
              </span>
            </div>
            <div className="p-3 bg-white rounded border-2 border-slate-200 shadow-sm">
              <span className="font-bold text-slate-900">처리 상태:</span> 
              <span className="ml-2 text-slate-700 font-medium">
                {isProcessing ? '⚙️ 처리 중' : '✅ 대기'}
              </span>
            </div>
          </div>
          
          <div className="p-3 bg-white rounded border-2 border-blue-300 shadow-sm">
            <div className="font-bold text-blue-900 mb-2 text-sm flex items-center justify-between">
              🔧 API 서비스 정보
              <Button
                variant="outline"
                size="sm"
                onClick={checkServer}
                className="border border-blue-300 text-blue-700 hover:bg-blue-50 text-xs px-2 py-1"
              >
                서버 상태 확인
              </Button>
            </div>
            <div className="text-slate-800 space-y-1 text-sm">
              <div><span className="font-medium">STT:</span> <span className="ml-2 text-blue-700 font-semibold">{serviceInfo.stt}</span></div>
              <div><span className="font-medium">Chat:</span> <span className="ml-2 text-blue-700 font-semibold">{serviceInfo.chat}</span></div>
              <div><span className="font-medium">환경:</span> <span className="ml-2 text-slate-600">{serviceInfo.environment}</span></div>
              <div><span className="font-medium">서버 URL:</span> <span className="ml-2 text-slate-600 font-mono text-xs">{serviceInfo.serverUrl}</span></div>
              <div>
                <span className="font-medium">서버 상태:</span> 
                <span className="ml-2 font-semibold">
                  {serverStatus === null ? '⏳ 확인 중...' : 
                   serverStatus.connected ? '✅ 연결됨' : '❌ 연결 실패'}
                </span>
              </div>
              <div><span className="font-medium">API 키:</span> <span className="ml-2 text-green-700 font-semibold">{serviceInfo.hasApiKey}</span></div>
            </div>
          </div>
          
          {/* 텍스트 Chat 테스트 */}
          <div className="p-3 bg-white rounded border-2 border-green-300 shadow-sm">
            <div className="font-bold text-green-900 mb-3 text-sm">💬 Chat API 테스트</div>
            <div className="flex gap-2">
              <input
                type="text"
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                placeholder="테스트할 텍스트 입력 (예: 안녕하세요, 아메리카노 주세요)"
                className="flex-1 px-3 py-2 text-sm border-2 border-slate-300 rounded focus:border-green-400 focus:outline-none"
                disabled={isProcessing}
                onKeyPress={(e) => e.key === 'Enter' && handleTestChatWithText()}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestChatWithText}
                disabled={isProcessing || !testText.trim()}
                className="border-2 border-green-400 text-green-800 hover:bg-green-100 bg-white disabled:opacity-50 text-sm px-3 py-2 font-medium"
              >
                Chat 테스트
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestTts}
                disabled={isPlaying || !testText.trim()}
                className="border-2 border-purple-400 text-purple-800 hover:bg-purple-100 bg-white disabled:opacity-50 text-sm px-3 py-2 font-medium"
              >
                {isPlaying ? '🔊 재생 중...' : 'TTS 테스트'}
              </Button>
            </div>
          </div>
        </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 세션 완료 체크 */}
      {progressTracker.isSessionComplete ? (
        <SessionComplete
          session={progressTracker.session}
          metrics={progressTracker.metrics}
          achievementLevel={progressTracker.achievementLevel}
          onRestart={() => {
            progressTracker.resetSession()
            dispatch({ type: 'CLEAR_SEGMENTS' })
            // 히스토리는 세션 리셋으로 자동 정리됨
          }}
          onContinue={onBack}
        />
      ) : (
        <>
          {/* 진행도 개요 */}
          <div className="px-4 py-3">
            <ProgressOverview
              metrics={progressTracker.metrics}
              achievementLevel={progressTracker.achievementLevel}
            />
          </div>

          {/* 현재 작업 표시 */}
          <motion.div 
            className="px-4 py-3 bg-muted/30"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-primary-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {progressTracker.currentTask?.ko || "작업을 완료하세요"}
                </p>
                {progressTracker.currentTaskProgress && (
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span>시도 {progressTracker.currentTaskProgress.attempts}/{progressTracker.currentTaskProgress.maxAttempts}</span>
                    {progressTracker.currentTaskProgress.timeSpent > 0 && (
                      <span>• {Math.round(progressTracker.currentTaskProgress.timeSpent / 1000)}초</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}

      {/* Messages Container */}
      <div className="flex-1 px-4 py-6 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-4">
          <AnimatePresence>
            {messages.map((message, index) => (
              <MessageItem key={message.id} message={message} index={index} />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {showHint && (
        <div className="px-4 pb-4">
          <div className="max-w-2xl mx-auto">
            <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="text-sm">
                    <span className="font-medium text-primary">TRY SAYING:</span>
                    <p className="mt-1">{currentTask?.en || 'Try speaking in Korean'}</p>
                    {currentTask?.ko && (
                      <p className="mt-1 text-muted-foreground">({currentTask.ko})</p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-auto">
                    <Button variant="ghost" size="sm" className="p-1.5 h-auto">
                      <Volume2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="p-1.5 h-auto">
                      <Languages className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Bottom Controls */}
      <div className="p-4 bg-background border-t border-border">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-center gap-4">
            {state.isListening && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <Button
                  variant="outline"
                  size="lg"
                  className="w-16 h-16 rounded-full bg-destructive/10 border-destructive/30 hover:bg-destructive/20"
                  onClick={() => vad.stop()}
                >
                  <X className="w-6 h-6 text-destructive" />
                </Button>
              </motion.div>
            )}

            {/* CSS 기반 시각적 피드백 (VAD 렌더링 의존성 제거) */}
            <MicrophoneVisualFeedback 
              isListening={audioUI.state === 'listening'}
              isSpeaking={audioUI.isRecentlyActive()}
            />

            <motion.div
              whileTap={{ scale: 0.95 }}
              animate={{
                scale: audioUI.state === 'listening' ? 1.05 : 1
              }}
              transition={{ duration: 0.3 }}
            >
              <Button
                size="lg"
                className={`w-20 h-20 rounded-full transition-all duration-300 relative ${
                  vad.speakingGateActive
                    ? "bg-gray-400 hover:bg-gray-500 cursor-not-allowed"
                    : state.isListening 
                      ? "bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/50" 
                      : "bg-primary hover:bg-primary/90"
                } ${isPlaying ? "ring-4 ring-purple-400/50" : ""}`}
                onClick={handleMicPress}
                disabled={vad.error !== null || vad.speakingGateActive}
              >
                {/* Speaking Gate Overlay */}
                {vad.speakingGateActive && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 flex items-center justify-center bg-gray-600/80 rounded-full"
                  >
                    <motion.span
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="text-2xl"
                    >
                      🔇
                    </motion.span>
                  </motion.div>
                )}

                {/* TTS Playing Indicator */}
                {isPlaying && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center"
                  >
                    <motion.span
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                      className="text-white text-xs"
                    >
                      🔊
                    </motion.span>
                  </motion.div>
                )}

                {/* Processing Indicator */}
                {isProcessing && !isPlaying && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center"
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-3 h-3 border-2 border-white border-t-transparent rounded-full"
                    />
                  </motion.div>
                )}

                {/* Microphone Icon */}
                {!vad.speakingGateActive && (
                  <>
                    {audioUI.state === 'listening' ? (
                      <motion.div
                        animate={{ 
                          scale: audioUI.isRecentlyActive() ? [1, 1.05, 1] : 1
                        }}
                        transition={{ 
                          scale: { duration: 1, repeat: audioUI.isRecentlyActive() ? Infinity : 0, ease: "easeInOut" }
                        }}
                      >
                        <Mic className="w-8 h-8" />
                      </motion.div>
                    ) : (
                      <Mic className="w-8 h-8" />
                    )}
                  </>
                )}
              </Button>
            </motion.div>
          </div>
          
          {vad.error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mt-4 p-3 bg-destructive/10 text-destructive rounded-lg text-sm"
            >
              Error: {vad.error}
            </motion.div>
          )}
        </div>
      </div>
      
      {/* 에러 표시 영역 */}
      {errorHandler.hasErrors && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 pb-4"
        >
          <ErrorList
            errors={errorHandler.errors}
            onRetry={(errorId) => {
              const error = errorHandler.errors.find(e => e.id === errorId)
              if (error?.type === 'stt' && state.segments.length > 0) {
                errorHandler.manualRetry(() => handleSendSegments(), errorId)
              } else if (error?.type === 'chat') {
                // Chat 재시도 로직 (필요시 구현)
                console.log('Chat retry not implemented yet')
              } else if (error?.type === 'tts') {
                // TTS 재시도 로직 (필요시 구현)
                console.log('TTS retry not implemented yet')
              }
            }}
            onDismiss={errorHandler.removeError}
            isRetrying={errorHandler.isRetrying}
            maxVisible={2}
            className="max-w-2xl mx-auto"
          />
        </motion.div>
      )}
      
      {/* 에러 토스트 (중요한 에러만) */}
      <ErrorToast
        error={errorHandler.lastError?.type === 'network' ? errorHandler.lastError : null}
        onRetry={() => {
          if (errorHandler.lastError) {
            // 네트워크 에러 재시도 로직
            checkServer()
          }
        }}
        onDismiss={() => {
          if (errorHandler.lastError) {
            errorHandler.removeError(errorHandler.lastError.id)
          }
        }}
        isRetrying={errorHandler.isRetrying}
      />
    </div>
  )
}