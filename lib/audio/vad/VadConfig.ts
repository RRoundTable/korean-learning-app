export type VadConfig = {
  sampleRateTarget: number
  frameMs: number
  speechProbabilityThreshold: number
  startSpeechAfterMs: number
  endSilenceAfterMs: number
  prefixPaddingMs: number
  maxUtteranceMs: number
  minUtteranceMs: number
  probabilitySmootherSize: number
}

export const defaultVadConfig: VadConfig = {
  sampleRateTarget: 16000,
  frameMs: 20,
  speechProbabilityThreshold: 0.1,
  startSpeechAfterMs: 20,
  endSilenceAfterMs: 700,
  prefixPaddingMs: 1000,
  maxUtteranceMs: 12000,
  minUtteranceMs: 50,
  probabilitySmootherSize: 3,
}
