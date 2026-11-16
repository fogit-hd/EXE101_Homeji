/** The landing tells the intro (LandingIntro) when its first view is ready to be seen. */
let ready = false
const waiting = new Set<() => void>()

export function markLandingReady() {
  if (ready) return
  ready = true
  waiting.forEach(fn => fn())
  waiting.clear()
}

export function whenLandingReady(fn: () => void): () => void {
  if (ready) {
    fn()
    return () => {}
  }
  waiting.add(fn)
  return () => { waiting.delete(fn) }
}
