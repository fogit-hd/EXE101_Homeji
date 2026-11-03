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
import { createSourceCatalogPopup } from './sourceCatalogPopup'
import type { MapPinLayers } from '../../lib/mapPinLayers'
import { useCatalogRefresh } from '../../lib/useCatalogRefresh'


export function useSourceCatalogMap(mapRef: RefObject<google.maps.Map | null>, libraryRef: RefObject<google.maps.MarkerLibrary | null>, ready: boolean, enabled: boolean, layers: MapPinLayers, markerVariant: 'pin' | 'price-pill', onMarkersChange: (markers: CatalogClusterMarker[]) => void, onSelectRental?: (pin: SourceCatalogPin) => void) {
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
    const handles: Array<{ marker: google.maps.marker.AdvancedMarkerElement; dispose: () => void; removeClick: () => void }> = []
    const popup = new google.maps.InfoWindow()
    const open = (pin: SourceCatalogPin, marker: google.maps.marker.AdvancedMarkerElement, shouldFocus: boolean) => {
      if (pin.kind === 'rental' && onSelectRental) { popup.close(); onSelectRental(pin); return }
      popup.setContent(createSourceCatalogPopup(pin, id => navigate(sourceRoomHref(id))))
      popup.open({ map, anchor: marker, shouldFocus })
    }
    for (const pin of pins) {
      const content = pin.kind === 'food'
        ? createMarketplacePinContent({ title: pin.title })
        : markerVariant === 'price-pill' && pin.price !== null
          ? createPricePillPinContent({ title: pin.title, label: formatCompactPriceTr(pin.price) })
          : createRentalPinContent({ title: pin.title, kind: 'vacant' })
      const marker = new library.AdvancedMarkerElement({ position: { lat: pin.lat, lng: pin.lng }, title: pin.title, content: content.element, gmpClickable: true, zIndex: 35 })
      const onClick = () => open(pin, marker, false)
      marker.addEventListener('gmp-click', onClick)
      handles.push({ marker, dispose: content.dispose, removeClick: () => marker.removeEventListener('gmp-click', onClick) })
    }
    onMarkersChange(handles.map((handle, index) => {
      const pin = pins[index]
      return { marker: handle.marker, listing: {
        id: pin.id, kind: pin.kind === 'rental' ? 'vacant' as const : 'marketplace' as const,
        title: pin.title, address: pin.address, imageUrl: pin.imageUrl,
        priceLabel: pin.price ? `${pin.price.toLocaleString('vi-VN')} đ / tháng` : '',
        premium: false,
        open: () => open(pin, handle.marker, true),
      } }
    }))
    setCount(handles.length)
    return () => { onMarkersChange([]); popup.close(); for (const handle of handles) { handle.removeClick(); handle.marker.map = null; handle.dispose() } }
  }, [mapRef, libraryRef, ready, enabled, markerVariant, pins, navigate, onMarkersChange, onSelectRental])
  return enabled && ready ? count : 0
}
