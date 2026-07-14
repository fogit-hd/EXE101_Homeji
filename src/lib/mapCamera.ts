/**
 * Smooth map camera moves — panTo + zoom, or fitBounds for multi-point views.
 * Avoid synthetic fitBounds-from-zoom (that overshoots and zooms way out).
 */

export function debounce<T extends (...args: never[]) => void>(fn: T, waitMs: number) {
  let timer = 0
  const wrapped = (...args: Parameters<T>) => {
    window.clearTimeout(timer)
    timer = window.setTimeout(() => {
      fn(...args)
    }, waitMs)
  }
  wrapped.cancel = () => {
    window.clearTimeout(timer)
  }
  return wrapped
}

/** Resolve when the map finishes settling (or after timeout). */
export function waitForMapIdle(
  map: google.maps.Map,
  timeoutMs = 2800,
): Promise<void> {
  return new Promise((resolve) => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      window.clearTimeout(timer)
      google.maps.event.removeListener(listener)
      resolve()
    }
    const listener = map.addListener('idle', finish)
    const timer = window.setTimeout(finish, timeoutMs)
  })
}

export type MapCameraTarget = {
  center: google.maps.LatLngLiteral
  zoom?: number
  /** fitBounds padding — when set with bounds, preferred over center/zoom */
  bounds?: google.maps.LatLngBounds
  padding?: number | google.maps.Padding
}

/**
 * Smooth camera move. Center+zoom uses panTo (then setZoom) — not fitBounds —
 * so “định vị của tôi” stays street-level instead of city-wide.
 */
export function moveMapCamera(map: google.maps.Map, target: MapCameraTarget) {
  const padding = target.padding ?? 48

  if (target.bounds) {
    map.fitBounds(target.bounds, padding)
    return
  }

  const wantZoom = target.zoom
  const currentZoom = map.getZoom()

  map.panTo(target.center)

  if (wantZoom == null) return
  if (currentZoom != null && Math.abs(currentZoom - wantZoom) < 0.1) return

  // Apply target zoom shortly after pan starts (keeps motion smooth, exact zoom).
  window.setTimeout(() => {
    map.setZoom(wantZoom)
  }, 120)
}

/** @deprecated Use moveMapCamera — kept for call sites that still import jump. */
export function jumpMapCamera(map: google.maps.Map, target: MapCameraTarget) {
  moveMapCamera(map, target)
}

type QueuedMove = {
  key: string
  target: MapCameraTarget
}

/**
 * Coalesce rapid camera requests: only the latest target runs after debounce,
 * and wait for idle so moves don't stack mid-animation.
 */
export function createMapCameraScheduler(options?: {
  debounceMs?: number
}) {
  const debounceMs = options?.debounceMs ?? 120
  let map: google.maps.Map | null = null
  let pending: QueuedMove | null = null
  let timer = 0
  let busy = false
  let disposed = false

  const flush = async () => {
    if (disposed || !map || !pending || busy) return
    const next = pending
    pending = null
    busy = true
    try {
      moveMapCamera(map, next.target)
      await waitForMapIdle(map)
    } finally {
      busy = false
      if (pending) {
        window.clearTimeout(timer)
        timer = window.setTimeout(() => {
          void flush()
        }, debounceMs)
      }
    }
  }

  return {
    attach(nextMap: google.maps.Map) {
      map = nextMap
    },
    /** Schedule a smooth camera move; same key replaces earlier pending move. */
    schedule(key: string, target: MapCameraTarget) {
      if (disposed) return
      pending = { key, target }
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        void flush()
      }, debounceMs)
    },
    dispose() {
      disposed = true
      window.clearTimeout(timer)
      pending = null
      map = null
    },
  }
}

export type MapCameraScheduler = ReturnType<typeof createMapCameraScheduler>
