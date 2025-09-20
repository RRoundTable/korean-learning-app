export type VadConfig = {
  sampleRateTarget: number
  frameMs: number
  speechProbabilityThreshold: number
  startSpeechAfterMs: number
  endSilenceAfterMs: number
  prefixPaddingMs: number
  maxUtteranceMs: number
  minUtteranceMs: number
}

export const defaultVadConfig: VadConfig = {
  sampleRateTarget: 16000,
  frameMs: 30,
  speechProbabilityThreshold: 0.5,
  startSpeechAfterMs: 90,
  endSilenceAfterMs: 500,
  prefixPaddingMs: 300,
  maxUtteranceMs: 12000,
  minUtteranceMs: 250,
}
