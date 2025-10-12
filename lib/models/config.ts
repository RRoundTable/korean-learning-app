/**
 * Centralized model configuration system
 * Manages OpenAI model settings across all API endpoints
 */

export enum ModelType {
  CHAT_ASSISTANT = 'CHAT_ASSISTANT',
  CHAT_HINT = 'CHAT_HINT', 
  CHAT_FEEDBACK = 'CHAT_FEEDBACK',
  CHAT_TASK_SUCCESS = 'CHAT_TASK_SUCCESS',
  EVALUATION = 'EVALUATION',           // HIGH reasoning effort
  TRANSLATE = 'TRANSLATE',             // MINIMAL reasoning effort
  TTS = 'TTS',
  STT = 'STT'
}

export interface ModelConfig {
  model: string
  reasoningEffort?: string
  maxTokens?: number
  temperature?: number
  isReasoningModel?: boolean
}

// Default model configurations
const DEFAULT_MODELS: Record<ModelType, string> = {
  [ModelType.CHAT_ASSISTANT]: 'gpt-4.1-mini',
  [ModelType.CHAT_HINT]: 'gpt-4.1-mini',
  [ModelType.CHAT_FEEDBACK]: 'gpt-4.1-mini',
  [ModelType.CHAT_TASK_SUCCESS]: 'gpt-4.1-mini',
  [ModelType.EVALUATION]: 'gpt-5-mini',
  [ModelType.TRANSLATE]: 'gpt-4.1-nano',
  [ModelType.TTS]: 'tts-1',
  [ModelType.STT]: 'gpt-4o-mini-transcribe'
}

// Environment variable mapping
const ENV_VAR_MAPPING: Record<ModelType, string> = {
  [ModelType.CHAT_ASSISTANT]: 'OPENAI_CHAT_ASSISTANT_MODEL',
  [ModelType.CHAT_HINT]: 'OPENAI_CHAT_HINT_MODEL',
  [ModelType.CHAT_FEEDBACK]: 'OPENAI_CHAT_FEEDBACK_MODEL',
  [ModelType.CHAT_TASK_SUCCESS]: 'OPENAI_CHAT_TASK_SUCCESS_MODEL',
  [ModelType.EVALUATION]: 'OPENAI_EVALUATION_MODEL',
  [ModelType.TRANSLATE]: 'OPENAI_TRANSLATE_MODEL',
  [ModelType.TTS]: 'OPENAI_TTS_MODEL',
  [ModelType.STT]: 'OPENAI_STT_MODEL'
}

// Reasoning effort mapping
const REASONING_EFFORT_MAPPING: Record<ModelType, string | undefined> = {
  [ModelType.CHAT_ASSISTANT]: undefined,
  [ModelType.CHAT_HINT]: undefined,
  [ModelType.CHAT_FEEDBACK]: undefined,
  [ModelType.CHAT_TASK_SUCCESS]: undefined,
  [ModelType.EVALUATION]: 'low',        // HIGH for evaluation
  [ModelType.TRANSLATE]: undefined,
  [ModelType.TTS]: undefined,             // Not applicable
  [ModelType.STT]: undefined              // Not applicable
}

// Environment variable mapping for reasoning effort
const REASONING_EFFORT_ENV_MAPPING: Record<ModelType, string> = {
  [ModelType.CHAT_ASSISTANT]: 'OPENAI_CHAT_REASONING_EFFORT',
  [ModelType.CHAT_HINT]: 'OPENAI_CHAT_REASONING_EFFORT',
  [ModelType.CHAT_FEEDBACK]: 'OPENAI_CHAT_REASONING_EFFORT',
  [ModelType.CHAT_TASK_SUCCESS]: 'OPENAI_CHAT_REASONING_EFFORT',
  [ModelType.EVALUATION]: 'OPENAI_EVALUATION_REASONING_EFFORT',
  [ModelType.TRANSLATE]: 'OPENAI_TRANSLATE_REASONING_EFFORT',
  [ModelType.TTS]: '',                    // Not applicable
  [ModelType.STT]: ''                     // Not applicable
}

