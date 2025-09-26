import { z } from "zod"

export const ChatInputSchema = z.object({
  sessionId: z.string().min(1, "sessionId is required"),
  userMessage: z.string().min(1, "userMessage is required"),
  systemPrompt: z.string().optional(),
  scenarioContext: z.object({
    scenarioId: z.union([z.string(), z.number()]),
    title: z.string(),
    role: z.string().optional(),
    userRole: z.string().optional(),
    constraints: z.record(z.any()).optional(),
    tasks: z.array(z.object({
      id: z.string(),
      ko: z.string(),
      en: z.string().optional(),
    })),
  }).optional(),
  progress: z.object({
    currentTaskIndex: z.number(),
    completed: z.number(),
    total: z.number(),
  }).optional(),
  currentTask: z.object({
    id: z.string(),
    ko: z.string(),
    en: z.string().optional(),
  }).optional(),
  memoryHistory: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        text: z.string().min(1),
      })
    )
    .optional(),
})
export type ChatInput = z.infer<typeof ChatInputSchema>

export const TurnResultSchema = z.object({
  success: z.boolean(),
  nextTaskId: z.string().nullable().optional(),
  score: z.number().min(0).max(100).optional(),
  hint: z.string().nullable().optional(),
  currentTaskId: z.string().optional(),
})
export type TurnResult = z.infer<typeof TurnResultSchema>

export const ChatResponseSchema = z.object({
  text: z.string(),
  createdAt: z.coerce.date(),
  usage: z
    .object({
      promptTokens: z.number(),
      completionTokens: z.number(),
      totalTokens: z.number(),
    })
    .optional(),
  turnResult: TurnResultSchema.optional(),
})
export type ChatResponse = z.infer<typeof ChatResponseSchema>

export type TargetKind = "assistant" | "metadata"

export function buildMessages(input: ChatInput, target: TargetKind) {
  const { systemPrompt, scenarioContext, currentTask, memoryHistory, userMessage } = input
  let messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = []

  let BasicSystemPrompt = systemPrompt
  let scenarioSystemMessage: string | undefined
  if (scenarioContext && currentTask) {
    BasicSystemPrompt = `너는 지금 한국어로 역할극을 하고 있다.
너의 역할은 사용자와 함께 역할극을 진행하는 것이다.
사용자는 한국어를 공부하는 외국인이다. 외국인이 한국어를 사용하여 너와 함께 역할극을 진행할 것이다.
역할극의 목표는 사용자가 한국어를 사용해서 원하는 목적을 달성하는 것이다.

사용자는 정해진 목표가 있지만, 부족한 정보가 있고, 너는 사용자가 상대방 역할을 하며 사용자가 올바른 한국어로 말했을때 부족한 정보에 대한 힌트를 제공할 것이다.
예를 들어, 너의 역할이 카페 알바생이고, 사용자가 고객이라면, 너는 카페의 메뉴 구성 및 가격을 알고 있지만, 사용자는 모른다.
이때 사용자는 올바른 한국어를 구성하여 자신이 원하는 음료를 시켜야한다.
`

    scenarioSystemMessage = `
시나리오 제목: ${scenarioContext.title}
달성해야하는 작업들: ${scenarioContext.tasks.map((task: any) => task.ko).join(", ")}
역할: ${scenarioContext.role}
상대방 역할: ${scenarioContext.userRole}
`
  }

  if (BasicSystemPrompt && BasicSystemPrompt.trim().length > 0) {
    messages.push({ role: "system", content: BasicSystemPrompt })
  }
  if (scenarioSystemMessage && scenarioSystemMessage.trim().length > 0) {
    messages.push({ role: "system", content: scenarioSystemMessage })
  }

  if (memoryHistory && Array.isArray(memoryHistory) && memoryHistory.length > 0) {
    memoryHistory.forEach((m) => {
      messages.push({ role: m.role, content: m.text })
    })
  }

  const expandedUserMessage = `
    currentTask: ${currentTask?.ko}
    userMessage: ${userMessage}
    `
  const last = messages[messages.length - 1]
  const userContent = target === "metadata" ? expandedUserMessage : String(userMessage)
  const shouldAppend = !last || last.role !== "user" || (String(last.content || "").trim() !== String(userContent).trim())
  if (shouldAppend) {
    messages.push({ role: "user", content: userContent })
  }

  return messages
}

export function getModel() {
  return process.env.OPENAI_CHAT_MODEL || "gpt-4.1-nano"
}

export function isDebugEnabled() {
  return process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_DEBUG_MODE === "true"
}


