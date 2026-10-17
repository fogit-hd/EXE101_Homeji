import type { KeyboardEvent } from 'react'

/** Navigation only; Enter/Space are left to each link/button's native action. */
export function navigateMenu(event: KeyboardEvent<Element>, close: () => void) {
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    close()
    return
  }
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
  const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'))
    .filter(item => !item.matches(':disabled, [aria-disabled="true"]') && !item.closest('[inert]'))
  if (!items.length) return
  event.preventDefault()
  event.stopPropagation()
  const current = items.indexOf(document.activeElement as HTMLElement)
  const index = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
    : event.key === 'ArrowDown' ? (current + 1) % items.length : (current <= 0 ? items.length : current) - 1
  items[index]?.focus()
}
