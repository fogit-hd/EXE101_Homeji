/** Screen-space refraction through a rounded bezel above a glass slab.
 * Coordinates are measured in control heights; the capsule's radius is .5.
 * The center is flat. A switch bead uses a raised lip and a shallow center dip.
 * Profile families follow the optical construction discussed at
 * https://kube.io/blog/liquid-glass-css-svg/ (not Apple's private renderer).
 */
const clamp = value => Math.max(0, Math.min(1, value))
const squircle = value => Math.pow(Math.max(0, 1 - (1 - value) ** 4), .25)
const surfaceHeight = (t, bead) => {
  if (!bead) return Math.pow(Math.max(0, 1 - (1 - t) ** 2.5), 1 / 2.5)
  const blend = t ** 3 * (10 - 15 * t + 6 * t * t)
  const bowl = 1 - Math.sqrt(Math.max(0, 1 - (1 - t) ** 2)) + .08
  return squircle(t * 2) * (1 - blend) + bowl * blend
}
export function capsuleLensField(x, y, ratio, profile = 'capsule') {
  const axis = Math.max(.5, Math.min(ratio - .5, x))
  const dx = x - axis, dy = y - .5, distance = Math.hypot(dx, dy)
  if (!distance || distance >= .5) return { x: 0, y: 0, highlight: 0 }
  const bead = profile === 'bead', fromEdge = .5 - distance
  const bezel = bead ? .5 : .34
  const t = clamp(fromEdge / bezel)
  // Keep an exact neutral core. A tiny finite-difference residue would round
  // opposite sides to 127/128 and introduce a seam in the encoded map.
  if (!bead && t === 1) return { x: 0, y: 0, highlight: 0 }
  const h = surfaceHeight(t, bead), height = bead ? .18 : .22
  const step = .0001, low = Math.max(0, t - step), high = Math.min(1, t + step)
  const slope = (surfaceHeight(high, bead) - surfaceHeight(low, bead)) / (high - low) * height / bezel
  const incident = Math.atan(slope)
  const refracted = Math.asin(Math.sin(incident) / 1.5)
  const travel = (.18 + height * h) * Math.tan(incident - refracted)
  // A subpixel shoulder keeps the boundary finite after image quantization.
  const edge = clamp(fromEdge / .012), fade = edge * edge * (3 - 2 * edge)
  const offset = -travel * 2 * fade
  const nx = dx / distance, ny = dy / distance
  const facing = -.6 * nx - .8 * ny
  const rim = Math.exp(-((fromEdge / .015) ** 2)) + .2 * Math.exp(-((fromEdge / .09) ** 2))
  const highlight = clamp(rim * (.65 * Math.max(0, facing) ** 2 + .35 * Math.min(0, facing) ** 2))
  return { x: offset * nx, y: offset * ny, highlight }
}
