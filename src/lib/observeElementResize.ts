/** Measurement enhances layout; its absence must not disable a form or control. */
export function observeElementResize(elements: readonly Element[], onResize: () => void): () => void {
  let disposed = false
  const notify = () => { if (!disposed) onResize() }
  let observer: ResizeObserver | undefined
  try {
    if (typeof ResizeObserver === 'function') {
      observer = new ResizeObserver(notify)
      for (const element of elements) observer.observe(element)
    }
  } catch { observer?.disconnect(); observer = undefined }
  window.addEventListener('resize', notify)
  return () => { disposed = true; observer?.disconnect(); window.removeEventListener('resize', notify) }
}
