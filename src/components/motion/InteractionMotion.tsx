import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import './interaction-motion.css'

const ACTIONS = 'button, [role="button"], summary, .btn, .auth-cinema__submit, .guest-hero__bloom-cta, .guest-hero__top-consult-btn, .roommate-people button, .marketplace-header button, [role="tab"], .hj-mega__link'
const AI_ACTIONS = '.ai-spectrum-button, .natural-rental-search__trigger, .map-chatbot__fab, .map-chatbot__chip, .map-chatbot__action, .map-chatbot__send'
const REVEALS = '.guest-mission__copy, .guest-mission__stat, .guest-steps li, .guest-audience__card, .guest-trust__points li, .hub-card, .hub-room-card, .roommate-people__person, .roommate-posts__card, .marketplace-card--browse, .food-card, .profile-section, [data-motion-reveal]'

/** Decorative feedback only: never intercept input, scrolling, focus, or API actions. */
export function InteractionMotion() {
  const overlay = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const animations = new Map<Animation, HTMLElement>()
    const seen = new WeakSet<Element>()
    const finish = (animation: Animation) => {
      const node = animations.get(animation)
      if (node?.classList.contains('interaction-pulse')) node.remove()
      animations.delete(animation)
    }
    const track = (animation: Animation, node: HTMLElement) => {
      animations.set(animation, node)
      void animation.finished.then(() => finish(animation), () => finish(animation))
    }
    const cancel = () => {
      animations.forEach((_, animation) => animation.cancel())
    }
    const onPreference = () => { if (reduced.matches) cancel() }
    reduced.addEventListener('change', onPreference)

    const pulse = (event: MouseEvent) => {
      if (reduced.matches || !(event.target instanceof Element) || !overlay.current) return
      const target = event.target.closest(ACTIONS)
      if (!(target instanceof HTMLElement) || target.matches(':disabled, [aria-disabled="true"]')
        || target.closest('.gm-style') || target.matches(AI_ACTIONS) || !target.animate) return
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
        animations.forEach((element, animation) => { if (element === oldest) animation.cancel() })
        oldest?.remove()
      }
      overlay.current.append(node)
      track(node.animate([{ opacity: .38, transform: 'scale(.35)' }, { opacity: 0, transform: 'scale(1)' }],
        { duration: 380, easing: 'cubic-bezier(.16,1,.3,1)' }), node)
    }
    document.addEventListener('click', pulse)

    const intersection = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
      let stagger = 0
      entries.forEach(entry => {
        if (!entry.isIntersecting) return
        intersection?.unobserve(entry.target)
        const node = entry.target
        if (!(node instanceof HTMLElement) || reduced.matches || !node.animate || node.contains(document.activeElement)) return
        // Nothing is hidden while waiting for the observer or when JavaScript fails.
        track(node.animate([
          { opacity: .35, translate: '0 12px' }, { opacity: 1, translate: '0 0' },
        ], { duration: 360, delay: Math.min(stagger++, 5) * 35, easing: 'cubic-bezier(.16,1,.3,1)' }), node)
      })
    }, { threshold: .12 })
    const register = (root: Element) => {
      const nodes = root.matches(REVEALS) ? [root, ...root.querySelectorAll(REVEALS)] : root.querySelectorAll(REVEALS)
      nodes.forEach(node => {
        if (seen.has(node)) return
        seen.add(node)
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
      reduced.removeEventListener('change', onPreference)
      intersection?.disconnect()
      mutations.disconnect()
      cancel()
    }
  }, [])

  return createPortal(<div ref={overlay} className="interaction-feedback" aria-hidden="true" />, document.body)
}
