/**
 * Monitoring and logging for reasoning effort usage
 */

import { isDebugEnabled } from "@/lib/models/config"

/**
 * Log reasoning effort usage for monitoring and debugging
 */
export function logReasoningEffortUsage(endpoint: string, reasoningEffort: string | undefined, modelType: string) {
  if (isDebugEnabled()) {
    console.log(`[REASONING_EFFORT] ${endpoint}: ${reasoningEffort || 'none'} (${modelType})`)
  }
}

/**
 * Log API request with reasoning effort information
 */
export function logAPIRequest(endpoint: string, modelType: string, reasoningEffort: string | undefined, additionalInfo?: Record<string, any>) {
  if (isDebugEnabled()) {
    const logData = {
      endpoint,
      modelType,
      reasoningEffort: reasoningEffort || 'none',
      timestamp: new Date().toISOString(),
      ...additionalInfo
    }
    console.log(`[API_REQUEST]`, logData)
  }
}

/**
 * Log API response with performance metrics
 */
export function logAPIResponse(endpoint: string, status: number, responseTime: number, tokenUsage?: { promptTokens: number; completionTokens: number; totalTokens: number }) {
  if (isDebugEnabled()) {
    const logData = {
      endpoint,
      status,
      responseTime: `${responseTime}ms`,
      tokenUsage,
      timestamp: new Date().toISOString()
    }
    console.log(`[API_RESPONSE]`, logData)
  }
}

/**
 * Get reasoning effort statistics for monitoring
 */
export function getReasoningEffortStats() {
  return {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    debugMode: isDebugEnabled()
  }
}
