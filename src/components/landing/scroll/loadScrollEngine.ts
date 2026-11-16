import type gsap from 'gsap'
import type { ScrollTrigger } from 'gsap/ScrollTrigger'

export type ScrollEngine = {
  gsap: typeof gsap
  ScrollTrigger: typeof ScrollTrigger
}

let enginePromise: Promise<ScrollEngine> | null = null

/** Lazy-load GSAP + ScrollTrigger once; safe to call from multiple landing scenes. */
export function loadScrollEngine(): Promise<ScrollEngine> {
  if (!enginePromise) {
    enginePromise = Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([gsapMod, stMod]) => {
      const gsapLib = (gsapMod as { gsap: typeof gsap; default: typeof gsap }).gsap
        ?? (gsapMod as { default: typeof gsap }).default
      const ST = (stMod as { ScrollTrigger: typeof ScrollTrigger }).ScrollTrigger
      gsapLib.registerPlugin(ST)
      ST.config({ ignoreMobileResize: true })
      return { gsap: gsapLib, ScrollTrigger: ST }
    })
  }
  return enginePromise
}

export function prefersLandingReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Coarse pointers keep native touch scrolling; ScrollTrigger still scrubs. */
export function prefersLandingNativeScroll(): boolean {
  if (typeof window === 'undefined') return true
  return window.matchMedia('(pointer: coarse)').matches
    || prefersLandingReducedMotion()
}
