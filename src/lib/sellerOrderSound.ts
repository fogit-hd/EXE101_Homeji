/** Short, self-contained three-tone alert. Audio must be armed from a user gesture. */
export class SellerOrderSound {
  private context: AudioContext | null = null
  private enabled = false

  async arm() {
    if (!window.AudioContext) return false
    try {
      this.context ??= new AudioContext()
      await this.context.resume()
      this.enabled = this.context.state === 'running'
      return this.enabled
    } catch { this.enabled = false; return false }
  }

  get ready() { return this.enabled && this.context?.state === 'running' }

  play() {
    const context = this.context
    if (!this.ready || !context) return false
    try {
      const start = context.currentTime
      for (const [index, frequency] of [659, 784, 988].entries()) {
        const oscillator = context.createOscillator()
        const gain = context.createGain()
        oscillator.type = 'sine'
        oscillator.frequency.value = frequency
        const at = start + index * .19
        gain.gain.setValueAtTime(0, at)
        gain.gain.linearRampToValueAtTime(.14, at + .02)
        gain.gain.exponentialRampToValueAtTime(.001, at + .17)
        oscillator.connect(gain)
        gain.connect(context.destination)
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect() }
        oscillator.start(at)
        oscillator.stop(at + .18)
      }
      return true
    } catch { this.enabled = false; return false }
  }

  mute() { this.enabled = false }
  dispose() { this.enabled = false; void this.context?.close().catch(() => {}); this.context = null }
}
