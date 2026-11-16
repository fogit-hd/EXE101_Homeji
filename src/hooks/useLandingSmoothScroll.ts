import { useEffect, useRef } from 'react'
import {
  isLandingScrollExcluded,
  landingLenisOffset,
  landingSectionInset,
  registerLandingScroll,
  refreshLandingScroll,
} from '../components/landing/scroll/landingScrollControl'
import {
  loadScrollEngine,
  prefersLandingNativeScroll,
  prefersLandingReducedMotion,
} from '../components/landing/scroll/loadScrollEngine'
import { useBrandIntroComplete } from './useBrandIntroComplete'

/**
 * Guest-landing only: Lenis ↔ ScrollTrigger bridge.
 * Skips Lenis on reduced-motion / coarse pointer; never touches map shell.
 */
export function useLandingSmoothScroll(active: boolean) {
  const introComplete = useBrandIntroComplete()
  const enabled = active && introComplete
  const lenisRef = useRef<{ destroy: () => void } | null>(null)

  useEffect(() => {
    if (!enabled) {
      registerLandingScroll(null)
      return undefined
    }

    let disposed = false
    let removeTicker: (() => void) | undefined
    let removeScroll: (() => void) | undefined
    let destroyLenis: (() => void) | undefined

    const run = async () => {
      const { gsap, ScrollTrigger } = await loadScrollEngine()
      if (disposed) return

      const useNative = prefersLandingNativeScroll()

      if (!useNative) {
        const { default: Lenis } = await import('lenis')
        if (disposed) return

        const lenis = new Lenis({
          autoRaf: false,
          smoothWheel: true,
          syncTouch: false,
          prevent: isLandingScrollExcluded,
        })
        lenisRef.current = lenis

        const onLenisScroll = () => ScrollTrigger.update()
        lenis.on('scroll', onLenisScroll)
        removeScroll = () => lenis.off('scroll', onLenisScroll)

        const tick = (time: number) => {
          lenis.raf(time * 1000)
        }
        gsap.ticker.add(tick)
        gsap.ticker.lagSmoothing(0)
        removeTicker = () => gsap.ticker.remove(tick)

        destroyLenis = () => {
          removeScroll?.()
          removeTicker?.()
          lenis.destroy()
          lenisRef.current = null
        }

        registerLandingScroll({
          stop: () => lenis.stop(),
          start: () => lenis.start(),
          scrollTo: (target, options) => {
            const resolved = typeof target === 'string'
              ? (document.getElementById(target.replace(/^#/, '')) ?? target)
              : target
            lenis.scrollTo(resolved, {
              immediate: options?.immediate ?? prefersLandingReducedMotion(),
              offset: landingLenisOffset(options?.offset ?? 0),
            })
          },
          refresh: () => ScrollTrigger.refresh(),
        })
      } else {
        registerLandingScroll({
          stop: () => {},
          start: () => {},
          scrollTo: (target, options) => {
            const inset = landingSectionInset()
            const behavior = options?.immediate || prefersLandingReducedMotion() ? 'auto' : 'smooth'
            const extra = options?.offset ?? 0
            if (typeof target === 'number') {
              window.scrollTo({ top: target + extra - inset, behavior })
              return
            }
            const el = typeof target === 'string'
              ? document.getElementById(target.replace(/^#/, ''))
              : target
            if (!el) return
            const top = el.getBoundingClientRect().top + window.scrollY - inset + extra
            window.scrollTo({ top: Math.max(0, top), behavior })
          },
          refresh: () => ScrollTrigger.refresh(),
        })
      }

      ScrollTrigger.refresh()
    }

    void run()

    return () => {
      disposed = true
      destroyLenis?.()
      registerLandingScroll(null)
      refreshLandingScroll()
    }
  }, [enabled])
}
