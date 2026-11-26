import { HomejiAgentMark } from '../ai/HomejiAgentMark'
import { useRef, useSyncExternalStore } from 'react'
import {
  HOMEJI_AI_TRIGGER_ATTR,
  requestHomejiAiLoad,
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
      className={`hj-ai-btn is-${tone}${open ? ' is-open' : ''}`}
      aria-expanded={open}
      aria-haspopup="dialog"
      aria-controls={HOMEJI_AI_PANEL_ID}
      aria-label="Trợ lý AI" title="Trợ lý AI"
      {...{ [HOMEJI_AI_TRIGGER_ATTR]: '' }}
      onPointerEnter={event => { if (event.pointerType === 'mouse') requestHomejiAiLoad() }}
      onFocus={requestHomejiAiLoad}
      onClick={() => toggleHomejiAi(ref.current)}
    >
      <HomejiAgentMark />
      <span className="hj-ai-btn__label">Trợ lý AI</span>
    </button>
  )
}