/**
 * Get model configuration for a specific type
 */
export function getModelConfig(type: ModelType): ModelConfig {
  const envVar = ENV_VAR_MAPPING[type]
  const envModel = process.env[envVar]
  const defaultModel = DEFAULT_MODELS[type]
  
  // Use environment variable if set, otherwise use default
  const model = envModel || defaultModel
  
  // Check for fallback to legacy OPENAI_CHAT_MODEL for chat endpoints
  if (!envModel && isChatModel(type) && process.env.OPENAI_CHAT_MODEL) {
    const model = process.env.OPENAI_CHAT_MODEL
    return createModelConfig(model, type)
  }
  
  return createModelConfig(model, type)
}

/**
 * Get model string for a specific type (backward compatibility)
 */
export function getModel(type: ModelType): string {
  return getModelConfig(type).model
}

/**
 * Check if a model is a reasoning model
 */
export function isReasoningModel(model?: string): boolean {
  const modelName = model || getModel(ModelType.CHAT_ASSISTANT)
  return modelName.startsWith('gpt-5') || modelName.includes('reasoning')
}

/**
 * Get reasoning effort for a model type
 */
export function getReasoningEffort(modelType: ModelType): string | undefined {
  // Check for environment variable override first
  const envVar = REASONING_EFFORT_ENV_MAPPING[modelType]
  if (envVar && process.env[envVar]) {
    return process.env[envVar]
  }
  
  // Fall back to default mapping
  return REASONING_EFFORT_MAPPING[modelType]
}

/**
 * Get reasoning effort for a model (backward compatibility)
 */
export function getReasoningEffortForModel(model?: string): string | undefined {
  return isReasoningModel(model) ? 'minimal' : undefined
}

/**
 * Check if debug mode is enabled
 */
export function isDebugEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_DEBUG_MODE === 'true'
}

/**
 * Create model configuration object
 */
function createModelConfig(model: string, type: ModelType): ModelConfig {
  return {
    model,
    reasoningEffort: getReasoningEffort(type),
    isReasoningModel: isReasoningModel(model),
    maxTokens: getMaxTokensForModel(model),
    temperature: getTemperatureForModel(model)
  }
}

/**
 * Check if model type is a chat model
 */
function isChatModel(type: ModelType): boolean {
  return [
    ModelType.CHAT_ASSISTANT,
    ModelType.CHAT_HINT,
    ModelType.CHAT_FEEDBACK,
    ModelType.CHAT_TASK_SUCCESS
  ].includes(type)
}

/**
 * Get max tokens for a specific model
 */
function getMaxTokensForModel(model: string): number | undefined {
  if (model.includes('nano')) return 1000
  if (model.includes('mini')) return 2000
  if (model.includes('gpt-5')) return 4000
  return undefined
}

/**
 * Get temperature for a specific model
 */
function getTemperatureForModel(model: string): number | undefined {
  if (model.includes('translate') || model.includes('nano')) return 0.3
  if (model.includes('reasoning')) return 0.1
  return undefined
}

/**
 * Validate all model configurations
 */
export function validateModelConfigs(): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  for (const [type, envVar] of Object.entries(ENV_VAR_MAPPING)) {
    const envValue = process.env[envVar]
    if (envValue && !isValidModelName(envValue)) {
      errors.push(`Invalid model name '${envValue}' for ${envVar}`)
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Check if model name is valid
 */
function isValidModelName(model: string): boolean {
  const validModels = [
    'gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-5', 'gpt-4o', 'gpt-4o-mini', 'gpt-4o-mini-transcribe',
    'tts-1', 'tts-1-hd', 'whisper-1'
  ]
  
  return validModels.some(validModel => model.includes(validModel))
}

/**
 * Get all configured models (for debugging)
 */
export function getAllModelConfigs(): Record<string, ModelConfig> {
  const configs: Record<string, ModelConfig> = {}
  
  for (const type of Object.values(ModelType)) {
    configs[type] = getModelConfig(type)
  }
  
  return configs
}
