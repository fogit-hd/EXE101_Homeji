/** Short, self-contained three-tone alert and tactile micro-sounds. Audio must be armed from a user gesture. */
export class SellerOrderSound {
  static readonly SILENT_KEY = 'homeji_dorm_silent_mode'
  private static sharedSound: SellerOrderSound | null = null

  private context: AudioContext | null = null
  private enabled = false
  private revision = 0

  static get isDormSilent(): boolean {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return false
    try {
      return localStorage.getItem(SellerOrderSound.SILENT_KEY) === 'true'
    } catch {
      return false
    }
  }

  static setDormSilent(silent: boolean): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return
    try {
      localStorage.setItem(SellerOrderSound.SILENT_KEY, silent ? 'true' : 'false')
    } catch {}
  }

  static getShared(): SellerOrderSound {
    if (!this.sharedSound) {
      this.sharedSound = new SellerOrderSound()
    }
    return this.sharedSound
  }

  static playPop(): boolean {
    const shared = this.getShared()
    if (!shared.ready) {
      void shared.arm().then((ready) => {
        if (ready) shared.playPop()
      })
      return true
    }
    return shared.playPop()
  }

  static async armShared(): Promise<boolean> {
    return this.getShared().arm()
  }

  async arm() {
    if (!window.AudioContext) return false
    const revision = this.revision
    try {
      this.context ??= new AudioContext()
      const context = this.context
      await context.resume()
      // A delayed browser permission must never undo mute or revive a disposed player.
      if (revision !== this.revision || context !== this.context) return false
      this.enabled = context.state === 'running'
      return this.enabled
    } catch { if (revision === this.revision) this.enabled = false; return false }
  }

  get ready() { return this.enabled && this.context?.state === 'running' }

  play() {
    const context = this.context
    if (!this.ready || !context || SellerOrderSound.isDormSilent) return false
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
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate([100, 50, 100]) } catch {}
      }
      return true
    } catch { this.enabled = false; return false }
  }

  playPop() {
    const context = this.context
    if (!this.ready || !context || SellerOrderSound.isDormSilent) return false
    try {
      const start = context.currentTime
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(320, start)
      oscillator.frequency.exponentialRampToValueAtTime(120, start + .06)
      gain.gain.setValueAtTime(.08, start)
      gain.gain.exponentialRampToValueAtTime(.001, start + .06)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect() }
      oscillator.start(start)
      oscillator.stop(start + .06)
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate(30) } catch {}
      }
      return true
    } catch { return false }
  }

  mute() { this.revision++; this.enabled = false }
  dispose() { this.mute(); void this.context?.close().catch(() => {}); this.context = null }
}
