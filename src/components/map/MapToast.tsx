import { X } from 'lucide-react'
import { useChangedInputs } from '../../hooks/useChangedInputs'
import { useEffect, useEffectEvent, useState } from 'react'
import './MapToast.css'

type Props = {
  message: string | null
  tone?: 'info' | 'error' | 'success'
  onDismiss?: () => void
  action?: { label: string; onClick: () => void }
  durationMs?: number
}

/** Top-right toast — keeps text during exit so fade-out completes. */
export function MapToast({ message, tone = 'info', onDismiss, action, durationMs }: Props) {
  const [display, setDisplay] = useState<string | null>(message)
  const [visible, setVisible] = useState(false)
  const [activeTone, setActiveTone] = useState(tone)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const dismiss = useEffectEvent(() => onDismiss?.())
  const canDismiss = Boolean(onDismiss)

  useEffect(() => {
    if (!message || !durationMs || !canDismiss || hovered || focused) return
    const timer = window.setTimeout(dismiss, action ? Math.max(6000, durationMs) : durationMs)
    return () => window.clearTimeout(timer)
  }, [message, tone, action, durationMs, canDismiss, hovered, focused])

  if (useChangedInputs([message, tone])) {
    if (message) { setDisplay(message); setActiveTone(tone) }
    else { setVisible(false); setHovered(false); setFocused(false) }
  }
  useEffect(() => {
    if (message) {
      let frame = window.requestAnimationFrame(() => {
        frame = window.requestAnimationFrame(() => setVisible(true))
      })
      return () => window.cancelAnimationFrame(frame)
    }

    const exit = window.setTimeout(() => setDisplay(null), 340)
    return () => window.clearTimeout(exit)
  }, [message, tone])

  if (!display && !visible) return null

  return (
    <div
      className={`map-toast map-toast--${activeTone}${visible ? ' is-visible' : ''}`}
      role="status"
      aria-live="polite"
      aria-hidden={!visible}
      inert={!visible}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
      }}
    >
      <p>{display ?? ''}</p>
      {action ? <button type="button" className="map-toast__action" onClick={action.onClick}>{action.label}</button> : null}
      {onDismiss ? (
        <button type="button" className="map-toast__close map-motion-press" onClick={onDismiss} aria-label="×">
          <X aria-hidden="true" size={18} style={{ verticalAlign: 'middle' }} />
        </button>
      ) : null}
    </div>
  )
}
