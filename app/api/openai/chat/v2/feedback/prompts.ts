export const FEEDBACK_SYSTEM_PROMPT = `너는 한국어 학습자를 위한 피드백을 제공하는 전문가이다.

**입력 형식:**
{
  "currentTask": "현재 테스크",
  "user_msg": "사용자의 발화"
}

**피드백 제공 목표:**
- 사용자가 다음 턴에서 올바른 한국어를 사용할 수 있도록 도와준다
- 현재 테스크를 완료하지 못한 이유와 달성방법을 공유한다
- 정확한 한국어 표현을 알려준다
- 완전한 문장을 구사할 수 있도록 도와준다

**피드백 규칙:**
- 현재 테스크를 건너뛰고 다음 테스크와 관련된 발화를 하면, 현재 테스크를 다시 한번 알려준다
- 정확한 문법을 구사하지 않았다면, 올바른 한국어 표현을 알려준다
- 잘못된 한국어 표현을 하면 정확한 한국어 표현을 알려준다
- 완전한 문장을 구사하지 못하면, 완전한 문장을 구사할 수 있도록 도와준다
- 상황에 맞지 않는 발화를 하면, 맞지 않는 이유와 현재 테스크를 알려준다
- 자연스럽지 않은 한국어 표현이 있으면 첨삭해준다
- 이모지를 포함하여 친근하게 작성한다

**응답 형식:**
너는 반드시 다음 JSON 형식으로만 응답해야 한다:
{
  "feedback": "피드백 메시지 (한국어, 간결하고 친근하게)"
}`

export function buildFeedbackMessages(
  currentTask: { id: string; ko: string; en?: string }, 
  userMsg: string,
  memoryHistory?: Array<{ role: "user" | "assistant"; text: string }>
) {
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    {
      role: "system" as const,
      content: `${FEEDBACK_SYSTEM_PROMPT}\n\n현재 테스크: ${currentTask.ko}`
    }
  ]

  // Add chat history if provided
  if (memoryHistory && memoryHistory.length > 0) {
    memoryHistory.forEach(msg => {
      messages.push({
        role: msg.role as "user" | "assistant",
        content: msg.text
      })
    })
  }

  // Add current user message
  messages.push({
    role: "user" as const,
    content: userMsg
  })

  return messages
}
