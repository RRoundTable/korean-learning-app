import { z } from "zod"
import { getModelConfig, ModelType, isReasoningModel, getReasoningEffort, isDebugEnabled } from "@/lib/models/config"

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

// Hint API schemas
export const HintResponseSchema = z.object({
  hint: z.string(),
  hintTranslateEn: z.string().optional(),
})

// Evaluation API schemas
export const EvaluationInputSchema = z.object({
  scenarioInfo: z.object({
    title: z.string(),
    task: z.string(),
    description: z.string(),
  }),
  chatHistory: z.array(z.object({
    role: z.enum(["assistant", "feedback", "user"]),
    content: z.string(),
    timestamp: z.string().optional(),
  })),
  completedTasks: z.array(z.object({
    id: z.string(),
    ko: z.string(),
    en: z.string().optional(),
    completedAt: z.string(),
  })),
})

export const EvaluationResponseSchema = z.object({
  axes: z.object({
    task: z.object({
      score: z.number().min(1).max(4),
    }),
    grammar: z.object({
      score: z.number().min(1).max(4),
      error_examples: z.array(z.string()),
    }),
    lexicon: z.object({
      score: z.number().min(1).max(4),
      error_examples: z.array(z.string()),
    }),
    pragmatics: z.object({
      score: z.number().min(1).max(4),
      error_examples: z.array(z.string()),
    }),
  }),
})

export type TaskSuccessResponse = z.infer<typeof TaskSuccessResponseSchema>
export type FeedbackResponse = z.infer<typeof FeedbackResponseSchema>
export type HintResponse = z.infer<typeof HintResponseSchema>
export type EvaluationInput = z.infer<typeof EvaluationInputSchema>
export type EvaluationResponse = z.infer<typeof EvaluationResponseSchema>

// Utility functions
export function getModel() {
  return getModelConfig(ModelType.CHAT_ASSISTANT).model
}

// Re-export from centralized config for backward compatibility
export { isReasoningModel, getReasoningEffort, isDebugEnabled }
