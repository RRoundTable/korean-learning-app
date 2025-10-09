import { getModelConfig, ModelType, isReasoningModel, getReasoningEffort, isDebugEnabled } from "@/lib/models/config"

// Translation-specific shared utilities
export function getTranslationModel() {
  return getModelConfig(ModelType.TRANSLATE).model
}

// Re-export from centralized config for backward compatibility
export { isReasoningModel, getReasoningEffort, isDebugEnabled }
