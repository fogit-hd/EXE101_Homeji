import { useLayoutEffect, useSyncExternalStore } from 'react'

/** Phones get their own component tree below this width (user decision 2026-11-25). */
export const MOBILE_QUERY = '(max-width: 767.98px)'

function subscribe(onChange: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const query = window.matchMedia(MOBILE_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

function snapshot() {
  return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(MOBILE_QUERY).matches
}

/** True while the viewport is phone-sized. Re-renders when the window crosses the breakpoint. */
export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, snapshot, () => false)
}

/**
 * Mirrors the switch onto `<html data-device>` so mobile-only CSS can be scoped to the mobile tree
 * (`html[data-device='mobile'] …`) instead of repeating width media queries.
 */
export function useDeviceAttribute(isMobile: boolean) {
  useLayoutEffect(() => {
    const root = document.documentElement
    root.dataset.device = isMobile ? 'mobile' : 'desktop'
  }, [isMobile])
}
