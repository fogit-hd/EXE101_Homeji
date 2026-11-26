import { useEffect, useState } from 'react'

const SCROLL_AREAS = '.map-listings__panel-body, .app-main, .main-content, .route-outlet, .saved-posts-embed'

/** Follow vertical reading scroll, including the split view's own results pane. */
export function useFloatingToolsTucked(enabled: boolean, routeKey: string): boolean {
  const [state, setState] = useState({ routeKey: '', tucked: false })
  useEffect(() => {
    if (!enabled) return
    const positions = new WeakMap<EventTarget, number>()
    positions.set(document, Math.max(0, window.scrollY))
    document.querySelectorAll<HTMLElement>(SCROLL_AREAS).forEach(element => positions.set(element, Math.max(0, element.scrollTop)))
    const onScroll = (event: Event) => {
      const target = event.target
      const page = target === document || target === document.scrollingElement
      if (!page && (!(target instanceof HTMLElement) || !target.matches(SCROLL_AREAS))) return
      const next = Math.max(0, page ? window.scrollY : (target as HTMLElement).scrollTop)
      const previous = target ? positions.get(target) ?? 0 : 0
      if (next !== 0 && Math.abs(next - previous) < 8) return
      if (target) positions.set(target, next)
      const tucked = next > previous && next > 0
      setState(current => current.routeKey === routeKey && current.tucked === tucked ? current : { routeKey, tucked })
    }
    // Element scroll does not bubble; capture is needed for list/split results.
    document.addEventListener('scroll', onScroll, { capture: true, passive: true })
    return () => document.removeEventListener('scroll', onScroll, true)
  }, [enabled, routeKey])
  return enabled && state.routeKey === routeKey && state.tucked
}
