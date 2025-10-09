import { z } from "zod"

// Common input schema for all v2 APIs
export const V2InputSchema = z.object({
  currentTask: z.object({
    id: z.string(),
    ko: z.string(),
    en: z.string().optional(),
  }),
  user_msg: z.string().min(1, "user_msg is required"),
  memoryHistory: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      text: z.string().min(1),
    })
  ).optional(),
  scenarioContext: z.object({
    scenarioId: z.union([z.string(), z.number()]),
    title: z.string(),
    assistantRole: z.string().optional(),
    userRole: z.string().optional(),
    description: z.string().optional(),
    constraints: z.record(z.any()).optional(),
    tasks: z.array(
      z.object({
        id: z.string(),
        ko: z.string(),
        en: z.string().optional(),
      })
    ).optional(),
  }).optional(),
})

export type V2Input = z.infer<typeof V2InputSchema>

// Individual API response schemas
export const TaskSuccessResponseSchema = z.object({
  currentTask: z.boolean(),
})

export const FeedbackResponseSchema = z.object({
  feedback: z.string(),
})

export type TaskSuccessResponse = z.infer<typeof TaskSuccessResponseSchema>
export type FeedbackResponse = z.infer<typeof FeedbackResponseSchema>

// Utility functions
export function getModel() {
  return process.env.OPENAI_CHAT_MODEL || "gpt-5"
}

export function isReasoningModel(model?: string): boolean {
  const modelName = model || getModel()
  return modelName.startsWith("gpt-5")
}

export function getReasoningEffort(model?: string): string | undefined {
  return isReasoningModel(model) ? "minimal" : undefined
}

export function isDebugEnabled() {
  return process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_DEBUG_MODE === "true"
}
