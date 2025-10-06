import { ScenarioPromptInput, MessageHistory } from "./types"

const ASSISTANT_SYSTEM_PROMPT =
`너는 지금 한국어로 역할극을 하고 있다.
너의 역할은 사용자와 함께 역할극을 진행하는 것이다.
사용자는 한국어를 공부하는 외국인이다. 외국인이 한국어를 사용하여 너와 함께 역할극을 진행할 것이다.

**중요한 역할극 규칙:**
1. 사용자는 정해진 테스크 순서대로 수행해야 한다
2. 너는 전체 테스크 목록과 현재 진행 상황을 알고 있다
3. 대화 히스토리를 바탕으로 자연스러운 대화를 이어간다. 대화 히스토리를 보고 사용자가 어떤 테스크를 수행했는지 알 수 있다.
4. 사용자가 현재 테스크에 맞지 않는 요청을 하더라도, 역할에 맞추어 답변을 한다
5. 절대로 선생님처럼 말하지 않고 시나리오 역할에 몰입한다
6. 한국어로만 응답한다
7. 사용자가 진행해야하는 테스크를 알고 있다. 사용자가 적절한 한국어 답변을 하지 않은 테스크에 대해서 정보를 제공하지 말아야한다. 왜냐하면, 사용자가 후에 그 테스크를 수행해야하기 때문이다.
예를 들어, 사용자의 테스크가 메뉴 물어보기, 가격 물어보기가 있고 사용자가 메뉴만 물어봤다면, 가격에 대해서는 정보를 제공하지 않아야한다. 
`

export function buildAssistantSystemPrompt(): string {
  return ASSISTANT_SYSTEM_PROMPT
}

export function buildScenarioSystemMessage(input?: ScenarioPromptInput): string | undefined {
  if (!input) return undefined
  const lines: string[] = []
  lines.push(`시나리오 제목: ${input.title}`)
  if (input.assistantRole) lines.push(`나의 역할: ${input.assistantRole}`)
  if (input.userRole) lines.push(`사용자 역할: ${input.userRole}`)
  if (input.description) lines.push(`시나리오 설명: ${input.description}`)
  
  // 테스크 목록 추가
  if (input.tasks && input.tasks.length > 0) {
    lines.push(`\n전체 테스크 목록:`)
    input.tasks.forEach((task, index) => {
      lines.push(`${index + 1}. ${task.ko}`)
    })
  }
  
  return "\n" + lines.join("\n") + "\n"
}


export function buildAssistantMessages(options: {
  scenario?: ScenarioPromptInput
  currentTask?: { id: string; ko: string; en?: string }
  progress?: { currentTaskIndex: number; completed: number; total: number }
  history?: MessageHistory
  userMessage: string
}) {
  const { scenario, currentTask, progress, history, userMessage } = options
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = []

  const system = buildAssistantSystemPrompt()
  if (system) messages.push({ role: "system", content: system })

  const scenarioMsg = buildScenarioSystemMessage(scenario)
  if (scenarioMsg && scenarioMsg.trim().length > 0) {
    messages.push({ role: "system", content: scenarioMsg })
  }


  if (history && history.length > 0) {
    history.forEach((m) => messages.push({ role: m.role, content: m.text }))
  }

  const last = messages[messages.length - 1]
  const shouldAppend = !last || last.role !== "user" || (String(last.content || "").trim() !== String(userMessage).trim())
  if (shouldAppend) messages.push({ role: "user", content: userMessage })

  return messages
}


