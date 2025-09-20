// Chat API 클라이언트 서비스

import { TurnResult, TurnResultSchema, safeParseTurnResult, exampleTurnResults } from '@/lib/schemas/turn-result'
import type { Scenario, LearningTask } from '@/lib/scenarios'

export type ChatMessage = {
  role: 'user' | 'assistant'
  text: string
}

export type ChatRequest = {
  sessionId: string
  userMessage: string
  systemPrompt?: string
  memoryHistory?: ChatMessage[]
}

export type ChatResponse = {
  text: string
  createdAt: Date
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export class ChatService {
  private baseUrl: string

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl
  }

  /**
   * 구조화된 JSON 응답을 위한 시스템 프롬프트 생성
   */
  private createSystemPrompt(scenario: Scenario, currentTask: LearningTask): string {
    return `당신은 한국어 회화 연습을 도와주는 AI 튜터입니다.

**역할**: ${scenario.agentRole}
**상황**: ${scenario.context}

**현재 작업**: ${currentTask.description}
- 목표: ${currentTask.goal}
- 성공 조건: ${currentTask.successCriteria.join(', ')}

**제약사항**:
- 가격 제한: ${scenario.constraints.priceLimit}원
- 금지 음료: ${scenario.constraints.bannedDrinks?.join(', ') || '없음'}
- 선호 음료: ${scenario.constraints.preferred?.join(', ') || '없음'}

**응답 형식**: 반드시 다음 JSON 스키마에 맞춰 응답하세요:

{
  "speech": "에이전트의 음성 응답 텍스트 (한국어, 자연스러운 대화체)",
  "taskStatus": "success | partial | failed",
  "feedback": "사용자 발화에 대한 평가 (선택사항)",
  "nextHint": "다음 단계 힌트 (선택사항)",
  "score": 1-5 점수 (선택사항),
  "shouldEnd": false,
  "metadata": {
    "detectedIntent": "감지된 의도",
    "keywords": ["언급된 키워드들"],
    "constraintViolations": ["위반된 제약사항들"],
    "progress": 0.0-1.0
  }
}

**중요 지침**:
1. 자연스럽고 친근한 한국어로 응답
2. 제약사항 위반 시 친절하게 안내
3. 사용자의 진행상황에 맞는 적절한 피드백 제공
4. JSON 형식을 정확히 지켜서 응답`
  }

  /**
   * 일반 Chat API 호출 (기존 방식)
   */
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/api/openai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // TODO: 실제 인증 토큰 처리 필요
      },
      credentials: 'include',
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(45000) // 45초 타임아웃
    })

    if (!response.ok) {
      let errorMessage = 'AI와의 대화 처리 중 오류가 발생했습니다.'
      
      try {
        const errorData = await response.json()
        errorMessage = errorData.error || errorMessage
      } catch {
        // JSON 파싱 실패 시 기본 메시지 사용
      }
      
      if (response.status >= 500) {
        errorMessage = `서버 오류가 발생했습니다 (${response.status})`
      } else if (response.status === 429) {
        errorMessage = '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.'
      } else if (response.status === 401) {
        errorMessage = 'API 인증에 실패했습니다. 설정을 확인해주세요.'
      } else if (response.status === 400) {
        errorMessage = '잘못된 요청입니다. 다시 시도해주세요.'
      }
      
      throw new Error(errorMessage)
    }

    const data = await response.json()
    
    if (!data.text && !data.error) {
      throw new Error('AI 응답을 받을 수 없습니다. 다시 시도해주세요.')
    }
    
    return data
  }

  /**
   * 구조화된 JSON 응답을 받는 Chat API 호출
   */
  async sendStructuredMessage(
    userMessage: string,
    scenario: Scenario,
    currentTask: LearningTask,
    options: {
      sessionId: string
      memoryHistory?: ChatMessage[]
    }
  ): Promise<TurnResult> {
    const systemPrompt = this.createSystemPrompt(scenario, currentTask)
    
    try {
      console.log('🤖 Sending structured chat request...')
      console.log('User message:', userMessage)
      console.log('System prompt preview:', systemPrompt.substring(0, 200) + '...')

      const chatResponse = await this.sendMessage({
        sessionId: options.sessionId,
        userMessage,
        systemPrompt,
        memoryHistory: options.memoryHistory
      })

      console.log('📥 Raw chat response:', chatResponse.text)

      // JSON 파싱 시도
      let parsedJson: unknown
      try {
        // 응답에서 JSON 부분만 추출 (마크다운 코드블록 제거)
        let jsonText = chatResponse.text.trim()
        
        // ```json ... ``` 형태의 코드블록 제거
        const jsonMatch = jsonText.match(/```(?:json)?\s*(\{.*\})\s*```/s)
        if (jsonMatch) {
          jsonText = jsonMatch[1]
        }
        
        parsedJson = JSON.parse(jsonText)
      } catch (parseError) {
        console.warn('⚠️ JSON parsing failed, using fallback response')
        
        // JSON 파싱 실패 시 폴백 응답 생성
        return {
          speech: chatResponse.text,
          taskStatus: 'partial',
          feedback: 'JSON 응답 파싱에 실패했지만 텍스트 응답을 받았습니다.',
          shouldEnd: false
        }
      }

      // 스키마 검증
      const validationResult = safeParseTurnResult(parsedJson)
      
      if (validationResult.success) {
        console.log('✅ Structured response validated:', validationResult.data)
        return validationResult.data
      } else {
        console.error('❌ Schema validation failed:', validationResult.error)
        
        // 검증 실패 시 폴백 응답
        return {
          speech: chatResponse.text,
          taskStatus: 'failed',
          feedback: '응답 형식 검증에 실패했습니다.',
          shouldEnd: false
        }
      }

    } catch (error) {
      console.error('❌ Structured chat failed:', error)
      throw error
    }
  }
}

