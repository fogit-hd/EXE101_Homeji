import { GLASS_LENS_DEPTHS, glassLensId, type GlassLensVariant } from './glassLensGeometry'

const svg = 'http://www.w3.org/2000/svg'

/** Share pixel-sized filters; release them when the last matching control leaves. */
export function createGlassLensFilters(defs: SVGDefsElement, maps: Record<number, string>) {
  const filters = new Map<string, { node: SVGFilterElement; users: number }>()
  const acquire = (width: number, height: number, ratio: number, variant: GlassLensVariant) => {
    const id = `size-${width}x${height}-${glassLensId(ratio, variant)}`
    const existing = filters.get(id)
    if (existing) { existing.users++; return id }
    const filter = document.createElementNS(svg, 'filter')
    const attributes = { id, filterUnits: 'objectBoundingBox', primitiveUnits: 'userSpaceOnUse',
      x: '0', y: '0', width: '1', height: '1', 'color-interpolation-filters': 'sRGB',
      'data-glass-depth': String(GLASS_LENS_DEPTHS[variant]) }
    Object.entries(attributes).forEach(([key, value]) => filter.setAttribute(key, value))
    const image = document.createElementNS(svg, 'feImage')
    Object.entries({ href: maps[ratio], x: '0', y: '0', width: String(width), height: String(height),
      preserveAspectRatio: 'none', result: 'lens' }).forEach(([key, value]) => image.setAttribute(key, value))
    const warp = document.createElementNS(svg, 'feDisplacementMap')
    // Equal pixel units on X and Y avoid aspect-dependent vertical stretching.
    Object.entries({ in: 'SourceGraphic', in2: 'lens', scale: String(GLASS_LENS_DEPTHS[variant] * height),
      xChannelSelector: 'R', yChannelSelector: 'G' }).forEach(([key, value]) => warp.setAttribute(key, value))
    filter.append(image, warp)
    defs.append(filter)
    filters.set(id, { node: filter, users: 1 })
    return id
  }
  const release = (id: string) => {
    const filter = filters.get(id)
    if (filter && --filter.users === 0) { filter.node.remove(); filters.delete(id) }
  }
  return { acquire, release, clear: () => { filters.forEach(filter => filter.node.remove()); filters.clear() } }
}
