import { z } from 'zod';

// Scenario status enum
export const ScenarioStatus = z.enum(['draft', 'public', 'archived']);
export type ScenarioStatus = z.infer<typeof ScenarioStatus>;

// Task schema for admin operations
export const AdminTaskSchema = z.object({
  id: z.string().optional(), // Optional for new tasks
  ko: z.string().min(1, 'Korean text is required'),
  en: z.string().min(1, 'English text is required'),
});

// Scenario creation schema
export const CreateScenarioSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  title_en: z.string().min(1, 'English title is required'),
  role: z.string().min(1, 'Role is required'),
  user_role: z.string().min(1, 'User role is required'),
  description: z.string().min(1, 'Description is required'),
  description_en: z.string().min(1, 'English description is required'),
  emoji: z.string().optional(),
  is_free: z.boolean().default(false),
  tts_voice: z.string().optional(),
  tts_instructions: z.string().optional(),
  stt_prompt: z.string().optional(),
  initial_message_text: z.string().optional(),
  initial_message_translation: z.string().optional(),
  status: ScenarioStatus.default('draft'),
  tasks: z.array(AdminTaskSchema).min(1, 'At least one task is required'),
});

// Scenario update schema
export const UpdateScenarioSchema = CreateScenarioSchema.partial().extend({
  id: z.string(),
  tasks: z.array(AdminTaskSchema).optional(),
  status: ScenarioStatus.default('draft'),
});

// Status update schema
export const UpdateStatusSchema = z.object({
  status: ScenarioStatus,
});

// Query parameters for listing scenarios
export const ListScenariosQuerySchema = z.object({
  status: ScenarioStatus.optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

// Response schemas
export const ScenarioListResponseSchema = z.object({
  scenarios: z.array(z.object({
    id: z.string(),
    title: z.string(),
    title_en: z.string(),
    role: z.string(),
    user_role: z.string(),
    description: z.string(),
    description_en: z.string(),
    emoji: z.string().nullable(),
    is_free: z.number(),
    tts_voice: z.string().nullable(),
    tts_instructions: z.string().nullable(),
    stt_prompt: z.string().nullable(),
    initial_message_text: z.string().nullable(),
    initial_message_translation: z.string().nullable(),
    status: ScenarioStatus,
    created_at: z.string(),
    updated_at: z.string(),
    task_count: z.number(),
  })),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    total_pages: z.number(),
  }),
});

export const ScenarioResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  title_en: z.string(),
  role: z.string(),
  user_role: z.string(),
  description: z.string(),
  description_en: z.string(),
  emoji: z.string().nullable(),
  is_free: z.number(),
  tts_voice: z.string().nullable(),
  tts_instructions: z.string().nullable(),
  stt_prompt: z.string().nullable(),
  initial_message_text: z.string().nullable(),
  initial_message_translation: z.string().nullable(),
  status: ScenarioStatus,
  created_at: z.string(),
  updated_at: z.string(),
  tasks: z.array(z.object({
    id: z.string(),
    scenario_id: z.string(),
    idx: z.number(),
    ko: z.string(),
    en: z.string(),
  })),
});

// Type exports
export type CreateScenarioInput = z.infer<typeof CreateScenarioSchema>;
export type UpdateScenarioInput = z.infer<typeof UpdateScenarioSchema>;
export type UpdateStatusInput = z.infer<typeof UpdateStatusSchema>;
export type ListScenariosQuery = z.infer<typeof ListScenariosQuerySchema>;
export type ScenarioListResponse = z.infer<typeof ScenarioListResponseSchema>;
export type ScenarioResponse = z.infer<typeof ScenarioResponseSchema>;
export type AdminTask = z.infer<typeof AdminTaskSchema>;
