import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import './MapLocationLottieMarker.css'

/** Synced from video-src/Location Lottie Animation.lottie */
const LOCATION_LOTTIE = '/lottie/location.lottie?v=3'

export type LocationLottieContentHandle = {
  element: HTMLDivElement
  dispose: () => void
}

function fixedBoxStyle(size: number): string {
  return [
    `width:${size}px`,
    `height:${size}px`,
    `min-width:${size}px`,
    `min-height:${size}px`,
    `max-width:${size}px`,
    `max-height:${size}px`,
    'display:block',
    'overflow:visible',
    'pointer-events:none',
    'box-sizing:border-box',
    'flex-shrink:0',
    /* Do not set transform here — AdvancedMarker owns positioning transforms. */
    'will-change:auto',
  ].join(';')
}

/**
 * HTML content for AdvancedMarkerElement — keeps Lottie pinned to the map
 * (no OverlayView / transform drift while dragging).
 */
export function createLocationLottieContent(options?: {
  size?: number
  title?: string
}): LocationLottieContentHandle {
  const size = options?.size ?? 64
  const wrap = document.createElement('div')
  wrap.className = 'map-location-lottie'
  wrap.title = options?.title ?? 'Vị trí'
  wrap.setAttribute('aria-hidden', 'true')
  wrap.style.cssText = fixedBoxStyle(size)

  const mount = document.createElement('div')
  mount.className = 'map-location-lottie__canvas'
  mount.style.cssText = fixedBoxStyle(size)
  wrap.appendChild(mount)

  let root: Root | null = createRoot(mount)
  root.render(
    createElement(DotLottieReact, {
      src: LOCATION_LOTTIE,
      loop: true,
      autoplay: true,
      style: {
        width: size,
        height: size,
        display: 'block',
        maxWidth: size,
        maxHeight: size,
      },
    }),
  )

  return {
    element: wrap,
    dispose: () => {
      const r = root
      root = null
      if (!r) return
      // Unmount outside the Maps marker detach path.
      queueMicrotask(() => {
        try {
          r.unmount()
        } catch {
          /* already unmounted */
        }
      })
    },
  }
}

/**
 * Separate pin for chat "Mở trên bản đồ" — must not reuse the selected-place
 * Lottie marker (that reuse caused squash + no cue at the shared coords).
 */
export function createSharedLocationPinContent(options: {
  title: string
  kindLabel?: string
  size?: number
}): LocationLottieContentHandle {
  const size = options.size ?? 72
  const shell = document.createElement('div')
  shell.className = 'map-shared-location-pin'
  shell.title = options.title
  shell.setAttribute('aria-hidden', 'true')
  /* Shell matches Lottie box so AdvancedMarker centers on lat/lng;
     badge is absolutely positioned above and does not shift the anchor. */
  shell.style.cssText = `${fixedBoxStyle(size)};position:relative;overflow:visible;`
  const badge = document.createElement('div')
  badge.className = 'map-shared-location-pin__badge'
  const kind = document.createElement('span')
  kind.className = 'map-shared-location-pin__kind'
  kind.textContent = options.kindLabel?.trim() || 'Từ tin nhắn'
  const name = document.createElement('strong')
  name.className = 'map-shared-location-pin__title'
  name.textContent = options.title
  badge.appendChild(kind)
  badge.appendChild(name)
  shell.appendChild(badge)

  const lottie = createLocationLottieContent({
    size,
    title: options.title,
  })
  lottie.element.classList.add('map-shared-location-pin__lottie')
  shell.appendChild(lottie.element)

  return {
    element: shell,
    dispose: () => {
      lottie.dispose()
    },
  }
}
