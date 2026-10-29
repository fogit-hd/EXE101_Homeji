/** Local synthesized call tones: no third-party audio requests or looping media files. */
export class CallTone {
  private context: AudioContext | null = null
  private interval: ReturnType<typeof setInterval> | null = null
  private nodes: OscillatorNode[] = []
  unlock() {
    try {
      this.context ??= new AudioContext()
      void this.context.resume().catch(() => {})
    } catch { /* Audio support is optional; call signaling still works. */ }
  }
  start(incoming: boolean) {
    this.stop(); this.unlock()
    const play = () => {
      const context = this.context
      if (!context || context.state !== 'running') return
      const base = context.currentTime
      for (const offset of [0, incoming ? 0.4 : 0.65]) {
        for (const frequency of incoming ? [660, 880] : [440, 480]) {
          const oscillator = context.createOscillator(), gain = context.createGain()
          oscillator.frequency.value = frequency
          gain.gain.setValueAtTime(0, base + offset)
          gain.gain.linearRampToValueAtTime(0.045, base + offset + 0.025)
          gain.gain.setValueAtTime(0.045, base + offset + 0.25)
          gain.gain.linearRampToValueAtTime(0, base + offset + 0.3)
          oscillator.connect(gain); gain.connect(context.destination)
          this.nodes.push(oscillator)
          oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); this.nodes = this.nodes.filter(node => node !== oscillator) }
          oscillator.start(base + offset); oscillator.stop(base + offset + 0.32)
        }
      }
    }
    play(); this.interval = setInterval(play, incoming ? 2400 : 4000)
  }
  stop() {
    if (this.interval !== null) clearInterval(this.interval)
    this.interval = null
    for (const node of this.nodes) { try { node.stop() } catch { /* Already ended. */ } }
    this.nodes = []
  }
  close() {
    this.stop(); const context = this.context; this.context = null
    if (context && context.state !== 'closed') void context.close().catch(() => {})
  }
}
