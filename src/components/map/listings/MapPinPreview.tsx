import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { previewPlacement } from './mapListingsLayout.ts'

/** Projection follows the vector map's camera without remounting its React content. */
export function MapPinPreview({ map, lat, lng, onClose, children }: {
  map: google.maps.Map | null; lat: number; lng: number; onClose: () => void; children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (!map || !ref.current) return
    const element = ref.current
    const overlay = new google.maps.OverlayView()
    overlay.onAdd = () => {}
    overlay.onRemove = () => {}
    overlay.draw = () => {
      const point = overlay.getProjection()?.fromLatLngToContainerPixel(new google.maps.LatLng(lat, lng))
      if (!point) return
      const host = map.getDiv()
      const placement = previewPlacement(point.x, point.y, host.clientWidth, host.clientHeight, element.offsetWidth, element.offsetHeight)
      element.style.left = `${placement.left}px`
      element.style.top = `${placement.top}px`
      element.dataset.below = String(placement.below)
      element.style.visibility = 'visible'
    }
    overlay.setMap(map)
    const resize = new ResizeObserver(() => overlay.draw())
    resize.observe(element)
    resize.observe(map.getDiv())
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.stopPropagation(); onClose() } }
    document.addEventListener('keydown', escape)
    return () => { resize.disconnect(); overlay.setMap(null); document.removeEventListener('keydown', escape) }
  }, [map, lat, lng, onClose])
  return <div ref={ref} className="map-pin-preview" style={{ visibility: 'hidden' }} onPointerDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}>{children}</div>
}
