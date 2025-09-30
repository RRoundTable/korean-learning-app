import { z } from "zod"

export const ChatInputSchema = z.object({
  sessionId: z.string().min(1, "sessionId is required"),
  userMessage: z.string().min(1, "userMessage is required"),
  assistantText: z.string().optional(),
  // systemPrompt removed; prompts are centralized in prompts/*
  scenarioContext: z
    .object({
      scenarioId: z.union([z.string(), z.number()]),
      title: z.string(),
      assistantRole: z.string().optional(),
      userRole: z.string().optional(),
      description: z.string().min(1, "description is required"),
      constraints: z.record(z.any()).optional(),
      tasks: z.array(
        z.object({
          id: z.string(),
          ko: z.string(),
          en: z.string().optional(),
        })
      ).optional(),
    }),
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

// Prompt building moved to app/api/openai/chat/prompts/*

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


