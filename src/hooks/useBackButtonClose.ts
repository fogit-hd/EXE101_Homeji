import { useEffect, useLayoutEffect, useRef } from 'react'

const MARKER_KEY = 'homejiOverlay'

function currentMarker(): unknown {
  const state: unknown = window.history.state
  return state && typeof state === 'object' ? (state as Record<string, unknown>)[MARKER_KEY] : undefined
}

/**
 * Lets the phone's Back gesture close a state-driven overlay instead of leaving the page.
 *
 * While `open`, one same-URL history entry is pushed. Back pops it and calls `onClose`.
 * Closing any other way (button, Escape, backdrop) removes that entry again, so the
 * history stack never keeps an extra step. The router state is copied into the entry,
 * so React Router sees the same location throughout.
 *
 * Use it only for overlays that are not already driven by the URL.
 */
export function useBackButtonClose(open: boolean, onClose: () => void) {
  const closeRef = useRef(onClose)
  useLayoutEffect(() => { closeRef.current = onClose }, [onClose])

  useEffect(() => {
    if (!open) return undefined
    const marker = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
    const base: unknown = window.history.state
    window.history.pushState({ ...(base && typeof base === 'object' ? base : {}), [MARKER_KEY]: marker }, '')
    let poppedByBack = false
    const onPopState = () => {
      if (currentMarker() === marker) return
      poppedByBack = true
      closeRef.current()
    }
    window.addEventListener('popstate', onPopState)
    return () => {
      window.removeEventListener('popstate', onPopState)
      if (poppedByBack) return
      // Wait a tick: if the close also navigated somewhere, that push replaced our entry and we leave it alone.
      window.setTimeout(() => { if (currentMarker() === marker) window.history.back() }, 0)
    }
  }, [open])
}
