import { useEffect, useState, type RefObject } from 'react'
import { apiRequest } from '../../api/client'
import { readSourceCatalogPins, type SourceCatalogPin } from '../../lib/sourceCatalog'
import { createMarketplacePinContent, createPricePillPinContent, createRentalPinContent } from './mapLocationPins'
import { formatCompactPriceTr } from './explore/mapExploreFormat'
import type { MapPinLayers } from '../../lib/mapPinLayers'

function popupContent(pin: SourceCatalogPin): HTMLDivElement {
  const root = document.createElement('div'); root.className = 'source-catalog-popup'
  if (pin.imageUrl) {
    const image = document.createElement('img'); image.src = pin.imageUrl; image.alt = ''; image.loading = 'lazy'; image.referrerPolicy = 'no-referrer'
    image.addEventListener('error', () => image.remove(), { once: true }); root.append(image)
  }
  const title = document.createElement('strong'); title.textContent = pin.title
  const address = document.createElement('p'); address.textContent = pin.address
  root.append(title, address)
  if (pin.price) { const price = document.createElement('p'); price.textContent = `${pin.price.toLocaleString('vi-VN')} đ/tháng · Giá trên tin gốc`; root.append(price) }
  const note = document.createElement('small'); note.textContent = pin.kind === 'food' ? 'Thông tin địa điểm công khai. Xem thông tin quán trước khi ghé.' : 'Tin từ nguồn công khai. Kiểm tra tình trạng phòng với người đăng trên tin gốc.'
  const link = document.createElement('a'); link.href = pin.sourceUrl; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = pin.kind === 'food' ? 'Xem thông tin quán' : 'Xem tin gốc'
  root.append(note, link); return root
}

export function useSourceCatalogMap(mapRef: RefObject<google.maps.Map | null>, libraryRef: RefObject<google.maps.MarkerLibrary | null>, ready: boolean, enabled: boolean, layers: MapPinLayers, markerVariant: 'pin' | 'price-pill') {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!ready || !enabled) return
    const map = mapRef.current, library = libraryRef.current
    if (!map || !library) return
    const controller = new AbortController()
    const handles: Array<{ marker: google.maps.marker.AdvancedMarkerElement; dispose: () => void; listener: google.maps.MapsEventListener }> = []
    const popup = new google.maps.InfoWindow()
    void Promise.allSettled([
      apiRequest<unknown>('/api/rental-source-listings?pageSize=50', { auth: false, signal: controller.signal }),
      apiRequest<unknown>('/api/food-source-places', { auth: false, signal: controller.signal }),
    ]).then(results => {
      if (controller.signal.aborted) return
      const pins = results.flatMap((result, index) => result.status === 'fulfilled' ? readSourceCatalogPins(result.value, index === 0 ? 'rental' : 'food') : [])
        .filter(pin => pin.kind === 'food' ? layers.marketplace : layers.vacant)
      for (const pin of pins) {
        const content = pin.kind === 'food'
          ? createMarketplacePinContent({ title: pin.title })
          : markerVariant === 'price-pill' && pin.price !== null
            ? createPricePillPinContent({ title: pin.title, label: formatCompactPriceTr(pin.price) })
            : createRentalPinContent({ title: pin.title, kind: 'vacant' })
        const marker = new library.AdvancedMarkerElement({ map, position: { lat: pin.lat, lng: pin.lng }, title: pin.title, content: content.element, gmpClickable: true, zIndex: 35 })
        const listener = marker.addListener('gmp-click', () => { popup.setContent(popupContent(pin)); popup.open({ map, anchor: marker, shouldFocus: false }) })
        handles.push({ marker, dispose: content.dispose, listener })
      }
      setCount(handles.length)
    }).catch(() => { if (!controller.signal.aborted) setCount(handles.length) })
    return () => { controller.abort(); popup.close(); for (const handle of handles) { handle.listener.remove(); handle.marker.map = null; handle.dispose() } }
  }, [mapRef, libraryRef, ready, enabled, layers.marketplace, layers.vacant, markerVariant])
  return enabled && ready ? count : 0
}
