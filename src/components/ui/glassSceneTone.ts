export type GlassSceneTone = 'light' | 'dark' | 'mixed'

function colorLightness(value: string): number | null {
  if (!/^(rgba?\(|color\(srgb )/.test(value)) return null
  const parts = value.match(/[\d.]+/g)?.map(Number)
  if (!parts || parts.length < 3 || (parts[3] ?? 1) < .75) return null
  const unit = value.startsWith('color(srgb ') ? 1 : 255
  return (.2126 * parts[0] + .7152 * parts[1] + .0722 * parts[2]) / unit
}

/** Estimate only known CSS paint. Photographs stay mixed: never guess their ink. */
export function glassSceneTone(element: HTMLElement, cache: Map<Element, GlassSceneTone>): GlassSceneTone {
  const parent = element.parentElement
  if (!parent) return 'mixed'
  const cached = cache.get(parent)
  if (cached) return cached
  const style = getComputedStyle(parent)
  let tone: GlassSceneTone
  if (style.backgroundImage.includes('url(')) tone = 'mixed'
  else {
    const stops = [...style.backgroundImage.matchAll(/(?:rgba?|color)\([^)]*\)/g)]
      .map(match => colorLightness(match[0])).filter((value): value is number => value !== null)
    const lightness = stops.length ? stops.reduce((sum, value) => sum + value, 0) / stops.length : colorLightness(style.backgroundColor)
    tone = lightness === null ? glassSceneTone(parent, cache) : lightness > .52 ? 'light' : 'dark'
  }
  cache.set(parent, tone)
  return tone
}
