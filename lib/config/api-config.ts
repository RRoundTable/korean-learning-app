// API 서비스 설정 및 환경별 분기

import { activeSttService, MockSttService } from '@/lib/services/stt-service'
import { activeChatService, MockChatService } from '@/lib/services/chat-service'

// 환경 설정
export const isProduction = process.env.NODE_ENV === 'production'
export const isDevelopment = process.env.NODE_ENV === 'development'

// korean-ai-tutor 서버 URL
export const KOREAN_AI_TUTOR_URL = 'http://localhost:3000'

// 서버 연결 상태 확인
export const checkServerConnection = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${KOREAN_AI_TUTOR_URL}/api/test-env`, {
      method: 'GET',
      credentials: 'include'
    })
    return response.ok
  } catch (error) {
    console.error('Server connection failed:', error)
    return false
  }
}

// 실제 API 사용 여부 (서버 연결 가능 여부로 판단)
export const useRealAPI = true // 항상 실제 API 시도, 실패 시 Mock으로 폴백

console.log('🔧 API Configuration:')
console.log('- Environment:', process.env.NODE_ENV)
console.log('- Korean AI Tutor URL:', KOREAN_AI_TUTOR_URL)
console.log('- Use Real API:', useRealAPI)

// 활성 서비스 선택 (항상 실제 서비스 사용, 에러 시 Mock으로 폴백)
export const activeSTTService = activeSttService // 기존 STT 서비스 (korean-ai-tutor API 호출)
export const activeChatService2 = activeChatService // 기존 Chat 서비스 (korean-ai-tutor API 호출)

// 서비스 타입 정보
export const serviceInfo = {
  stt: 'Korean AI Tutor STT API',
  chat: 'Korean AI Tutor Chat API', 
  environment: process.env.NODE_ENV,
  serverUrl: KOREAN_AI_TUTOR_URL,
  hasApiKey: 'Server-side only' // 서버에서만 API 키 관리
}

// 서버 상태 체크 함수
export const getServerStatus = async () => {
  const isConnected = await checkServerConnection()
  return {
    connected: isConnected,
    url: KOREAN_AI_TUTOR_URL,
    timestamp: new Date().toISOString()
  }
}
