import { useEffect, useMemo, useState, type RefObject } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { parseFiltersFromURL } from './listings/listingAdapters'
import { filterRentalSources } from '../../lib/rentalSourceFilters'
import { apiRequest } from '../../api/client'
import { getRentalSourceCatalog, sourceRoomHref } from '../../api/rentalSources'
import type { CatalogClusterMarker } from './clusterListings'
import { readSourceCatalogPins, type SourceCatalogPin } from '../../lib/sourceCatalog'
import { createMarketplacePinContent, createPricePillPinContent, createRentalPinContent } from './mapLocationPins'
import { formatCompactPriceTr } from './explore/mapExploreFormat'
import { formatPrice } from '../../lib/labels'
import type { MapPinLayers } from '../../lib/mapPinLayers'
import { useCatalogRefresh } from '../../lib/useCatalogRefresh'

function popupContent(pin: SourceCatalogPin, onOpen: (id: string) => void): HTMLDivElement {
  const root = document.createElement('div'); root.className = `source-catalog-popup source-catalog-popup--${pin.kind}`
  if (pin.imageUrl) {
    const image = document.createElement('img'); image.src = pin.imageUrl; image.alt = pin.kind === 'rental' ? pin.title : ''; image.loading = 'lazy'; image.referrerPolicy = 'no-referrer'
    image.addEventListener('error', () => image.remove(), { once: true }); root.append(image)
  }
  if (pin.kind === 'food') {
    const title = document.createElement('strong'); title.textContent = pin.title
    const address = document.createElement('p'); address.textContent = pin.address
    root.append(title, address)
    const note = document.createElement('small'); note.textContent = 'Xem thông tin quán trước khi ghé.'
    const link = document.createElement('a'); link.href = pin.sourceUrl; link.textContent = 'Xem thông tin quán'; link.target = '_blank'; link.rel = 'noopener noreferrer'
    root.append(note, link); return root
  }

  const body = document.createElement('div'); body.className = 'source-catalog-popup__body'
  const eyebrow = document.createElement('span'); eyebrow.className = 'source-catalog-popup__eyebrow'; eyebrow.textContent = 'PHÒNG TRONG KHU VỰC'
  const title = document.createElement('strong'); title.className = 'source-catalog-popup__title'; title.textContent = pin.title
  body.append(eyebrow, title)
  if (pin.price !== null) {
    const price = document.createElement('p'); price.className = 'source-catalog-popup__price'
    const amount = document.createElement('strong'); amount.textContent = formatPrice(pin.price)
    const period = document.createElement('small'); period.textContent = '/ tháng'
    price.append(amount, period); body.append(price)
  }
  const address = document.createElement('p'); address.className = 'source-catalog-popup__address'; address.textContent = pin.address; body.append(address)
  const facts = [pin.area !== null ? `${pin.area} m²` : null, pin.depositLabel, ...pin.amenityHighlights].filter((value): value is string => Boolean(value))
  if (facts.length) {
    const list = document.createElement('div'); list.className = 'source-catalog-popup__facts'
    for (const fact of facts) { const tag = document.createElement('span'); tag.textContent = fact; list.append(tag) }
    body.append(list)
  }
  if (pin.sourceUpdatedAt) {
    const updated = document.createElement('small'); updated.className = 'source-catalog-popup__updated'
    updated.textContent = `Cập nhật ${new Intl.DateTimeFormat('vi-VN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(pin.sourceUpdatedAt))}`
    body.append(updated)
  }
  const author = document.createElement('p'); author.className = 'source-catalog-popup__publisher'; author.textContent = `Người đăng: ${pin.publisherName?.trim() || 'Chưa có tên người đăng'}`; body.append(author)
  const note = document.createElement('small'); note.className = 'source-catalog-popup__note'; note.textContent = 'Xác nhận tình trạng phòng với người đăng trước khi đến.'; body.append(note)
  const button = document.createElement('button'); button.type = 'button'; button.className = 'source-catalog-popup__action'; button.textContent = 'Xem chi tiết & liên hệ'
  button.addEventListener('click', () => onOpen(pin.id.slice('rental:'.length))); body.append(button)
  root.append(body); return root
}

export function useSourceCatalogMap(mapRef: RefObject<google.maps.Map | null>, libraryRef: RefObject<google.maps.MarkerLibrary | null>, ready: boolean, enabled: boolean, layers: MapPinLayers, markerVariant: 'pin' | 'price-pill', onMarkersChange: (markers: CatalogClusterMarker[]) => void) {
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
    onMarkersChange(handles.map((handle, index) => {
      const pin = pins[index]
      return { marker: handle.marker, listing: {
        id: pin.id, kind: pin.kind === 'rental' ? 'vacant' as const : 'marketplace' as const,
        title: pin.title, address: pin.address, imageUrl: pin.imageUrl,
        priceLabel: pin.price ? `${pin.price.toLocaleString('vi-VN')} đ / tháng` : '',
        premium: false,
        open: () => { popup.setContent(popupContent(pin, id => navigate(sourceRoomHref(id)))); popup.open({ map, anchor: handle.marker, shouldFocus: true }) },
      } }
    }))
    setCount(handles.length)
    return () => { onMarkersChange([]); popup.close(); for (const handle of handles) { handle.listener.remove(); handle.marker.map = null; handle.dispose() } }
  }, [mapRef, libraryRef, ready, enabled, markerVariant, pins, navigate, onMarkersChange])
  return enabled && ready ? count : 0
}
