function floatTo16BitPCM(float32Array: Float32Array): Int16Array {
  const output = new Int16Array(float32Array.length)
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]))
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return output
}

export function encodeWavPCM16(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const pcm16 = floatTo16BitPCM(samples)
  const blockAlign = 1 * 2
  const byteRate = sampleRate * blockAlign
  const dataSize = pcm16.byteLength
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)

  let offset = 0
  const writeString = (s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i))
    offset += s.length
  }

  writeString("RIFF")
  view.setUint32(offset, 36 + dataSize, true); offset += 4
  writeString("WAVE")
  writeString("fmt ")
  view.setUint32(offset, 16, true); offset += 4 // PCM chunk size
  view.setUint16(offset, 1, true); offset += 2 // PCM format
  view.setUint16(offset, 1, true); offset += 2 // mono
  view.setUint32(offset, sampleRate, true); offset += 4
  view.setUint32(offset, byteRate, true); offset += 4
  view.setUint16(offset, blockAlign, true); offset += 2
  view.setUint16(offset, 16, true); offset += 2 // bits per sample
  writeString("data")
  view.setUint32(offset, dataSize, true); offset += 4

  new Int16Array(buffer, 44).set(pcm16)
  return buffer
}
