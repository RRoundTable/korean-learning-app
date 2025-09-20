// STT API 클라이언트 서비스

export type SttResponse = {
  text: string
  language?: string
  durationMs?: number
}

export type SttError = {
  error: string
}

export class SttService {
  private baseUrl: string

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl
  }

  /**
   * 단일 오디오 세그먼트를 STT로 변환
   */
  async transcribeSegment(
    audioBlob: Blob,
    options?: {
      language?: string
      prompt?: string
      durationMs?: number
    }
  ): Promise<SttResponse> {
    const formData = new FormData()
    
    // WAV 파일로 변환 (필요시)
    const wavBlob = audioBlob.type === 'audio/wav' 
      ? audioBlob 
      : new Blob([await audioBlob.arrayBuffer()], { type: 'audio/wav' })
    
    formData.append('file', wavBlob, 'audio.wav')
    
    if (options?.language) {
      formData.append('language', options.language)
    }
    if (options?.prompt) {
      formData.append('prompt', options.prompt)
    }
    if (options?.durationMs) {
      formData.append('durationMs', options.durationMs.toString())
    }

    const response = await fetch(`${this.baseUrl}/api/stt`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(30000) // 30초 타임아웃
    })

    if (!response.ok) {
      let errorMessage = '음성 인식 중 오류가 발생했습니다.'
      
      try {
        const errorData: SttError = await response.json()
        errorMessage = errorData.error || errorMessage
      } catch {
        // JSON 파싱 실패 시 기본 메시지 사용
      }
      
      if (response.status >= 500) {
        errorMessage = `서버 오류가 발생했습니다 (${response.status})`
      } else if (response.status === 429) {
        errorMessage = '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.'
      } else if (response.status === 413) {
        errorMessage = '음성 파일이 너무 큽니다. 더 짧게 녹음해주세요.'
      } else if (response.status === 400) {
        errorMessage = '잘못된 음성 파일입니다. 다시 녹음해주세요.'
      }
      
      throw new Error(errorMessage)
    }

    return await response.json()
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

// 싱글톤 인스턴스
export const sttService = new SttService()

// Mock STT 서비스 (개발/테스트용)
export class MockSttService extends SttService {
  async transcribeSegment(
    audioBlob: Blob,
    options?: {
      language?: string
      prompt?: string
      durationMs?: number
    }
  ): Promise<SttResponse> {
    // 모의 지연
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))
    
    const mockTexts = [
      "안녕하세요",
      "커피 한 잔 주세요",
      "아이스 아메리카노로 주세요",
      "가격이 얼마인가요",
      "5천원 이하로 주문하고 싶어요",
      "라떼로 바꿔주세요",
      "결제는 카드로 하겠습니다"
    ]
    
    const randomText = mockTexts[Math.floor(Math.random() * mockTexts.length)]
    
    console.log(`🧪 Mock STT result: "${randomText}"`)
    
    return {
      text: randomText,
      language: options?.language || 'ko',
      durationMs: options?.durationMs
    }
  }
}

// 개발 모드에서는 Mock 서비스 사용
export const isDevelopment = process.env.NODE_ENV === 'development'
export const activeSttService = isDevelopment ? new MockSttService() : sttService
