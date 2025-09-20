// 실제 OpenAI API를 직접 호출하는 Chat 서비스

import { TurnResult, TurnResultSchema, safeParseTurnResult } from '@/lib/schemas/turn-result'
import type { Scenario, LearningTask } from '@/lib/scenarios'

export type ChatMessage = {
  role: 'user' | 'assistant'
  text: string
}

export class RealChatService {
  private apiKey: string

  constructor() {
    // 클라이언트에서 환경변수 접근
    this.apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY || ''
    
    if (!this.apiKey) {
      console.warn('⚠️ OpenAI API key not found. Chat service may not work properly.')
    }
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

**응답 형식**: 반드시 다음 JSON 스키마에 맞춰 응답하세요. 다른 텍스트 없이 JSON만 반환하세요:

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
4. JSON 형식을 정확히 지켜서 응답
5. 마크다운이나 다른 포맷 없이 순수 JSON만 반환`
  }

  /**
   * OpenAI API 직접 호출
   */
  async callOpenAI(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options: {
      model?: string
      temperature?: number
      maxTokens?: number
    } = {}
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key is not configured')
    }

    const {
      model = 'gpt-4o-mini',
      temperature = 0.7,
      maxTokens = 1000
    } = options

    console.log('🤖 Calling OpenAI API with model:', model)
    console.log('📝 Messages:', messages.length, 'messages')

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        response_format: { type: "json_object" } // JSON 모드 강제
      }),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      console.error('❌ OpenAI API Error:', response.status, errorText)
      throw new Error(`OpenAI API Error: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    const assistantMessage = data.choices?.[0]?.message?.content

    if (!assistantMessage) {
      throw new Error('No response from OpenAI API')
    }

    console.log('✅ OpenAI Response received:', assistantMessage.substring(0, 200) + '...')
    return assistantMessage
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
      console.log('🤖 Sending structured chat request to OpenAI...')
      console.log('👤 User message:', userMessage)

      // 메시지 구성
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemPrompt }
      ]

      // 대화 히스토리 추가 (최근 6개 메시지)
      if (options.memoryHistory && options.memoryHistory.length > 0) {
        const recentHistory = options.memoryHistory.slice(-6)
        recentHistory.forEach(msg => {
          messages.push({
            role: msg.role,
            content: msg.text
          })
        })
      }

      // 현재 사용자 메시지 추가
      messages.push({
        role: 'user',
        content: userMessage
      })

      // OpenAI API 호출
      const rawResponse = await this.callOpenAI(messages, {
        model: 'gpt-4o-mini',
        temperature: 0.7,
        maxTokens: 1000
      })

      console.log('📥 Raw OpenAI response:', rawResponse)

      // JSON 파싱 시도
      let parsedJson: unknown
      try {
        parsedJson = JSON.parse(rawResponse.trim())
      } catch (parseError) {
        console.error('❌ JSON parsing failed:', parseError)
        console.log('Raw response:', rawResponse)
        
        // JSON 파싱 실패 시 폴백 응답 생성
        return {
          speech: "죄송합니다. 응답을 처리하는 중 문제가 발생했습니다. 다시 시도해주세요.",
          taskStatus: 'failed',
          feedback: 'JSON 응답 파싱에 실패했습니다.',
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
        console.log('Invalid response:', parsedJson)
        
        // 검증 실패 시 폴백 응답
        return {
          speech: "응답 형식에 문제가 있습니다. 다시 시도해주세요.",
          taskStatus: 'failed',
          feedback: '응답 형식 검증에 실패했습니다.',
          shouldEnd: false
        }
      }

    } catch (error) {
      console.error('❌ Real chat service failed:', error)
      
      // 에러 시 폴백 응답
      return {
        speech: "죄송합니다. 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
        taskStatus: 'failed',
        feedback: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        shouldEnd: false
      }
    }
  }
}

// 실제 API 서비스 인스턴스
export const realChatService = new RealChatService()
