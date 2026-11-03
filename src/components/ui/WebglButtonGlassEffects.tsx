import { useEffect } from 'react'
import { BUTTON_GLASS_CANDIDATES, createButtonPaintReader, cssColor, supportsButtonGlass } from './buttonGlassPaint'
import { createButtonGlassRenderer, type ButtonGlassPaint } from './buttonGlassRenderer'
import './WebglButtonGlassEffects.css'

type Face = { canvas: HTMLCanvasElement; visible: boolean; paint: ButtonGlassPaint | null; width: number; height: number; light: [number, number]; pressed: number; target: number; velocity: number; until: number }

/** Event-driven tiles share one GPU context; idle buttons run no render loop. */
export function WebglButtonGlassEffects() {
  useEffect(() => {
    const faces = new Map<HTMLElement, Face>(), pending = new Set<HTMLElement>()
    const preferences = matchMedia('(forced-colors: active), (prefers-contrast: more), (prefers-reduced-transparency: reduce)')
    const readPaint = createButtonPaintReader()
    let frame = 0, last = 0, disposed = false
    const fallback = () => { for (const element of faces.keys()) { delete element.dataset.glassButtonReady; element.dataset.glassButtonFallback = '' } }
    const renderer = createButtonGlassRenderer(fallback)
    const clear = (element: HTMLElement) => {
      delete element.dataset.glassButton; delete element.dataset.glassButtonReady; delete element.dataset.glassButtonFallback; delete element.dataset.glassButtonPosition
      element.style.removeProperty('--button-glass-ink'); element.style.removeProperty('--button-glass-base')
    }
    const forget = (element: HTMLElement) => {
      const face = faces.get(element)
      if (!face) return
      resize.unobserve(element); intersection?.unobserve(element); face.canvas.remove(); faces.delete(element); pending.delete(element); clear(element)
    }
    const schedule = () => { if (!disposed && !frame && !document.hidden && !preferences.matches) frame = requestAnimationFrame(render) }
    const invalidate = (element: HTMLElement) => { if (faces.get(element)?.visible) { pending.add(element); schedule() } }
    function render(now: number) {
      frame = 0
      const dt = Math.min((now - (last || now - 16)) / 1000, .032); last = now
      for (const [element, face] of faces) {
        if (!face.visible || !element.isConnected) continue
        const moving = Math.abs(face.target - face.pressed) > .001 || Math.abs(face.velocity) > .001
        if (!pending.has(element) && !moving && face.until < now) continue
        if (pending.delete(element)) {
          if (!supportsButtonGlass(element)) { forget(element); continue }
          if (getComputedStyle(element).position === 'static') element.dataset.glassButtonPosition = ''
          const wasReady = element.hasAttribute('data-glass-button-ready')
          delete element.dataset.glassButtonReady
          const measured = readPaint(element)
          if (!measured) { face.paint = null; face.canvas.hidden = true; element.style.removeProperty('--button-glass-ink'); element.style.removeProperty('--button-glass-base'); continue }
          face.canvas.hidden = false; face.paint = measured.paint; face.width = element.offsetWidth; face.height = element.offsetHeight
          element.style.setProperty('--button-glass-ink', cssColor(measured.ink)); element.style.setProperty('--button-glass-base', cssColor(measured.paint.face))
          if (wasReady) element.dataset.glassButtonReady = ''
        }
        if (!face.paint || !face.width || !face.height) continue
        const ticks = Math.ceil(dt * 120), tick = dt / ticks
        for (let i = 0; i < ticks; i++) { face.velocity += ((face.target - face.pressed) * 300 - face.velocity * 24) * tick; face.pressed += face.velocity * tick }
        if (renderer?.draw(face.canvas, face.width, face.height, face.paint, face.pressed, face.light)) element.dataset.glassButtonReady = ''
        else { delete element.dataset.glassButtonReady; element.dataset.glassButtonFallback = ''; continue }
        if (moving || face.until > now) schedule()
      }
    }
    const resize = new ResizeObserver(entries => { for (const entry of entries) invalidate(entry.target as HTMLElement) })
    const intersection = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
      for (const entry of entries) { const element = entry.target as HTMLElement, face = faces.get(element); if (face) { face.visible = entry.isIntersecting; if (face.visible) invalidate(element) } }
    })
    const register = (element: HTMLElement) => {
      if (preferences.matches || !supportsButtonGlass(element)) { forget(element); return }
      if (faces.has(element)) { const face = faces.get(element)!; if (face.canvas.parentElement !== element) element.prepend(face.canvas); invalidate(element); return }
      const canvas = document.createElement('canvas'); canvas.className = 'button-glass__surface'; canvas.setAttribute('aria-hidden', 'true'); canvas.dataset.glassExclude = ''
      const face: Face = { canvas, visible: !intersection, paint: null, width: 0, height: 0, light: [-.45, .8], pressed: 0, target: 0, velocity: 0, until: 0 }
      faces.set(element, face); element.dataset.glassButton = ''
      if (getComputedStyle(element).position === 'static' || element.dataset.glassPosition === 'relative') element.dataset.glassButtonPosition = ''
      element.prepend(canvas); resize.observe(element); intersection?.observe(element); invalidate(element)
    }
    const scan = (root: Element) => {
      if (root instanceof HTMLElement && root.matches(BUTTON_GLASS_CANDIDATES)) register(root)
      root.querySelectorAll<HTMLElement>(BUTTON_GLASS_CANDIDATES).forEach(register)
    }
    const mutations = new MutationObserver(records => {
      for (const record of records) {
        if (record.target === document.documentElement) { scan(document.body); continue }
        if (record.type === 'attributes' && record.target instanceof HTMLElement) {
          if (record.attributeName === 'style') {
            const stripOwn = (value: string) => value.replace(/--button-glass-(?:ink|base):[^;]+;?/g, '').replace(/\s/g, '')
            if (stripOwn(record.oldValue ?? '') === stripOwn(record.target.getAttribute('style') ?? '')) continue
          }
          scan(record.target)
        }
        if (record.type === 'childList') {
          if (record.target instanceof HTMLElement && faces.has(record.target)) register(record.target)
          record.addedNodes.forEach(node => { if (node instanceof Element && !node.matches('.button-glass__surface')) scan(node) })
          record.removedNodes.forEach(node => { if (node instanceof Element && !node.isConnected) { if (node instanceof HTMLElement) forget(node); node.querySelectorAll<HTMLElement>('[data-glass-button]').forEach(forget) } })
        }
      }
    })
    const controller = new AbortController(), options = { capture: true, signal: controller.signal }
    const pulse = (event: Event, target?: number) => {
      if (!(event.target instanceof Element)) return
      const element = event.target.closest<HTMLElement>('[data-glass-button]'), face = element && faces.get(element)
      if (!face || !element || element.matches(':disabled')) return
      if (target !== undefined) face.target = target
      if (event instanceof PointerEvent) { const rect = element.getBoundingClientRect(); face.light = [(event.clientX - rect.left) / Math.max(1, rect.width) - .5, .8 - (event.clientY - rect.top) / Math.max(1, rect.height) * .3] }
      face.until = performance.now() + 180; schedule()
    }
    const release = () => { for (const face of faces.values()) if (face.target) { face.target = 0; face.until = performance.now() + 250 } schedule() }
    document.addEventListener('pointermove', event => pulse(event), options)
    document.addEventListener('pointerdown', event => pulse(event, 1), options)
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) document.addEventListener(type, release, options)
    document.addEventListener('keydown', event => { if (event.key === ' ' || event.key === 'Enter') pulse(event, 1) }, options)
    document.addEventListener('keyup', release, options); window.addEventListener('blur', release, options)
    const refresh = () => scan(document.body)
    const onPreference = () => { if (preferences.matches) { for (const element of [...faces.keys()]) forget(element); cancelAnimationFrame(frame); frame = 0 } else refresh() }
    const onVisibility = () => { last = 0; if (document.hidden) { cancelAnimationFrame(frame); frame = 0; release() } else { release(); refresh() } }
    preferences.addEventListener('change', onPreference); document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('resize', refresh, { signal: controller.signal })
    mutations.observe(document.body, { subtree: true, childList: true, attributes: true, attributeOldValue: true, attributeFilter: ['style', 'class', 'disabled', 'aria-disabled', 'aria-pressed', 'aria-selected', 'hidden'] })
    mutations.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    scan(document.body)
    return () => { disposed = true; cancelAnimationFrame(frame); controller.abort(); mutations.disconnect(); resize.disconnect(); intersection?.disconnect(); preferences.removeEventListener('change', onPreference); document.removeEventListener('visibilitychange', onVisibility); for (const element of [...faces.keys()]) forget(element); renderer?.dispose() }
  }, [])
  return null
}
