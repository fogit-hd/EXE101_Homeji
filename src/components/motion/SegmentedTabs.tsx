import { LiquidTabList } from '../ui/LiquidTabList'
import { useId, useRef } from 'react'
import './SegmentedTabs.css'

type Props<T extends string> = {
  items: readonly { id: T; label: string }[]
  value: T
  onChange: (value: T) => void
  label: string
  className?: string
  idPrefix?: string
  panelId?: string
}

/** Segmented switch: a raised glass lens moves between options (tablist semantics). */
export function SegmentedTabs<T extends string>({ items, value, onChange, label, className = '', idPrefix, panelId }: Props<T>) {
  const generated = useId()
  const prefix = idPrefix ?? `segmented-${generated}`
  const ref = useRef<HTMLDivElement>(null)
  return (
    <LiquidTabList containerRef={ref} className={`segmented-tabs ${className}`} role="tablist" aria-label={label}>
      {items.map((item, index) => {
        const on = item.id === value
        return (
          <button key={item.id} type="button" role="tab" id={`${prefix}-${item.id}`}
            aria-selected={on} aria-controls={panelId} tabIndex={on ? 0 : -1}
            className={on ? 'segmented-tabs__tab is-active' : 'segmented-tabs__tab'}
            onClick={() => onChange(item.id)}
            onKeyDown={event => {
              if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
              event.preventDefault()
              const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
                : (index + (event.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length
              onChange(items[next].id)
              ref.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus({ preventScroll: true })
            }}>
            <span className="segmented-tabs__label">{item.label}</span>
          </button>
        )
      })}
    </LiquidTabList>
  )
}
