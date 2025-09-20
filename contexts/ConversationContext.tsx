"use client"

import { createContext, useContext, useReducer, useEffect, ReactNode } from "react"
import { 
  Scenario, 
  UserState, 
  Progress, 
  LearningTask,
  coffeeShopScenario,
  createInitialUserState,
  calculateProgress,
  getCurrentTask,
  getNextTask
} from "@/lib/scenarios"
import { useProgressTracker } from "@/hooks/use-progress-tracker"

// 세그먼트 타입 정의
export type AudioSegment = {
  id: string
  wavBlob: Blob
  durationMs: number
  sttText?: string
}

// 대화 히스토리 타입
export type ConversationMessage = {
  role: 'user' | 'assistant'
  text: string
}

// 재생 상태
export type PlaybackState = {
  isPlaying: boolean
  lastAudioUrl?: string
}

// 전체 상태 타입
export type ConversationState = {
  session: { id: string; startedAt: Date }
  scenario: Scenario
  userState: UserState
  segments: AudioSegment[]
  history: ConversationMessage[]
  progress: Progress
  playback: PlaybackState
  isListening: boolean
  isSpeaking: boolean
}

// 액션 타입들
export type ConversationAction =
  | { type: 'START_LISTENING' }
  | { type: 'STOP_LISTENING' }
  | { type: 'ADD_SEGMENT'; payload: { wavBlob: Blob; durationMs: number } }
  | { type: 'UPDATE_SEGMENT_STT'; payload: { segmentId: string; sttText: string } }
  | { type: 'CLEAR_SEGMENTS' }
  | { type: 'ADD_MESSAGE'; payload: ConversationMessage }
  | { type: 'MARK_TASK_SUCCESS'; payload: { taskId: string } }
  | { type: 'MARK_TASK_FAILED'; payload: { taskId: string } }
  | { type: 'UPDATE_TASK_STATUS'; payload: { taskId: string; status: 'completed' | 'failed' | 'in_progress' } }
  | { type: 'MOVE_TO_NEXT_TASK' }
  | { type: 'SET_SPEAKING'; payload: boolean }
  | { type: 'SET_PLAYBACK'; payload: Partial<PlaybackState> }
  | { type: 'INCREMENT_ATTEMPTS' }
  | { type: 'RESET_SESSION' }

// 초기 상태 생성
const createInitialState = (): ConversationState => {
  const scenario = coffeeShopScenario
  const userState = createInitialUserState(scenario)
  
  return {
    session: {
      id: `session-${Date.now()}`,
      startedAt: new Date()
    },
    scenario,
    userState,
    segments: [],
    history: [],
    progress: calculateProgress(userState, scenario),
    playback: { isPlaying: false },
    isListening: false,
    isSpeaking: false
  }
}

// 리듀서
const conversationReducer = (state: ConversationState, action: ConversationAction): ConversationState => {
  switch (action.type) {
    case 'START_LISTENING':
      return { ...state, isListening: true }
    
    case 'STOP_LISTENING':
      return { ...state, isListening: false }
    
    case 'ADD_SEGMENT':
      const newSegment: AudioSegment = {
        id: `segment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        wavBlob: action.payload.wavBlob,
        durationMs: action.payload.durationMs
      }
      // 최대 3개의 세그먼트만 유지
      const updatedSegments = [...state.segments, newSegment].slice(-3)
      return { ...state, segments: updatedSegments }
    
    case 'UPDATE_SEGMENT_STT':
      return {
        ...state,
        segments: state.segments.map(segment =>
          segment.id === action.payload.segmentId
            ? { ...segment, sttText: action.payload.sttText }
            : segment
        )
      }
    
    case 'CLEAR_SEGMENTS':
      return { ...state, segments: [] }
    
    case 'ADD_MESSAGE':
      return {
        ...state,
        history: [...state.history, action.payload]
      }
    
    case 'MARK_TASK_SUCCESS': {
      const newTaskStatuses = {
        ...state.userState.taskStatuses,
        [action.payload.taskId]: 'success' as const
      }
      const updatedUserState = {
        ...state.userState,
        taskStatuses: newTaskStatuses
      }
      return {
        ...state,
        userState: updatedUserState,
        progress: calculateProgress(updatedUserState, state.scenario)
      }
    }
    
    case 'MARK_TASK_FAILED': {
      const newTaskStatuses = {
        ...state.userState.taskStatuses,
        [action.payload.taskId]: 'failed' as const
      }
      const updatedUserState = {
        ...state.userState,
        taskStatuses: newTaskStatuses
      }
      return {
        ...state,
        userState: updatedUserState,
        progress: calculateProgress(updatedUserState, state.scenario)
      }
    }
    
    case 'UPDATE_TASK_STATUS': {
      const newTaskStatuses = {
        ...state.userState.taskStatuses,
        [action.payload.taskId]: action.payload.status
      }
      const updatedUserState = {
        ...state.userState,
        taskStatuses: newTaskStatuses
      }
      return {
        ...state,
        userState: updatedUserState,
        progress: calculateProgress(updatedUserState, state.scenario)
      }
    }
    
    case 'MOVE_TO_NEXT_TASK': {
      const nextTask = getNextTask(state.userState.currentTaskIndex, state.scenario)
      if (!nextTask) return state
      
      const updatedUserState = {
        ...state.userState,
        currentTaskId: nextTask.id,
        currentTaskIndex: state.userState.currentTaskIndex + 1
      }
      return {
        ...state,
        userState: updatedUserState,
        progress: calculateProgress(updatedUserState, state.scenario)
      }
    }
    
    case 'SET_SPEAKING':
      return { ...state, isSpeaking: action.payload }
    
    case 'SET_PLAYBACK':
      return {
        ...state,
        playback: { ...state.playback, ...action.payload }
      }
    
    case 'INCREMENT_ATTEMPTS':
      return {
        ...state,
        userState: { ...state.userState, attempts: state.userState.attempts + 1 }
      }
    
    case 'RESET_SESSION':
      return createInitialState()
    
    default:
      return state
  }
}

// 컨텍스트 생성
const ConversationContext = createContext<{
  state: ConversationState
  dispatch: React.Dispatch<ConversationAction>
  // 헬퍼 함수들
  getCurrentTask: () => LearningTask | null
  isTaskCompleted: (taskId: string) => boolean
  isScenarioCompleted: () => boolean
} | null>(null)

// 프로바이더
export function ConversationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(conversationReducer, null, createInitialState)

  // 로컬 스토리지에서 상태 복원 (추후 구현)
  useEffect(() => {
    // TODO: localStorage에서 상태 복원
  }, [])

  // 상태 변경 시 로컬 스토리지에 저장 (추후 구현)
  useEffect(() => {
    // TODO: localStorage에 상태 저장
  }, [state])

  const contextValue = {
    state,
    dispatch,
    getCurrentTask: () => getCurrentTask(state.userState, state.scenario),
    isTaskCompleted: (taskId: string) => state.userState.taskStatuses[taskId] === 'success',
    isScenarioCompleted: () => state.progress.completed === state.progress.total
  }

  return (
    <ConversationContext.Provider value={contextValue}>
      {children}
    </ConversationContext.Provider>
  )
}

// 훅
export function useConversation() {
  const context = useContext(ConversationContext)
  if (!context) {
    throw new Error('useConversation must be used within a ConversationProvider')
  }
  return context
}
