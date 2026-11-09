import { useEffect, useRef, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import './action-wheel.css'

export type WheelAction = { label: string; icon: ReactNode; /** CSS colour for this action. */ tone?: string }

type Props = {
  x: number
  y: number
  title: string
  actions: readonly WheelAction[]
  active: number
  mode: 'hold' | 'menu'
  onSelect: (index: number) => void
  onClose: () => void
}

/** Radial menu drawn at a viewport point. In `menu` mode it is a keyboard-operable menu. */
export function ActionWheel({ x, y, title, actions, active, mode, onSelect, onClose }: Props) {
  const items = useRef<(HTMLButtonElement | null)[]>([])
  const previousFocus = useRef<Element | null>(null)

  useEffect(() => {
    if (mode !== 'menu') return
    previousFocus.current = document.activeElement
    items.current[0]?.focus()
    const dismiss = (event: PointerEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest('.action-wheel')) onClose()
    }
    const onScroll = () => onClose()
    document.addEventListener('pointerdown', dismiss, true)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      document.removeEventListener('pointerdown', dismiss, true)
      window.removeEventListener('scroll', onScroll)
      const back = previousFocus.current
      if (back instanceof HTMLElement && back.isConnected) back.focus()
    }
  }, [mode, onClose])

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = items.current.findIndex(item => item === document.activeElement)
    const move = (step: number) => {
      event.preventDefault()
      items.current[(current + step + actions.length) % actions.length]?.focus()
    }
    if (event.key === 'Escape') { event.preventDefault(); onClose() }
    else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') move(1)
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') move(-1)
    else if (event.key === 'Tab') move(event.shiftKey ? -1 : 1)
  }

  const step = 360 / actions.length
  return createPortal(
    <div
      className="action-wheel"
      data-mode={mode}
      data-has-active={active >= 0 || undefined}
      data-glass-exclude=""
      role={mode === 'menu' ? 'menu' : 'presentation'}
      aria-label={mode === 'menu' ? title : undefined}
      aria-hidden={mode === 'hold' || undefined}
      style={{ left: x, top: y, '--wheel-active': actions[active]?.tone ?? 'var(--wheel-accent)' } as CSSProperties}
      onKeyDown={onKeyDown}
      onContextMenu={event => event.preventDefault()}
    >
      <span className="action-wheel__disc" aria-hidden="true" />
      <span className="action-wheel__pointer" aria-hidden="true" data-visible={active >= 0 || undefined} style={{ '--wheel-angle': `${active * step}deg` } as CSSProperties} />
      {actions.map((action, index) => (
        <button
          key={action.label}
          ref={element => { items.current[index] = element }}
          type="button"
          role={mode === 'menu' ? 'menuitem' : undefined}
          tabIndex={mode === 'menu' ? 0 : -1}
          className="action-wheel__item"
          data-active={index === active || undefined}
          style={{ '--wheel-angle': `${index * step}deg`, '--wheel-order': index, '--tone': action.tone ?? 'var(--wheel-accent)' } as CSSProperties}
          onClick={() => onSelect(index)}
        >
          <span className="action-wheel__icon" aria-hidden="true">{action.icon}</span>
          <span className="action-wheel__label">{action.label}</span>
        </button>
      ))}
      <span className="action-wheel__hub" aria-hidden="true">
        {active >= 0 ? actions[active]?.label : mode === 'hold' ? 'Kéo để chọn' : 'Chọn thao tác'}
      </span>
    </div>,
    document.body,
  )
}
