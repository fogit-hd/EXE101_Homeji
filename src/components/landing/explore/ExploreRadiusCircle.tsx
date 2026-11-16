import { useEffect } from 'react'

type Props = {
  center: { lat: number; lng: number } | null
  radiusKm: number
  enabled: boolean
}

/** Draws search radius on the live RentalMap instance (`window.__HOMEJI_MAP`). */
export function ExploreRadiusCircle({ center, radiusKm, enabled }: Props) {
  useEffect(() => {
    if (!enabled || !center) return undefined
    let cancelled = false
    let circle: google.maps.Circle | null = null
    let mark: google.maps.marker.AdvancedMarkerElement | null = null
    let timer = 0

    const attach = () => {
      if (cancelled) return
      const map = (window as Window & { __HOMEJI_MAP?: google.maps.Map }).__HOMEJI_MAP
      if (!map || typeof google === 'undefined' || !google.maps?.Circle) {
        timer = window.setTimeout(attach, 250)
        return
      }
      circle?.setMap(null)
      circle = new google.maps.Circle({
        map,
        center,
        radius: radiusKm * 1000,
        // Ballpoint-ink ring; the notebook keeps green for the one thing in focus.
        strokeColor: document.documentElement.dataset.theme === 'dark' ? '#a9b9ff' : '#1c3aa6',
        strokeOpacity: 0.85,
        strokeWeight: 2.5,
        fillColor: '#1c3aa6',
        fillOpacity: 0.05,
        clickable: false,
        zIndex: 1,
      })
      const Advanced = google.maps.marker?.AdvancedMarkerElement
      if (Advanced) {
        const el = document.createElement('div')
        el.className = 'explore-place-mark'
        el.setAttribute('aria-hidden', 'true')
        el.innerHTML =
          '<svg viewBox="0 0 34 34" width="34" height="34"><path d="M17 3.5c-7.6-.3-13.6 5.6-13.4 13 .2 7.2 6.1 13.3 13.6 13.1 7.3-.2 13.3-6 13.1-13.3C30.1 9.4 24.4 3.8 17.6 3.6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M11.5 11.8 22.6 22.4M22.2 11.4 11.9 22.7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg><span>ở đây</span>'
        if (mark) mark.map = null
        mark = new Advanced({ map, position: center, content: el, zIndex: 2000 })
      }
    }

    attach()
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      circle?.setMap(null)
      circle = null
      if (mark) mark.map = null
      mark = null
    }
  }, [center, enabled, radiusKm])

  return null
}
