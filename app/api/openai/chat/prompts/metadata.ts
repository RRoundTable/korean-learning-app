import { ScenarioPromptInput, MessageHistory } from "./types"


const METADATA_SYSTEM_PROMPT  =
`너는 한국어 학습자의 한국어 발화를 평가하는 역할이다.
사용자는 한국어를 공부하는 학생이고 너는 학생의 한국어 발화를 평가하는 역할이다.
너는 학생의 발화 히스토리를 제공받을 것이고 시나리오와 현재 수행해야하는 작업정보를 전달 받을 것이다.
이 정보를 바탕으로 아래 형식에 맞게 응답하라. 반드시 json 객체로만 응답하라. (Respond ONLY with a JSON object.)

응답형식:
{
  "success": boolean,
  "score": number,
  "hint": string,
  "currentTaskId": string
}
success는 유저의 답변이 올바른지 여부를 나타낸다.
hint는 유저가 다음 답변을 할때 사용할 수 있는 구문 예시를 제공한다.
구문 예시는 유저가 답을 할때 활용할 수 있는 문장으로 모든 정보를 제공하지 않는다.
대신에 유저가 답변에 활용할 수 있다.
를 들어 유저의 현재 Task가 메뉴의 가격을 알바생에게 물어보는 것이라면 다음과 같이 힌트를 제시할 수 있다.
- 00은 얼마인가요?
currentTaskId는 현재 과제의 ID를 나타낸다.`

export function buildMetadataSystemPrompt(): string {
  return METADATA_SYSTEM_PROMPT
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

export function buildMetadataMessages(options: {
  scenario?: ScenarioPromptInput
  currentTaskKo?: string
  history?: MessageHistory
  userMessage: string
}) {
  const { scenario, currentTaskKo, history, userMessage } = options
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = []

  const system = buildMetadataSystemPrompt()
  if (system) messages.push({ role: "system", content: system })

  const scenarioMsg = buildScenarioSystemMessage(scenario)
  if (scenarioMsg && scenarioMsg.trim().length > 0) messages.push({ role: "system", content: scenarioMsg })

  if (history && history.length > 0) history.forEach((m) => messages.push({ role: m.role, content: m.text }))

  const expandedUserMessage = `\ncurrentTask: ${currentTaskKo || ""}\nuserMessage: ${userMessage}\n`
  const last = messages[messages.length - 1]
  const shouldAppend = !last || last.role !== "user" || (String(last.content || "").trim() !== String(expandedUserMessage).trim())
  if (shouldAppend) messages.push({ role: "user", content: expandedUserMessage })

  return messages
}


