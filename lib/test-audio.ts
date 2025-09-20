// 실제 STT 테스트를 위한 오디오 생성 및 녹음 기능

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null
  private audioChunks: Blob[] = []
  private stream: MediaStream | null = null

  /**
   * 마이크 권한 요청 및 녹음 준비
   */
  async initialize(): Promise<boolean> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      })

      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm;codecs=opus'
      })

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data)
        }
      }

      console.log('🎤 Audio recorder initialized')
      return true
    } catch (error) {
      console.error('❌ Failed to initialize audio recorder:', error)
      return false
    }
  }

  /**
   * 녹음 시작
   */
  startRecording(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('Audio recorder not initialized'))
        return
      }

      this.audioChunks = []
      
      this.mediaRecorder.onstart = () => {
        console.log('🔴 Recording started')
        resolve()
      }

      this.mediaRecorder.start()
    })
  }

  /**
   * 녹음 정지 및 오디오 블롭 반환
   */
  stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('Audio recorder not initialized'))
        return
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' })
        console.log('⏹️ Recording stopped, blob size:', audioBlob.size, 'bytes')
        resolve(audioBlob)
      }

      this.mediaRecorder.stop()
    })
  }

  /**
   * 리소스 정리
   */
  cleanup() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop())
      this.stream = null
    }
    this.mediaRecorder = null
    this.audioChunks = []
    console.log('🧹 Audio recorder cleaned up')
  }
}

/**
   * WebM을 WAV로 변환 (STT API 호환성을 위해)
   */
export async function convertWebMToWav(webmBlob: Blob): Promise<Blob> {
  try {
    const arrayBuffer = await webmBlob.arrayBuffer()
    const audioContext = new AudioContext({ sampleRate: 16000 })
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    
    // 16kHz 모노로 리샘플링
    const length = audioBuffer.length
    const sampleRate = 16000
    const numberOfChannels = 1
    
    const wavBuffer = audioContext.createBuffer(numberOfChannels, length, sampleRate)
    const channelData = audioBuffer.getChannelData(0) // 첫 번째 채널만 사용
    wavBuffer.copyToChannel(channelData, 0)
    
    // WAV 인코딩
    const wavArrayBuffer = audioBufferToWav(wavBuffer)
    const wavBlob = new Blob([wavArrayBuffer], { type: 'audio/wav' })
    
    console.log('🔄 Converted WebM to WAV:', wavBlob.size, 'bytes')
    return wavBlob
    
  } catch (error) {
    console.error('❌ Failed to convert WebM to WAV:', error)
    // 변환 실패 시 원본 반환
    return webmBlob
  }
}

/**
 * AudioBuffer를 WAV ArrayBuffer로 변환
 */
function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const length = buffer.length
  const numberOfChannels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const bytesPerSample = 2 // 16-bit
  const blockAlign = numberOfChannels * bytesPerSample
  const byteRate = sampleRate * blockAlign
  const dataSize = length * blockAlign
  const bufferSize = 44 + dataSize
  
  const arrayBuffer = new ArrayBuffer(bufferSize)
  const view = new DataView(arrayBuffer)
  
  let pos = 0
  
  // WAV 헤더 작성
  const writeString = (str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(pos + i, str.charCodeAt(i))
    }
    pos += str.length
  }
  
  writeString('RIFF')
  view.setUint32(pos, bufferSize - 8, true); pos += 4
  writeString('WAVE')
  writeString('fmt ')
  view.setUint32(pos, 16, true); pos += 4 // PCM chunk size
  view.setUint16(pos, 1, true); pos += 2 // PCM format
  view.setUint16(pos, numberOfChannels, true); pos += 2
  view.setUint32(pos, sampleRate, true); pos += 4
  view.setUint32(pos, byteRate, true); pos += 4
  view.setUint16(pos, blockAlign, true); pos += 2
  view.setUint16(pos, 16, true); pos += 2 // bits per sample
  writeString('data')
  view.setUint32(pos, dataSize, true); pos += 4
  
  // 오디오 데이터 작성
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]))
      view.setInt16(pos, sample * 0x7FFF, true)
      pos += 2
    }
  }
  
  return arrayBuffer
}

// 전역 인스턴스
export const audioRecorder = new AudioRecorder()
