import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { animate, type AnimationPlaybackControlsWithThen as AnimationPlaybackControls } from 'motion/react'
import { DURATION, EASE, SCROLL_REVEAL } from '../../lib/motionTokens'
import './interaction-motion.css'

const ACTIONS = 'button, [role="button"], summary, .btn, .auth-cinema__submit, .guest-hero__bloom-cta, .guest-hero__top-consult-btn, .roommate-people button, .marketplace-header button, [role="tab"], .hj-mega__link'
const AI_ACTIONS = '.ai-spectrum-button, .natural-rental-search__trigger, .map-chatbot__fab, .map-chatbot__chip, .map-chatbot__action, .map-chatbot__send'
const REVEALS = '.guest-mission__copy, .guest-mission__stat, .guest-steps li, .guest-audience__card, .guest-trust__points li, .hub-card, .hub-room-card, .roommate-people__person, .roommate-posts__card, .marketplace-card--browse, .food-card, .profile-section, [data-motion-reveal]'

/** Decorative feedback only: never intercept input, scrolling, focus, or API actions. */
export function InteractionMotion() {
  const overlay = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const reduced = window.matchMedia('not all') // always animate, regardless of OS reduced-motion
    const animations = new Map<AnimationPlaybackControls, HTMLElement>()
    const seen = new WeakSet<Element>()
    const glassReduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    let lightFrame = 0
    let litSurface: HTMLElement | null = null
    const resetLight = () => {
      cancelAnimationFrame(lightFrame)
      lightFrame = 0
      litSurface?.style.removeProperty('--glass-x')
      litSurface?.style.removeProperty('--glass-y')
      litSurface = null
    }
    const onGlassPreference = () => { if (glassReduced.matches) resetLight() }
    glassReduced.addEventListener('change', onGlassPreference)
    const onGlassVisibility = () => { if (document.hidden) resetLight() }
    document.addEventListener('visibilitychange', onGlassVisibility)
    const finish = (animation: AnimationPlaybackControls) => {
      const node = animations.get(animation)
      if (node?.classList.contains('interaction-pulse')) node.remove()
      // Hand transform/opacity back to the stylesheet so hover lifts keep working.
      else if (node) { node.style.removeProperty('transform'); node.style.removeProperty('opacity') }
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

    const pulse = (event: MouseEvent) => {
      if (reduced.matches || !(event.target instanceof Element) || !overlay.current) return
      const target = event.target.closest(ACTIONS)
      if (!(target instanceof HTMLElement) || target.matches(':disabled, [aria-disabled="true"]')
        || target.closest('.gm-style') || target.matches(AI_ACTIONS)) return
      const bounds = target.getBoundingClientRect()
      if (!bounds.width || !bounds.height) return
      const node = document.createElement('span')
      node.className = 'interaction-pulse'
      const size = Math.min(84, Math.max(36, bounds.height * 1.4))
      const x = event.detail ? Math.max(bounds.left, Math.min(event.clientX, bounds.right)) : bounds.left + bounds.width / 2
      const y = event.detail ? Math.max(bounds.top, Math.min(event.clientY, bounds.bottom)) : bounds.top + bounds.height / 2
      Object.assign(node.style, { left: `${x - size / 2}px`, top: `${y - size / 2}px`, width: `${size}px`, height: `${size}px` })
      // Bound rapid clicks without queueing feedback behind the user's next action.
      if (overlay.current.childElementCount >= 3) {
        const oldest = overlay.current.firstElementChild
        animations.forEach((element, animation) => { if (element === oldest) animation.stop() })
        oldest?.remove()
      }
      overlay.current.append(node)
      track(animate(node, { opacity: [.38, 0], scale: [.35, 1] },
        { duration: DURATION.reveal, ease: EASE.out }), node)
    }
    document.addEventListener('click', pulse)
    const refract = (event: PointerEvent) => {
      if (glassReduced.matches || event.pointerType !== 'mouse' || !(event.target instanceof Element)) return
      const surface = event.target.closest('.btn, .choice-picker__trigger, button[type="submit"]')
      if (!(surface instanceof HTMLElement) || surface.closest('.gm-style') || surface.matches(':disabled')) {
        resetLight()
        return
      }
      if (litSurface !== surface) { resetLight(); litSurface = surface }
      cancelAnimationFrame(lightFrame)
      lightFrame = requestAnimationFrame(() => {
        const bounds = surface.getBoundingClientRect()
        if (!bounds.width || !bounds.height) return
        surface.style.setProperty('--glass-x', `${Math.max(0, Math.min(100, (event.clientX - bounds.left) / bounds.width * 100))}%`)
        surface.style.setProperty('--glass-y', `${Math.max(0, Math.min(100, (event.clientY - bounds.top) / bounds.height * 100))}%`)
        lightFrame = 0
      })
    }
    document.addEventListener('pointermove', refract, { passive: true })

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
      document.removeEventListener('click', pulse)
      document.removeEventListener('pointermove', refract)
      glassReduced.removeEventListener('change', onGlassPreference)
      document.removeEventListener('visibilitychange', onGlassVisibility)
      resetLight()
      reduced.removeEventListener('change', onPreference)
      intersection?.disconnect()
      document.querySelectorAll('.hj-pre-reveal').forEach(n => n.classList.remove('hj-pre-reveal'))
      mutations.disconnect()
      cancel()
    }
  }, [])

  return createPortal(<div ref={overlay} className="interaction-feedback" aria-hidden="true" />, document.body)
}
