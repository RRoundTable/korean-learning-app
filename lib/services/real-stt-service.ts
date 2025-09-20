// 실제 OpenAI STT API를 직접 호출하는 서비스

export type SttResponse = {
  text: string
  language?: string
  durationMs?: number
}

export class RealSttService {
  private apiKey: string

  constructor() {
    // 클라이언트에서 환경변수 접근
    this.apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY || ''
    
    if (!this.apiKey) {
      console.warn('⚠️ OpenAI API key not found. STT service may not work properly.')
    }
  }

  /**
   * OpenAI Whisper API 직접 호출
   */
  async transcribeSegment(
    audioBlob: Blob,
    options?: {
      language?: string
      prompt?: string
      durationMs?: number
    }
  ): Promise<SttResponse> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key is not configured')
    }

    console.log('🎤 Calling OpenAI Whisper API...')
    console.log('📊 Audio blob size:', audioBlob.size, 'bytes')
    console.log('🌐 Language:', options?.language || 'auto-detect')

    const formData = new FormData()
    
    // WAV 파일로 추가
    formData.append('file', audioBlob, 'audio.wav')
    formData.append('model', 'whisper-1')
    formData.append('response_format', 'json')
    
    if (options?.language) {
      formData.append('language', options.language)
    }
    if (options?.prompt) {
      formData.append('prompt', options.prompt)
    }

    try {
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        console.error('❌ OpenAI STT API Error:', response.status, errorText)
        throw new Error(`OpenAI STT API Error: ${response.status} ${errorText}`)
      }

      const data = await response.json()
      const text = data.text || ''

      console.log('✅ STT Result:', text)

      return {
        text,
        language: options?.language,
        durationMs: options?.durationMs
      }

    } catch (error) {
      console.error('❌ STT transcription failed:', error)
      throw error
    }
  }

  /**
   * 여러 세그먼트를 병렬로 처리 (최대 3개 제한)
   */
  async transcribeSegments(
    segments: Array<{
      id: string
      audioBlob: Blob
      durationMs: number
    }>,
    options?: {
      language?: string
      prompt?: string
      maxConcurrent?: number
    }
  ): Promise<Array<{
    id: string
    text: string
    error?: string
  }>> {
    const maxConcurrent = options?.maxConcurrent || 3
    const results: Array<{
      id: string
      text: string
      error?: string
    }> = []

    console.log('🎤 Processing', segments.length, 'segments with max concurrency:', maxConcurrent)

    // 병렬 처리를 위해 청크로 나누기
    for (let i = 0; i < segments.length; i += maxConcurrent) {
      const chunk = segments.slice(i, i + maxConcurrent)
      
      const chunkPromises = chunk.map(async (segment) => {
        try {
          console.log(`🎤 Transcribing segment ${segment.id}...`)
          
          const result = await this.transcribeSegment(segment.audioBlob, {
            language: options?.language || 'ko',
            prompt: options?.prompt,
            durationMs: segment.durationMs
          })

          console.log(`✅ Transcription complete for ${segment.id}:`, result.text)
          
          return {
            id: segment.id,
            text: result.text,
          }
        } catch (error) {
          console.error(`❌ Transcription failed for ${segment.id}:`, error)
          
          return {
            id: segment.id,
            text: '',
            error: error instanceof Error ? error.message : String(error)
          }
        }
      })

      const chunkResults = await Promise.all(chunkPromises)
      results.push(...chunkResults)
    }

    return results
  }

  /**
   * 여러 텍스트 결과를 하나로 병합
   */
  mergeTranscriptions(
    transcriptions: Array<{
      id: string
      text: string
      error?: string
    }>
  ): string {
    return transcriptions
      .filter(t => t.text && !t.error)
      .map(t => t.text.trim())
      .join(' ')
      .trim()
  }
}

// 실제 API 서비스 인스턴스
export const realSttService = new RealSttService()
