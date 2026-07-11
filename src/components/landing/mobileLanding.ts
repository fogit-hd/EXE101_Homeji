/** Mobile landing scroll only — keep desktop journey metrics untouched. */
export function isMobileLandingViewport() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(max-width: 900px)').matches
}
