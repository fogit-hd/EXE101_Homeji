/**
 * Cards lean toward a fine pointer and leave two glowing echoes that follow
 * a little later. Only CSS custom properties are written; layout never moves.
 */
type Trace = { x: number; y: number; e1x: number; e1y: number; e2x: number; e2y: number; tx: number; ty: number }

const RATES = { card: 18, echo1: 9, echo2: 5 }
const SETTLED = .002

export function attachTraceTilt(container: HTMLElement, itemSelector: string) {
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)')
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const traces = new Map<HTMLElement, Trace>()
  let active: HTMLElement | null = null
  let frame = 0
  let previous = 0

  const write = (item: HTMLElement, trace: Trace) => {
    const style = item.style
    style.setProperty('--trace-x', trace.x.toFixed(4))
    style.setProperty('--trace-y', trace.y.toFixed(4))
    style.setProperty('--trace-e1x', (trace.e1x - trace.x).toFixed(4))
    style.setProperty('--trace-e1y', (trace.e1y - trace.y).toFixed(4))
    style.setProperty('--trace-e2x', (trace.e2x - trace.x).toFixed(4))
    style.setProperty('--trace-e2y', (trace.e2y - trace.y).toFixed(4))
  }
  const clear = (item: HTMLElement) => {
    delete item.dataset.trace
    for (const name of ['x', 'y', 'e1x', 'e1y', 'e2x', 'e2y']) item.style.removeProperty(`--trace-${name}`)
  }

  const step = (time: number) => {
    frame = 0
    const elapsed = previous ? Math.min((time - previous) / 1000, .05) : 1 / 60
    previous = time
    const ease = (rate: number) => 1 - Math.exp(-rate * elapsed)
    for (const [item, trace] of traces) {
      trace.x += (trace.tx - trace.x) * ease(RATES.card)
      trace.y += (trace.ty - trace.y) * ease(RATES.card)
      trace.e1x += (trace.x - trace.e1x) * ease(RATES.echo1)
      trace.e1y += (trace.y - trace.e1y) * ease(RATES.echo1)
      trace.e2x += (trace.e1x - trace.e2x) * ease(RATES.echo2)
      trace.e2y += (trace.e1y - trace.e2y) * ease(RATES.echo2)
      const resting = item !== active && [trace.x, trace.y, trace.e1x, trace.e1y, trace.e2x, trace.e2y].every(value => Math.abs(value) < SETTLED)
      if (resting) {
        traces.delete(item)
        clear(item)
      } else {
        write(item, trace)
      }
    }
    if (traces.size) frame = requestAnimationFrame(step)
    else previous = 0
  }
  const schedule = () => { if (!frame) frame = requestAnimationFrame(step) }

  const release = () => {
    if (active) {
      const trace = traces.get(active)
      if (trace) { trace.tx = 0; trace.ty = 0 }
      active = null
    }
    schedule()
  }
  const move = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse' || !finePointer.matches || reduced.matches) return
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>(itemSelector) : null
    const item = target && container.contains(target) ? target : null
    if (item !== active) release()
    if (!item) return
    const bounds = item.getBoundingClientRect()
    if (!bounds.width || !bounds.height) return
    const tx = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width) * 2 - 1))
    const ty = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height) * 2 - 1))
    let trace = traces.get(item)
    if (!trace) {
      trace = { x: 0, y: 0, e1x: 0, e1y: 0, e2x: 0, e2y: 0, tx, ty }
      traces.set(item, trace)
      item.dataset.trace = ''
    }
    trace.tx = tx
    trace.ty = ty
    active = item
    schedule()
  }
  const reset = () => {
    cancelAnimationFrame(frame)
    frame = 0
    previous = 0
    active = null
    for (const item of traces.keys()) clear(item)
    traces.clear()
  }
  const onPreference = () => { if (reduced.matches || !finePointer.matches) reset() }

  container.addEventListener('pointermove', move, { passive: true })
  container.addEventListener('pointerleave', release)
  reduced.addEventListener('change', onPreference)
  finePointer.addEventListener('change', onPreference)
  return () => {
    container.removeEventListener('pointermove', move)
    container.removeEventListener('pointerleave', release)
    reduced.removeEventListener('change', onPreference)
    finePointer.removeEventListener('change', onPreference)
    reset()
  }
}
