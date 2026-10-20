import { GLASS_LENS_DEPTHS, glassLensId, type GlassLensVariant } from './glassLensGeometry'

const svg = 'http://www.w3.org/2000/svg'

/** Share pixel-sized filters; release them when the last matching control leaves. */
type LensMapSet = { circle: string; vertical: string; horizontal: string }
export function createGlassLensFilters(defs: SVGDefsElement, maps: { capsule: LensMapSet; bead: LensMapSet }) {
  const filters = new Map<string, { node: SVGFilterElement; users: number; illumination?: SVGFEColorMatrixElement }>()
  let dark = document.documentElement.dataset.theme === 'dark'
  const illuminationValues = () => `${dark ? '0 0 0 0 .06 0 0 0 0 .1 0 0 0 0 .12' : '1 0 0 0 .04 0 1 0 0 .04 0 0 1 0 .04'} .19134 .64368 .06498 0 .06`
  const acquire = (width: number, height: number, ratio: number, variant: GlassLensVariant) => {
    const id = `size-${width}x${height}-${glassLensId(ratio, variant)}`
    const existing = filters.get(id)
    if (existing) { existing.users++; return id }
    const filter = document.createElementNS(svg, 'filter')
    const attributes = { id, filterUnits: 'objectBoundingBox', primitiveUnits: 'userSpaceOnUse',
      x: '0', y: '0', width: '1', height: '1', 'color-interpolation-filters': 'sRGB',
      'data-glass-depth': String(GLASS_LENS_DEPTHS[variant]) }
    Object.entries(attributes).forEach(([key, value]) => filter.setAttribute(key, value))
    const bead = variant === 'bead' || variant === 'bead-active'
    const map = bead ? maps.bead : maps.capsule
    const image = (href: string, x: number, y: number, w: number, h: number, aspect: string, result: string) => {
      const node = document.createElementNS(svg, 'feImage')
      Object.entries({ href, x, y, width: w, height: h, preserveAspectRatio: aspect, result })
        .forEach(([key, value]) => node.setAttribute(key, String(value)))
      filter.append(node)
    }
    // Crop equal-size circular caps and extend only the straight stem. Stretching
    // a full PNG also stretches the cap normal, changing refraction with width.
    if (width !== height) {
      const horizontal = width > height, diameter = Math.min(width, height), radius = diameter / 2
      if (horizontal) {
        image(map.circle, 0, 0, radius, height, 'xMinYMid slice', 'cap-start')
        image(map.circle, width - radius, 0, radius, height, 'xMaxYMid slice', 'cap-end')
        image(map.vertical, radius, 0, width - diameter, height, 'none', 'stem')
      } else {
        image(map.circle, 0, 0, width, radius, 'xMidYMin slice', 'cap-start')
        image(map.circle, 0, height - radius, width, radius, 'xMidYMax slice', 'cap-end')
        image(map.horizontal, 0, radius, width, height - diameter, 'none', 'stem')
      }
      const merge = document.createElementNS(svg, 'feMerge')
      merge.setAttribute('result', 'lens')
      for (const input of ['cap-start', 'stem', 'cap-end']) {
        const node = document.createElementNS(svg, 'feMergeNode'); node.setAttribute('in', input); merge.append(node)
      }
      filter.append(merge)
    } else image(map.circle, 0, 0, width, height, 'none', 'lens')
    // Smooth the encoded normal field, not foreground ink. This avoids stepping
    // from 8-bit PNG quantization when a long capsule stretches the map.
    const normals = document.createElementNS(svg, 'feGaussianBlur')
    Object.entries({ in: 'lens', stdDeviation: '.65', edgeMode: 'duplicate', result: 'lens-normal' })
      .forEach(([key, value]) => normals.setAttribute(key, value))
    const warp = document.createElementNS(svg, 'feDisplacementMap')
    // Equal pixel units on X and Y avoid aspect-dependent vertical stretching.
    Object.entries({ in: 'SourceGraphic', in2: 'lens-normal', scale: String(GLASS_LENS_DEPTHS[variant] * Math.min(width, height)),
      xChannelSelector: 'R', yChannelSelector: 'G', result: 'refracted-scene' }).forEach(([key, value]) => warp.setAttribute(key, value))
    filter.append(normals, warp)
    let illumination: SVGFEColorMatrixElement | undefined
    if (variant !== 'bead' && variant !== 'bead-active' && variant !== 'surface' && variant !== 'surface-active') {
      // Mix a broad local scene color into bright text backdrops. This softens
      // contrast without painting every scene white; dark mode protects ink
      // with a dark tint instead. The foreground is never input.
      const light = document.createElementNS(svg, 'feGaussianBlur')
      Object.entries({ in: 'SourceGraphic', stdDeviation: String(Math.min(20, height * .3)), edgeMode: 'duplicate', result: 'scene-light' })
        .forEach(([key, value]) => light.setAttribute(key, value))
      illumination = document.createElementNS(svg, 'feColorMatrix')
      illumination.setAttribute('in', 'scene-light'); illumination.setAttribute('type', 'matrix')
      illumination.setAttribute('values', illuminationValues()); illumination.setAttribute('result', 'glass-light')
      const material = document.createElementNS(svg, 'feMerge')
      material.setAttribute('result', 'material-scene')
      for (const input of ['refracted-scene', 'glass-light']) {
        const node = document.createElementNS(svg, 'feMergeNode'); node.setAttribute('in', input); material.append(node)
      }
      filter.append(light, illumination, material)
    }
    const reflection = document.createElementNS(svg, 'feColorMatrix')
    Object.entries({ in: 'lens-normal', type: 'matrix', values: '0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 .5 0 0', result: 'bezel-reflection' })
      .forEach(([key, value]) => reflection.setAttribute(key, value))
    const finish = document.createElementNS(svg, 'feMerge')
    const transmitted = document.createElementNS(svg, 'feMergeNode'), reflected = document.createElementNS(svg, 'feMergeNode')
    transmitted.setAttribute('in', illumination ? 'material-scene' : 'refracted-scene')
    reflected.setAttribute('in', 'bezel-reflection'); finish.append(transmitted, reflected)
    filter.append(reflection, finish)
    defs.append(filter)
    filters.set(id, { node: filter, users: 1, illumination })
    return id
  }
  const release = (id: string) => {
    const filter = filters.get(id)
    if (filter && --filter.users === 0) { filter.node.remove(); filters.delete(id) }
  }
  return { acquire, release,
    setTheme: (nextDark: boolean) => { if (nextDark === dark) return; dark = nextDark; filters.forEach(filter => filter.illumination?.setAttribute('values', illuminationValues())) },
    clear: () => { filters.forEach(filter => filter.node.remove()); filters.clear() } }
}
