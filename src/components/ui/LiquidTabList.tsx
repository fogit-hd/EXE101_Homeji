import { useLayoutEffect, useRef, type HTMLAttributes, type RefObject } from 'react'
import './LiquidTabList.css'

type Props = HTMLAttributes<HTMLDivElement> & { containerRef?: RefObject<HTMLDivElement | null> }

/** Presentation and keyboard navigation only; callers keep selection and API state. */
export function LiquidTabList({ children, className = '', containerRef, onKeyDown, ...props }: Props) {
  const localRef = useRef<HTMLDivElement>(null)
  const rootRef = containerRef ?? localRef
  const lensRef = useRef<HTMLSpanElement>(null)
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
      // Five pixels above and below the track give the lens visible thickness.
      lens.style.width = `${selected.width}px`
      lens.style.height = `${selected.height + 10}px`
      lens.style.transform = `translate3d(${selected.left - box.left + root.scrollLeft - root.clientLeft}px,${selected.top - box.top + root.scrollTop - root.clientTop - 5}px,0)`
      // Reveal a selected item inside an overflowing rail without scrolling the page.
      if (selected.right > box.right - 6) root.scrollLeft += selected.right - box.right + 6
      else if (selected.left < box.left + 6) root.scrollLeft -= box.left + 6 - selected.left
      root.querySelectorAll<HTMLButtonElement>(':scope > [role="tab"]').forEach(button => { button.tabIndex = button === active ? 0 : -1 })
      if (!root.dataset.lensReady) frame = requestAnimationFrame(() => { if (!disposed) root.dataset.lensReady = 'true' })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(root)
    root.querySelectorAll(':scope > [role="tab"]').forEach(button => observer.observe(button))
    void document.fonts?.ready.then(measure)
    return () => { disposed = true; cancelAnimationFrame(frame); observer.disconnect() }
  }, [children, rootRef])
  return <div {...props} ref={rootRef} className={`liquid-tabs ${className}`} role="tablist" onKeyDown={event => {
    onKeyDown?.(event)
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
