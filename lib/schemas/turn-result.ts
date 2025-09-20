// LLM 응답을 위한 구조화된 스키마 정의

import { z } from 'zod'

// 작업 상태 열거형
export const TaskStatusSchema = z.enum(['success', 'partial', 'failed'])
export type TaskStatus = z.infer<typeof TaskStatusSchema>

// 에이전트 응답 스키마
export const TurnResultSchema = z.object({
  // 에이전트의 음성 응답 텍스트
  speech: z.string().min(1, '에이전트 응답은 필수입니다'),
  
  // 현재 작업 상태 평가
  taskStatus: TaskStatusSchema,
  
  // 작업 성공/실패 이유 (선택사항)
  feedback: z.string().optional(),
  
  // 다음 단계 힌트 (선택사항)
  nextHint: z.string().optional(),
  
  // 사용자 발화에 대한 평가 점수 (1-5)
  score: z.number().min(1).max(5).optional(),
  
  // 대화 종료 여부
  shouldEnd: z.boolean().default(false),
  
  // 메타데이터
  metadata: z.object({
    // 감지된 의도
    detectedIntent: z.string().optional(),
    
    // 언급된 키워드들
    keywords: z.array(z.string()).default([]),
    
    // 제약사항 위반 여부
    constraintViolations: z.array(z.string()).default([]),
    
    // 진행도 (0-1)
    progress: z.number().min(0).max(1).optional()
  }).optional()
})

export type TurnResult = z.infer<typeof TurnResultSchema>

// 예시 응답들
export const exampleTurnResults = {
  // 성공적인 주문 시작
  orderStart: {
    speech: "안녕하세요! 어떤 음료를 드시고 싶으신가요?",
    taskStatus: "success" as TaskStatus,
    feedback: "인사를 잘 받아들였습니다.",
    nextHint: "원하는 음료를 말해보세요.",
    score: 5,
    shouldEnd: false,
    metadata: {
      detectedIntent: "greeting",
      keywords: [],
      constraintViolations: [],
      progress: 0.1
    }
  },
  
  // 가격 제한 위반
  priceViolation: {
    speech: "죄송하지만 그 음료는 예산을 초과합니다. 5천원 이하의 음료를 선택해주세요.",
    taskStatus: "failed" as TaskStatus,
    feedback: "가격 제한을 위반했습니다.",
    nextHint: "아메리카노나 에스프레소를 고려해보세요.",
    score: 2,
    shouldEnd: false,
    metadata: {
      detectedIntent: "order_drink",
      keywords: ["비싼음료"],
      constraintViolations: ["price_limit_exceeded"],
      progress: 0.3
    }
  },
  
  // 성공적인 주문 완료
  orderComplete: {
    speech: "네, 아이스 아메리카노 4천원입니다. 결제는 어떻게 하시겠어요?",
    taskStatus: "success" as TaskStatus,
    feedback: "음료 주문을 성공적으로 완료했습니다!",
    nextHint: "결제 방법을 말해보세요.",
    score: 5,
    shouldEnd: false,
    metadata: {
      detectedIntent: "order_drink",
      keywords: ["아이스아메리카노", "4천원"],
      constraintViolations: [],
      progress: 0.8
    }
  }
} as const

// 스키마 검증 헬퍼
export function validateTurnResult(data: unknown): TurnResult {
  return TurnResultSchema.parse(data)
}

export function safeParseTurnResult(data: unknown): { success: true; data: TurnResult } | { success: false; error: z.ZodError } {
  const result = TurnResultSchema.safeParse(data)
  return result
}
