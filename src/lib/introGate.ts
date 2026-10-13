/**
 * Coordinates the brand intro with the real home page underneath it.
 * HomePage reports when its first data + map script have settled; the intro
 * waits for that (bounded) before handing off, so the reveal lands on a populated page.
 */
type Listener = () => void

let homeReady = false
const listeners = new Set<Listener>()

export const INTRO_SESSION_KEY = 'hj-intro-seen'

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

/** Decided once by the inline boot script in index.html (session, path, reduced motion). */
export function introRequested(): boolean {
  return typeof document !== 'undefined' && document.documentElement.dataset.intro === '1'
}
