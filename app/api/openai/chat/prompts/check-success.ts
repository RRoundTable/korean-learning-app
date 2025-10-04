import { ScenarioPromptInput, MessageHistory } from "./types"
import { buildScenarioSystemMessage as buildAssistantScenarioMessage } from "./assistant"

const CHECK_SUCCESS_SYSTEM_PROMPT = `너는 한국어 학습자의 발화가 현재 과제를 달성했는지 여부만 판단하는 심판이다.
너는 시나리오 제목, 설명, 너의 역할, 사용자(한국어 학습자)의 역할에 대해서 전달 받을 것이다. 또한 대화 히스토리도 함께 제공된다.
최근 사용자의 발화와 현재 사용자가 수행해야하는 테스크를 보고 사용자가 현재 과제를 달성했는지 여부를 판단해야한다.

오로지 성공 여부(success: true/false)만 JSON 객체로 응답해라. 다른 필드는 절대 포함하지 마라.
반드시 JSON 객체만 반환한다. (Respond ONLY with a JSON object.)

응답 예시:
{"success": true}`

export function buildCheckSuccessSystemPrompt(): string {
  return CHECK_SUCCESS_SYSTEM_PROMPT
}

// Reuse assistant's scenario processing for consistency
export function buildScenarioSystemMessage(input?: ScenarioPromptInput): string | undefined {
  return buildAssistantScenarioMessage(input)
}

export function buildCheckSuccessMessages(options: {
  scenario?: ScenarioPromptInput
  currentTaskKo?: string
  history?: MessageHistory
  userMessage: string
  assistantText?: string
}) {
  const { scenario, currentTaskKo, history, userMessage, assistantText } = options
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = []

  const system = buildCheckSuccessSystemPrompt()
  messages.push({ role: "system", content: system })

  // Use assistant's scenario processing (includes full task list)
  const scenarioMsg = buildScenarioSystemMessage(scenario)
  if (scenarioMsg && scenarioMsg.trim().length > 0) messages.push({ role: "system", content: scenarioMsg })

  // Add conversation history
  if (history && history.length > 0) history.forEach((m) => messages.push({ role: m.role, content: m.text }))

  // Add current user message
  if (userMessage && userMessage.trim().length > 0) {
    messages.push({ role: "user", content: userMessage })
  }

  // Add current task context
  if (currentTaskKo && currentTaskKo.trim().length > 0) {
    messages.push({ role: "system", content: `현재 테스크: ${currentTaskKo}` })
  }

  // Assistant response is optional - only add if available
  if (assistantText && assistantText.trim().length > 0) {
    messages.push({ role: "assistant", content: assistantText })
  }

  return messages
}


