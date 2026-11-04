import { useListingSearchParams } from '../../hooks/useListingSearchParams'
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { useNavigate } from 'react-router-dom'
import { parseFiltersFromURL } from './listings/listingAdapters'
import { filterRentalSources } from '../../lib/rentalSourceFilters'
import { apiRequest } from '../../api/client'
import { getRentalSourceCatalog, sourceRoomHref } from '../../api/rentalSources'
import type { CatalogClusterMarker } from './clusterListings'
import { readSourceCatalogPins, type SourceCatalogPin } from '../../lib/sourceCatalog'
import { createMarketplacePinContent, createPricePillPinContent, createRentalPinContent } from './mapLocationPins'
import { formatCompactPriceTr } from './explore/mapExploreFormat'
import { createSourceCatalogPopup } from './sourceCatalogPopup'
import type { MapPinLayers } from '../../lib/mapPinLayers'
import { useCatalogRefresh } from '../../lib/useCatalogRefresh'

type OwnedCatalogMarker = {
  pin: SourceCatalogPin
  marker: google.maps.marker.AdvancedMarkerElement
  styleKey: string
  dispose: () => void
  removeClick: () => void
}

function disposeCatalogMarker(handle: OwnedCatalogMarker) {
  handle.removeClick()
  handle.marker.map = null
  handle.dispose()
}

export function useSourceCatalogMap(mapRef: RefObject<google.maps.Map | null>, libraryRef: RefObject<google.maps.MarkerLibrary | null>, ready: boolean, enabled: boolean, layers: MapPinLayers, markerVariant: 'pin' | 'price-pill', onMarkersChange: (markers: CatalogClusterMarker[]) => void, onSelectRental?: (pin: SourceCatalogPin) => void) {
  const navigate = useNavigate()
  const [params] = useListingSearchParams()
  // UI selection and panel URLs do not change which source pins match the search.
  const filterParams = new URLSearchParams(params)
  for (const key of ['section', 'post', 'source', 'view', 'placeName', 'interest', 'page']) filterParams.delete(key)
  filterParams.sort()
  const filterKey = filterParams.toString()
  const query = useMemo(() => parseFiltersFromURL(new URLSearchParams(filterKey)), [filterKey])
  const actions = useRef({ navigate, onSelectRental })
  useLayoutEffect(() => { actions.current = { navigate, onSelectRental } }, [navigate, onSelectRental])
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
  const markers = useRef(new Map<string, OwnedCatalogMarker>())
  const popupRef = useRef<google.maps.InfoWindow | null>(null)
  useEffect(() => {
    if (!ready || !enabled) return
    popupRef.current = new google.maps.InfoWindow()
    const owned = markers.current
    return () => {
      onMarkersChange([])
      popupRef.current?.close()
      popupRef.current = null
      for (const handle of owned.values()) {
        disposeCatalogMarker(handle)
      }
      owned.clear()
    }
  }, [ready, enabled, onMarkersChange])
  useEffect(() => {
    if (!ready || !enabled) return
    const map = mapRef.current, library = libraryRef.current
    if (!map || !library) return
    const owned = markers.current
    const nextIds = new Set(pins.map(pin => pin.id))
    for (const [id, handle] of owned) {
      if (nextIds.has(id)) continue
      disposeCatalogMarker(handle); owned.delete(id)
    }
    const open = (pin: SourceCatalogPin, marker: google.maps.marker.AdvancedMarkerElement, shouldFocus: boolean) => {
      const popup = popupRef.current
      if (!popup) return
      if (pin.kind === 'rental' && actions.current.onSelectRental) { popup.close(); actions.current.onSelectRental(pin); return }
      popup.setContent(createSourceCatalogPopup(pin, id => actions.current.navigate(sourceRoomHref(id))))
      popup.open({ map, anchor: marker, shouldFocus })
    }
    for (const pin of pins) {
      const styleKey = JSON.stringify([pin.kind, pin.title, pin.price, markerVariant])
      const previous = owned.get(pin.id)
      if (previous) {
        if (previous.pin.lat !== pin.lat || previous.pin.lng !== pin.lng) previous.marker.position = { lat: pin.lat, lng: pin.lng }
        previous.pin = pin
        if (previous.styleKey === styleKey) continue
        previous.dispose()
      }
      const content = pin.kind === 'food'
        ? createMarketplacePinContent({ title: pin.title })
        : markerVariant === 'price-pill' && pin.price !== null
          ? createPricePillPinContent({ title: pin.title, label: formatCompactPriceTr(pin.price) })
          : createRentalPinContent({ title: pin.title, kind: 'vacant' })
      if (previous) {
        previous.marker.content = content.element
        previous.marker.title = pin.title
        previous.dispose = content.dispose
        previous.styleKey = styleKey
        continue
      }
      const marker = new library.AdvancedMarkerElement({ position: { lat: pin.lat, lng: pin.lng }, title: pin.title, content: content.element, gmpClickable: true, zIndex: 35 })
      const entry = { pin, marker, styleKey, dispose: content.dispose, removeClick: () => {} }
      const onClick = () => open(entry.pin, marker, false)
      marker.addEventListener('gmp-click', onClick)
      entry.removeClick = () => marker.removeEventListener('gmp-click', onClick)
      owned.set(pin.id, entry)
    }
    onMarkersChange(pins.map(pin => {
      const handle = owned.get(pin.id)!
      return { marker: handle.marker, listing: {
        id: pin.id, kind: pin.kind === 'rental' ? 'vacant' as const : 'marketplace' as const,
        title: pin.title, address: pin.address, imageUrl: pin.imageUrl,
        priceLabel: pin.price ? `${pin.price.toLocaleString('vi-VN')} đ / tháng` : '',
        premium: false,
        open: () => open(handle.pin, handle.marker, true),
      } }
    }))
    setCount(owned.size)
  }, [mapRef, libraryRef, ready, enabled, markerVariant, pins, onMarkersChange])
  return enabled && ready ? count : 0
}
