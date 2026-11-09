import { useId, useLayoutEffect, useRef, type CSSProperties, type PointerEvent } from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import { clamp, GLASS_TRACK, paintGlassLight, resizeGlassCanvas } from './glassLightArtwork'
import type { createGlassLightWebGL } from './glassLightWebGL'
import { THEME_FADE_MS, themeFadeEase } from './themeFade'

/** A timed move of the lens that runs alongside the page fade. */
type Tween = { from: number, to: number, start: number }

type Drag = {
  id: number
  startX: number
  startPosition: number
  travel: number
  moved: boolean
}

export function ThemeSwitch({ floating = false }: { floating?: boolean }) {
  const { theme, pendingTheme, toggle } = useTheme()
  const dark = theme === 'dark'
  const target = (pendingTheme ?? theme) === 'dark' ? 0 : 1
  const button = useRef<HTMLButtonElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const drag = useRef<Drag | null>(null)
  const ignoreClick = useRef(false)
  // Each visible switch needs its own name for the page transition.
  const transitionName = `theme-switch-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const motion = useRef({
    position: target, target, velocity: 0, orbit: target ? -Math.PI / 2 : Math.PI / 2,
    direction: target ? -1 : 1, hover: 0, energy: 0, scrub: null as number | null,
    tween: null as Tween | null,
  })
  const refresh = useRef(() => {})

  useLayoutEffect(() => {
    const control = button.current
    const artwork = canvas.current
    if (!control || !artwork || !artwork.getContext || !window.CanvasRenderingContext2D) return
    const ctx = artwork.getContext('2d')
    if (!ctx?.roundRect) return

    const state = motion.current
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0
    let previous = 0
    let width = 0
    let renderer: ReturnType<typeof createGlassLightWebGL> = null
    let initialized = false
    let disposed = false
    const draw = () => {
      if (renderer?.paint(ctx, state.position, state.orbit, state.energy)) {
        control.dataset.glassRenderer = 'webgl'
      } else {
        paintGlassLight(ctx, state.position, state.orbit, state.energy)
        control.dataset.glassRenderer = 'canvas'
      }
    }
    const paint = (time: number) => {
      frame = 0
      const elapsed = previous ? Math.min((time - previous) / 1000, .032) : 1 / 60
      previous = time
      const destination = state.scrub ?? state.target
      if (state.scrub !== null || reduced.matches) {
        state.tween = null
        state.position = destination
        state.velocity = 0
      } else if (state.tween) {
        // Brighten or dim on the page fade's clock, so the switch lands when the page does.
        const progress = clamp((time - state.tween.start) / THEME_FADE_MS)
        const next = state.tween.from + (state.tween.to - state.tween.from) * themeFadeEase(progress)
        state.velocity = (next - state.position) / Math.max(elapsed, 1 / 240)
        state.position = next
        if (progress >= 1) {
          state.position = state.tween.to
          state.velocity = 0
          state.tween = null
        }
      } else {
        // Substeps keep the spring stable on slower devices.
        for (let step = 0; step < 3; step++) {
          state.velocity += ((destination - state.position) * 129 - state.velocity * 15) * elapsed / 3
          state.position += state.velocity * elapsed / 3
        }
        if (Math.abs(destination - state.position) < .001 && Math.abs(state.velocity) < .015) {
          state.position = destination
          state.velocity = 0
        }
      }
      const phase = clamp(state.position)
      const sweep = phase < .5 ? 4 * phase ** 3 : 1 - 4 * (1 - phase) ** 3
      // Continue around the bevel on the return trip. Reversing a drag
      // retraces the same arc until the lens reaches the other end.
      const angle = state.direction > 0
        ? Math.PI / 2 - Math.PI * sweep
        : -3 * Math.PI / 2 + Math.PI * sweep
      const desiredAngle = angle + clamp(Math.abs(state.velocity) * .09)
      const remaining = Math.atan2(Math.sin(desiredAngle - state.orbit), Math.cos(desiredAngle - state.orbit))
      state.orbit = reduced.matches || Math.abs(remaining) < .003
        ? desiredAngle
        : state.orbit + remaining * Math.min(1, elapsed * 16)
      const energy = reduced.matches ? 0 : state.hover + Math.min(.65, Math.abs(state.velocity) * .16)
      state.energy += (energy - state.energy) * Math.min(1, elapsed * 14)
      if (Math.abs(energy - state.energy) < .01) state.energy = energy
      draw()
      if (state.position !== destination || state.orbit !== desiredAngle || state.energy !== energy) schedule()
      else previous = 0
    }
    const schedule = () => { if (width && !frame) frame = requestAnimationFrame(paint) }
    const resize = () => {
      width = control.getBoundingClientRect().width
      if (!width) return
      if (!initialized) {
        initialized = true
        // The first paint uses Canvas 2D while the shader loads separately.
        void import('./glassLightWebGL').then(({ createGlassLightWebGL }) => {
          if (disposed) return
          renderer = createGlassLightWebGL(schedule)
          if (renderer) schedule()
        }).catch(() => { /* Canvas 2D is already active. */ })
      }
      resizeGlassCanvas(artwork, width)
      draw()
      control.dataset.artworkReady = ''
      schedule()
    }
    const observer = new ResizeObserver(resize)
    refresh.current = schedule
    observer.observe(control)
    window.addEventListener('resize', resize)
    reduced.addEventListener('change', schedule)
    resize()
    return () => {
      disposed = true
      observer.disconnect()
      window.removeEventListener('resize', resize)
      reduced.removeEventListener('change', schedule)
      cancelAnimationFrame(frame)
      renderer?.dispose()
      delete control.dataset.artworkReady
      delete control.dataset.glassRenderer
      refresh.current = () => {}
    }
  }, [])

  useLayoutEffect(() => {
    const state = motion.current
    if (state.target !== target && !drag.current) state.direction = target ? 1 : -1
    if (state.target !== target && state.scrub === null)
      state.tween = { from: state.position, to: target, start: performance.now() }
    state.target = target
    refresh.current()
  }, [target])

  const press = (event: PointerEvent<HTMLButtonElement>) => {
    if (pendingTheme || drag.current || !event.isPrimary || event.button !== 0) return
    ignoreClick.current = false
    const bounds = event.currentTarget.getBoundingClientRect()
    const lensWidth = bounds.width * GLASS_TRACK.lens / GLASS_TRACK.width
    const travel = bounds.width * GLASS_TRACK.travel / GLASS_TRACK.width
    const startPosition = motion.current.position
    const center = bounds.left + bounds.width / 2 + (startPosition - .5) * travel
    if (Math.abs(event.clientX - center) > lensWidth / 2) return
    motion.current.direction = dark ? 1 : -1
    drag.current = {
      id: event.pointerId, startX: event.clientX, startPosition, travel, moved: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const move = (event: PointerEvent<HTMLButtonElement>) => {
    const gesture = drag.current
    if (!gesture || gesture.id !== event.pointerId || !gesture.travel) return
    const dx = event.clientX - gesture.startX
    if (!gesture.moved && Math.abs(dx) < 4) return
    gesture.moved = true
    motion.current.scrub = clamp(gesture.startPosition + dx / gesture.travel)
    refresh.current()
  }
  const release = (event: PointerEvent<HTMLButtonElement>, commit: boolean) => {
    const gesture = drag.current
    if (!gesture || gesture.id !== event.pointerId) return
    drag.current = null
    const state = motion.current
    const released = state.scrub ?? state.position
    state.scrub = null
    if (gesture.moved) {
      ignoreClick.current = true
      if (commit && (released < .5) !== dark) toggle(event.currentTarget)
    }
    refresh.current()
  }
  const hover = (value: number) => {
    motion.current.hover = value
    refresh.current()
  }

  return (
    <button
      ref={button}
      type="button"
      role="switch"
      aria-label="Chế độ tối"
      aria-checked={dark}
      aria-disabled={!!pendingTheme || undefined}
      aria-busy={!!pendingTheme || undefined}
      title={dark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
      className={`theme-switch${floating ? ' theme-switch--floating' : ''}`}
      style={{ '--theme-switch-name': transitionName } as CSSProperties}
      data-glass-exclude=""
      onPointerDown={press}
      onPointerMove={move}
      onPointerUp={event => release(event, true)}
      onPointerCancel={event => release(event, false)}
      onLostPointerCapture={event => release(event, false)}
      onPointerEnter={event => { if (event.pointerType === 'mouse') hover(1) }}
      onPointerLeave={() => hover(0)}
      onClick={event => {
        const wasDrag = ignoreClick.current && event.detail > 0
        ignoreClick.current = false
        if (!wasDrag && !pendingTheme) toggle(event.currentTarget)
      }}
    >
      <span className="theme-switch__fallback" aria-hidden="true">{dark ? '☾' : '☀'}</span>
      <canvas ref={canvas} className="theme-switch__artwork" aria-hidden="true" />
    </button>
  )
}
