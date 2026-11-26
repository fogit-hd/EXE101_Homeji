import { useEffect, useRef } from 'react'
import circleMap from './liquid-lens-map-1.png'
import stemMap from './liquid-lens-map-stem.png'
import horizontalStemMap from './liquid-lens-map-stem-horizontal.png'
import beadMap from './liquid-lens-bead-map.png'
import beadStemMap from './liquid-lens-bead-map-stem.png'
import beadHorizontalStemMap from './liquid-lens-bead-map-stem-horizontal.png'
import { nearestLensRatio } from './glassLensGeometry'
import { createGlassLensFilters } from './glassLensFilters'
import { GLASS_CANDIDATES, glassControlKind } from './glassControlScope'

const maps = {
  capsule: { circle: circleMap, vertical: stemMap, horizontal: horizontalStemMap },
  bead: { circle: beadMap, vertical: beadStemMap, horizontal: beadHorizontalStemMap },
}

/** Registration works without SVG support; only small standalone lenses refract. */
export function LiquidGlassEffects() {
  const defsRef = useRef<SVGDefsElement>(null)
  useEffect(() => {
    if (!defsRef.current) return
    const bank = createGlassLensFilters(defsRef.current, maps)
    const preference = matchMedia('(prefers-reduced-transparency: reduce), (prefers-contrast: more), (forced-colors: active)')
    const registered = new Map<HTMLElement, string | undefined>()
    const clear = (element: HTMLElement) => {
      const id = registered.get(element)
      if (id) bank.release(id)
      registered.delete(element)
      delete element.dataset.glassSurface
      delete element.dataset.glassRegisteredLens
      element.style.removeProperty('--glass-lens-filter')
    }
    const resize = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(entries => {
      for (const { target } of entries) {
        const element = target as HTMLElement
        const old = registered.get(element)
        if (old) bank.release(old)
        registered.set(element, undefined)
        element.style.removeProperty('--glass-lens-filter')
        if (preference.matches || glassControlKind(element) !== 'lens'
          || !CSS.supports('backdrop-filter', 'url("#lens")')) continue
        const { width, height } = element.getBoundingClientRect()
        if (!width || !height) continue
        const id = bank.acquire(Math.round(width), Math.round(height), nearestLensRatio(width, height),
          element.matches('.theme-switch__thumb,.liquid-switch__thumb') ? 'bead' : 'tab-rest')
        element.style.setProperty('--glass-lens-filter', `url("#${id}")`)
        registered.set(element, id)
      }
    })
    const refresh = () => {
      for (const element of registered.keys()) {
        if (!element.isConnected || glassControlKind(element) === 'skip') {
          resize?.unobserve(element)
          clear(element)
        }
      }
      document.querySelectorAll<HTMLElement>(GLASS_CANDIDATES).forEach(element => {
        const kind = glassControlKind(element)
        if (kind === 'skip' || registered.has(element)) return
        registered.set(element, undefined)
        if (kind === 'lens') {
          element.dataset.glassRegisteredLens = ''
          resize?.observe(element)
        } else element.dataset.glassSurface = ''
      })
    }
    const onPreference = () => {
      for (const element of registered.keys()) { resize?.unobserve(element); clear(element) }
      refresh()
    }
    refresh()
    const observer = new MutationObserver(refresh)
    observer.observe(document.body, { childList: true, subtree: true, attributes: true,
      attributeFilter: ['class', 'role', 'data-glass-exclude', 'data-glass-panel', 'data-glass-lens'] })
    preference.addEventListener('change', onPreference)
    return () => {
      observer.disconnect()
      resize?.disconnect()
      preference.removeEventListener('change', onPreference)
      for (const element of registered.keys()) clear(element)
      bank.clear()
    }
  }, [])
  return <svg className="liquid-glass-defs" width="0" height="0" aria-hidden="true" focusable="false">
    <defs ref={defsRef} />
  </svg>
}
