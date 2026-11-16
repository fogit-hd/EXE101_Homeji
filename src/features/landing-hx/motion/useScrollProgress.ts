import { useEffect, useState, type RefObject } from 'react'
import { useScroll, type MotionValue } from 'motion/react'

/**
 * Scroll progress (0 → 1) of a section as it passes the middle of the viewport.
 * Backed by motion's scroll timeline: no layout reads in a scroll handler, and
 * the value can drive transforms directly without React re-renders.
 */
export function useScrollProgress(target: RefObject<HTMLElement | null>): MotionValue<number> {
  const { scrollYProgress } = useScroll({ target, offset: ['start center', 'end center'] })
  return scrollYProgress
}

/** True when the media query matches; follows changes (resize, rotation, OS settings). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia(query).matches,
  )
  useEffect(() => {
    const list = window.matchMedia(query)
    const onChange = () => setMatches(list.matches)
    onChange()
    list.addEventListener('change', onChange)
    return () => list.removeEventListener('change', onChange)
  }, [query])
  return matches
}
