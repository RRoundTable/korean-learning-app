import { z } from "zod"

export const ScenarioTaskSchema = z.object({
  id: z.string(),
  ko: z.string(),
  en: z.string().optional(),
})

export const ScenarioPromptInputSchema = z.object({
  scenarioId: z.union([z.string(), z.number()]),
  title: z.string(),
  assistantRole: z.string().optional(),
  userRole: z.string().optional(),
  description: z.string().optional(),
  constraints: z.record(z.any()).optional(),
  tasks: z.array(ScenarioTaskSchema).optional(),
})

export type ScenarioPromptInput = z.infer<typeof ScenarioPromptInputSchema>

export const MemoryTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string().min(1),
})

export const MessageHistorySchema = z.array(MemoryTurnSchema)

export type MemoryTurn = z.infer<typeof MemoryTurnSchema>
export type MessageHistory = z.infer<typeof MessageHistorySchema>


// Assistant model response schema (single source of truth)
export const AssistantResponseSchema = z.object({
  msg: z.string().nullable(),
  show_msg: z.boolean(),
  feedback: z.string().nullable(),
  task_success: z.array(z.boolean()),
})

export type AssistantResponse = z.infer<typeof AssistantResponseSchema>


