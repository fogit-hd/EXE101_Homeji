import { useChangedInputs } from '../../hooks/useChangedInputs'
import { useEffect, useState } from 'react'
import './MapToast.css'

type Props = {
  message: string | null
  tone?: 'info' | 'error' | 'success'
  onDismiss?: () => void
}

/** Top-right toast — keeps text during exit so fade-out completes. */
export function MapToast({ message, tone = 'info', onDismiss }: Props) {
  const [display, setDisplay] = useState<string | null>(message)
  const [visible, setVisible] = useState(false)
  const [activeTone, setActiveTone] = useState(tone)

  if (useChangedInputs([message, tone])) {
    if (message) { setDisplay(message); setActiveTone(tone) }
    else setVisible(false)
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
    >
      <p>{display ?? ''}</p>
      {onDismiss ? (
        <button type="button" className="map-toast__close map-motion-press" onClick={onDismiss}>
          ×
        </button>
      ) : null}
    </div>
  )
}
