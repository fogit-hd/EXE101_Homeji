export const GLASS_LENS_RATIOS = [1, 2, 3, 4, 6, 10] as const
export function glassLensId(ratio: number, engaged = false) {
  const base = ratio === 3 ? 'homeji-liquid-lens' : `homeji-liquid-lens-${ratio}`
  return engaged ? `${base}-active` : base
}
export function nearestLensRatio(width: number, height: number) {
  const aspect = width / Math.max(1, height)
  return GLASS_LENS_RATIOS.reduce((best, candidate) => Math.abs(Math.log(aspect / candidate)) < Math.abs(Math.log(aspect / best)) ? candidate : best, 3 as typeof GLASS_LENS_RATIOS[number])
}
