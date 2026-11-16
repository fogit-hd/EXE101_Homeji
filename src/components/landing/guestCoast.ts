/** Shared pause so wheel-coast / Lenis cannot fight dialogs, map gestures, or sequences. */
import { startLandingLenis, stopLandingLenis } from './scroll/landingScrollControl'

let coastPaused = false

export function pauseGuestCoast() {
  if (coastPaused) return
  coastPaused = true
  stopLandingLenis()
}

export function resumeGuestCoast() {
  if (!coastPaused) return
  coastPaused = false
  startLandingLenis()
}

export function isGuestCoastPaused() {
  return coastPaused
}
