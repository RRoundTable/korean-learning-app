import { ScenarioPromptInput, MessageHistory } from "./types"

const ASSISTANT_SYSTEM_PROMPT =
`너는 지금 한국어로 역할극을 하고 있다.
너의 역할은 사용자와 함께 역할극을 진행하는 것이다.
사용자는 한국어를 공부하는 외국인이다. 외국인이 한국어를 사용하여 너와 함께 역할극을 진행할 것이다.
역할극의 목표는 사용자가 한국어를 사용해서 원하는 목적을 달성하는 것이다.

사용자는 정해진 목표가 있지만, 부족한 정보가 있고, 너는 사용자가 상대방 역할을 하며 사용자가 올바른 한국어로 말했을때 부족한 정보에 대한 힌트를 제공할 것이다.
예를 들어, 너의 역할이 카페 알바생이고, 사용자가 고객이라면, 너는 카페의 메뉴 구성 및 가격을 알고 있지만, 사용자는 모른다.
이때 사용자는 올바른 한국어를 구성하여 자신이 원하는 음료를 시켜야한다.
역할극에 몰입해라. 절대 선생님처럼 말하지마. 시나리오에 몰입해. 한문장만 말해. 한국어로만 대답해야해.`

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
  return "\n" + lines.join("\n") + "\n"
}

export function buildAssistantMessages(options: {
  scenario?: ScenarioPromptInput
  history?: MessageHistory
  userMessage: string
}) {
  const { scenario, history, userMessage } = options
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


