import {
  APILoadingStatus,
  InfoWindow,
  Map,
  Marker,
  useApiLoadingStatus,
  useMap,
} from '@vis.gl/react-google-maps'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { RentalPostSummary } from '../../api/types'
import { RentalPostType } from '../../api/types'
import { HomejiLoader } from '../HomejiLoader'
import { useGoogleMaps } from '../../contexts/GoogleMapsProvider'
import { useGoogleMapsDiagnostics } from '../../hooks/useGoogleMapsDiagnostics'
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  createMarkerIcon,
  isValidCoord,
  markerColorForType,
} from '../../lib/googleMaps'
import { formatPrice, rentalPostTypeLabel } from '../../lib/labels'
import { MapErrorPanel } from './MapErrorPanel'
import './RentalMap.css'

export { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM }

type MapFocus = { lat: number; lng: number; zoom?: number }

type RentalMapProps = {
  posts: RentalPostSummary[]
  selectedPostId: string | null
  onSelectPost: (postId: string) => void
  onClearSelection?: () => void
  focus?: MapFocus | null
}

/** Map đôi khi render trắng/xanh nếu container chưa có kích thước lúc khởi tạo. */
function MapResizeFix() {
  const map = useMap()

  useEffect(() => {
    if (!map) return

    const fix = () => {
      google.maps.event.trigger(map, 'resize')
      map.setCenter(DEFAULT_MAP_CENTER)
    }

    fix()
    const t1 = window.setTimeout(fix, 100)
    const t2 = window.setTimeout(fix, 500)

    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [map])

  return null
}

type MapMarkersProps = {
  posts: RentalPostSummary[]
  selectedPostId: string | null
  onSelectPost: (postId: string) => void
  onClearSelection?: () => void
}

function MapMarkers({ posts, selectedPostId, onSelectPost, onClearSelection }: MapMarkersProps) {
  const map = useMap()
  const [infoPostId, setInfoPostId] = useState<string | null>(null)

  const mappable = useMemo(
    () => posts.filter((p) => isValidCoord(p.latitude, p.longitude)),
    [posts],
  )

  const infoPost = mappable.find((p) => p.id === infoPostId) ?? null

  useEffect(() => {
    if (selectedPostId) setInfoPostId(selectedPostId)
    else setInfoPostId(null)
  }, [selectedPostId])

  useEffect(() => {
    if (!map) return
    const listener = map.addListener('click', () => {
      setInfoPostId(null)
      onClearSelection?.()
    })
    return () => {
      google.maps.event.removeListener(listener)
    }
  }, [map, onClearSelection])

  useEffect(() => {
    if (!map || mappable.length === 0) return

    if (selectedPostId) {
      const post = mappable.find((p) => p.id === selectedPostId)
      if (post) {
        map.panTo({ lat: post.latitude, lng: post.longitude })
        map.setZoom(15)
      }
      return
    }

    if (mappable.length === 1) {
      map.setCenter({ lat: mappable[0].latitude, lng: mappable[0].longitude })
      map.setZoom(14)
      return
    }

    const bounds = new google.maps.LatLngBounds()
    for (const post of mappable) {
      bounds.extend({ lat: post.latitude, lng: post.longitude })
    }
    map.fitBounds(bounds, 48)
  }, [map, mappable, selectedPostId])

  return (
    <>
      {mappable.map((post) => {
        const isRoommate = post.type === RentalPostType.RoommateShare
        const isActive = post.id === selectedPostId
        const color = markerColorForType(isRoommate)

        return (
          <Marker
            key={post.id}
            position={{ lat: post.latitude, lng: post.longitude }}
            zIndex={isActive ? 1000 : 1}
            icon={createMarkerIcon(color, isActive ? 11 : 9, isActive)}
            onClick={(e) => {
              e.domEvent?.stopPropagation()
              onSelectPost(post.id)
              setInfoPostId(post.id)
            }}
          />
        )
      })}

      {infoPost && (
        <InfoWindow
          position={{ lat: infoPost.latitude, lng: infoPost.longitude }}
          onCloseClick={() => {
            setInfoPostId(null)
            onClearSelection?.()
          }}
        >
          <div className="map-popup">
            <strong>{infoPost.title || 'Tin đăng'}</strong>
            <p className="map-popup__price">{formatPrice(infoPost.price)}/tháng</p>
            <p>{rentalPostTypeLabel[infoPost.type]} · {infoPost.area} m²</p>
            <p>{infoPost.address}</p>
            <Link to={`/posts/${infoPost.id}`} className="map-popup__cta">
              Xem chi tiết →
            </Link>
          </div>
        </InfoWindow>
      )}
    </>
  )
}

function MapFocusPan({ focus }: { focus: MapFocus | null | undefined }) {
  const map = useMap()

  useEffect(() => {
    if (!map || !focus) return
    map.panTo({ lat: focus.lat, lng: focus.lng })
    if (focus.zoom != null) map.setZoom(focus.zoom)
  }, [map, focus])

  return null
}

export function RentalMap({
  posts,
  selectedPostId,
  onSelectPost,
  onClearSelection,
  focus,
}: RentalMapProps) {
  const { apiKey, mapId, loadError } = useGoogleMaps()
  const status = useApiLoadingStatus()
  const mapsFailed = status === APILoadingStatus.FAILED
  const diagnostics = useGoogleMapsDiagnostics(apiKey, loadError, mapsFailed)

  const mappable = useMemo(
    () => posts.filter((p) => isValidCoord(p.latitude, p.longitude)),
    [posts],
  )

  if (!apiKey) {
    return (
      <div className="rental-map map-placeholder-msg">
        <p>Chưa cấu hình Google Maps API key.</p>
        <p className="map-placeholder-hint">
          Thêm <code>VITE_GOOGLE_MAPS_API_KEY</code> vào <code>.env</code> và bật{' '}
          <strong>Maps JavaScript API</strong> trên Google Cloud.
        </p>
      </div>
    )
  }

  if (diagnostics.failed) {
    return (
      <div className="rental-map">
        <MapErrorPanel
          diagnosis={diagnostics.diagnosis}
          report={diagnostics.report}
          apiKeyMasked={diagnostics.apiKeyMasked}
          probing={diagnostics.probing}
          probeStatus={diagnostics.probeStatus}
        />
      </div>
    )
  }

  if (status !== APILoadingStatus.LOADED) {
    return (
      <div className="rental-map map-loading">
        <HomejiLoader label="Đang tải bản đồ..." />
      </div>
    )
  }

  return (
    <div className="rental-map">
      <Map
        {...(mapId ? { mapId } : {})}
        defaultCenter={DEFAULT_MAP_CENTER}
        defaultZoom={DEFAULT_MAP_ZOOM}
        disableDefaultUI
        zoomControl
        fullscreenControl
        streetViewControl={false}
        mapTypeControl={false}
        gestureHandling="greedy"
        className="rental-map-container"
        style={{ width: '100%', height: '100%' }}
      >
        <MapResizeFix />
        <MapFocusPan focus={focus} />
        <MapMarkers
          posts={posts}
          selectedPostId={selectedPostId}
          onSelectPost={onSelectPost}
          onClearSelection={onClearSelection}
        />
      </Map>

      {mappable.length === 0 && posts.length > 0 && (
        <div className="map-no-coords-hint">
          Các tin đăng chưa có tọa độ trên bản đồ.
        </div>
      )}
    </div>
  )
}
