import { memo, useEffect, useRef, useState } from 'react'
import { useGoogleMaps } from '../../contexts/GoogleMapsProvider'
import { useGoogleMapsDiagnostics } from '../../hooks/useGoogleMapsDiagnostics'
import {
  useSystemMapColorScheme,
} from '../../hooks/useSystemMapColorScheme'
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  MAP_FOCUS_ZOOM,
  createMapOptions,
  createStyledPin,
  isValidCoord,
  listingPinStyle,
  loadMarkerLibrary,
  pinContent,
  readAdvancedMarkerLatLng,
  resolveMapsColorScheme,
} from '../../lib/googleMaps'
import { moveMapCamera } from '../../lib/mapCamera'
import { waitForMapHostSize } from '../../lib/mapWebGL'
import { MapErrorPanel } from './MapErrorPanel'
import './RentalMap.css'

type Props = {
  latitude: number
  longitude: number
  onLocationChange?: (lat: number, lng: number) => void
}

function LocationPickerMapComponent({
  latitude,
  longitude,
  onLocationChange,
}: Props) {
  const { apiKey, mapId, isLoaded, loadError } = useGoogleMaps()
  const diagnostics = useGoogleMapsDiagnostics(apiKey, loadError, Boolean(loadError))
  const mapColorScheme = useSystemMapColorScheme()

  const hostRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null)
  const pinRef = useRef<google.maps.marker.PinElement | null>(null)
  const libRef = useRef<google.maps.MarkerLibrary | null>(null)
  const onLocationChangeRef = useRef(onLocationChange)
  onLocationChangeRef.current = onLocationChange

  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    if (!isLoaded || !apiKey) return
    const host = hostRef.current
    if (!host || mapRef.current) return

    let cancelled = false
    let clickL: google.maps.MapsEventListener | null = null
    let mapDiv: HTMLDivElement | null = null
    const colorScheme = resolveMapsColorScheme(mapColorScheme)

    void (async () => {
      await waitForMapHostSize(host)
      if (cancelled || mapRef.current) return

      mapDiv = document.createElement('div')
      mapDiv.className = 'rental-map__canvas'
      mapDiv.style.cssText = 'width:100%;height:100%;position:absolute;inset:0;'
      host.replaceChildren(mapDiv)

      const hasPin = isValidCoord(latitude, longitude)
      const map = new google.maps.Map(
        mapDiv,
        createMapOptions(mapId, {
          center: hasPin ? { lat: latitude, lng: longitude } : DEFAULT_MAP_CENTER,
          zoom: hasPin ? MAP_FOCUS_ZOOM : DEFAULT_MAP_ZOOM,
          gestureHandling: 'cooperative',
          zoomControl: true,
          disableDefaultUI: false,
          ...(colorScheme != null ? { colorScheme } : {}),
        }),
      )
      if (cancelled) {
        google.maps.event.clearInstanceListeners(map)
        mapDiv.replaceChildren()
        mapDiv.remove()
        return
      }

      mapRef.current = map
      setMapReady(true)

      clickL = map.addListener('click', (event: google.maps.MapMouseEvent) => {
        const cb = onLocationChangeRef.current
        if (!cb || !event.latLng) return
        cb(event.latLng.lat(), event.latLng.lng())
      })

      const lib = await loadMarkerLibrary()
      if (cancelled) return
      libRef.current = lib
    })()

    return () => {
      cancelled = true
      if (clickL) google.maps.event.removeListener(clickL)
      if (markerRef.current) markerRef.current.map = null
      markerRef.current = null
      pinRef.current = null
      if (mapRef.current) {
        google.maps.event.clearInstanceListeners(mapRef.current)
        mapRef.current = null
      }
      libRef.current = null
      if (mapDiv) {
        mapDiv.replaceChildren()
        mapDiv.remove()
      }
      host.replaceChildren()
      setMapReady(false)
    }
    // Remount when theme changes — colorScheme is init-only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, apiKey, mapId, mapColorScheme])

  useEffect(() => {
    const map = mapRef.current
    const lib = libRef.current
    if (!map || !mapReady || !lib) return

    if (!isValidCoord(latitude, longitude)) {
      if (markerRef.current) markerRef.current.map = null
      return
    }

    const pos = { lat: latitude, lng: longitude }
    const style = listingPinStyle(false, true)
    const { AdvancedMarkerElement, PinElement } = lib

    if (!markerRef.current || !pinRef.current) {
      const pin = createStyledPin(PinElement, style)
      pinRef.current = pin
      const marker = new AdvancedMarkerElement({
        map,
        position: pos,
        content: pinContent(pin),
        gmpDraggable: Boolean(onLocationChangeRef.current),
        title: 'Vị trí đã chọn',
      })
      marker.addListener('dragend', () => {
        const cb = onLocationChangeRef.current
        const next = readAdvancedMarkerLatLng(marker)
        if (!cb || !next) return
        cb(next.lat, next.lng)
      })
      markerRef.current = marker
      moveMapCamera(map, { center: pos, zoom: MAP_FOCUS_ZOOM })
    } else {
      markerRef.current.map = map
      markerRef.current.gmpDraggable = Boolean(onLocationChangeRef.current)
      const cur = readAdvancedMarkerLatLng(markerRef.current)
      if (
        !cur ||
        Math.abs(cur.lat - latitude) > 1e-7 ||
        Math.abs(cur.lng - longitude) > 1e-7
      ) {
        markerRef.current.position = pos
        moveMapCamera(map, { center: pos })
      }
    }
  }, [mapReady, latitude, longitude])

  if (!apiKey) {
    return (
      <div className="map-placeholder-msg">
        Thêm <code>VITE_GOOGLE_MAPS_API_KEY</code> vào file .env.
      </div>
    )
  }

  if (diagnostics.failed) {
    return (
      <MapErrorPanel
        diagnosis={diagnostics.diagnosis}
        report={diagnostics.report}
        apiKeyMasked={diagnostics.apiKeyMasked}
        probing={diagnostics.probing}
        probeStatus={diagnostics.probeStatus}
      />
    )
  }

  return (
    <div className="location-picker-map">
      {!mapReady ? <div className="map-placeholder-msg">Đang tải bản đồ...</div> : null}
      <div ref={hostRef} className="rental-map__host" />
      {onLocationChange ? (
        <p className="map-picker-hint">Click hoặc kéo pin trên bản đồ để chọn vị trí.</p>
      ) : null}
    </div>
  )
}

export const LocationPickerMap = memo(LocationPickerMapComponent)
