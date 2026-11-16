type ScrollOptions = { immediate?: boolean; offset?: number }

type LandingScrollController = {
  stop: () => void
  start: () => void
  scrollTo: (target: string | number | HTMLElement, options?: ScrollOptions) => void
  refresh: () => void
}

let controller: LandingScrollController | null = null
let pauseDepth = 0
let pending: { target: string | number | HTMLElement; options?: ScrollOptions } | null = null

function stickyNavOffset(): number {
  const nav = document.querySelector<HTMLElement>('.navbar')
  if (!nav) return 0
  const style = getComputedStyle(nav)
  if (style.position !== 'sticky' && style.position !== 'fixed') return 0
  return nav.getBoundingClientRect().height
}

/** html { scroll-padding-block } (product-ui) — Lenis honors it; guest landing has no sticky nav. */
function htmlScrollPaddingTop(): number {
  return parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0
}

/**
 * Inset from the viewport top where the section edge should land.
 * Sticky/fixed `.navbar` wins; otherwise flush (0) — callers must cancel scroll-padding for Lenis.
 */
export function landingSectionInset(): number {
  return stickyNavOffset()
}

/** Lenis `offset` so the target sits at `landingSectionInset()` despite html scroll-padding. */
export function landingLenisOffset(extra = 0): number {
  const inset = landingSectionInset()
  const padding = htmlScrollPaddingTop()
  // Lenis resolves elements with scroll-padding; add +padding to cancel, then -inset for sticky nav.
  return extra + padding - inset
}

function resolveElement(target: string | number | HTMLElement): HTMLElement | number | null {
  if (typeof target === 'number') return target
  if (typeof target !== 'string') return target
  return document.getElementById(target.replace(/^#/, ''))
}

function nativeScrollTo(target: string | number | HTMLElement, options?: ScrollOptions) {
  const behavior = options?.immediate ? 'auto' : 'smooth'
  const inset = landingSectionInset()
  const extra = options?.offset ?? 0
  const resolved = resolveElement(target)
  if (resolved == null) return
  if (typeof resolved === 'number') {
    window.scrollTo({ top: resolved + extra - inset, behavior })
    return
  }
  // window.scrollTo ignores scroll-padding — aim with inset only.
  const top = resolved.getBoundingClientRect().top + window.scrollY - inset + extra
  window.scrollTo({ top: Math.max(0, top), behavior })
}

export function registerLandingScroll(next: LandingScrollController | null) {
  controller = next
  if (!next) {
    pauseDepth = 0
    return
  }
  if (pending) {
    const job = pending
    pending = null
    next.scrollTo(job.target, job.options)
  }
}

export function stopLandingLenis() {
  pauseDepth += 1
  controller?.stop()
}

export function startLandingLenis() {
  pauseDepth = Math.max(0, pauseDepth - 1)
  if (pauseDepth === 0) controller?.start()
}

export function scrollLandingTo(
  target: string | number | HTMLElement,
  options?: ScrollOptions,
) {
  if (controller) {
    controller.scrollTo(target, options)
    return
  }
  // Deep-link may fire before Lenis/ST registers — scroll natively now and replay once ready.
  pending = { target, options: { ...options, immediate: options?.immediate ?? true } }
  nativeScrollTo(target, pending.options)
}

export function refreshLandingScroll() {
  controller?.refresh()
}

/** Lenis/ST should ignore gesture targets that need native scroll (maps, dialogs, nested panes). */
export function isLandingScrollExcluded(node: HTMLElement): boolean {
  return Boolean(
    node.closest(
      [
        '.gm-style',
        'gmp-map',
        'dialog',
        '[data-lenis-prevent]',
        '[data-landing-scroll-native]',
        '.confirm-dialog',
        '.source-room-detail',
        '.auth-modal-overlay',
      ].join(','),
    ),
  )
}
