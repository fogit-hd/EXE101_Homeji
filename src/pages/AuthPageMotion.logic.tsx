export function voiceTravelDuration(distPx: number) {
  if (distPx < 0.75) return 0
  return Math.min(2.35, Math.max(1.15, distPx / 78))
}
