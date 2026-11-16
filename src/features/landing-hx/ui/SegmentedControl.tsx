import { useId, useRef, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'

export type SegmentOption<T extends string> = {
  value: T
  label: ReactNode
  icon?: ReactNode
}

type Common<T extends string> = {
  options: readonly SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  size?: 'sm' | 'md'
  block?: boolean
  className?: string
}

/**
 * radio mode: a real radio group (native inputs, arrow keys, works inside a <form>).
 * tabs mode: a WAI-ARIA tablist; pass panelId(value) to wire aria-controls.
 */
type Props<T extends string> =
  | (Common<T> & { mode?: 'radio'; name: string; legend: string })
  | (Common<T> & { mode: 'tabs'; label: string; tabId: (value: T) => string; panelId: (value: T) => string })

export function SegmentedControl<T extends string>(props: Props<T>) {
  const { options, value, onChange, size = 'md', block = false, className } = props
  const activeIndex = Math.max(0, options.findIndex(option => option.value === value))
  const classes = ['hx-seg', `hx-seg--${size}`, block ? 'hx-seg--block' : '', className ?? ''].filter(Boolean).join(' ')
  const style = { '--hx-seg-count': options.length, '--hx-seg-index': activeIndex } as CSSProperties
  const groupId = useId()
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  if (props.mode === 'tabs') {
    const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
      const keys: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, Home: -Infinity, End: Infinity }
      if (!(event.key in keys)) return
      event.preventDefault()
      const step = keys[event.key]
      const next = step === -Infinity ? 0 : step === Infinity ? options.length - 1
        : (activeIndex + step + options.length) % options.length
      onChange(options[next].value)
      tabRefs.current[next]?.focus()
    }
    return (
      <div role="tablist" aria-label={props.label} className={classes} style={style}>
        <span className="hx-seg__thumb" aria-hidden="true" />
        {options.map((option, index) => {
          const selected = option.value === value
          return (
            <button
              key={option.value}
              ref={node => { tabRefs.current[index] = node }}
              type="button"
              role="tab"
              id={props.tabId(option.value)}
              aria-selected={selected}
              aria-controls={props.panelId(option.value)}
              tabIndex={selected ? 0 : -1}
              className={`hx-seg__option${selected ? ' is-active' : ''}`}
              onClick={() => onChange(option.value)}
              onKeyDown={onKeyDown}
            >
              {option.icon}
              <span>{option.label}</span>
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <fieldset className={classes} style={style}>
      <legend className="hx-sr-only">{props.legend}</legend>
      <span className="hx-seg__thumb" aria-hidden="true" />
      {options.map(option => {
        const id = `${groupId}-${option.value}`
        const selected = option.value === value
        return (
          <label key={option.value} htmlFor={id} className={`hx-seg__option${selected ? ' is-active' : ''}`}>
            <input
              id={id}
              type="radio"
              className="hx-seg__input"
              name={props.name}
              value={option.value}
              checked={selected}
              onChange={() => onChange(option.value)}
            />
            {option.icon}
            <span>{option.label}</span>
          </label>
        )
      })}
    </fieldset>
  )
}
