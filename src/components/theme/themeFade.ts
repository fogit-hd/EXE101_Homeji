import type { Theme } from '../../lib/theme'

/** Length of the page fade. theme.css uses the same value, and the switch lens follows it. */
export const THEME_FADE_MS = 1100

/** cubic-bezier(.4, 0, .2, 1), the easing of the page fade in theme.css. */
export function themeFadeEase(progress: number): number {
  const t = Math.min(1, Math.max(0, progress))
  if (t === 0 || t === 1) return t
  const [x1, y1, x2, y2] = [.4, 0, .2, 1]
  const coordinate = (s: number, a: number, b: number) => 3 * a * s * (1 - s) ** 2 + 3 * b * s ** 2 * (1 - s) + s ** 3
  // Solve the curve's x for t by bisection, then read its y.
  let low = 0
  let high = 1
  let s = t
  for (let step = 0; step < 24; step++) {
    if (coordinate(s, x1, x2) < t) low = s
    else high = s
    s = (low + high) / 2
  }
  return coordinate(s, y1, y2)
}

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>(resolve => {
    const timer = window.setTimeout(done, ms)
    signal.addEventListener('abort', done, { once: true })
    function done() {
      window.clearTimeout(timer)
      signal.removeEventListener('abort', done)
      resolve()
    }
  })
}

/** Blend the new theme over the previous page without moving any content. */
export async function fadeTheme(_next: Theme, commit: () => void, signal: AbortSignal) {
  const root = document.documentElement
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || document.visibilityState !== 'visible') {
    commit()
    return
  }
  let transition: ViewTransition | undefined
  let committed = false
  const apply = () => {
    if (signal.aborted || committed) return
    commit()
    committed = true
  }
  const cancel = () => { transition?.skipTransition() }
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
    // Without View Transitions, colors ease to the new theme in place. The page never disappears
    // behind a solid layer, and the switch lens moves over the same time.
    root.dataset.themeTransition = 'fallback'
    void getComputedStyle(root).color
    apply()
    await wait(THEME_FADE_MS, signal)
  } finally {
    signal.removeEventListener('abort', cancel)
    delete root.dataset.themeTransition
  }
}
