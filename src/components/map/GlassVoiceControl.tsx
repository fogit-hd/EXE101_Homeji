import { useEffect, useRef, type PointerEvent } from 'react'
import './GlassVoiceControl.css'

const bands = [[75, 150], [150, 300], [300, 600], [600, 1200], [1200, 2400], [2400, 4800]] as const

function Microphone() {
  return <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="8.4" y="1.7" width="7.2" height="13.2" rx="3.6" />
    <path d="M4.8 11.5v.8a7.2 7.2 0 0 0 14.4 0v-.8M12 19.5v3M8.5 22.5h7" />
  </svg>
}

type Props = {
  recording: boolean
  starting: boolean
  seconds: number
  disabled: boolean
  getAnalyser: () => AnalyserNode | undefined
  onStart: () => void
  onStop: () => void
}

export function GlassVoiceControl({ recording, starting, seconds, disabled, getAnalyser, onStart, onStop }: Props) {
  const root = useRef<HTMLDivElement>(null)
  const expanded = starting || recording
  const clock = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

  useEffect(() => {
    const element = root.current
    const analyser = recording ? getAnalyser() : undefined
    if (!element || !analyser) return
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
    const spectrum = new Uint8Array(analyser.frequencyBinCount)
    const resolution = analyser.context.sampleRate / analyser.fftSize
    const bins = bands.map(([from, to]) => [
      Math.floor(from / resolution), Math.min(spectrum.length, Math.ceil(to / resolution)),
    ])
    const energy = bands.map(() => 0)
    let frame = 0
    let previous = -Infinity
    const clear = () => energy.forEach((_, index) => element.style.removeProperty(`--voice-${index}`))
    const paint = (now: number) => {
      if (now - previous >= 32) {
        analyser.getByteFrequencyData(spectrum)
        bins.forEach(([from, to], index) => {
          let peak = 0
          for (let bin = from; bin < to; bin++) peak = Math.max(peak, spectrum[bin])
          const next = Math.max(0, (peak / 255 - .12) / .88)
          energy[index] += (next - energy[index]) * (next > energy[index] ? .58 : .28)
          element.style.setProperty(`--voice-${index}`, energy[index].toFixed(3))
        })
        previous = now
      }
      frame = requestAnimationFrame(paint)
    }
    const sync = () => {
      cancelAnimationFrame(frame)
      if (reducedMotion.matches) clear()
      else frame = requestAnimationFrame(paint)
    }
    reducedMotion.addEventListener('change', sync)
    sync()
    return () => {
      cancelAnimationFrame(frame)
      reducedMotion.removeEventListener('change', sync)
      clear()
    }
  }, [getAnalyser, recording])

  function move(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'touch' || (disabled && !recording)) return
    const element = event.currentTarget
    const { x, y, width, height } = element.getBoundingClientRect()
    const dx = (event.clientX - x - width / 2) / (width / 2)
    const dy = (event.clientY - y - height / 2) / (height / 2)
    const strength = Math.min(1, Math.hypot(dx, dy))
    element.style.setProperty('--voice-angle', `${Math.atan2(dy, dx)}rad`)
    element.style.setProperty('--voice-stretch', String(1 + strength * .27))
    element.style.setProperty('--voice-squeeze', String(1 - strength * .20))
    element.style.setProperty('--voice-shift-x', `${dx * 5}%`)
    element.style.setProperty('--voice-shift-y', `${dy * 5}%`)
  }

  function reset(event: PointerEvent<HTMLDivElement>) {
    const style = event.currentTarget.style
    for (const key of ['stretch', 'squeeze', 'shift-x', 'shift-y']) style.removeProperty(`--voice-${key}`)
  }

  return (
    <div ref={root} className="glass-voice" data-expanded={expanded || undefined} data-recording={recording || undefined}
      onPointerMove={move} onPointerLeave={reset} onPointerCancel={reset}>
      <span className="glass-voice__shell" aria-hidden="true"><span data-glass-optics="" /></span>
      <span className="glass-voice__bead" aria-hidden="true"><span data-glass-optics="" /></span>
      <span className="glass-voice__mark" aria-hidden="true"><Microphone /></span>
      {expanded && <span className="glass-voice__clock" role="timer" aria-live="off">{clock}</span>}
      <button type="button" className="glass-voice__hit" data-glass-exclude="" aria-pressed={recording}
        aria-label={expanded ? 'Dừng ghi' : 'Ghi âm tin nhắn'} title={expanded ? 'Dừng ghi' : 'Ghi âm'}
        disabled={starting || (!recording && disabled)} onClick={recording ? onStop : onStart}>
        {expanded && <span className="glass-voice__stop" aria-hidden="true" />}
      </button>
    </div>
  )
}
