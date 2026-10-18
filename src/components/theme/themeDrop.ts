import type { Theme } from '../../lib/theme'

/** A droplet falls first, then the new document spreads from its impact point. */
export async function themeDrop(next: Theme, origin: DOMRect, commit: () => void, signal: AbortSignal) {
  const root = document.documentElement
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !Element.prototype.animate) { commit(); return }
  const x = Math.min(innerWidth - 24, Math.max(24, origin.left + origin.width / 2))
  const y = Math.min(innerHeight * .4, Math.max(origin.bottom + 70, 110))
  const radius = Math.ceil(Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))) + 4
  const animations = new Set<Animation>()
  const layer = document.createElement('div')
  layer.className = 'theme-water-layer'
  layer.setAttribute('aria-hidden', 'true')
  layer.dataset.target = next
  layer.style.setProperty('--drop-color', next === 'dark' ? '#050505' : '#ffffff')
  const drop = document.createElement('div')
  drop.className = 'theme-water-drop'
  drop.style.left = `${x - 13}px`
  layer.append(drop)
  document.body.append(layer)
  root.dataset.themeTransition = 'falling'
  let transition: ViewTransition | undefined
  const cancel = () => { animations.forEach(animation => animation.cancel()); transition?.skipTransition() }
  signal.addEventListener('abort', cancel, { once: true })
  const play = async (element: Element, frames: Keyframe[], options: KeyframeAnimationOptions) => {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
    const animation = element.animate(frames, options)
    animations.add(animation)
    try { await animation.finished } finally { animations.delete(animation) }
  }
  try {
    await play(drop, [
      { transform: 'translateY(-40px) scale(.75,1.35)', opacity: 0 },
      { transform: 'translateY(0) scale(.8,1.25)', opacity: 1, offset: .15 },
      { transform: `translateY(${y - 13}px) scale(.9,1.22)`, opacity: 1, offset: .88 },
      { transform: `translateY(${y - 13}px) scale(1.45,.65)`, opacity: 1 },
    ], { duration: 520, easing: 'cubic-bezier(.45,0,.8,.4)', fill: 'forwards' })
    root.dataset.themeTransition = 'spreading'
    if (document.startViewTransition && document.visibilityState === 'visible') {
      drop.remove()
      try {
        transition = document.startViewTransition(commit)
        await transition.ready
        await play(root, [
          { clipPath: `circle(0px at ${x}px ${y}px)` },
          { clipPath: `circle(${radius}px at ${x}px ${y}px)` },
        ], { duration: 820, easing: 'cubic-bezier(.2,.65,.25,1)', pseudoElement: '::view-transition-new(root)' })
        await transition.finished
        return
      } catch {
        transition?.skipTransition()
        if (signal.aborted) return
      }
    }
    drop.remove()
    const wave = document.createElement('div')
    wave.className = 'theme-water-wave'
    Object.assign(wave.style, { width: `${radius * 2}px`, height: `${radius * 2}px`, left: `${x - radius}px`, top: `${y - radius}px` })
    layer.append(wave)
    await play(wave, [{ transform: 'scale(0)' }, { transform: 'scale(1)' }], { duration: 720, easing: 'cubic-bezier(.2,.65,.25,1)', fill: 'forwards' })
    commit()
    await play(wave, [{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: 'forwards' })
  } finally {
    signal.removeEventListener('abort', cancel)
    cancel()
    layer.remove()
    delete root.dataset.themeTransition
  }
}
