const activityTargets = '[data-glass-control],.liquid-tabs,.theme-switch,.ai-spectrum-button,.map-chatbot__panel,.map-chatbot__form,.rental-draft-assistant,.rental-comparison,.ai-search-review'

/** Transient optics follow real input, never a stationary hover or focus. */
export function observeGlassActivity(doc: Document) {
  const timers = new Map<HTMLElement, ReturnType<typeof setTimeout>>()
  const pressed = new Set<HTMLElement>()
  const pointers = new Map<number, HTMLElement[]>()
  const keys = new Map<string, HTMLElement[]>()
  const controller = new AbortController()
  const options = { capture: true, signal: controller.signal }
  const targets = (target: EventTarget | null) => {
    if (!(target instanceof Element) || target.closest('[data-glass-exclude]')) return []
    const result: HTMLElement[] = []
    for (let node: Element | null = target; node; node = node.parentElement) {
      if (!(node instanceof HTMLElement) || !node.matches(activityTargets) || node.matches(':disabled,[aria-disabled="true"]')) continue
      const lens = node.matches('.liquid-tabs,.theme-switch') ? node.querySelector<HTMLElement>('.liquid-tabs__lens,.theme-switch__thumb') : null
      result.push(lens ?? node)
    }
    return result
  }
  const relax = (element: HTMLElement) => {
    clearTimeout(timers.get(element))
    timers.set(element, setTimeout(() => {
      timers.delete(element)
      if (!pressed.has(element)) delete element.dataset.glassInteracting
    }, 180))
  }
  const pulse = (elements: HTMLElement[]) => elements.forEach(element => {
    element.dataset.glassInteracting = ''
    relax(element)
  })
  const release = (elements: HTMLElement[]) => elements.forEach(element => {
    // Another pointer/key may still be holding the same control.
    if (![...pointers.values(), ...keys.values()].some(group => group.includes(element))) pressed.delete(element)
    relax(element)
  })
  const reset = () => {
    for (const [element, timer] of timers) { clearTimeout(timer); delete element.dataset.glassInteracting }
    for (const element of pressed) delete element.dataset.glassInteracting
    timers.clear(); pressed.clear(); pointers.clear(); keys.clear()
  }
  doc.addEventListener('pointermove', event => pulse(targets(event.target)), options)
  doc.addEventListener('pointerdown', event => {
    const elements = targets(event.target)
    pointers.set(event.pointerId, elements)
    elements.forEach(element => pressed.add(element))
    pulse(elements)
  }, options)
  const releasePointer = (event: PointerEvent) => {
    const elements = pointers.get(event.pointerId) ?? []
    pointers.delete(event.pointerId)
    release(elements)
  }
  doc.addEventListener('pointerup', releasePointer, options)
  doc.addEventListener('pointercancel', releasePointer, options)
  doc.addEventListener('lostpointercapture', releasePointer, options)
  doc.addEventListener('keydown', event => {
    if (!['Enter', ' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return
    const elements = targets(event.target)
    keys.set(event.key, elements)
    elements.forEach(element => pressed.add(element))
    pulse(elements)
  }, options)
  doc.addEventListener('keyup', event => {
    const elements = keys.get(event.key) ?? []
    keys.delete(event.key)
    release(elements)
  }, options)
  doc.addEventListener('click', event => pulse(targets(event.target)), options)
  doc.addEventListener('visibilitychange', () => { if (doc.hidden) reset() }, options)
  doc.defaultView?.addEventListener('blur', event => { if (event.target === doc.defaultView) reset() }, options)
  return () => { controller.abort(); reset() }
}
