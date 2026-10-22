type LensTarget = { x: number; y: number; width: number; height: number }

/** Animate only the optical face. Selection and panel navigation stay synchronous. */
export function createTabLensMotion(root: HTMLElement, lens: HTMLElement) {
  let selected: HTMLElement | null = null
  let animation: Animation | null = null
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')
  const stop = () => {
    if (animation) {
      animation.onfinish = null
      animation.cancel()
      animation = null
    }
    delete root.dataset.lensTravel
  }
  const onPreferenceChange = () => { if (reduced?.matches) stop() }
  reduced?.addEventListener?.('change', onPreferenceChange)
  return {
    moveTo(next: HTMLElement, target: LensTarget) {
      const changed = selected !== null && selected !== next && root.hasAttribute('data-lens-ready')
      selected = next
      const from = lens.getBoundingClientRect()
      const startScale = getComputedStyle(lens).scale
      const distance = next.getBoundingClientRect().left + target.width / 2 - from.left - from.width / 2
      lens.style.width = `${target.width}px`
      lens.style.height = `${target.height}px`
      lens.style.transform = `translate3d(${target.x}px,${target.y}px,0)`
      if (!changed || reduced?.matches || typeof lens.animate !== 'function') return
      stop()
      root.dataset.lensTravel = distance >= 0 ? 'right' : 'left'
      // Stretch towards the trailing side, keeping end tabs inside the rail.
      lens.style.transformOrigin = distance >= 0 ? 'right center' : 'left center'
      // More travel stretches the face further; the upper bound keeps small rails stable.
      const stretch = 1 + Math.min(.07, Math.max(.025, Math.abs(distance) / target.width * .025))
      // The production CSS optimizer can convert 620ms to .62s.
      const cssDuration = getComputedStyle(root).getPropertyValue('--glass-settle-duration').trim()
      const duration = parseFloat(cssDuration) * (cssDuration.endsWith('ms') ? 1 : 1000)
      const nextAnimation = lens.animate([
        { scale: startScale === 'none' ? '1' : startScale, offset: 0, easing: 'ease-in-out' },
        { scale: `${stretch} .98`, offset: .22, easing: 'ease-in-out' },
        { scale: '1.015 1.025', offset: .58, easing: 'ease-in-out' },
        { scale: '.995 1.008', offset: .82, easing: 'ease-in-out' },
        { scale: '1 1', offset: 1 },
      ], { duration: Number.isFinite(duration) && duration > 0 ? duration : 620, easing: 'linear' })
      animation = nextAnimation
      nextAnimation.onfinish = () => { if (animation === nextAnimation) stop() }
    },
    stop,
    dispose() { stop(); reduced?.removeEventListener?.('change', onPreferenceChange) },
  }
}
