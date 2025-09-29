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


