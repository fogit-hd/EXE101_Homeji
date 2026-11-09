import type { Theme } from '../../lib/theme'

/** Blend the new theme over the previous page without moving any content. */
export async function fadeTheme(next: Theme, commit: () => void, signal: AbortSignal) {
  const root = document.documentElement
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || document.visibilityState !== 'visible') {
    commit()
    return
  }
  let transition: ViewTransition | undefined
  let overlay: HTMLDivElement | undefined
  let animation: Animation | undefined
  let committed = false
  const apply = () => {
    if (signal.aborted || committed) return
    commit()
    committed = true
  }
  const cancel = () => { transition?.skipTransition(); animation?.cancel() }
  signal.addEventListener('abort', cancel, { once: true })
  try {
    if (document.startViewTransition) {
      root.dataset.themeTransition = 'crossfade'
      try {
        transition = document.startViewTransition(apply)
        await transition.finished
        return
      } catch {
        transition?.skipTransition()
        if (committed || signal.aborted) return
      }
    }
    if (!Element.prototype.animate) { apply(); return }
    root.dataset.themeTransition = 'fallback'
    overlay = document.createElement('div')
    overlay.className = 'theme-fade-layer'
    overlay.dataset.target = next
    overlay.setAttribute('aria-hidden', 'true')
    document.body.append(overlay)
    animation = overlay.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, easing: 'ease-in', fill: 'forwards' })
    await animation.finished
    if (signal.aborted) return
    apply()
    animation = overlay.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 360, easing: 'ease-out', fill: 'forwards' })
    await animation.finished
  } finally {
    signal.removeEventListener('abort', cancel)
    overlay?.remove()
    delete root.dataset.themeTransition
  }
}
