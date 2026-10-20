/** Inverse sampling through a convex capsule, using a spherical-cap normal.
 * Snell's angular deflection grows toward the curved rim; cap thickness brings
 * displacement back to zero at the silhouette. The two sides bend inward.
 * This is a bounded screen-space approximation, not a full optical ray tracer.
 */
export function capsuleLensField(x, y, ratio) {
  const axis = Math.max(.5, Math.min(ratio - .5, x))
  const dx = x - axis, dy = y - .5
  const radius = Math.hypot(dx, dy) * 2
  if (radius === 0 || radius >= 1) return { x: 0, y: 0 }
  const refractiveIndex = 1.45
  const thickness = Math.sqrt(1 - radius * radius)
  const incidentAngle = Math.asin(radius)
  const transmittedAngle = Math.asin(radius / refractiveIndex)
  // feDisplacementMap samples output + scale*(channel - .5). Gain 1.8
  // bounds both PNG channels; runtime depth is measured in control heights.
  const offset = -1.8 * thickness * Math.tan(incidentAngle - transmittedAngle)
  return { x: offset * dx / (radius * .5), y: offset * dy / (radius * .5) }
}
