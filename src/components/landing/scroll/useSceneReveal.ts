import { useLayoutEffect, type RefObject } from 'react'
import type { ScrollEngine } from './loadScrollEngine'
import { loadScrollEngine, prefersLandingReducedMotion } from './loadScrollEngine'

type Gsap = ScrollEngine['gsap']
type Timeline = ReturnType<Gsap['timeline']>
type SelectorFn = ReturnType<Gsap['utils']['selector']>

export type RevealTimelineArgs = {
  gsap: Gsap
  timeline: Timeline
  root: HTMLElement
  q: SelectorFn
}

export type RevealTimelineBuilder = (args: RevealTimelineArgs) => void

type UseSceneRevealOptions = {
  rootRef: RefObject<HTMLElement | null>
  enabled?: boolean
  /** ScrollTrigger start; the reveal plays once when the scene reaches this line going down. */
  start?: string
  buildTimeline: RevealTimelineBuilder
}

/**
 * Plays a scene's entrance once, the first time it scrolls into view going down.
 * Scrolling back up never reverses it. Scenes already above the viewport
 * (deep link, reload mid-page) are shown in their final state without animating.
 */
export function useSceneReveal({
  rootRef,
  enabled = true,
  start = 'top 72%',
  buildTimeline,
}: UseSceneRevealOptions) {
  useLayoutEffect(() => {
    if (!enabled || prefersLandingReducedMotion()) return undefined
    const root = rootRef.current
    if (!root) return undefined

    let disposed = false
    let ctx: { revert: () => void } | null = null

    void loadScrollEngine().then(({ gsap, ScrollTrigger }) => {
      if (disposed || !rootRef.current) return

      ctx = gsap.context(() => {
        const q = gsap.utils.selector(root)
        const timeline = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } })
        buildTimeline({ gsap, timeline, root, q })

        if (root.getBoundingClientRect().bottom <= 0) {
          timeline.progress(1)
          return
        }

        ScrollTrigger.create({
          trigger: root,
          start,
          once: true,
          onEnter: () => timeline.play(),
        })
      }, root)
    })

    return () => {
      disposed = true
      ctx?.revert()
    }
  }, [buildTimeline, enabled, rootRef, start])
}
