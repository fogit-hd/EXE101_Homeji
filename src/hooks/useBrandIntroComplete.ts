import { useSyncExternalStore } from 'react'
import { BRAND_INTRO_FINISHED_EVENT, introRequested } from '../lib/introGate'

function subscribe(listener: () => void) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(BRAND_INTRO_FINISHED_EVENT, listener)
  return () => window.removeEventListener(BRAND_INTRO_FINISHED_EVENT, listener)
}

function getSnapshot() {
  return !introRequested()
}

/** Lets global banners wait for the first-paint logo intro without delaying their data fetches. */
export function useBrandIntroComplete() {
  return useSyncExternalStore(subscribe, getSnapshot, () => true)
}
