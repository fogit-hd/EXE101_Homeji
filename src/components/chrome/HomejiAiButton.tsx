import { useRef, useSyncExternalStore } from 'react'
import {
  HOMEJI_AI_TRIGGER_ATTR,
  homejiAiOpenSnapshot,
  subscribeHomejiAiOpen,
  toggleHomejiAi,
} from '../../lib/homejiAiLauncher'
import './HomejiAiButton.css'

/** Navbar entry for the Homeji assistant (replaces the old floating launcher). */
export function HomejiAiButton({ tone = 'light' }: { tone?: 'light' | 'glass' }) {
  const ref = useRef<HTMLButtonElement>(null)
  const open = useSyncExternalStore(subscribeHomejiAiOpen, homejiAiOpenSnapshot, () => false)
  return (
    <button
      ref={ref}
      type="button"
      className={`hj-ai-btn is-${tone}${open ? ' is-open' : ''}`}
      aria-expanded={open}
      aria-haspopup="dialog"
      aria-label="Hỏi Homeji AI"
      {...{ [HOMEJI_AI_TRIGGER_ATTR]: '' }}
      onClick={() => toggleHomejiAi(ref.current)}
    >
      <span className="hj-ai-btn__spectrum" aria-hidden="true" />
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3.5 13.7 8.3 18.5 10 13.7 11.7 12 16.5 10.3 11.7 5.5 10 10.3 8.3Z" />
        <path d="M18.5 15.5 19.2 17.3 21 18 19.2 18.7 18.5 20.5 17.8 18.7 16 18 17.8 17.3Z" />
      </svg>
      <span className="hj-ai-btn__label">Hỏi Homeji AI</span>
    </button>
  )
}
