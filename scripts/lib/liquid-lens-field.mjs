/** Inverse image sampling for a close, convex capsule lens.
 * The center magnifies, both sides bend toward the optical axis, and the
 * displacement joins the unfiltered scene with zero slope at the boundary.
 * This is a bounded screen-space approximation, not a full optical ray tracer.
 */
export function capsuleLensField(x, y, ratio) {
  const axis = Math.max(.5, Math.min(ratio - .5, x))
  const dx = x - axis, dy = y - .5
  const radius = Math.hypot(dx, dy) * 2
  const envelope = Math.max(0, 1 - radius * radius) ** 2
  // feDisplacementMap samples output + scale*(channel - .5).
  // Gain 3 keeps channels in range; depth < 1/3 keeps sampling monotonic.
  return { x: -3 * dx * envelope, y: -3 * dy * envelope }
}
