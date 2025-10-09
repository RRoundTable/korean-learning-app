export const TASK_SUCCESS_SYSTEM_PROMPT = `너는 한국어 학습자의 테스크 성공 여부를 판단하는 전문가이다.

**입력 형식:**
{
  "currentTask": "현재 테스크",
  "user_msg": "사용자의 발화"
}

**판단 기준:**
- 사용자가 current task에 대한 올바른 한국어 표현을 사용했는가
- current task에 맞는 한국어 표현을 정확한 문법으로 구사했는가
- 완전한 문장을 구사했는가
- 의미가 맞더라도 사용자가 완전한 한국어를 사용하지 못하면 실패 처리

**응답 형식:**
너는 반드시 다음 JSON 형식으로만 응답해야 한다:
{
  "currentTask": true/false
}

**판단 규칙:**
- current task에 맞는 한국어 표현을 정확한 문법으로 구사했으면 true
- 완전한 문장을 구사하지 않았으면 false
- 잘못된 한국어 표현을 사용했으면 false
- current task와 관련 없는 발화를 했으면 false
- 문법적으로 올바르고 완전한 문장으로 current task를 수행했으면 true`

export function buildTaskSuccessMessages(
  currentTask: { id: string; ko: string; en?: string }, 
  userMsg: string,
  memoryHistory?: Array<{ role: "user" | "assistant"; text: string }>,
  scenarioContext?: {
    scenarioId: string | number;
    title: string;
    assistantRole?: string;
    userRole?: string;
    description?: string;
    constraints?: Record<string, any>;
    tasks?: Array<{ id: string; ko: string; en?: string }>;
  }
) {
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    {
      role: "system" as const,
      content: `${TASK_SUCCESS_SYSTEM_PROMPT}\n\n현재 테스크: ${currentTask.ko}`
    }
  ]

  // Add scenario context if provided
  if (scenarioContext) {
    const scenarioLines: string[] = []
    scenarioLines.push(`시나리오 제목: ${scenarioContext.title}`)
    if (scenarioContext.assistantRole) scenarioLines.push(`나의 역할: ${scenarioContext.assistantRole}`)
    if (scenarioContext.userRole) scenarioLines.push(`사용자 역할: ${scenarioContext.userRole}`)
    if (scenarioContext.description) scenarioLines.push(`시나리오 설명: ${scenarioContext.description}`)
    
    // Add task list if available
    if (scenarioContext.tasks && scenarioContext.tasks.length > 0) {
      scenarioLines.push(`\n전체 테스크 목록:`)
      scenarioContext.tasks.forEach((task, index) => {
        scenarioLines.push(`${index + 1}. ${task.ko}`)
      })
    }
    
    if (scenarioLines.length > 0) {
      messages.push({
        role: "system" as const,
        content: "\n" + scenarioLines.join("\n") + "\n"
      })
    }
  }

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
