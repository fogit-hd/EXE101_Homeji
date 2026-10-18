import { LiquidTabList } from '../ui/LiquidTabList'
import { useId, useRef, type ReactNode } from 'react'
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

/** A shared raised lens follows selection while preserving existing IDs and navigation. */
export function MotionTabs<T extends string>({ items, value, onChange, label, className, buttonClassName = '', idPrefix, panelId, renderLabel }: Props<T>) {
  const generatedId = useId()
  const prefix = idPrefix ?? `motion-tabs-${generatedId}`
  const containerRef = useRef<HTMLDivElement>(null)
  return <LiquidTabList containerRef={containerRef} className={`motion-tabs ${className}`} role="tablist" aria-label={label}>
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
  </LiquidTabList>
}
