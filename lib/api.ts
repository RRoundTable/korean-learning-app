// API utilities for local korean-learning-app APIs
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ''

export interface SttResponse {
  text: string
  language?: string
  durationMs?: number
}

export interface TurnResult {
  agentReply: string
  success: boolean
  nextTaskId?: string | null
  feedback?: string
  score?: number
  hints?: string[]
}

export interface ChatRequest {
  sessionId: string
  userMessage: string
  systemPrompt?: string
  scenarioContext?: {
    scenarioId: string | number
    title: string
    constraints?: Record<string, any>
    tasks: Array<{ id: string; ko: string; en?: string }>
  }
  progress?: {
    currentTaskIndex: number
    completed: number
    total: number
  }
  currentTask?: {
    id: string
    ko: string
    en?: string
  }
  memoryHistory?: Array<{
    role: 'user' | 'assistant'
    text: string
  }>
}

export interface ChatResponse {
  text: string
  createdAt: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  turnResult?: TurnResult
}

export interface TtsRequest {
  text: string
  voiceId?: string
  model?: string
  voiceSettings?: {
    stability?: number
    similarity_boost?: number
    style?: number
    use_speaker_boost?: boolean
  }
}

export interface OpenAiTtsRequest {
  text: string
  voice?: string
  format?: "mp3" | "wav"
  sampleRate?: number
}

export class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  async stt(audioBlob: Blob, options?: { language?: string; prompt?: string }): Promise<SttResponse> {
    const formData = new FormData()
    formData.append('file', audioBlob, 'audio.webm')
    
    if (options?.language) {
      formData.append('language', options.language)
    }
    if (options?.prompt) {
      formData.append('prompt', options.prompt)
    }

    const response = await fetch(`${this.baseUrl}/api/stt`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'STT request failed' }))
      throw new Error(error.error || `STT failed with status ${response.status}`)
    }

    return response.json()
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/api/openai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      credentials: 'include', // Include cookies for auth
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Chat request failed' }))
      throw new Error(error.error || `Chat failed with status ${response.status}`)
    }

    return response.json()
  }

  async tts(request: TtsRequest): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/api/elevenlabs/text-to-speech`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      credentials: 'include', // Include cookies for auth
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'TTS request failed' }))
      throw new Error(error.error || `TTS failed with status ${response.status}`)
    }

    return response.blob()
  }

  async openaiTts(request: OpenAiTtsRequest): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/api/openai/text-to-speech`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'OpenAI TTS request failed' }))
      throw new Error(error.error || `OpenAI TTS failed with status ${response.status}`)
    }

    return response.blob()
  }
}

export const apiClient = new ApiClient()
