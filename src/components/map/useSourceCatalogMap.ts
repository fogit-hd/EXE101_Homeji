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
import { useCatalogRefresh } from '../../lib/useCatalogRefresh'

function popupContent(pin: SourceCatalogPin, onOpen: (id: string) => void): HTMLDivElement {
  const root = document.createElement('div'); root.className = 'source-catalog-popup'
  if (pin.imageUrl) {
    const image = document.createElement('img'); image.src = pin.imageUrl; image.alt = ''; image.loading = 'lazy'; image.referrerPolicy = 'no-referrer'
    image.addEventListener('error', () => image.remove(), { once: true }); root.append(image)
  }
  const title = document.createElement('strong'); title.textContent = pin.title
  const address = document.createElement('p'); address.textContent = pin.address
  root.append(title, address)
  if (pin.price) { const price = document.createElement('p'); price.textContent = `${pin.price.toLocaleString('vi-VN')} đ/tháng · Giá thuê`; root.append(price) }
  if (pin.publisherName) { const author = document.createElement('p'); author.textContent = `Người đăng: ${pin.publisherName}`; root.append(author) }
  const note = document.createElement('small'); note.textContent = pin.kind === 'food' ? 'Xem thông tin quán trước khi ghé.' : 'Kiểm tra tình trạng phòng với người đăng trước khi đến.'
  const link = document.createElement('a'); link.href = pin.kind === 'food' ? pin.sourceUrl : sourceRoomHref(pin.id.slice('rental:'.length)); link.textContent = pin.kind === 'food' ? 'Xem thông tin quán' : 'Xem chi tiết & liên hệ'; if (pin.kind === 'food') { link.target = '_blank'; link.rel = 'noopener noreferrer' } else link.addEventListener('click', event => { event.preventDefault(); onOpen(pin.id.slice('rental:'.length)) })
  root.append(note, link); return root
}

export function useSourceCatalogMap(mapRef: RefObject<google.maps.Map | null>, libraryRef: RefObject<google.maps.MarkerLibrary | null>, ready: boolean, enabled: boolean, layers: MapPinLayers, markerVariant: 'pin' | 'price-pill') {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const query = useMemo(() => parseFiltersFromURL(params), [params])
  const [count, setCount] = useState(0)
  const revision = useCatalogRefresh(ready && enabled)
  const [rentalRows, setRentalRows] = useState<Awaited<ReturnType<typeof getRentalSourceCatalog>>>([])
  const [foodRows, setFoodRows] = useState<unknown>([])
  useEffect(() => {
    if (!ready || !enabled) return
    const controller = new AbortController()
    void Promise.allSettled([
      getRentalSourceCatalog(),
      apiRequest<unknown>('/api/food-source-places', { auth: false, signal: controller.signal }),
    ]).then(([rentals, food]) => {
      if (controller.signal.aborted) return
      if (rentals.status === 'fulfilled') setRentalRows(rentals.value)
      if (food.status === 'fulfilled') setFoodRows(food.value)
    })
    return () => controller.abort()
  }, [ready, enabled, revision])
  const pins = useMemo(() => [
    ...readSourceCatalogPins(filterRentalSources(rentalRows, query), 'rental'),
    ...readSourceCatalogPins(foodRows, 'food'),
  ].filter(pin => pin.kind === 'food' ? layers.marketplace : layers.vacant), [rentalRows, foodRows, query, layers.marketplace, layers.vacant])
  useEffect(() => {
    if (!ready || !enabled) return
    const map = mapRef.current, library = libraryRef.current
    if (!map || !library) return
    const handles: Array<{ marker: google.maps.marker.AdvancedMarkerElement; dispose: () => void; listener: google.maps.MapsEventListener }> = []
    const popup = new google.maps.InfoWindow()
    let clusterer: MarkerClusterer | null = null
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
      const pinByMarker = new Map(handles.map((handle, index) => [handle.marker, pins[index]]))
      clusterer = new MarkerClusterer({ map, markers: handles.map(handle => handle.marker), algorithm: new SuperClusterAlgorithm({ radius: 72, maxZoom: 19 }), renderer: {
        render: cluster => {
          const rentals = cluster.markers.filter(marker => kinds.get(marker as google.maps.marker.AdvancedMarkerElement) === 'rental').length
          return new library.AdvancedMarkerElement({ position: cluster.position, gmpClickable: true, zIndex: 2500 + cluster.count,
            title: `${cluster.count} tin gần nhau. Nhấn để xem từng tin.`, content: createMapClusterContent({ count: cluster.count, kindCounts: { vacant: rentals, roommate: 0, marketplace: cluster.count - rentals } }) })
        },
      }, onClusterClick: (_event, cluster, clusterMap) => {
        const root = document.createElement('div')
        root.className = 'source-catalog-cluster'
        const title = document.createElement('strong')
        title.textContent = `${cluster.count} tin trong khu vực này`
        const list = document.createElement('div')
        list.className = 'source-catalog-cluster__list'
        for (const marker of cluster.markers) {
          const pin = pinByMarker.get(marker as google.maps.marker.AdvancedMarkerElement)
          if (pin) list.append(popupContent(pin, id => navigate(sourceRoomHref(id))))
        }
        const zoom = document.createElement('button')
        zoom.type = 'button'; zoom.textContent = 'Phóng to khu vực'
        zoom.addEventListener('click', () => { if (cluster.bounds) clusterMap.fitBounds(cluster.bounds, 72) })
        root.append(title, zoom, list)
        popup.setContent(root); popup.setPosition(cluster.position)
        popup.open({ map: clusterMap, shouldFocus: true })
      } })
      setCount(handles.length)
    return () => { popup.close(); clusterer?.clearMarkers(); clusterer?.setMap(null); for (const handle of handles) { handle.listener.remove(); handle.marker.map = null; handle.dispose() } }
  }, [mapRef, libraryRef, ready, enabled, markerVariant, pins, navigate])
  return enabled && ready ? count : 0
}
