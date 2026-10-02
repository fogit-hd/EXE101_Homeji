import { useEffect, useRef, type RefObject } from 'react'

/** Close an open search when the pointer or focus leaves its root. One listener while active. */
export function useDismissOnOutside(
  active: boolean,
  roots: Array<RefObject<HTMLElement | null>>,
  dismiss: () => void,
) {
  const dismissRef = useRef(dismiss)
  const rootsRef = useRef(roots)

  useEffect(() => {
    dismissRef.current = dismiss
    rootsRef.current = roots
  })

  useEffect(() => {
    if (!active) return
    const inside = (target: EventTarget | null) => {
      if (!(target instanceof Node)) return false
      return rootsRef.current.some((root) => root.current?.contains(target))
    }
    const onPointerDown = (event: PointerEvent) => {
      if (inside(event.target)) return
      dismissRef.current()
    }
    const onFocusIn = (event: FocusEvent) => {
      if (inside(event.target)) return
      dismissRef.current()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      dismissRef.current()
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('keydown', onKey)
    }
  }, [active])
}
