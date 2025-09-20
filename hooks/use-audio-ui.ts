// VAD와 분리된 오디오 UI 상태 관리

'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

export type AudioUIState = 'idle' | 'listening' | 'speaking' | 'processing'

interface AudioUIData {
  state: AudioUIState
  isActive: boolean
  hasSegments: boolean
  lastActivityTime: number
}

export function useAudioUI() {
  const [uiState, setUIState] = useState<AudioUIData>({
    state: 'idle',
    isActive: false,
    hasSegments: false,
    lastActivityTime: 0
  })

  // VAD 이벤트 집계를 위한 버퍼
  const activityBuffer = useRef<{
    level: number
    isActive: boolean
    lastUpdate: number
  }>({
    level: 0,
    isActive: false,
    lastUpdate: 0
  })

  // UI 업데이트를 위한 타이머
  const updateTimer = useRef<NodeJS.Timeout>()

  // VAD 데이터를 받아서 버퍼에 저장 (렌더링 트리거 안함)
  const updateVadData = useCallback((level: number, probability: number, isSpeaking: boolean) => {
    const now = Date.now()
    
    // 버퍼에만 저장, UI 업데이트는 하지 않음
    activityBuffer.current = {
      level: Math.max(level, probability), // 둘 중 높은 값 사용
      isActive: isSpeaking || level > 0.1,
      lastUpdate: now
    }
  }, [])

  // 의미있는 상태 변화만 UI에 반영
  const setAudioState = useCallback((newState: AudioUIState) => {
    setUIState(prev => {
      if (prev.state === newState) return prev
      
      const now = Date.now()
      return {
        ...prev,
        state: newState,
        isActive: newState === 'listening' || newState === 'speaking',
        lastActivityTime: now
      }
    })
  }, [])

  // 세그먼트 상태 업데이트
  const setHasSegments = useCallback((hasSegments: boolean) => {
    setUIState(prev => ({
      ...prev,
      hasSegments
    }))
  }, [])

  // 주기적인 UI 업데이트 (필요한 경우에만)
  const scheduleUIUpdate = useCallback(() => {
    if (updateTimer.current) {
      clearTimeout(updateTimer.current)
    }

    updateTimer.current = setTimeout(() => {
      const buffer = activityBuffer.current
      const now = Date.now()
      
      // 최근 활동이 있고, UI가 listening 상태인 경우에만 업데이트
      if (buffer.lastUpdate > 0 && 
          now - buffer.lastUpdate < 1000 && 
          uiState.state === 'listening') {
        
        setUIState(prev => ({
          ...prev,
          lastActivityTime: buffer.lastUpdate
        }))
      }
    }, 500) // 500ms마다 한 번만 확인
  }, [uiState.state])

  // 정리
  useEffect(() => {
    return () => {
      if (updateTimer.current) {
        clearTimeout(updateTimer.current)
      }
    }
  }, [])

  return {
    // UI 상태 (렌더링에 사용)
    state: uiState.state,
    isActive: uiState.isActive,
    hasSegments: uiState.hasSegments,
    
    // 액션 (VAD 이벤트 처리용)
    updateVadData, // VAD 데이터 수신 (렌더링 트리거 안함)
    setAudioState, // 의미있는 상태 변화만
    setHasSegments,
    scheduleUIUpdate,
    
    // 헬퍼
    getActivityLevel: () => activityBuffer.current.level,
    isRecentlyActive: () => {
      const now = Date.now()
      return now - activityBuffer.current.lastUpdate < 2000
    }
  }
}
