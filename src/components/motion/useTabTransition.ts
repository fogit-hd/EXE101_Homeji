import { useLayoutEffect, useRef } from 'react'

/** Animate the existing panel; data, forms and DOM identity are never reset for an entrance. */
export function useTabTransition(value: string, order: readonly string[], childSelector?: string) {
  const ref = useRef<HTMLDivElement>(null)
  const previous = useRef(value)
  useLayoutEffect(() => {
    const element = ref.current
    const from = order.indexOf(previous.current)
    const to = order.indexOf(value)
    const changed = previous.current !== value
    previous.current = value
    if (!element || !changed || typeof element.animate !== 'function') return
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (preference.matches) return
    const direction = to >= from ? 1 : -1
    // Food cart overlays are fixed siblings of its catalog: animate the catalog, not their containing block.
    const targets = childSelector ? [...element.querySelectorAll<HTMLElement>(childSelector)] : [element]
    const animations = targets.map(target => target.animate([
      { opacity: .25, translate: `${direction * 28}px 6px`, scale: '.99' },
      { opacity: 1, translate: '0 0', scale: '1' },
    ], { duration: 320, easing: 'cubic-bezier(.16, 1, .3, 1)' }))
    const cancel = () => animations.forEach(animation => animation.cancel())
    const reduce = () => { if (preference.matches) cancel() }
    preference.addEventListener('change', reduce)
    return () => { cancel(); preference.removeEventListener('change', reduce) }
  }, [value, order, childSelector])
  return ref
}
