import { useEffect, type RefObject } from 'react'

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

/**
 * Modal focus lifecycle: move focus into the dialog when it opens, keep Tab inside it,
 * and return focus to whatever opened it when it closes.
 */
export function useDialogFocus(open: boolean, ref: RefObject<HTMLElement | null>, initialSelector?: string) {
  useEffect(() => {
    if (!open) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const root = ref.current
    const visible = () => [...(root?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])]
      .filter(node => node.offsetParent !== null || node === document.activeElement)
    const first = (initialSelector && root?.querySelector<HTMLElement>(initialSelector)) || visible()[0] || root
    if (first && !root?.contains(document.activeElement)) {
      if (first === root && !root.hasAttribute('tabindex')) root.setAttribute('tabindex', '-1')
      first.focus({ preventScroll: true })
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !root) return
      const nodes = visible()
      if (!nodes.length) { event.preventDefault(); return }
      const head = nodes[0]
      const tail = nodes[nodes.length - 1]
      if (event.shiftKey && (document.activeElement === head || !root.contains(document.activeElement))) {
        event.preventDefault()
        tail.focus()
      } else if (!event.shiftKey && (document.activeElement === tail || !root.contains(document.activeElement))) {
        event.preventDefault()
        head.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      if (opener?.isConnected) opener.focus({ preventScroll: true })
    }
  }, [open, ref, initialSelector])
}
