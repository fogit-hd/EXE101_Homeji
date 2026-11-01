import { useEffect, useMemo, useState, type RefObject } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { parseFiltersFromURL } from './listings/listingAdapters'
import { filterRentalSources } from '../../lib/rentalSourceFilters'
import { apiRequest } from '../../api/client'
import { getRentalSourceCatalog, sourceRoomHref } from '../../api/rentalSources'
import { MarkerClusterer, SuperClusterAlgorithm } from '@googlemaps/markerclusterer'
import { readSourceCatalogPins, type SourceCatalogPin } from '../../lib/sourceCatalog'
import { createMapClusterContent, createMarketplacePinContent, createPricePillPinContent, createRentalPinContent } from './mapLocationPins'
import { formatCompactPriceTr } from './explore/mapExploreFormat'
import type { MapPinLayers } from '../../lib/mapPinLayers'

function popupContent(pin: SourceCatalogPin, onOpen: (id: string) => void): HTMLDivElement {
  const root = document.createElement('div'); root.className = 'source-catalog-popup'
  if (pin.imageUrl) {
    const image = document.createElement('img'); image.src = pin.imageUrl; image.alt = ''; image.loading = 'lazy'; image.referrerPolicy = 'no-referrer'
    image.addEventListener('error', () => image.remove(), { once: true }); root.append(image)
  }
  const title = document.createElement('strong'); title.textContent = pin.title
  const address = document.createElement('p'); address.textContent = pin.address
  root.append(title, address)
  if (pin.price) { const price = document.createElement('p'); price.textContent = `${pin.price.toLocaleString('vi-VN')} đ/tháng · Giá trên tin gốc`; root.append(price) }
  if (pin.publisherName) { const author = document.createElement('p'); author.textContent = `Người đăng: ${pin.publisherName}`; root.append(author) }
  const note = document.createElement('small'); note.textContent = pin.kind === 'food' ? 'Xem thông tin quán trước khi ghé.' : 'Vị trí theo tin gốc. Kiểm tra tình trạng phòng với người đăng trước khi đến.'
  const link = document.createElement('a'); link.href = pin.kind === 'food' ? pin.sourceUrl : sourceRoomHref(pin.id.slice('rental:'.length)); link.textContent = pin.kind === 'food' ? 'Xem thông tin quán' : 'Xem chi tiết & liên hệ'; if (pin.kind === 'food') { link.target = '_blank'; link.rel = 'noopener noreferrer' } else link.addEventListener('click', event => { event.preventDefault(); onOpen(pin.id.slice('rental:'.length)) })
  root.append(note, link); return root
}

export function useSourceCatalogMap(mapRef: RefObject<google.maps.Map | null>, libraryRef: RefObject<google.maps.MarkerLibrary | null>, ready: boolean, enabled: boolean, layers: MapPinLayers, markerVariant: 'pin' | 'price-pill') {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const query = useMemo(() => parseFiltersFromURL(params), [params])
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!ready || !enabled) return
    const map = mapRef.current, library = libraryRef.current
    if (!map || !library) return
    const controller = new AbortController()
    const handles: Array<{ marker: google.maps.marker.AdvancedMarkerElement; dispose: () => void; listener: google.maps.MapsEventListener }> = []
    const popup = new google.maps.InfoWindow()
    let clusterer: MarkerClusterer | null = null
    void Promise.allSettled([
      getRentalSourceCatalog(),
      apiRequest<unknown>('/api/food-source-places', { auth: false, signal: controller.signal }),
    ]).then(results => {
      if (controller.signal.aborted) return
      const pins = results.flatMap((result, index) => result.status === 'fulfilled' ? readSourceCatalogPins(index === 0 ? filterRentalSources(result.value as Awaited<ReturnType<typeof getRentalSourceCatalog>>, query) : result.value, index === 0 ? 'rental' : 'food') : [])
        .filter(pin => pin.kind === 'food' ? layers.marketplace : layers.vacant)
      for (const pin of pins) {
        const content = pin.kind === 'food'
          ? createMarketplacePinContent({ title: pin.title })
          : markerVariant === 'price-pill' && pin.price !== null
            ? createPricePillPinContent({ title: pin.title, label: formatCompactPriceTr(pin.price) })
            : createRentalPinContent({ title: pin.title, kind: 'vacant' })
        const marker = new library.AdvancedMarkerElement({ position: { lat: pin.lat, lng: pin.lng }, title: pin.title, content: content.element, gmpClickable: true, zIndex: 35 })
        const listener = marker.addListener('gmp-click', () => { popup.setContent(popupContent(pin, id => navigate(sourceRoomHref(id)))); popup.open({ map, anchor: marker, shouldFocus: false }) })
        handles.push({ marker, dispose: content.dispose, listener })
      }
      const kinds = new Map(handles.map((handle, index) => [handle.marker, pins[index].kind]))
      clusterer = new MarkerClusterer({ map, markers: handles.map(handle => handle.marker), algorithm: new SuperClusterAlgorithm({ radius: 72, maxZoom: 19 }), renderer: {
        render: cluster => {
          const rentals = cluster.markers.filter(marker => kinds.get(marker as google.maps.marker.AdvancedMarkerElement) === 'rental').length
          return new library.AdvancedMarkerElement({ position: cluster.position, gmpClickable: true, zIndex: 2500 + cluster.count,
            title: `${cluster.count} vị trí gần nhau. Nhấn để phóng to.`, content: createMapClusterContent({ count: cluster.count, kindCounts: { vacant: rentals, roommate: 0, marketplace: cluster.count - rentals } }) })
        },
      } })
      setCount(handles.length)
    }).catch(() => { if (!controller.signal.aborted) setCount(handles.length) })
    return () => { controller.abort(); popup.close(); clusterer?.clearMarkers(); clusterer?.setMap(null); for (const handle of handles) { handle.listener.remove(); handle.marker.map = null; handle.dispose() } }
  }, [mapRef, libraryRef, ready, enabled, layers.marketplace, layers.vacant, markerVariant, query, navigate])
  return enabled && ready ? count : 0
}
