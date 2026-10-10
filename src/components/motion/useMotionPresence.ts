import { useLayoutEffect, useRef, useState } from 'react'

/** Retain a closing surface briefly; it becomes inert immediately, before its exit finishes. */
export function useMotionPresence(open: boolean, kind: 'popup' | 'collapse' | 'fade' = 'popup') {
  const [retained, setRetained] = useState(open)
  const ref = useRef<HTMLDivElement>(null)
  if (open && !retained) setRetained(true)
  const present = open || retained

  useLayoutEffect(() => {
    const node = ref.current
    if (!node || !present) return
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const settle = () => { if (!open) setRetained(false) }
    if (preference.matches || !node.animate) { settle(); return }
    let cancelled = false
    const height = node.getBoundingClientRect().height
    const frames: Keyframe[] = kind === 'collapse'
      ? [{ height: '0px', opacity: 0 }, { height: `${height}px`, opacity: 1 }]
      : kind === 'fade' ? [{ opacity: 0 }, { opacity: 1 }]
      : [{ opacity: 0, translate: '0 16px', scale: '.94' }, { opacity: 1, translate: '0 0', scale: '1' }]
    const previousOverflow = node.style.overflow
    if (kind === 'collapse') node.style.overflow = 'hidden'
    const animation = node.animate(open ? frames : [...frames].reverse(), {
      duration: open ? 320 : 180, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both',
    })
    void animation.finished.then(() => {
      if (!cancelled) { settle(); animation.cancel(); node.style.overflow = previousOverflow }
    }, () => {})
    const reduce = () => { if (preference.matches) { animation.cancel(); settle(); node.style.overflow = previousOverflow } }
    preference.addEventListener('change', reduce)
    return () => {
      cancelled = true
      animation.cancel()
      node.style.overflow = previousOverflow
      preference.removeEventListener('change', reduce)
    }
  }, [open, present, kind])

  return { present, ref, inert: !open, 'aria-hidden': !open }
}
