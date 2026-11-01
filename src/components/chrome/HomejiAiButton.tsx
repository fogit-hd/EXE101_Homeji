import { HomejiAgentMark } from '../ai/HomejiAgentMark'
import { useRef, useSyncExternalStore } from 'react'
import {
  HOMEJI_AI_TRIGGER_ATTR,
  HOMEJI_AI_PANEL_ID,
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
      data-glass-exclude
      className={`hj-ai-btn ai-spectrum-launcher is-${tone}${open ? ' is-open' : ''}`}
      aria-expanded={open}
      aria-haspopup="dialog"
      aria-controls={HOMEJI_AI_PANEL_ID}
      aria-label="Homeji AI"
      {...{ [HOMEJI_AI_TRIGGER_ATTR]: '' }}
      onClick={() => toggleHomejiAi(ref.current)}
    >
      <span className="ai-spectrum-launcher__edge" aria-hidden="true" />
      <HomejiAgentMark />
      <span className="hj-ai-btn__label">Homeji AI</span>
    </button>
  )
}
