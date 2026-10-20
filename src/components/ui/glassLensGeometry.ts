export const GLASS_LENS_RATIOS = [1, 2, 3, 4, 6, 10] as const
export type GlassLensVariant = 'control' | 'control-active' | 'tab-rest' | 'tab-active' | 'surface' | 'surface-active' | 'bead' | 'bead-active'
export function glassLensId(ratio: number, variant: GlassLensVariant = 'control') {
  const base = ratio === 3 ? 'homeji-liquid-lens' : `homeji-liquid-lens-${ratio}`
  return variant === 'control' ? base : `${base}-${variant === 'tab-rest' ? 'tab' : variant === 'tab-active' ? 'active' : variant}`
}
export function nearestLensRatio(width: number, height: number) {
  const aspect = width / Math.max(1, height)
  return GLASS_LENS_RATIOS.reduce((best, candidate) => Math.abs(Math.log(aspect / candidate)) < Math.abs(Math.log(aspect / best)) ? candidate : best, 3 as typeof GLASS_LENS_RATIOS[number])
}

export const GLASS_LENS_DEPTHS: Record<GlassLensVariant, number> = {
  surface: .06, 'surface-active': .08,
  bead: .75, 'bead-active': .8,
  control: .85, 'tab-rest': .85,
  'control-active': .9, 'tab-active': .9,
}
