import { useEffect } from 'react'

/** Closes open `<details>` popovers matching `selector` when the pointer goes down outside them. */
export function useDismissDetailsOnOutside(selector: string) {
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      document.querySelectorAll<HTMLDetailsElement>(`${selector}[open]`).forEach(details => {
        if (!target || !details.contains(target)) details.open = false
      })
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [selector])
}
