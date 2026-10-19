import { useEffect } from 'react'
import lensMap from './liquid-lens-map.png'
import circleMap from './liquid-lens-map-1.png'
import shortMap from './liquid-lens-map-2.png'
import longMap from './liquid-lens-map-4.png'
import wideMap from './liquid-lens-map-6.png'
import rowMap from './liquid-lens-map-10.png'
import { GLASS_LENS_RATIOS, glassLensId, nearestLensRatio } from './glassLensGeometry'

const maps = { 1: circleMap, 2: shortMap, 3: lensMap, 4: longMap, 6: wideMap, 10: rowMap }
const lensVariants = [
  { variant: 'control', state: 'rest', depth: .012, blur: 0 },
  { variant: 'tab-rest', state: 'tab-rest', depth: .065, blur: 0 },
  { variant: 'tab-active', state: 'active', depth: .095, blur: 0 },
] as const
// Optics belong only to explicit backgrounds and the one moving tab lens.
// Cards, images and ordinary labels never become optical surfaces.
const controls = '[data-glass-optics],.liquid-tabs__lens'

/** Shared shape-aware lens filters. Only geometry changes trigger measurements. */
export function LiquidGlassEffects() {
  useEffect(() => {
    if (!window.ResizeObserver || typeof CSS === 'undefined' || typeof CSS.supports !== 'function'
      || !CSS.supports('backdrop-filter', 'url("#homeji-liquid-lens")')) return
    const observed = new Set<HTMLElement>()
    const pending = new Map<HTMLElement, { width: number; height: number }>()
    let frame = 0
    const resize = new ResizeObserver(entries => {
      for (const entry of entries) {
        const element = entry.target as HTMLElement
        const box = entry.borderBoxSize?.[0]
        pending.set(element, { width: box?.inlineSize ?? entry.contentRect.width, height: box?.blockSize ?? entry.contentRect.height })
      }
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        pending.forEach(({ width, height }, element) => {
          if (!element.isConnected || !width || !height) return
          const ratio = nearestLensRatio(width, height)
          const value = `url("#${glassLensId(ratio, element.matches('.liquid-tabs__lens,.theme-switch__thumb') ? 'tab-rest' : 'control')}") saturate(1.08)`
          if (element.style.getPropertyValue('--glass-lens-filter') !== value) element.style.setProperty('--glass-lens-filter', value)
          if (element.hasAttribute('data-glass-face')) element.style.setProperty('--glass-face-filter', `url("#${glassLensId(ratio, 'tab-rest')}")`)
          if (element.matches('.liquid-tabs__lens,.theme-switch__thumb,[data-glass-face]')) element.style.setProperty('--glass-lens-active-filter', `url("#${glassLensId(ratio, 'tab-active')}") saturate(1.12)`)
        })
        pending.clear()
      })
    })
    const register = (root: Element) => {
      const candidates = root.matches(controls) ? [root, ...root.querySelectorAll(controls)] : root.querySelectorAll(controls)
      candidates.forEach(element => {
        if (!(element instanceof HTMLElement) || element.closest('.gm-style, gmp-map') || observed.has(element)) return
        observed.add(element)
        resize.observe(element)
      })
    }
    register(document.body)
    const mutations = new MutationObserver(records => {
      records.forEach(record => record.addedNodes.forEach(node => { if (node instanceof Element) register(node) }))
      observed.forEach(element => {
        if (!element.isConnected) { resize.unobserve(element); pending.delete(element); observed.delete(element) }
      })
    })
    mutations.observe(document.body, { childList: true, subtree: true })
    return () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
      mutations.disconnect()
      observed.forEach(element => { element.style.removeProperty('--glass-lens-filter'); element.style.removeProperty('--glass-lens-active-filter'); element.style.removeProperty('--glass-face-filter'); delete element.dataset.glassFace; delete element.dataset.glassPosition })
      pending.clear()
    }
  }, [])
  return <svg className="liquid-glass-defs" width="0" height="0" aria-hidden="true" focusable="false">
    <defs>{GLASS_LENS_RATIOS.flatMap(ratio => lensVariants.map(({ variant, state, depth, blur }) => <filter key={glassLensId(ratio, variant)} id={glassLensId(ratio, variant)} data-glass-state={state} data-glass-depth={depth} filterUnits="objectBoundingBox" primitiveUnits="objectBoundingBox"
      x="0" y="0" width="1" height="1" colorInterpolationFilters="sRGB">
      <feImage href={maps[ratio]} x="0" y="0" width="1" height="1" preserveAspectRatio="none" result="lens" />
      <feGaussianBlur in="SourceGraphic" stdDeviation={`${blur / ratio} ${blur}`} result="scene" />
      {variant === 'control' ? <feDisplacementMap in="scene" in2="lens" scale={depth} xChannelSelector="R" yChannelSelector="G" /> : <>
        <feDisplacementMap in="scene" in2="lens" scale={depth + .004} xChannelSelector="R" yChannelSelector="G" result="red-warp" />
        <feColorMatrix in="red-warp" type="matrix" values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" result="red" />
        <feDisplacementMap in="scene" in2="lens" scale={depth} xChannelSelector="R" yChannelSelector="G" result="green-warp" />
        <feColorMatrix in="green-warp" type="matrix" values="0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0" result="green" />
        <feDisplacementMap in="scene" in2="lens" scale={depth - .004} xChannelSelector="R" yChannelSelector="G" result="blue-warp" />
        <feColorMatrix in="blue-warp" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0" result="blue" />
        <feComposite in="red" in2="green" operator="arithmetic" k2="1" k3="1" result="red-green" />
        <feComposite in="red-green" in2="blue" operator="arithmetic" k2="1" k3="1" />
      </>}
    </filter>))}</defs>
  </svg>
}
