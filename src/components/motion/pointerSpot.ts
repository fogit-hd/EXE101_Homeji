/**
 * Writes the fine-pointer position inside the hovered item as
 * `--spot-x` / `--spot-y` (pixels) and marks it with `data-spot`.
 * CSS decides what the spot lights up; nothing here touches layout.
 */
export function attachPointerSpot(container: HTMLElement, itemSelector: string) {
  // Decoration only: environments without media queries get none.
  if (typeof matchMedia !== 'function') return () => {}
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)')
  let active: HTMLElement | null = null
  let frame = 0
  let pending: { item: HTMLElement; x: number; y: number } | null = null

  const leave = () => {
    if (active) delete active.dataset.spot
    active = null
    pending = null
  }
  const flush = () => {
    frame = 0
    if (!pending) return
    const { item, x, y } = pending
    pending = null
    item.style.setProperty('--spot-x', `${x.toFixed(1)}px`)
    item.style.setProperty('--spot-y', `${y.toFixed(1)}px`)
    item.dataset.spot = ''
  }
  const move = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse' || !finePointer.matches) return
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>(itemSelector) : null
    const item = target && container.contains(target) ? target : null
    if (item !== active) leave()
    if (!item) return
    active = item
    const bounds = item.getBoundingClientRect()
    pending = { item, x: event.clientX - bounds.left, y: event.clientY - bounds.top }
    if (!frame) frame = requestAnimationFrame(flush)
  }

  container.addEventListener('pointermove', move, { passive: true })
  container.addEventListener('pointerleave', leave)
  return () => {
    container.removeEventListener('pointermove', move)
    container.removeEventListener('pointerleave', leave)
    cancelAnimationFrame(frame)
    leave()
  }
}
