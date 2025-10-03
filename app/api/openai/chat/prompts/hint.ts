import { ScenarioPromptInput, MessageHistory } from "./types"

const HINT_SYSTEM_PROMPT = `너는 한국어 역할극 과제 수행을 돕는 조력자다.
너는 시나리오 제목, 설명, 너의 역할, 사용자(한국어 학습자)의 역할에 대해서 전달 받을 것이다. 또한 대화 히스토리도 함께 제공된다.

현재 과제를 수행하는 데 도움이 되는 한국어 한 문장을 제시해라.
추측 정보나 정답을 모두 주지 말고, 유저가 말할 때 참고할 수 있는 표현을 제시해라.

예를 들어, 사용자의 현재 테스크가 가격을 물어보는 것이라면 다음과 같이 응답할 수 있다.
hint: 00은 얼마인가요?
`

export function buildHintSystemPrompt(): string {
  return HINT_SYSTEM_PROMPT
}

export function buildScenarioSystemMessage(input?: ScenarioPromptInput): string | undefined {
  if (!input) return undefined
  const lines: string[] = []
  lines.push(`시나리오 제목: ${input.title}`)
  if (input.assistantRole) lines.push(`역할: ${input.assistantRole}`)
  if (input.userRole) lines.push(`상대방 역할: ${input.userRole}`)
  if (input.description) lines.push(`시나리오 설명: ${input.description}`)
  return "\n" + lines.join("\n") + "\n"
}

export function buildHintMessages(options: {
  scenario?: ScenarioPromptInput
  currentTaskKo?: string
  history?: MessageHistory
  userMessage?: string
}) {
  const { scenario, currentTaskKo, history, userMessage } = options
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = []

  const system = buildHintSystemPrompt()
  messages.push({ role: "system", content: system })

  const scenarioMsg = buildScenarioSystemMessage(scenario)
  if (scenarioMsg && scenarioMsg.trim().length > 0) messages.push({ role: "system", content: scenarioMsg })

  if (currentTaskKo && currentTaskKo.trim().length > 0) {
    messages.push({ role: "system", content: `currentTask: ${currentTaskKo}` })
  }

  if (history && history.length > 0) history.forEach((m) => messages.push({ role: m.role, content: m.text }))

  if (userMessage && userMessage.trim().length > 0) {
    messages.push({ role: "user", content: userMessage })
  }

  // 간결한 한 문장으로만 답변하라고 지시
  messages.push({ role: "system", content: "한국어 한 문장만 답변하라." })

  return messages
}


