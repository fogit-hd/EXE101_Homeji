import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type Wave = { id: number; x: number; y: number; size: number }
const AI_BUTTONS = '.ai-spectrum-button, .natural-rental-search__trigger, .map-chatbot__fab, .map-chatbot__chip, .map-chatbot__action, .map-chatbot__send'

/** A separate overlay avoids changing button layout or intercepting input. */
export function AiInteractionEffects() {
  const [waves, setWaves] = useState<Wave[]>([])
  const nextId = useRef(0)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const timers = new Set<number>()
    const pulse = (event: MouseEvent) => {
      if (reduced.matches || !(event.target instanceof Element)) return
      const button = event.target.closest(AI_BUTTONS)
      if (!(button instanceof HTMLButtonElement) || button.disabled) return
      const bounds = button.getBoundingClientRect()
      const id = ++nextId.current
      const wave = {
        id,
        x: event.detail ? event.clientX : bounds.left + bounds.width / 2,
        y: event.detail ? event.clientY : bounds.top + bounds.height / 2,
        size: Math.min(160, Math.max(bounds.width, bounds.height) * 1.4),
      }
      setWaves(current => [...current.slice(-2), wave])
      const timer = window.setTimeout(() => {
        setWaves(current => current.filter(item => item.id !== id))
        timers.delete(timer)
      }, 650)
      timers.add(timer)
    }
    document.addEventListener('click', pulse)
    return () => {
      document.removeEventListener('click', pulse)
      timers.forEach(timer => window.clearTimeout(timer))
    }
  }, [])

  return createPortal(<div className="ai-interaction-waves" aria-hidden="true">
    {waves.map(wave => <span key={wave.id} className="ai-interaction-wave" style={{
      left: wave.x - wave.size / 2, top: wave.y - wave.size / 2,
      width: wave.size, height: wave.size,
    }} />)}
  </div>, document.body)
}
