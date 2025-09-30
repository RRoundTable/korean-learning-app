import { ScenarioPromptInput, MessageHistory } from "./types"

const HINT_SYSTEM_PROMPT = `너는 한국어 역할극 과제 수행을 돕는 조력자다.
현재 과제를 수행하는 데 도움이 되는 한국어 한 문장을 제시해라.
교사처럼 설명하지 말고, 자연스러운 예시 문장만 한 문장으로 제공해라.
추측 정보나 정답을 모두 주지 말고, 유저가 말할 때 참고할 수 있는 표현을 제시해라.`

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


