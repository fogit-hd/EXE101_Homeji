import { useRef, type ReactNode } from 'react'

type Props<T extends string> = {
  items: readonly { id: T; label: string }[]
  value: T
  onChange: (value: T) => void
  label: string
  /** Keeps the desktop tab ids, so panels labelled by them still resolve. */
  idPrefix: string
  panelId?: string
  className?: string
  buttonClassName?: string
  renderLabel?: (id: T, label: string) => ReactNode
}

/** Plain ARIA tablist for phones: no glass lens, arrow keys move the selection. */
export function MobileTabs<T extends string>({ items, value, onChange, label, idPrefix, panelId, className = 'm-seg', buttonClassName, renderLabel }: Props<T>) {
  const listRef = useRef<HTMLDivElement>(null)
  return (
    <div ref={listRef} className={className} role="tablist" aria-label={label}>
      {items.map((item, index) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          className={buttonClassName}
          id={`${idPrefix}-${item.id}`}
          aria-selected={value === item.id}
          aria-controls={panelId}
          tabIndex={value === item.id ? 0 : -1}
          onClick={() => onChange(item.id)}
          onKeyDown={(event) => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
            event.preventDefault()
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
              : (index + (event.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length
            onChange(items[next].id)
            listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus()
          }}
        >
          {renderLabel ? renderLabel(item.id, item.label) : item.label}
        </button>
      ))}
    </div>
  )
}
