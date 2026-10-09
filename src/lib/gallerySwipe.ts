/** Ignore taps and vertical gestures; the same navigation remains available as buttons. */
export function gallerySwipeDirection(dx: number, dy: number): -1 | 0 | 1 {
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.5) return 0
  return dx < 0 ? 1 : -1
}
