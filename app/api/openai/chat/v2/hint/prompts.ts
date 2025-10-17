import { V2Input } from "../_shared"

export function buildHintMessages(input: V2Input) {
  const { currentTask, user_msg, memoryHistory, scenarioContext } = input

  const system = [
    {
      role: "system" as const,
      content:
        "You are a helpful Korean conversation coach. Provide a short, actionable hint (one sentence) in Korean that helps the user progress the current task. Do not reveal full answers."
    },
  ]

  const context = [
    {
      role: "system" as const,
      content: `Scenario: ${scenarioContext?.title || ""}\nCurrent Task: ${currentTask.ko}${currentTask.en ? ` (${currentTask.en})` : ""}`,
    },
  ]

  const history = (memoryHistory || []).map(h => ({ role: h.role, content: h.text }))

  const user = [
    {
      role: "user" as const,
      content: `User message: ${user_msg}\nPlease return only a short Korean hint (<= 20 words).`
    }
  ]

  return [...system, ...context, ...history, ...user]
}


