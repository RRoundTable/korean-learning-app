// TTS API 클라이언트 서비스

export type TtsOptions = {
  sessionId: string
  text: string
  voice?: string
  format?: 'mp3' | 'wav'
  sampleRate?: number
}

export class TtsService {
  private baseUrl: string

  constructor(baseUrl: string = 'http://localhost:3001') {
    this.baseUrl = baseUrl
  }

  /**
   * 텍스트를 음성으로 변환
   */
  async synthesizeSpeech(options: TtsOptions): Promise<Blob> {
    const {
      sessionId,
      text,
      voice = 'alloy',
      format = 'mp3',
      sampleRate = 24000
    } = options

    console.log('🔊 Synthesizing speech:', { text: text.substring(0, 50) + '...', voice, format })

    const params = new URLSearchParams({
      sessionId,
      text,
      voice,
      format,
      sampleRate: sampleRate.toString()
    })

    const response = await fetch(`${this.baseUrl}/api/openai/text-to-speech?${params}`, {
      method: 'GET',
      credentials: 'include',
      signal: AbortSignal.timeout(30000) // 30초 타임아웃
    })

    if (!response.ok) {
      let errorMessage = '음성 합성 중 오류가 발생했습니다.'
      
      try {
        const errorData = await response.json()
        errorMessage = errorData.error || errorMessage
      } catch {
        // JSON이 아닌 경우 텍스트로 시도
        try {
          const errorText = await response.text()
          if (errorText) errorMessage = errorText
        } catch {
          // 둘 다 실패하면 기본 메시지 사용
        }
      }
      
      if (response.status >= 500) {
        errorMessage = `서버 오류가 발생했습니다 (${response.status})`
      } else if (response.status === 429) {
        errorMessage = '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.'
      } else if (response.status === 401) {
        errorMessage = 'API 인증에 실패했습니다. 설정을 확인해주세요.'
      } else if (response.status === 400) {
        errorMessage = '잘못된 텍스트입니다. 다른 내용으로 시도해주세요.'
      } else if (response.status === 413) {
        errorMessage = '텍스트가 너무 깁니다. 더 짧게 줄여주세요.'
      }
      
      throw new Error(errorMessage)
    }

    const audioBlob = await response.blob()
    
    if (audioBlob.size === 0) {
      throw new Error('음성 파일이 생성되지 않았습니다. 다시 시도해주세요.')
    }
    
    console.log('✅ TTS synthesis complete:', audioBlob.size, 'bytes')
    
    return audioBlob
  }

  /**
   * 오디오 재생
   */
  async playAudio(audioBlob: Blob): Promise<HTMLAudioElement> {
    return new Promise((resolve, reject) => {
      try {
        const audioUrl = URL.createObjectURL(audioBlob)
        const audio = new Audio(audioUrl)
        
        audio.onloadeddata = () => {
          console.log('🎵 Audio loaded, duration:', audio.duration, 'seconds')
        }
        
        audio.onended = () => {
          console.log('🎵 Audio playback finished')
          URL.revokeObjectURL(audioUrl)
          resolve(audio)
        }
        
        audio.onerror = (error) => {
          console.error('❌ Audio playback error:', error)
          URL.revokeObjectURL(audioUrl)
          reject(new Error('Audio playback failed'))
        }
        
        audio.play().catch(reject)
        console.log('🔊 Starting audio playback...')
        
      } catch (error) {
        console.error('❌ Audio setup error:', error)
        reject(error)
      }
    })
  }

  /**
   * 텍스트를 음성으로 변환하고 재생
   */
  async speakText(options: TtsOptions): Promise<HTMLAudioElement> {
    try {
      console.log('🗣️ Speaking text:', options.text.substring(0, 100) + '...')
      
      // 1. TTS API 호출
      const audioBlob = await this.synthesizeSpeech(options)
      
      // 2. 오디오 재생
      const audio = await this.playAudio(audioBlob)
      
      return audio
      
    } catch (error) {
      console.error('❌ Text-to-speech failed:', error)
      throw error
    }
  }
}

// Mock TTS 서비스 (개발/테스트용)
export class MockTtsService extends TtsService {
  async synthesizeSpeech(options: TtsOptions): Promise<Blob> {
    console.log('🧪 Mock TTS - Synthesizing:', options.text.substring(0, 50) + '...')
    
    // 모의 지연
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))
    
    // 간단한 사인파 오디오 생성 (440Hz, 2초)
    const sampleRate = options.sampleRate || 24000
    const duration = 2 // 2초
    const frequency = 440 // 440Hz (A4 음)
    const samples = sampleRate * duration
    
    // 16-bit PCM WAV 생성
    const buffer = new ArrayBuffer(44 + samples * 2)
    const view = new DataView(buffer)
    
    // WAV 헤더
    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i))
      }
    }
    
    writeString(0, 'RIFF')
    view.setUint32(4, 36 + samples * 2, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true) // PCM
    view.setUint16(22, 1, true) // mono
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * 2, true)
    view.setUint16(32, 2, true)
    view.setUint16(34, 16, true)
    writeString(36, 'data')
    view.setUint32(40, samples * 2, true)
    
    // 사인파 오디오 데이터
    for (let i = 0; i < samples; i++) {
      const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.1
      view.setInt16(44 + i * 2, sample * 32767, true)
    }
    
    const audioBlob = new Blob([buffer], { type: 'audio/wav' })
    console.log('🧪 Mock TTS complete:', audioBlob.size, 'bytes')
    
    return audioBlob
  }
}

// 싱글톤 인스턴스
export const ttsService = new TtsService()

// 개발 모드에서는 Mock 서비스 사용
export const isDevelopment = process.env.NODE_ENV === 'development'
export const activeTtsService = isDevelopment ? new MockTtsService() : ttsService
