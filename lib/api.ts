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

export interface OpenAiTtsStreamOptions extends OpenAiTtsRequest {
  sessionId: string
}

export class ApiClient {
  private baseUrl: string
  private debugMode: boolean

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
    this.debugMode = process.env.NODE_ENV === 'development' && 
                    process.env.NEXT_PUBLIC_DEBUG_MODE === 'true'
  }

  private logRequest(method: string, url: string, data?: any) {
    if (this.debugMode) {
      console.group(`🚀 API Request: ${method} ${url}`)
      console.log('Request data:', data)
      console.groupEnd()
    }
  }

  private logResponse(method: string, url: string, response: any) {
    if (this.debugMode) {
      console.group(`📥 API Response: ${method} ${url}`)
      console.log('Response data:', response)
      console.groupEnd()
    }
  }

  async stt(audioBlob: Blob, options?: { language?: string; prompt?: string }): Promise<SttResponse> {
    this.logRequest('POST', '/api/openai/speech-to-text', { options, audioSize: audioBlob.size })
    
    const formData = new FormData()
    formData.append('file', audioBlob, 'audio.webm')
    
    if (options?.language) {
      formData.append('language', options.language)
    }
    if (options?.prompt) {
      formData.append('prompt', options.prompt)
    }

    const response = await fetch(`${this.baseUrl}/api/openai/speech-to-text`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'STT request failed' }))
      throw new Error(error.error || `STT failed with status ${response.status}`)
    }

    const data = await response.json()
    this.logResponse('POST', '/api/openai/speech-to-text', data)
    return data
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    this.logRequest('POST', '/api/openai/chat', request)
    
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

    const data = await response.json()
    this.logResponse('POST', '/api/openai/chat', data)
    return data
  }

  async tts(request: TtsRequest): Promise<Blob> {
    this.logRequest('POST', '/api/elevenlabs/text-to-speech', request)
    
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

    const blob = await response.blob()
    this.logResponse('POST', '/api/elevenlabs/text-to-speech', { blobSize: blob.size, type: blob.type })
    return blob
  }

  // Streaming-friendly: return a URL that the <audio> element can progressively play
  openaiTtsStreamUrl(options: OpenAiTtsStreamOptions): string {
    const params = new URLSearchParams()
    params.set('sessionId', options.sessionId)
    params.set('text', options.text)
    if (options.voice) params.set('voice', options.voice)
    if (options.format) params.set('format', options.format)
    if (options.sampleRate != null) params.set('sampleRate', String(options.sampleRate))
    const url = `${this.baseUrl}/api/openai/text-to-speech?${params.toString()}`
    this.logRequest('GET', '/api/openai/text-to-speech', Object.fromEntries(params))
    return url
  }

  // Low-level streaming: fetch and expose the ReadableStream and content type
  async openaiTtsStream(options: OpenAiTtsStreamOptions): Promise<{ stream: ReadableStream<Uint8Array>, contentType: string }> {
    const url = this.openaiTtsStreamUrl(options)
    const response = await fetch(url)
    if (!response.ok || !response.body) {
      const errorText = await response.text().catch(() => '')
      throw new Error(errorText || `OpenAI TTS stream failed with status ${response.status}`)
    }
    const contentType = response.headers.get('Content-Type') || 'audio/mpeg'
    this.logResponse('GET', '/api/openai/text-to-speech', { contentType })
    return { stream: response.body as ReadableStream<Uint8Array>, contentType }
  }
}

export const apiClient = new ApiClient()
