// API utilities for local korean-learning-app APIs
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ''

export interface SttResponse {
  text: string
  language?: string
  durationMs?: number
}

export interface TurnResult {
  success: boolean
}

export interface ChatRequest {
  sessionId: string
  userMessage: string
  assistantText?: string
  scenarioContext?: {
    scenarioId: string | number
    title: string
    assistantRole?: string
    userRole?: string
    description?: string
    constraints?: Record<string, any>
    tasks?: Array<{ id: string; ko: string; en?: string }>
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
  translateEn?: string
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
  instructions?: string
}

export interface TranslateRequest {
  text: string
  targetLanguage?: string
}

export interface TranslateResponse {
  translateEn: string
}

export class ApiClient {
  private baseUrl: string
  private debugMode: boolean
  private audioCache: Map<string, string> = new Map()

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

  // Deprecated chat() removed. Use chatAssistant() and chatMetadata() instead.

  // Conversation assistant response (validated shape)
  async chatAssistant(request: ChatRequest): Promise<{ 
    msg: string | null; 
    show_msg: boolean; 
    feedback: string | null;
    task_success: boolean[];
    createdAt?: string;
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  }> {
    // Always use v2
    return this.chatAssistantV2(request)
  }

  // V2 API implementation with parallel processing
  private async chatAssistantV2(request: ChatRequest): Promise<{ 
    msg: string | null; 
    show_msg: boolean; 
    feedback: string | null;
    task_success: boolean[];
    createdAt?: string;
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  }> {
    if (!request.currentTask) {
      throw new Error('currentTask is required for v2 API')
    }

    const v2Request = {
      currentTask: request.currentTask,
      user_msg: request.userMessage,
      memoryHistory: request.memoryHistory,
      scenarioContext: request.scenarioContext
    }

    try {
      // Call all 3 v2 APIs in parallel
      const [assistantRes, taskSuccessRes, feedbackRes] = await Promise.allSettled([
        this.callV2Assistant(v2Request),
        this.callV2TaskSuccess(v2Request),
        this.callV2Feedback(v2Request)
      ])

      let assistant: string | null = null
      let feedback: string | null = null
      let taskSuccess: boolean = false

      // Process assistant response
      if (assistantRes.status === 'fulfilled') {
        assistant = assistantRes.value
      }

      // Process task success response
      if (taskSuccessRes.status === 'fulfilled') {
        taskSuccess = taskSuccessRes.value.currentTask
      }

      // Process feedback response
      if (feedbackRes.status === 'fulfilled') {
        feedback = feedbackRes.value
      }

      // Determine what to show based on task success
      const show_msg = taskSuccess
      const msg = taskSuccess ? assistant : null
      const finalFeedback = taskSuccess ? null : feedback

      // Create task_success array compatible with v1 format
      // Preserve existing completed tasks and only update current task status
      const totalTasks = request.scenarioContext?.tasks?.length || 1
      const currentTaskIndex = request.scenarioContext?.tasks?.findIndex(
        (task: any) => task.ko === request.currentTask?.ko
      ) || 0
      
      // Get current progress from the request to preserve completed tasks
      const currentProgress = request.progress || { completed: 0, total: totalTasks }
      
      // Initialize task_success array preserving already completed tasks
      const task_success = new Array(totalTasks).fill(false)
      
      // Mark all previously completed tasks as successful
      for (let i = 0; i < currentProgress.completed; i++) {
        task_success[i] = true
      }
      
      if (taskSuccess) {
        // Current task succeeded: mark current task as successful
        if (currentTaskIndex >= 0 && currentTaskIndex < totalTasks) {
          task_success[currentTaskIndex] = true
        }
      } else {
        // Current task failed: only mark current task as failed (already false by default)
        // No need to explicitly set to false as array is initialized with false
      }

      return {
        msg,
        show_msg,
        feedback: finalFeedback,
        task_success,
        createdAt: new Date().toISOString()
      }
    } catch (error) {
      console.error('V2 API error:', error)
      throw new Error('V2 API failed')
    }
  }

