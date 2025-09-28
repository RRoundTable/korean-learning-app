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
  score: z.number().min(0).max(100).optional(),
  hint: z.string().nullable().optional(),
  hintTranslateEn: z.string().nullable().optional(),
  currentTaskId: z.string().nullable().optional(),
})
export type TurnResult = z.infer<typeof TurnResultSchema>

export const ChatResponseSchema = z.object({
  text: z.string(),
  translateEn: z.string().optional(),
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

// System Prompts
export const SYSTEM_PROMPTS = {
  // Basic roleplay system prompt for both assistant and metadata
  ROLEPLAY_BASIC: `너는 지금 한국어로 역할극을 하고 있다.
너의 역할은 사용자와 함께 역할극을 진행하는 것이다.
사용자는 한국어를 공부하는 외국인이다. 외국인이 한국어를 사용하여 너와 함께 역할극을 진행할 것이다.
역할극의 목표는 사용자가 한국어를 사용해서 원하는 목적을 달성하는 것이다.

사용자는 정해진 목표가 있지만, 부족한 정보가 있고, 너는 사용자가 상대방 역할을 하며 사용자가 올바른 한국어로 말했을때 부족한 정보에 대한 힌트를 제공할 것이다.
예를 들어, 너의 역할이 카페 알바생이고, 사용자가 고객이라면, 너는 카페의 메뉴 구성 및 가격을 알고 있지만, 사용자는 모른다.
이때 사용자는 올바른 한국어를 구성하여 자신이 원하는 음료를 시켜야한다.`,

  // Assistant-specific system prompt
  ASSISTANT_ROLE: `역할극 상대방의 발화(한국어)이다. 절대 선생님처럼 말하지마. 역할극에 몰입해. 한문장만 말해.`,

  // Metadata evaluation system prompt
  METADATA_EVALUATOR: `Role: Evaluator. Return ONLY a JSON object that matches the provided schema. Include success, score 0-100, hint (single helpful Korean phrase for the user to say), currentTaskId. No conversational text.
success는 유저의 답변이 올바른지 여부를 나타낸다.
hint는 유저가 다음 답변을 할때 사용할 수 있는 구문 예시를 제공한다. 구문 예시는 유저가 답을 할때 활용할 수 있는 문장으로 모든 정보를 제공하지 않는다. 대신에 유저가 답변에 활용할 수 있다.
예를 들어 유저의 현재 Task가 메뉴의 가격을 알바생에게 물어보는 것이라면 다음과 같이 힌트를 제시할 수 있다.
- 00은 얼마인가요?
currentTaskId는 현재 과제의 ID를 나타낸다.`
}

export function buildAssistantMessages(input: ChatInput) {
  const { systemPrompt, scenarioContext, currentTask, memoryHistory, userMessage } = input
  let messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = []

  // System prompts first - these should be at the very top
  let BasicSystemPrompt = systemPrompt
  let scenarioSystemMessage: string | undefined
  if (scenarioContext && currentTask) {
    BasicSystemPrompt = SYSTEM_PROMPTS.ROLEPLAY_BASIC

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
  
  // Add assistant-specific system prompt
  messages.push({ role: "system", content: SYSTEM_PROMPTS.ASSISTANT_ROLE })

  // Then conversation history
  if (memoryHistory && Array.isArray(memoryHistory) && memoryHistory.length > 0) {
    memoryHistory.forEach((m) => {
      messages.push({ role: m.role, content: m.text })
    })
  }

  // Finally, current user message
  const last = messages[messages.length - 1]
  const shouldAppend = !last || last.role !== "user" || (String(last.content || "").trim() !== String(userMessage).trim())
  if (shouldAppend) {
    messages.push({ role: "user", content: userMessage })
  }

  return messages
}

export function buildMetadataMessages(input: ChatInput) {
  const { systemPrompt, scenarioContext, currentTask, memoryHistory, userMessage } = input
  let messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = []

  // System prompts first - these should be at the very top
  let BasicSystemPrompt = systemPrompt
  let scenarioSystemMessage: string | undefined
  if (scenarioContext && currentTask) {
    BasicSystemPrompt = SYSTEM_PROMPTS.ROLEPLAY_BASIC

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
  
  // Add metadata evaluator system prompt
  messages.push({ role: "system", content: SYSTEM_PROMPTS.METADATA_EVALUATOR })

  // Then conversation history
  if (memoryHistory && Array.isArray(memoryHistory) && memoryHistory.length > 0) {
    memoryHistory.forEach((m) => {
      messages.push({ role: m.role, content: m.text })
    })
  }

  // Finally, current user message with task context for metadata evaluation
  const expandedUserMessage = `
currentTask: ${currentTask?.ko}
userMessage: ${userMessage}
`
  const last = messages[messages.length - 1]
  const shouldAppend = !last || last.role !== "user" || (String(last.content || "").trim() !== String(expandedUserMessage).trim())
  if (shouldAppend) {
    messages.push({ role: "user", content: expandedUserMessage })
  }

  return messages
}

export function getModel() {
  return process.env.OPENAI_CHAT_MODEL || "gpt-4.1-nano"
}

export function isDebugEnabled() {
  return process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_DEBUG_MODE === "true"
}

export async function translateToEnglish(koreanText: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY")
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a professional translator. Translate the given Korean text to natural, fluent English. Return only the translation without any additional text or explanations."
        },
        {
          role: "user",
          content: koreanText
        }
      ],
      max_tokens: 500,
      temperature: 0.3
    })
  })

  if (!response.ok) {
    throw new Error(`Translation API error: ${response.status}`)
  }

  const data = await response.json()
  return data.choices[0].message.content.trim()
}


