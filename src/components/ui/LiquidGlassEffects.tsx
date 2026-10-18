import { useEffect } from 'react'
import lensMap from './liquid-lens-map.png'
import circleMap from './liquid-lens-map-1.png'
import shortMap from './liquid-lens-map-2.png'
import longMap from './liquid-lens-map-4.png'
import wideMap from './liquid-lens-map-6.png'
import rowMap from './liquid-lens-map-10.png'
import { GLASS_LENS_RATIOS, glassLensId, nearestLensRatio } from './glassLensGeometry'

const maps = { 1: circleMap, 2: shortMap, 3: lensMap, 4: longMap, 6: wideMap, 10: rowMap }
const controls = 'button, summary, input[type="button"], input[type="submit"], input[type="reset"], .btn, .liquid-action, .pay-btn, .payment-button, .hj-action, .hj-post-cta, [role="button"], [role="menuitem"], [data-glass-lens]'

/** Shared shape-aware lens filters. Only geometry changes trigger measurements. */
export function LiquidGlassEffects() {
  useEffect(() => {
    if (!window.ResizeObserver || !CSS.supports('backdrop-filter', 'url("#homeji-liquid-lens")')) return
    const observed = new Set<HTMLElement>()
    const pending = new Map<HTMLElement, { width: number; height: number }>()
    let frame = 0
    const resize = new ResizeObserver(entries => {
      for (const entry of entries) {
        const element = entry.target as HTMLElement
        const box = entry.borderBoxSize[0]
        pending.set(element, { width: box?.inlineSize ?? entry.contentRect.width, height: box?.blockSize ?? entry.contentRect.height })
      }
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        pending.forEach(({ width, height }, element) => {
          if (!element.isConnected || !width || !height) return
          const ratio = nearestLensRatio(width, height)
          const value = `url("#${glassLensId(ratio)}") saturate(1.08)`
          if (element.style.getPropertyValue('--glass-lens-filter') !== value) element.style.setProperty('--glass-lens-filter', value)
          if (element.classList.contains('liquid-tabs__lens')) element.style.setProperty('--glass-lens-active-filter', `url("#${glassLensId(ratio, true)}") saturate(1.12)`)
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
      observed.forEach(element => { element.style.removeProperty('--glass-lens-filter'); element.style.removeProperty('--glass-lens-active-filter') })
      pending.clear()
    }
  }, [])
  return <svg className="liquid-glass-defs" width="0" height="0" aria-hidden="true" focusable="false">
    <defs>{GLASS_LENS_RATIOS.flatMap(ratio => [false, true].map(engaged => <filter key={glassLensId(ratio, engaged)} id={glassLensId(ratio, engaged)} data-glass-state={engaged ? 'active' : 'rest'} filterUnits="objectBoundingBox" primitiveUnits="objectBoundingBox"
      x="0" y="0" width="1" height="1" colorInterpolationFilters="sRGB">
      <feImage href={maps[ratio]} x="0" y="0" width="1" height="1" preserveAspectRatio="none" result="lens" />
      <feGaussianBlur in="SourceGraphic" stdDeviation={`${(engaged ? .006 : .014) / ratio} ${engaged ? .006 : .014}`} result="scene" />
      <feDisplacementMap in="scene" in2="lens" scale={engaged ? .42 : .24} xChannelSelector="R" yChannelSelector="G" />
    </filter>))}</defs>
  </svg>
}
