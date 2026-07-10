import {
  APILoadingStatus,
  Map,
  Marker,
  useApiLoadingStatus,
  useMap,
} from '@vis.gl/react-google-maps'
import { useEffect, useMemo } from 'react'
import { useGoogleMaps } from '../../contexts/GoogleMapsProvider'
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  createMarkerIcon,
  isValidCoord,
} from '../../lib/googleMaps'
import './RentalMap.css'

type Props = {
  latitude: number
  longitude: number
  onLocationChange?: (lat: number, lng: number) => void
}

function MapResizeFix() {
  const map = useMap()

  useEffect(() => {
    if (!map) return
    const fix = () => google.maps.event.trigger(map, 'resize')
    fix()
    const t = window.setTimeout(fix, 200)
    return () => window.clearTimeout(t)
  }, [map])

  return null
}

export function LocationPickerMap({ latitude, longitude, onLocationChange }: Props) {
  const { apiKey, mapId, loadError } = useGoogleMaps()
  const status = useApiLoadingStatus()

  const center = useMemo(() => {
    if (isValidCoord(latitude, longitude)) {
      return { lat: latitude, lng: longitude }
    }
    return DEFAULT_MAP_CENTER
  }, [latitude, longitude])

  const hasPin = isValidCoord(latitude, longitude)
  const zoom = hasPin ? 16 : DEFAULT_MAP_ZOOM

  if (!apiKey) {
    return (
      <div className="map-placeholder-msg">
        Thêm <code>VITE_GOOGLE_MAPS_API_KEY</code> vào file .env.
      </div>
    )
  }

  if (loadError || status === APILoadingStatus.FAILED) {
    return <div className="map-placeholder-msg">Không thể tải Maps JavaScript API.</div>
  }

  if (status !== APILoadingStatus.LOADED) {
    return <div className="map-placeholder-msg">Đang tải bản đồ...</div>
  }

  return (
    <div className="location-picker-map">
      <Map
        {...(mapId ? { mapId } : {})}
        defaultCenter={center}
        defaultZoom={zoom}
        disableDefaultUI
        zoomControl
        fullscreenControl={false}
        streetViewControl={false}
        mapTypeControl={false}
        className="rental-map-container"
        style={{ width: '100%', height: '100%' }}
        onClick={(event) => {
          if (!onLocationChange) return
          const lat = event.detail.latLng?.lat
          const lng = event.detail.latLng?.lng
          if (lat == null || lng == null) return
          onLocationChange(lat, lng)
        }}
      >
        <MapResizeFix />
        {hasPin && (
          <Marker
            position={{ lat: latitude, lng: longitude }}
            draggable={Boolean(onLocationChange)}
            icon={createMarkerIcon('#006491', 11)}
            onDragEnd={(event) => {
              if (!onLocationChange) return
              const lat = event.latLng?.lat()
              const lng = event.latLng?.lng()
              if (lat == null || lng == null) return
              onLocationChange(lat, lng)
            }}
          />
        )}
      </Map>
      {onLocationChange && (
        <p className="map-picker-hint">Click hoặc kéo pin trên bản đồ để chọn vị trí.</p>
      )}
    </div>
  )
}
