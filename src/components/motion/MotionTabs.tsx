import { useId, useLayoutEffect, useRef, type ReactNode } from 'react'
import './MotionTabs.css'

type Props<T extends string> = {
  items: readonly { id: T; label: string }[]
  value: T
  onChange: (value: T) => void
  label: string
  className: string
  buttonClassName?: string
  idPrefix?: string
  panelId?: string
  renderLabel?: (id: T, label: string) => ReactNode
}

/** A single moving underline follows the actual button geometry, including font and viewport changes. */
export function MotionTabs<T extends string>({ items, value, onChange, label, className, buttonClassName = '', idPrefix, panelId, renderLabel }: Props<T>) {
  const generatedId = useId()
  const prefix = idPrefix ?? `motion-tabs-${generatedId}`
  const containerRef = useRef<HTMLDivElement>(null)
  const indicatorRef = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const container = containerRef.current
    const indicator = indicatorRef.current
    if (!container || !indicator) return
    let disposed = false
    const measure = () => {
      if (disposed) return
      const active = container.querySelector<HTMLButtonElement>('[aria-selected="true"]')
      if (!active) return
      const box = container.getBoundingClientRect()
      const selected = active.getBoundingClientRect()
      indicator.style.width = `${selected.width}px`
      indicator.style.transform = `translateX(${selected.left - box.left + container.scrollLeft - container.clientLeft}px)`
      indicator.style.opacity = '1'
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(container)
    container.querySelectorAll('button').forEach(button => observer.observe(button))
    void document.fonts?.ready.then(measure)
    return () => { disposed = true; observer.disconnect() }
  }, [value, items])

  return <div ref={containerRef} className={`motion-tabs ${className}`} role="tablist" aria-label={label}>
    <span ref={indicatorRef} className="motion-tabs__indicator" aria-hidden="true" />
    {items.map(item => <button key={item.id} type="button" role="tab" id={`${prefix}-${item.id}`}
      aria-selected={value === item.id} aria-controls={panelId} tabIndex={value === item.id ? 0 : -1}
      className={`${buttonClassName}${value === item.id ? ' is-active' : ''}`}
      onClick={() => onChange(item.id)} onKeyDown={event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
        event.preventDefault()
        const current = items.findIndex(candidate => candidate.id === item.id)
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
          : (current + (event.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length
        onChange(items[next].id)
        const button = containerRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]
        button?.focus({ preventScroll: true })
        button?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' })
      }}>{renderLabel ? renderLabel(item.id, item.label) : item.label}</button>)}
  </div>
}
