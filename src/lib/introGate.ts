/**
 * Coordinates the brand intro with the real home page underneath it.
 * HomePage reports when its first data + map script have settled; the intro
 * waits for that (bounded) before handing off, so the reveal lands on a populated page.
 */
type Listener = () => void

let homeReady = false
const listeners = new Set<Listener>()

export const INTRO_SESSION_KEY = 'hj-intro-seen'
export const BRAND_INTRO_FINISHED_EVENT = 'homeji:brand-intro-finished'

export function markHomeReady() {
  if (homeReady) return
  homeReady = true
  listeners.forEach(fn => fn())
  listeners.clear()
}

export function whenHomeReady(fn: Listener): () => void {
  if (homeReady) { fn(); return () => {} }
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

/** Decided once by the inline boot script in index.html; SPA navigation does not replay it. */
export function introRequested(): boolean {
  return typeof document !== 'undefined' && document.documentElement.dataset.intro === '1'
}

/** Release startup overlays only after the brand animation has handed off. */
export function completeBrandIntro() {
  if (typeof document === 'undefined') return
  const wasRequested = introRequested()
  delete document.documentElement.dataset.intro
  if (wasRequested && typeof window !== 'undefined') {
    window.dispatchEvent(new Event(BRAND_INTRO_FINISHED_EVENT))
  }
}
