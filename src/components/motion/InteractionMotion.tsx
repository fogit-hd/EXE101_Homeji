import { useEffect } from 'react'
import { animate, type AnimationPlaybackControlsWithThen as AnimationPlaybackControls } from 'motion/react'
import { EASE, SCROLL_REVEAL } from '../../lib/motionTokens'
import './interaction-motion.css'

const REVEALS = '.guest-mission__copy, .guest-mission__stat, .guest-steps li, .guest-audience__card, .guest-trust__points li, .hub-card, .hub-room-card, .roommate-people__person, .roommate-posts__card, .marketplace-card--browse, .food-card, .profile-section, [data-motion-reveal]'

/** Content reveals respect motion preferences and never intercept input. */
export function InteractionMotion() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const animations = new Map<AnimationPlaybackControls, HTMLElement>()
    const seen = new WeakSet<Element>()
    const finish = (animation: AnimationPlaybackControls) => {
      const node = animations.get(animation)
      if (node) { node.style.removeProperty('transform'); node.style.removeProperty('opacity') }
      animations.delete(animation)
    }
    const track = (animation: AnimationPlaybackControls, node: HTMLElement) => {
      animations.set(animation, node)
      void animation.then(() => finish(animation), () => finish(animation))
    }
    const cancel = () => {
      animations.forEach((_, animation) => animation.stop())
    }
    const onPreference = () => { if (reduced.matches) cancel() }
    reduced.addEventListener('change', onPreference)

    const intersection = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
      let stagger = 0
      entries.forEach(entry => {
        if (!entry.isIntersecting) return
        intersection?.unobserve(entry.target)
        const node = entry.target
        if (!(node instanceof HTMLElement)) return
        const wasHidden = node.classList.contains('hj-pre-reveal')
        node.classList.remove('hj-pre-reveal')
        if (reduced.matches || node.contains(document.activeElement)) return
        const { from } = SCROLL_REVEAL
        // Cards rise and settle; nodes that were already on screen only get a soft lift.
        track(animate(node, {
          opacity: [wasHidden ? from.opacity : 0.6, 1], y: [from.y, 0], scale: [from.scale, 1],
        }, {
          duration: SCROLL_REVEAL.duration, delay: Math.min(stagger++, SCROLL_REVEAL.maxStagger) * SCROLL_REVEAL.stagger, ease: EASE.out,
        }), node)
      })
    }, { threshold: .12, rootMargin: '0px 0px -6% 0px' })
    const register = (root: Element) => {
      const nodes = root.matches(REVEALS) ? [root, ...root.querySelectorAll(REVEALS)] : root.querySelectorAll(REVEALS)
      nodes.forEach(node => {
        if (seen.has(node)) return
        seen.add(node)
        // Pre-hide only what starts below the fold, so it can rise in from nothing when reached.
        if (intersection && node instanceof HTMLElement && node.getBoundingClientRect().top > window.innerHeight) node.classList.add('hj-pre-reveal')
        intersection?.observe(node)
      })
    }
    register(document.body)
    const mutations = new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => {
      if (node instanceof Element && !node.closest('.interaction-feedback')) register(node)
    })))
    mutations.observe(document.getElementById('root') ?? document.body, { childList: true, subtree: true })
    return () => {
      reduced.removeEventListener('change', onPreference)
      intersection?.disconnect()
      document.querySelectorAll('.hj-pre-reveal').forEach(n => n.classList.remove('hj-pre-reveal'))
      mutations.disconnect()
      cancel()
    }
  }, [])

  return null
}