// Mock Chat 서비스 (개발/테스트용)
export class MockChatService extends ChatService {
  private responseIndex = 0
  private mockResponses: TurnResult[] = [
    exampleTurnResults.orderStart,
    {
      speech: "좋은 선택이세요! 아이스로 드릴까요, 핫으로 드릴까요?",
      taskStatus: "partial",
      feedback: "음료를 선택했습니다. 온도를 정해주세요.",
      nextHint: "아이스 또는 핫을 말해보세요.",
      score: 4,
      shouldEnd: false,
      metadata: {
        detectedIntent: "order_drink",
        keywords: ["아메리카노"],
        constraintViolations: [],
        progress: 0.5
      }
    },
    exampleTurnResults.orderComplete,
    {
      speech: "감사합니다! 주문이 완료되었습니다. 좋은 하루 되세요!",
      taskStatus: "success",
      feedback: "결제까지 성공적으로 완료했습니다!",
      score: 5,
      shouldEnd: true,
      metadata: {
        detectedIntent: "payment",
        keywords: ["카드결제"],
        constraintViolations: [],
        progress: 1.0
      }
    }
  ]

  async sendStructuredMessage(
    userMessage: string,
    scenario: Scenario,
    currentTask: LearningTask,
    options: {
      sessionId: string
      memoryHistory?: ChatMessage[]
    }
  ): Promise<TurnResult> {
    // 모의 지연
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))
    
    console.log('🧪 Mock Chat - User message:', userMessage)
    
    // 특정 키워드에 따른 응답 선택
    let response: TurnResult
    
    if (userMessage.includes('안녕') || userMessage.includes('주세요')) {
      response = this.mockResponses[0] // 인사 응답
    } else if (userMessage.includes('아메리카노') || userMessage.includes('커피')) {
      response = this.mockResponses[1] // 음료 선택 응답
    } else if (userMessage.includes('아이스') || userMessage.includes('핫')) {
      response = this.mockResponses[2] // 주문 완료
    } else if (userMessage.includes('카드') || userMessage.includes('결제')) {
      response = this.mockResponses[3] // 결제 완료
    } else {
      // 순환하며 응답
      response = this.mockResponses[this.responseIndex % this.mockResponses.length]
      this.responseIndex++
    }
    
    console.log('🧪 Mock Chat response:', response)
    return response
  }
}

// 싱글톤 인스턴스
export const chatService = new ChatService()

// 개발 모드에서는 Mock 서비스 사용
export const isDevelopment = process.env.NODE_ENV === 'development'
export const activeChatService = isDevelopment ? new MockChatService() : chatService
