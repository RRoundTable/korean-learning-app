import { z } from "zod"
import { getModelConfig, ModelType, isReasoningModel, getReasoningEffort, isDebugEnabled } from "@/lib/models/config"

// Legacy ChatInputSchema for v1 APIs
export const ChatInputSchema = z.object({
  sessionId: z.string().min(1, "sessionId is required"),
  userMessage: z.string().min(1, "userMessage is required"),
  assistantText: z.string().optional(),
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

// Utility functions for v1
export function getModel() {
  return getModelConfig(ModelType.CHAT_ASSISTANT).model
}

// Re-export from centralized config for backward compatibility
export { isReasoningModel, getReasoningEffort, isDebugEnabled }
