/**
 * Jumps straight to an in-page section (navbar links, "Tìm phòng", the hero search) instead of
 * scrolling there: a smooth scroll from the hero would race through the whole scroll film first.
 * The page cuts to the section under a short fade of the landing's ground, and keyboard and
 * screen-reader focus moves to the section's heading.
 */
export function jumpToSection(target: HTMLElement, hash?: string) {
  if (hash) history.pushState(null, '', hash)
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!reduce) veil()
  // 'instant' overrides any scroll-behavior: smooth set in CSS.
  target.scrollIntoView({ behavior: 'instant', block: 'start' })
  // A story anchor names its scene's heading; that heading shows once the scrub catches up.
  const named = target.dataset.focus ? document.getElementById(target.dataset.focus) : null
  const heading = named ?? target.querySelector<HTMLElement>('h2')
  if (!heading) return
  heading.setAttribute('tabindex', '-1')
  if (named) window.setTimeout(() => heading.focus({ preventScroll: true }), reduce ? 50 : 750)
  else heading.focus({ preventScroll: true })
}

/** A sheet of the page's ground over everything, fading out as the new place shows. */
function veil() {
  const ground = getComputedStyle(document.querySelector('.hx') ?? document.body).getPropertyValue('--hx-bg').trim()
  const sheet = document.createElement('div')
  sheet.setAttribute('aria-hidden', 'true')
  sheet.style.cssText = `position:fixed;inset:0;z-index:2147483000;pointer-events:none;background:${ground || '#f7f1e7'}`
  document.body.append(sheet)
  sheet.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 320, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' }).finished
    .catch(() => {})
    .finally(() => sheet.remove())
}
