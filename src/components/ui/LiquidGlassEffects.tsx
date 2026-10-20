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
import { GLASS_CANDIDATES, glassControlKind, type GlassControlKind } from './glassControlScope'

const maps = { 1: circleMap, 2: shortMap, 3: lensMap, 4: longMap, 6: wideMap, 10: rowMap }
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
    const kinds = new Map<HTMLElement, GlassControlKind>()
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
          const lens = kinds.get(element) === 'lens'
          const surface = kinds.get(element) === 'surface'
          const rest = bank.acquire(w, h, ratio, surface ? 'surface' : lens ? 'tab-rest' : 'control')
          const active = bank.acquire(w, h, ratio, surface ? 'surface-active' : lens ? 'tab-active' : 'control-active')
          const ids = [rest, active]
          element.style.setProperty('--glass-lens-filter', `url("#${rest}")`)
          element.style.setProperty('--glass-lens-active-filter', `url("#${active}")`)
          release(element)
          leases.set(element, ids)
        })
        pending.clear()
      })
    })
    const clearMarkers = (element: HTMLElement) => {
      element.style.removeProperty('--glass-lens-filter')
      element.style.removeProperty('--glass-lens-active-filter')
      for (const key of ['glassControl', 'glassFace', 'glassPosition', 'glassSearch', 'glassField', 'glassToggle', 'glassSurface', 'glassContent']) delete element.dataset[key]
    }
    const forget = (element: HTMLElement) => {
      resize.unobserve(element); pending.delete(element); observed.delete(element)
      kinds.delete(element); release(element); clearMarkers(element)
    }
    const reconcile = (element: HTMLElement) => {
      const kind = glassControlKind(element)
      if (kinds.get(element) === kind) return
      if (observed.has(element)) forget(element)
      else { kinds.delete(element); clearMarkers(element) }
      if (kind === 'skip') return
      kinds.set(element, kind)
      if (kind === 'content') { element.dataset.glassContent = ''; return }
      if (kind !== 'lens') {
        element.dataset.glassControl = ''
        if (kind === 'search') element.dataset.glassSearch = ''
        if (kind === 'field') element.dataset.glassField = ''
        if (kind === 'toggle') element.dataset.glassToggle = ''
        if (kind === 'surface') element.dataset.glassSurface = ''
        if (kind === 'control' && element.matches('button,a,summary') && !element.matches('.ai-spectrum-button')
          && ['none', 'normal'].includes(getComputedStyle(element, '::after').content)) {
          element.dataset.glassFace = ''
          if (getComputedStyle(element).position === 'static') element.dataset.glassPosition = 'relative'
        }
      }
      observed.add(element)
      resize.observe(element)
    }
    const register = (root: Element) => {
      if (root instanceof HTMLElement && (root.matches(GLASS_CANDIDATES) || kinds.has(root))) reconcile(root)
      root.querySelectorAll(GLASS_CANDIDATES).forEach(element => { if (element instanceof HTMLElement) reconcile(element) })
    }
    register(document.body)
    const stopActivity = observeGlassActivity(document)
    const mutations = new MutationObserver(records => {
      const removals = new Set<Element>()
      for (const record of records) {
        if (record.type === 'attributes' && record.target instanceof Element) register(record.target)
        if (record.type === 'childList') {
          record.addedNodes.forEach(node => { if (node instanceof Element) register(node) })
          record.removedNodes.forEach(node => { if (node instanceof Element) removals.add(node) })
          if (record.target instanceof HTMLElement && kinds.has(record.target)) reconcile(record.target)
        }
      }
      // Only removed subtrees need cleanup; typing no longer scans every control.
      for (const root of removals) {
        if (root.isConnected) continue
        if (root instanceof HTMLElement && kinds.has(root)) forget(root)
        root.querySelectorAll<HTMLElement>('[data-glass-control],[data-glass-content],.liquid-tabs__lens,.theme-switch__thumb,[data-glass-optics]')
          .forEach(element => { if (kinds.has(element)) forget(element) })
      }
    })
    mutations.observe(document.body, { childList: true, subtree: true, attributes: true,
      attributeFilter: ['class', 'role', 'type', 'readonly', 'hidden', 'aria-hidden', 'data-glass-exclude', 'data-glass-optics', 'data-glass-panel'] })
    return () => {
      stopActivity()
      cancelAnimationFrame(frame)
      resize.disconnect()
      mutations.disconnect()
      kinds.forEach((_, element) => clearMarkers(element))
      kinds.clear()
      pending.clear()
      leases.clear()
      bank.clear()
    }
  }, [])
  return <svg className="liquid-glass-defs" width="0" height="0" aria-hidden="true" focusable="false">
    <defs ref={defsRef} />
  </svg>
}
