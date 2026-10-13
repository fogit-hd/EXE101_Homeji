import { useLayoutEffect, useRef, useState } from 'react'
import { animate, type DOMKeyframesDefinition } from 'motion/react'
import { DURATION, EASE } from '../../lib/motionTokens'

/**
 * Retain a closing surface briefly; it becomes inert immediately, before its exit finishes.
 * Animated with Motion so every popup/collapse shares the tokens in lib/motionTokens.
 */
export function useMotionPresence(open: boolean, kind: 'popup' | 'collapse' | 'fade' = 'popup') {
  const [retained, setRetained] = useState(open)
  const ref = useRef<HTMLDivElement>(null)
  const reduced = false // always animate, regardless of OS reduced-motion
  if (open && !retained) setRetained(true)
  const present = open || retained

  useLayoutEffect(() => {
    const node = ref.current
    if (!node || !present) return
    const settle = () => { if (!open) setRetained(false) }
    if (reduced) { settle(); return }
    let cancelled = false
    const height = node.getBoundingClientRect().height
    const shown: DOMKeyframesDefinition = kind === 'collapse' ? { height: `${height}px`, opacity: 1 }
      : kind === 'fade' ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }
    const hidden: DOMKeyframesDefinition = kind === 'collapse' ? { height: '0px', opacity: 0 }
      : kind === 'fade' ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.94 }
    const keyframes = Object.fromEntries(Object.keys(shown).map(key => {
      const from = (open ? hidden : shown)[key as keyof DOMKeyframesDefinition]
      const to = (open ? shown : hidden)[key as keyof DOMKeyframesDefinition]
      return [key, [from, to]]
    })) as DOMKeyframesDefinition
    const previousOverflow = node.style.overflow
    if (kind === 'collapse') node.style.overflow = 'hidden'
    const restore = () => {
      node.style.overflow = previousOverflow
      for (const prop of ['height', 'opacity', 'transform']) node.style.removeProperty(prop)
    }
    const controls = animate(node, keyframes, open
      ? { duration: DURATION.panel, ease: EASE.out }
      : { duration: DURATION.exit, ease: EASE.in })
    // On close, keep the hidden end-state until unmount so nothing flashes back for a frame.
    void controls.then(() => { if (!cancelled) { if (open) restore(); settle() } })
    return () => {
      cancelled = true
      controls.stop()
      restore()
    }
  }, [open, present, kind, reduced])

  return { present, ref, inert: !open, 'aria-hidden': !open }
}
