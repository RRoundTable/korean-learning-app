import { EvaluationInput, EvaluationResponse } from '@/lib/types/evaluation'

export async function evaluateKoreanLevel(input: EvaluationInput): Promise<EvaluationResponse> {
  const response = await fetch('/api/openai/chat/v2/evaluation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
  }

  const data = await response.json()
  return data
}
