import { useEffect, useRef } from 'react'
import lensMap from './liquid-lens-map.png'
import circleMap from './liquid-lens-map-1.png'
import shortMap from './liquid-lens-map-2.png'
import longMap from './liquid-lens-map-4.png'
import wideMap from './liquid-lens-map-6.png'
import rowMap from './liquid-lens-map-10.png'
import { observeGlassActivity } from './glassActivity'
import { nearestLensRatio } from './glassLensGeometry'
import { createGlassLensFilters } from './glassLensFilters'

const maps = { 1: circleMap, 2: shortMap, 3: lensMap, 4: longMap, 6: wideMap, 10: rowMap }
// Only the backdrop samples the scene. Labels/icons sit above that plane;
// information cards and conversation rows never become lenses.
const searchSurfaces = '.hj-search__field,.gmaps-omnibox__bar,.map-messages__inbox-search,.map-messages__search-bar,.choice-picker__search-wrap'
const controls = `[data-glass-optics],.liquid-tabs__lens,.theme-switch__thumb,button,summary,input[type="button"],input[type="submit"],input[type="reset"],.btn,.liquid-action,.pay-btn,.payment-button,.hj-action,.hj-post-cta,[role="button"],[role="menuitem"],select,${searchSurfaces}`
const contentControls = '.pay-table__row,.map-explore-card,.map-listing-card,.marketplace-card__main,.food-card__media,.food-card__main,.food-kitchen-row,.food-kitchen-card,.marketplace-seller-card,.hj-account__item,.hj-mega__link,[role="menuitem"],[role="option"],.schedule-dt__day,[class*="__card"],[class*="__hit"],[class*="__photo"],[class*="__thumbnail"],[class*="__image"],[class*="__person"],[role="tab"]'

/** Shared shape-aware lens filters. Only geometry changes trigger measurements. */
export function LiquidGlassEffects() {
  const defsRef = useRef<SVGDefsElement>(null)
  useEffect(() => {
    if (!window.ResizeObserver || typeof CSS === 'undefined' || typeof CSS.supports !== 'function'
      || !CSS.supports('backdrop-filter', 'url("#homeji-liquid-lens")')) return
    if (!defsRef.current) return
    const bank = createGlassLensFilters(defsRef.current, maps)
    const leases = new Map<HTMLElement, string[]>()
    const release = (element: HTMLElement) => {
      leases.get(element)?.forEach(bank.release)
      leases.delete(element)
    }
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
          const w = Math.round(width * 100) / 100, h = Math.round(height * 100) / 100
          const lens = element.matches('.liquid-tabs__lens,.theme-switch__thumb')
          const rest = bank.acquire(w, h, ratio, lens ? 'tab-rest' : 'control')
          const active = bank.acquire(w, h, ratio, lens ? 'tab-active' : 'control-active')
          const ids = [rest, active]
          element.style.setProperty('--glass-lens-filter', `url("#${rest}")`)
          element.style.setProperty('--glass-lens-active-filter', `url("#${active}")`)
          release(element)
          leases.set(element, ids)
        })
        pending.clear()
      })
    })
    const register = (root: Element) => {
      const candidates = root.matches(controls) ? [root, ...root.querySelectorAll(controls)] : root.querySelectorAll(controls)
      candidates.forEach(element => {
        if (!(element instanceof HTMLElement) || element.closest('.gm-style, gmp-map,[data-glass-exclude]') || observed.has(element)) return
        const lens = element.matches('.liquid-tabs__lens,.theme-switch__thumb,[data-glass-optics]')
        if (!lens && (element.matches(contentControls) || (element.textContent?.trim().length ?? 0) > 120
          || element.querySelector('h1,h2,h3,h4,p,article,section,table'))) {
          element.dataset.glassContent = ''
          return
        }
        if (!lens) {
          element.dataset.glassControl = ''
          // The container refracts the scene; its editable text stays above it.
          if (element.matches(searchSurfaces)) element.dataset.glassSearch = ''
          // Keep existing icon/AI pseudo-elements intact. This face is a faint
          // reflection only; it never filters or samples foreground labels.
          if (element.matches('button,a,summary') && !element.matches('.ai-spectrum-button')
            && ['none', 'normal'].includes(getComputedStyle(element, '::after').content)) {
            element.dataset.glassFace = ''
            if (getComputedStyle(element).position === 'static') element.dataset.glassPosition = 'relative'
          }
        }
        observed.add(element)
        resize.observe(element)
      })
    }
    register(document.body)
    const stopActivity = observeGlassActivity(document)
    const mutations = new MutationObserver(records => {
      records.forEach(record => record.addedNodes.forEach(node => { if (node instanceof Element) register(node) }))
      observed.forEach(element => {
        if (!element.isConnected) { resize.unobserve(element); pending.delete(element); observed.delete(element); release(element) }
      })
    })
    mutations.observe(document.body, { childList: true, subtree: true })
    return () => {
      stopActivity()
      cancelAnimationFrame(frame)
      resize.disconnect()
      mutations.disconnect()
      observed.forEach(element => { element.style.removeProperty('--glass-lens-filter'); element.style.removeProperty('--glass-lens-active-filter'); delete element.dataset.glassControl; delete element.dataset.glassFace; delete element.dataset.glassPosition; delete element.dataset.glassSearch })
      pending.clear()
      leases.clear()
      bank.clear()
    }
  }, [])
  return <svg className="liquid-glass-defs" width="0" height="0" aria-hidden="true" focusable="false">
    <defs ref={defsRef} />
  </svg>
}
