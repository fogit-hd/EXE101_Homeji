/** Closed details can retain layout rectangles for controls that cannot receive focus. */
export function isVisibleFocusTarget(element: HTMLElement): boolean {
  if (element.closest('[hidden], [inert], [aria-hidden="true"]')
    || element.getAttribute('tabindex') === '-1' || element.getClientRects().length === 0) return false
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    if (parent.tagName !== 'DETAILS' || parent.hasAttribute('open')) continue
    const summary = parent.querySelector(':scope > summary')
    if (!summary?.contains(element)) return false
  }
  return true
}
