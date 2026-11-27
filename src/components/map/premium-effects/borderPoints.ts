export function roundedBorderPoint(width: number, height: number, radius: number, unit: number) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2))
  const horizontal = width - 2 * r, vertical = height - 2 * r, arc = Math.PI * r / 2
  const lengths = [horizontal, arc, vertical, arc, horizontal, arc, vertical, arc]
  let d = ((unit % 1) + 1) % 1 * lengths.reduce((a, b) => a + b, 0), segment = 0
  while (segment < 7 && d > lengths[segment]) d -= lengths[segment++]
  const left = -width / 2, right = width / 2, top = -height / 2, bottom = height / 2
  if (segment === 0) return { x: left + r + d, y: top }
  if (segment === 2) return { x: right, y: top + r + d }
  if (segment === 4) return { x: right - r - d, y: bottom }
  if (segment === 6) return { x: left, y: bottom - r - d }
  const angle = [0, -Math.PI / 2, 0, 0, 0, Math.PI / 2, 0, Math.PI][segment] + d / (r || 1)
  const cx = segment === 1 || segment === 3 ? right - r : left + r
  const cy = segment === 1 || segment === 7 ? top + r : bottom - r
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
}
