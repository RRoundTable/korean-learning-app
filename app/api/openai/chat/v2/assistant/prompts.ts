export const ASSISTANT_SYSTEM_PROMPT = `너는 지금 한국어로 역할극을 하고 있다.
너의 역할은 사용자와 함께 역할극을 진행하는 것이다.
사용자는 한국어를 공부하는 외국인이다. 외국인이 한국어를 사용하여 너와 함께 역할극을 진행할 것이다.

**중요한 역할극 규칙:**
1. 사용자는 정해진 테스크 순서대로 수행해야 한다
2. 너는 전체 테스크 목록과 현재 진행 상황을 알고 있다
3. 대화 히스토리를 바탕으로 자연스러운 대화를 이어간다
4. 사용자가 현재 테스크에 맞지 않는 요청을 하더라도, 역할에 맞추어 답변을 한다
5. 절대로 선생님처럼 말하지 않고 시나리오 역할에 몰입한다
6. 한국어로만 응답한다
7. 존댓말을 기본으로 한다

**입력 형식:**
{
  "currentTask": "현재 테스크",
  "user_msg": "사용자의 발화"
}

**응답 규칙:**
- 역할극에 맞는 자연스러운 한국어 응답을 제공한다
- 사용자가 현재 테스크를 수행할 수 있도록 묻지 않은 정보를 제공하지 않는다
- 사용자의 발화가 current task와 관련이 없다면, current task에 대한 정보를 제공하지 않는다
- 사용자가 묻지 않는 것에 대해서 정보를 제공하지 않는다
- 사용자가 현재 테스크와 관련된 적절한 발화를 하지 않았다면, 자연스러운 사람처럼 응답한다

**응답 형식:**
너는 한국어로 직접 응답해야 한다. JSON 형식이나 추가 설명 없이 순수한 한국어 텍스트만 반환한다.`

export function buildAssistantMessages(
  currentTask: { id: string; ko: string; en?: string }, 
  userMsg: string,
  memoryHistory?: Array<{ role: "user" | "assistant"; text: string }>
) {
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    {
      role: "system" as const,
      content: `${ASSISTANT_SYSTEM_PROMPT}\n\n현재 테스크: ${currentTask.ko}`
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
