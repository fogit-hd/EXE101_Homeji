import { useEffect, useLayoutEffect, useRef, type HTMLAttributes, type RefObject } from 'react'
import './LiquidTabList.css'

type Drag = { pointerId: number; x: number; y: number; left: number; width: number; height: number; top: number; moved: boolean; capture: HTMLButtonElement }
const tabsOf = (root: HTMLElement) => [...root.querySelectorAll<HTMLButtonElement>(':scope > button[role="tab"]:not(:disabled)')]

type Props = HTMLAttributes<HTMLDivElement> & { containerRef?: RefObject<HTMLDivElement | null> }

/** Presentation and keyboard navigation only; callers keep selection and API state. */
export function LiquidTabList({ children, className = '', containerRef, onKeyDown, onKeyUp, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onLostPointerCapture, onClick, onClickCapture, ...props }: Props) {
  const localRef = useRef<HTMLDivElement>(null)
  const rootRef = containerRef ?? localRef
  const lensRef = useRef<HTMLSpanElement>(null)
  const drag = useRef<Drag | null>(null)
  const settleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const suppressClickUntil = useRef(0)
  const restore = useRef<() => void>(() => {})
  const engage = () => {
    clearTimeout(settleTimer.current)
    if (rootRef.current) rootRef.current.dataset.lensEngaged = 'true'
  }
  const relax = (delay = 0) => {
    clearTimeout(settleTimer.current)
    settleTimer.current = setTimeout(() => {
      if (rootRef.current) { delete rootRef.current.dataset.lensEngaged; delete rootRef.current.dataset.lensDragging }
    }, delay)
  }
  const cancelDrag = () => {
    const current = drag.current
    drag.current = null
    if (current?.capture.hasPointerCapture(current.pointerId)) current.capture.releasePointerCapture(current.pointerId)
    restore.current()
    relax()
  }
  useEffect(() => () => { clearTimeout(settleTimer.current); drag.current = null }, [])
  useLayoutEffect(() => {
    const root = rootRef.current, lens = lensRef.current
    if (!root || !lens) return
    let disposed = false
    let frame = 0
    const measure = () => {
      if (disposed) return
      const active = root.querySelector<HTMLElement>(':scope > [role="tab"][aria-selected="true"]')
      if (!active) { lens.hidden = true; return }
      lens.hidden = false
      const box = root.getBoundingClientRect(), selected = active.getBoundingClientRect()
      const tabs = tabsOf(root)
      const padding = parseFloat(getComputedStyle(root).paddingRight) || 0
      root.style.setProperty('--tabs-track-width', `${Math.max(root.clientWidth, ...tabs.map(tab => tab.offsetLeft + tab.offsetWidth + padding))}px`)
      if (drag.current?.moved) return
      // At rest the lens fits the track; only engagement enlarges its optical face.
      lens.style.width = `${selected.width}px`
      lens.style.height = `${selected.height}px`
      lens.style.transform = `translate3d(${selected.left - box.left + root.scrollLeft - root.clientLeft}px,${selected.top - box.top + root.scrollTop - root.clientTop}px,0)`
      // Reveal a selected item inside an overflowing rail without scrolling the page.
      if (selected.right > box.right - 6) root.scrollLeft += selected.right - box.right + 6
      else if (selected.left < box.left + 6) root.scrollLeft -= box.left + 6 - selected.left
      root.querySelectorAll<HTMLButtonElement>(':scope > [role="tab"]').forEach(button => { button.tabIndex = button === active ? 0 : -1 })
      if (!root.dataset.lensReady) frame = requestAnimationFrame(() => { if (!disposed) root.dataset.lensReady = 'true' })
    }
    restore.current = measure
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(root)
    root.querySelectorAll(':scope > [role="tab"]').forEach(button => observer.observe(button))
    void document.fonts?.ready.then(measure)
    return () => { disposed = true; cancelAnimationFrame(frame); observer.disconnect() }
  }, [children, rootRef])
  return <div {...props} ref={rootRef} className={`liquid-tabs ${className}`} role="tablist"
    onPointerDown={event => {
      onPointerDown?.(event)
      if (event.defaultPrevented || !event.isPrimary || event.button !== 0 || drag.current) return
      const root = event.currentTarget
      const button = (event.target as Element).closest<HTMLButtonElement>('button[role="tab"]')
      if (!button || button.parentElement !== root || button.disabled) return
      const box = root.getBoundingClientRect(), selected = button.getBoundingClientRect()
      drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY,
        left: selected.left - box.left + root.scrollLeft, width: selected.width, height: selected.height,
        top: selected.top - box.top, moved: false, capture: button }
      try { button.setPointerCapture(event.pointerId) }
      catch { drag.current = null; return }
      engage()
    }}
    onPointerMove={event => {
      onPointerMove?.(event)
      const current = drag.current, lens = lensRef.current, root = rootRef.current
      if (event.defaultPrevented || !current || current.pointerId !== event.pointerId || !lens || !root) return
      const dx = event.clientX - current.x, dy = event.clientY - current.y
      // Let a vertical touch gesture scroll the page rather than changing tabs.
      if (!current.moved && Math.abs(dy) > 6 && Math.abs(dy) > Math.abs(dx)) { cancelDrag(); return }
      if (!current.moved && Math.abs(dx) < 5) return
      current.moved = true
      root.dataset.lensDragging = 'true'
      const tabs = tabsOf(root), first = tabs[0], last = tabs.at(-1)
      if (!first || !last) return
      const left = Math.max(first.offsetLeft, Math.min(last.offsetLeft + last.offsetWidth - current.width, current.left + dx))
      lens.style.width = `${current.width}px`
      lens.style.height = `${current.height}px`
      lens.style.transform = `translate3d(${left}px,${current.top}px,0)`
    }}
    onPointerUp={event => {
      onPointerUp?.(event)
      const current = drag.current
      if (!current || current.pointerId !== event.pointerId) return
      drag.current = null
      if (current.capture.hasPointerCapture(event.pointerId)) current.capture.releasePointerCapture(event.pointerId)
      if (current.moved && !event.defaultPrevented) {
        suppressClickUntil.current = performance.now() + 100
        const tabs = tabsOf(event.currentTarget)
        const nearest = tabs.reduce<HTMLButtonElement | undefined>((best, tab) => {
          const center = (button: HTMLButtonElement) => { const r = button.getBoundingClientRect(); return r.left + r.width / 2 }
          return !best || Math.abs(center(tab) - event.clientX) < Math.abs(center(best) - event.clientX) ? tab : best
        }, undefined)
        nearest?.click()
        nearest?.focus({ preventScroll: true })
      }
      if (rootRef.current) delete rootRef.current.dataset.lensDragging
      restore.current()
      relax(140)
    }}
    onPointerCancel={event => { onPointerCancel?.(event); if (drag.current?.pointerId === event.pointerId) cancelDrag() }}
    onLostPointerCapture={event => { onLostPointerCapture?.(event); if (drag.current?.pointerId === event.pointerId) cancelDrag() }}
    onClickCapture={event => {
      if (event.detail > 0 && performance.now() < suppressClickUntil.current) { event.preventDefault(); event.stopPropagation(); return }
      onClickCapture?.(event)
    }}
    onClick={event => {
      onClick?.(event)
      if (!event.defaultPrevented && (event.target as Element).closest('button[role="tab"]')) { engage(); relax(180) }
    }}
    onKeyUp={event => { onKeyUp?.(event); if (event.key === ' ' || event.key === 'Enter') relax(140) }}
    onKeyDown={event => {
    onKeyDown?.(event)
    if (!event.defaultPrevented && [' ', 'Enter'].includes(event.key)) engage()
    if (event.defaultPrevented || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    const tabs = [...event.currentTarget.querySelectorAll<HTMLButtonElement>(':scope > button[role="tab"]:not(:disabled)')]
    const index = tabs.indexOf(event.target as HTMLButtonElement)
    if (index < 0 || !tabs.length) return
    event.preventDefault()
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length
    tabs[next].click()
    tabs[next].focus({ preventScroll: true })
    tabs[next].scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' })
  }}>
    <span className="liquid-tabs__lens" ref={lensRef} data-glass-lens="" aria-hidden="true" />
    {children}
  </div>
}
