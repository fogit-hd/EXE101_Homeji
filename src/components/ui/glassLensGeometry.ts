export const GLASS_LENS_RATIOS = [1, 2, 3, 4, 6, 10] as const
export type GlassLensVariant = 'control' | 'control-active' | 'tab-rest' | 'tab-active' | 'surface' | 'surface-active'
export function glassLensId(ratio: number, variant: GlassLensVariant = 'control') {
  const base = ratio === 3 ? 'homeji-liquid-lens' : `homeji-liquid-lens-${ratio}`
  return variant === 'control-active' ? `${base}-control-active` : variant === 'tab-rest' ? `${base}-tab` : variant === 'tab-active' ? `${base}-active` : variant === 'surface' ? `${base}-surface` : variant === 'surface-active' ? `${base}-surface-active` : base
}
export function nearestLensRatio(width: number, height: number) {
  const aspect = width / Math.max(1, height)
  return GLASS_LENS_RATIOS.reduce((best, candidate) => Math.abs(Math.log(aspect / candidate)) < Math.abs(Math.log(aspect / best)) ? candidate : best, 3 as typeof GLASS_LENS_RATIOS[number])
}

export const GLASS_LENS_DEPTHS: Record<GlassLensVariant, number> = {
  surface: .06, 'surface-active': .08,
  control: .4, 'tab-rest': .4,
  'control-active': .44, 'tab-active': .44,
}
