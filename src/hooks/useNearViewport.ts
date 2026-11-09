import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Becomes true once the element comes within `rootMargin` of the viewport, and stays true.
 * Use it to start requests for a section only when a visitor is about to reach it.
 *
 * The observer stops after the first hit, so a section loads once. Browsers without
 * IntersectionObserver get `true` straight away, so the section still loads.
 */
export function useNearViewport<T extends Element>(rootMargin = '600px 0px') {
  const [near, setNear] = useState(false)
  const observer = useRef<IntersectionObserver | null>(null)

  const ref = useCallback((node: T | null) => {
    observer.current?.disconnect()
    observer.current = null
    if (!node || near) return
    if (typeof IntersectionObserver === 'undefined') {
      setNear(true)
      return
    }
    const watcher = new IntersectionObserver(entries => {
      // The first callback arrives as soon as observing starts, usually not intersecting.
      if (!entries.some(entry => entry.isIntersecting)) return
      watcher.disconnect()
      setNear(true)
    }, { rootMargin })
    watcher.observe(node)
    observer.current = watcher
  }, [near, rootMargin])

  useEffect(() => () => observer.current?.disconnect(), [])

  return [ref, near] as const
}
