/** Shared pause so wheel-coast cannot fight wind / rocket sequences */
let coastPaused = false

export function pauseGuestCoast() {
  coastPaused = true
}

export function resumeGuestCoast() {
  coastPaused = false
}

export function isGuestCoastPaused() {
  return coastPaused
}
