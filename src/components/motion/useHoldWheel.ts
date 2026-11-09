import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react'

export type WheelState<T> = {
  target: T
  x: number
  y: number
  /** Highlighted action, or -1 while the pointer rests in the hub. */
  active: number
  /** `hold`: release over an action to run it. `menu`: actions are focusable buttons. */
  mode: 'hold' | 'menu'
}

const HOLD_MS = 380
const MOVE_TOLERANCE = 9
const DEAD_ZONE = 26
const EDGE = 104

type Press = { id: number; x: number; y: number; target: unknown; timer: number }

/** Index of the action under a pointer offset; actions start at 12 o'clock and go clockwise. */
export function wheelIndex(dx: number, dy: number, count: number) {
  if (Math.hypot(dx, dy) < DEAD_ZONE || count < 1) return -1
  const turn = (Math.atan2(dy, dx) * 180 / Math.PI + 450) % 360
  return Math.round(turn / (360 / count)) % count
}

const clampToViewport = (x: number, y: number) => ({
  x: Math.min(innerWidth - EDGE, Math.max(EDGE, x)),
  y: Math.min(innerHeight - EDGE, Math.max(EDGE, y)),
})

/**
 * Press and hold an item to open a radial menu; flick toward an action and
 * release to run it. The context-menu gesture (right click, menu key, long
 * press without movement) opens the same actions as ordinary buttons.
 */
export function useHoldWheel<T>(resolve: (element: Element) => T | null, count: number, onChoose: (target: T, index: number) => void) {
  const [wheel, setWheel] = useState<WheelState<T> | null>(null)
  const press = useRef<Press | null>(null)
  const suppressClick = useRef(false)
  const wheelRef = useRef(wheel)
  useLayoutEffect(() => { wheelRef.current = wheel }, [wheel])
  // Handlers read the ref, so it changes together with the state.
  const update = useCallback((next: WheelState<T> | null) => { wheelRef.current = next; setWheel(next) }, [])

  const cancelPress = useCallback(() => {
    if (press.current) window.clearTimeout(press.current.timer)
    press.current = null
  }, [])
  const close = useCallback(() => { cancelPress(); update(null) }, [cancelPress, update])

  // Keep the page still while a touch is steering an open wheel.
  useEffect(() => {
    if (wheel?.mode !== 'hold') return
    const stop = (event: TouchEvent) => event.preventDefault()
    document.addEventListener('touchmove', stop, { passive: false })
    return () => document.removeEventListener('touchmove', stop)
  }, [wheel?.mode])
  useEffect(() => cancelPress, [cancelPress])

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (!event.isPrimary || event.button !== 0 || wheelRef.current) return
    const target = event.target instanceof Element ? resolve(event.target) : null
    if (target == null) return
    cancelPress()
    const { clientX, clientY, pointerId } = event
    const host = event.currentTarget
    const timer = window.setTimeout(() => {
      const current = press.current
      if (!current || current.id !== pointerId) return
      const point = clampToViewport(current.x, current.y)
      try { host.setPointerCapture(pointerId) } catch { /* The pointer already ended. */ }
      suppressClick.current = true
      update({ target, ...point, active: -1, mode: 'hold' })
      navigator.vibrate?.(8)
    }, HOLD_MS)
    press.current = { id: pointerId, x: clientX, y: clientY, target, timer }
  }
  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const current = press.current
    if (current && current.id === event.pointerId && !wheelRef.current) {
      if (Math.hypot(event.clientX - current.x, event.clientY - current.y) > MOVE_TOLERANCE) cancelPress()
      return
    }
    const open = wheelRef.current
    if (open?.mode !== 'hold') return
    const active = wheelIndex(event.clientX - open.x, event.clientY - open.y, count)
    if (active !== open.active) update({ ...open, active })
  }
  const onPointerUp = (event: PointerEvent<HTMLElement>) => {
    const open = wheelRef.current
    if (press.current?.id === event.pointerId) cancelPress()
    if (open?.mode !== 'hold') return
    update(null)
    if (open.active >= 0) onChoose(open.target, open.active)
  }
  const onPointerCancel = () => {
    cancelPress()
    suppressClick.current = false
    if (wheelRef.current?.mode === 'hold') update(null)
  }
  const onClickCapture = (event: MouseEvent<HTMLElement>) => {
    if (!suppressClick.current) return
    suppressClick.current = false
    event.preventDefault()
    event.stopPropagation()
  }
  const onContextMenu = (event: MouseEvent<HTMLElement>) => {
    const target = event.target instanceof Element ? resolve(event.target) : null
    if (target == null) return
    event.preventDefault()
    cancelPress()
    const keyboard = event.detail === 0 || (event.clientX === 0 && event.clientY === 0)
    const anchor = event.target instanceof Element ? event.target.getBoundingClientRect() : null
    const point = keyboard && anchor
      ? clampToViewport(anchor.left + anchor.width / 2, anchor.top + anchor.height / 2)
      : clampToViewport(event.clientX, event.clientY)
    // A long touch that is still held keeps the steering behaviour.
    if (wheelRef.current?.mode === 'hold') return
    suppressClick.current = false
    update({ target, ...point, active: -1, mode: 'menu' })
  }

  return {
    wheel,
    close,
    choose: (index: number) => {
      const open = wheelRef.current
      update(null)
      if (open) onChoose(open.target, index)
    },
    bind: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClickCapture, onContextMenu },
  }
}
