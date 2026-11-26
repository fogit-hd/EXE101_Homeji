import { glassLensId, type GlassLensVariant } from './glassLensGeometry'

const svg = 'http://www.w3.org/2000/svg'
type LensMapSet = { circle: string; vertical: string; horizontal: string }

/** A single neutral displacement; no channel splitting or scene recolouring. */
export function createGlassLensFilters(defs: SVGDefsElement, maps: { capsule: LensMapSet; bead: LensMapSet }) {
  const filters = new Map<string, { node: SVGFilterElement; users: number }>()
  const acquire = (width: number, height: number, ratio: number, variant: GlassLensVariant) => {
    const id = `size-${width}x${height}-${glassLensId(ratio, variant)}`
    const existing = filters.get(id)
    if (existing) { existing.users++; return id }
    const filter = document.createElementNS(svg, 'filter')
    Object.entries({ id, x: '0', y: '0', width: '1', height: '1', filterUnits: 'objectBoundingBox',
      primitiveUnits: 'userSpaceOnUse', 'color-interpolation-filters': 'sRGB' })
      .forEach(([key, value]) => filter.setAttribute(key, value))
    const image = document.createElementNS(svg, 'feImage')
    Object.entries({ href: variant.startsWith('bead') ? maps.bead.circle : maps.capsule.circle,
      width: String(width), height: String(height), preserveAspectRatio: 'none', result: 'lens' })
      .forEach(([key, value]) => image.setAttribute(key, value))
    const warp = document.createElementNS(svg, 'feDisplacementMap')
    Object.entries({ in: 'SourceGraphic', in2: 'lens', scale: '2', xChannelSelector: 'R', yChannelSelector: 'G' })
      .forEach(([key, value]) => warp.setAttribute(key, value))
    filter.append(image, warp)
    defs.append(filter)
    filters.set(id, { node: filter, users: 1 })
    return id
  }
  const release = (id: string) => {
    const entry = filters.get(id)
    if (entry && --entry.users === 0) { entry.node.remove(); filters.delete(id) }
  }
  return { acquire, release, clear: () => { filters.forEach(entry => entry.node.remove()); filters.clear() } }
}