  private async callV2Assistant(request: { currentTask: any; user_msg: string; memoryHistory?: any; scenarioContext?: any }): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/openai/chat/v2/assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    })
    if (!response.ok) throw new Error(`Assistant v2 failed: ${response.status}`)
    return await response.text()
  }

  private async callV2TaskSuccess(request: { currentTask: any; user_msg: string; memoryHistory?: any; scenarioContext?: any }): Promise<{ currentTask: boolean }> {
    const response = await fetch(`${this.baseUrl}/api/openai/chat/v2/task-success`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    })
    if (!response.ok) throw new Error(`Task success v2 failed: ${response.status}`)
    return await response.json()
  }

  private async callV2Feedback(request: { currentTask: any; user_msg: string; memoryHistory?: any; scenarioContext?: any }): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/openai/chat/v2/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    })
    if (!response.ok) throw new Error(`Feedback v2 failed: ${response.status}`)
    return await response.text()
  }

  // Deprecated: chatCheckSuccess removed - now integrated into chatAssistant

  async chatHint(request: ChatRequest): Promise<{ hint: string; hintTranslateEn?: string | null }> {
    if (!request.currentTask) {
      throw new Error('currentTask is required for hint v2')
    }
    const v2Request = {
      currentTask: request.currentTask,
      user_msg: request.userMessage,
      memoryHistory: request.memoryHistory,
      scenarioContext: request.scenarioContext
    }
    const url = `${this.baseUrl}/api/openai/chat/v2/hint`
    this.logRequest('POST', url, request)
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(v2Request),
      credentials: 'include',
    })
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Hint request failed' }))
      throw new Error(err.error || `Hint failed with status ${response.status}`)
    }
    const data = await response.json()
    this.logResponse('POST', '/api/openai/chat/hint', data)
    return data as { hint: string; hintTranslateEn?: string | null }
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
    if (options.instructions) params.set('instructions', options.instructions)
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

  // Get cached TTS URL or generate new one
  getCachedTtsUrl(text: string, options: Omit<OpenAiTtsStreamOptions, 'text'>): string {
    const cacheKey = `${text}|${options.sessionId}|${options.voice || 'nova'}|${options.format || 'mp3'}|${options.instructions || 'default'}`
    
    if (this.audioCache.has(cacheKey)) {
      return this.audioCache.get(cacheKey)!
    }
    
    const url = this.openaiTtsStreamUrl({ ...options, text })
    this.audioCache.set(cacheKey, url)
    return url
  }

  // Fetch once and cache as Blob object URL to avoid repeat API calls
  async getOrCreateTtsObjectUrl(text: string, options: Omit<OpenAiTtsStreamOptions, 'text'>): Promise<string> {
    const cacheKey = `blob|${text}|${options.sessionId}|${options.voice || 'nova'}|${options.format || 'mp3'}|${options.instructions || 'default'}`
    const cached = this.audioCache.get(cacheKey)
    if (cached) return cached

    const { stream, contentType } = await this.openaiTtsStream({ ...options, text })

    // Read the stream into a Blob
    const reader = (stream as ReadableStream<Uint8Array>).getReader()
    const chunks: Uint8Array[] = []
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) chunks.push(value)
    }
    const totalLength = chunks.reduce((acc, c) => acc + c.length, 0)
    const merged = new Uint8Array(totalLength)
    let offset = 0
    for (const c of chunks) {
      merged.set(c, offset)
      offset += c.length
    }
    const blob = new Blob([merged], { type: contentType })
    const objectUrl = URL.createObjectURL(blob)
    this.audioCache.set(cacheKey, objectUrl)
    return objectUrl
  }

  // Clear audio cache (call on component unmount)
  clearAudioCache(): void {
    // Revoke any object URLs before clearing
    for (const [key, value] of this.audioCache.entries()) {
      if (key.startsWith('blob|') && value.startsWith('blob:')) {
        try { URL.revokeObjectURL(value) } catch {}
      }
    }
    this.audioCache.clear()
  }

  async translate(request: TranslateRequest): Promise<TranslateResponse> {
    const url = `${this.baseUrl}/api/openai/translate`
    this.logRequest('POST', url, request)
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      credentials: 'include',
    })
    
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Translation request failed' }))
      throw new Error(err.error || `Translation failed with status ${response.status}`)
    }
    
    const data = await response.json()
    this.logResponse('POST', '/api/openai/translate', data)
    return data as TranslateResponse
  }
}

export const apiClient = new ApiClient()
