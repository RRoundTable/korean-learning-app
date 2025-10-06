class VADProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.inputSampleRate = sampleRate; // context sample rate
    this.targetSampleRate = 16000;
    this.downsampleRatio = this.inputSampleRate / this.targetSampleRate;
    this.resampleCursor = 0;
    this.downsampledBuffer = [];
    this.targetFrameSize = Math.round(0.03 * this.targetSampleRate); // 30ms ~ 480 samples
  }

  static get parameterDescriptors() {
    return [];
  }

  _downsample(input) {
    if (!input || input.length === 0) return [];
    const output = [];
    let cursor = this.resampleCursor;
    const ratio = this.downsampleRatio;
    for (let i = 0; i < input.length; i++) {
      cursor += 1;
      // whenever we cross the ratio, pick a sample (nearest neighbor)
      if (cursor >= ratio) {
        const idx = i;
        output.push(input[idx]);
        cursor -= ratio;
      }
    }
    this.resampleCursor = cursor;
    return output;
  }

  _rms(input) {
    if (!input || input.length === 0) return 0;
    let sum = 0;
    for (let i = 0; i < input.length; i++) {
      const v = input[i];
      sum += v * v;
    }
    return Math.sqrt(sum / input.length);
  }

  process(inputs) {
    const channelData = inputs[0] && inputs[0][0] ? inputs[0][0] : null;
    if (!channelData) {
      return true;
    }

    const level = this._rms(channelData);
    const down = this._downsample(channelData);
    if (down.length > 0) {
      this.downsampledBuffer.push(...down);
    }

    while (this.downsampledBuffer.length >= this.targetFrameSize) {
      const frame = this.downsampledBuffer.slice(0, this.targetFrameSize);
      this.downsampledBuffer = this.downsampledBuffer.slice(this.targetFrameSize);
      this.port.postMessage({ type: 'frame', frame: new Float32Array(frame), level });
    }

    return true;
  }
}

registerProcessor('vad-processor', VADProcessor);


