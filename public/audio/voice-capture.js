// Runs off the UI thread; converts microphone audio to bounded 16 kHz mono PCM.
class HomejiVoiceCapture extends AudioWorkletProcessor {
  constructor() {
    super()
    this.buffer = new Int16Array(1600)
    this.position = 0
    this.phase = 0
    this.sum = 0
    this.count = 0
    this.total = 0
    this.port.onmessage = event => {
      if (event.data === 'stop') { this.flush(); this.port.postMessage({ stopped: true }) }
    }
  }
  flush() {
    if (!this.position) return
    const chunk = this.buffer.slice(0, this.position)
    this.port.postMessage({ samples: chunk.buffer }, [chunk.buffer])
    this.position = 0
  }
  process(inputs) {
    const input = inputs[0]?.[0]
    if (!input || this.total >= 16000 * 120) return true
    for (const value of input) {
      this.sum += value; this.count++; this.phase += 16000
      if (this.phase >= sampleRate) {
        this.phase -= sampleRate
        const sample = Math.max(-1, Math.min(1, this.sum / this.count))
        this.buffer[this.position++] = Math.round(sample * (sample < 0 ? 32768 : 32767))
        this.sum = 0; this.count = 0; this.total++
        if (this.position === this.buffer.length) this.flush()
        if (this.total >= 16000 * 120) { this.flush(); this.port.postMessage({ limit: true }); break }
      }
    }
    return true
  }
}
registerProcessor('homeji-voice-capture', HomejiVoiceCapture)
