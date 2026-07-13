import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { RentalPostSummary } from '../../api/types'
import { RentalPostType } from '../../api/types'
import { HomejiLoader } from '../HomejiLoader'
import { useGoogleMaps } from '../../contexts/GoogleMapsProvider'
import { useGoogleMapsDiagnostics } from '../../hooks/useGoogleMapsDiagnostics'
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  createMapOptions,
  isValidCoord,
  loadMarkerLibrary,
  resolveMapsColorScheme,
} from '../../lib/googleMaps'
import {
  fetchMapPlaceDetails,
  isPlaceIconClick,
  type MapPlaceDetails,
} from '../../lib/mapPlace'
import { waitForMapHostSize } from '../../lib/mapWebGL'
import {
  useSystemMapColorScheme,
} from '../../hooks/useSystemMapColorScheme'
import { MapErrorPanel } from './MapErrorPanel'
import './RentalMap.css'

export type { MapPlaceDetails }

export { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM }

export type MapFocus = { lat: number; lng: number; zoom?: number }
export type MapViewportPad = { top: number; bottom: number }

type LatLng = { lat: number; lng: number }

type RentalMapProps = {
  posts: RentalPostSummary[]
  selectedPostId: string | null
  hoveredPostId?: string | null
  onSelectPost: (postId: string) => void
  onClearSelection?: () => void
  /** Google POI / place tap — details shown in-app (not google.com/maps). */
  onSelectPlace?: (place: MapPlaceDetails) => void
  onPlaceLoading?: (loading: boolean) => void
  /** Red pin for the active Google Place (or any non-listing selection). */
  selectedPlacePin?: (LatLng & { title?: string }) | null
  focus?: MapFocus | null
  userLocation?: LatLng | null
  zoomControlSide?: 'LEFT' | 'RIGHT'
  onLocate?: () => void
  locating?: boolean
  locationError?: string
  selectionPad?: MapViewportPad
  focusToken?: number
}

const DEFAULT_PAD: MapViewportPad = { top: 100, bottom: 230 }
const DRAG_CLICK_GUARD_MS = 800

type MarkerEntry = {
  marker: google.maps.marker.AdvancedMarkerElement
  postId: string
  styleKey: string
  el: HTMLDivElement
}

function mappablePosts(posts: RentalPostSummary[]) {
  return posts.filter((p) => isValidCoord(p.latitude, p.longitude))
}

/** Homeji listing pin (green ✓) — distinct from Google POI icons. */
function makeListingPin(
  color: string,
  size: number,
  ring = '#fff',
): HTMLDivElement {
  const el = document.createElement('div')
  el.className = 'homeji-listing-pin'
  el.setAttribute('aria-hidden', 'true')
  el.textContent = '✓'
  el.style.cssText = [
    `width:${size}px`,
    `height:${size}px`,
    'border-radius:50%',
    `background:${color}`,
    `border:2px solid ${ring}`,
    'box-shadow:0 1px 3px rgba(0,0,0,.35)',
    'display:grid',
    'place-items:center',
    `font-size:${Math.max(10, Math.round(size * 0.55))}px`,
    'font-weight:800',
    'line-height:1',
    'color:#fff',
    'transform:translateZ(0)',
    'pointer-events:auto',
    'user-select:none',
  ].join(';')
  return el
}

/** User location — plain blue dot (not a listing). */
function makeDot(color: string, size: number, ring = '#fff'): HTMLDivElement {
  const el = document.createElement('div')
  el.style.cssText = [
    `width:${size}px`,
    `height:${size}px`,
    'border-radius:50%',
    `background:${color}`,
    `border:2px solid ${ring}`,
    'box-shadow:0 1px 3px rgba(0,0,0,.35)',
    'transform:translateZ(0)',
    'pointer-events:auto',
  ].join(';')
  return el
}

/** Selected place pin — Google Maps style red teardrop. */
function makePlacePin(): HTMLDivElement {
  const wrap = document.createElement('div')
  wrap.className = 'homeji-place-pin'
  wrap.setAttribute('aria-hidden', 'true')
  wrap.style.cssText = [
    'position:relative',
    'width:28px',
    'height:36px',
    'transform:translateZ(0)',
    'pointer-events:none',
    'filter:drop-shadow(0 2px 4px rgba(0,0,0,.4))',
  ].join(';')

  const pin = document.createElement('div')
  pin.style.cssText = [
    'position:absolute',
    'left:50%',
    'top:0',
    'width:22px',
    'height:22px',
    'margin-left:-11px',
    'border-radius:50% 50% 50% 0',
    'background:#ea4335',
    'transform:rotate(-45deg)',
    'border:2px solid #fff',
    'box-sizing:border-box',
  ].join(';')

  const dot = document.createElement('div')
  dot.style.cssText = [
    'position:absolute',
    'left:50%',
    'top:6px',
    'width:8px',
    'height:8px',
    'margin-left:-4px',
    'border-radius:50%',
    'background:#fff',
  ].join(';')

  wrap.append(pin, dot)
  return wrap
}

function styleFor(
  post: RentalPostSummary,
  selected: boolean,
  hot: boolean,
): { color: string; size: number; ring: string; key: string; z: number } {
  const roommate = post.type === RentalPostType.RoommateShare
  // Green ✓ pins = Homeji listings (distinct from Google POI icons).
  const color = selected ? '#00b14f' : roommate ? '#2ECC71' : '#00b14f'
  const size = selected ? 24 : hot ? 22 : 20
  const ring = selected || hot ? '#fff' : '#e8fff2'
  return {
    color,
    size,
    ring,
    key: `${color}|${size}|${ring}`,
    z: selected ? 1000 : hot ? 500 : 1,
  }
}

/**
 * AdvancedMarkerElement required when using Cloud Map ID.
 * Keep content as a plain <div> dot (not PinElement) and do ZERO work on
 * dragend/idle — that settle hitch was the release lag.
 */
function RentalMapComponent({
  posts,
  selectedPostId,
  hoveredPostId = null,
  onSelectPost,
  onClearSelection,
  onSelectPlace,
  onPlaceLoading,
  selectedPlacePin = null,
  focus = null,
  userLocation = null,
  onLocate,
  locating = false,
  locationError = '',
  selectionPad = DEFAULT_PAD,
  focusToken = 0,
}: RentalMapProps) {
  const { apiKey, mapId, isLoaded, loadError } = useGoogleMaps()
  const diagnostics = useGoogleMapsDiagnostics(apiKey, loadError, Boolean(loadError))
  const mapColorScheme = useSystemMapColorScheme()

  const hostRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<Map<string, MarkerEntry>>(new Map())
  const userMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null)
  const placePinRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null)
  const libRef = useRef<google.maps.MarkerLibrary | null>(null)
  const fittedKeyRef = useRef('')
  const focusAppliedRef = useRef('')
  const selectAppliedRef = useRef('')
  const userGestureRef = useRef(false)
  const ignoreClickUntilRef = useRef(0)
  const syncMarkersRef = useRef<() => void>(() => {})

  const onSelectPostRef = useRef(onSelectPost)
  const onClearSelectionRef = useRef(onClearSelection)
  const onSelectPlaceRef = useRef(onSelectPlace)
  const onPlaceLoadingRef = useRef(onPlaceLoading)
  onSelectPostRef.current = onSelectPost
  onClearSelectionRef.current = onClearSelection
  onSelectPlaceRef.current = onSelectPlace
  onPlaceLoadingRef.current = onPlaceLoading
  const placeFetchSeqRef = useRef(0)

  const [mapReady, setMapReady] = useState(false)

  const pins = useMemo(() => mappablePosts(posts), [posts])
  const selectedPost = useMemo(
    () => pins.find((p) => p.id === selectedPostId) ?? null,
    [pins, selectedPostId],
  )

  const syncMarkers = useCallback(() => {
    const map = mapRef.current
    const lib = libRef.current
    if (!map || !lib) return

    const { AdvancedMarkerElement } = lib
    const nextIds = new Set(pins.map((p) => p.id))

    markersRef.current.forEach((entry, id) => {
      if (nextIds.has(id)) return
      entry.marker.map = null
      markersRef.current.delete(id)
    })

    for (const post of pins) {
      const selected = post.id === selectedPostId
      const hot = !selected && post.id === hoveredPostId
      const s = styleFor(post, selected, Boolean(hot))
      const pos = { lat: post.latitude, lng: post.longitude }

      let entry = markersRef.current.get(post.id)
      if (!entry) {
        const el = makeListingPin(s.color, s.size, s.ring)
        const marker = new AdvancedMarkerElement({
          map,
          position: pos,
          content: el,
          title: post.title || 'Tin đăng Homeji',
          zIndex: s.z,
          gmpClickable: true,
        })
        marker.addListener('gmp-click', () => {
          if (performance.now() < ignoreClickUntilRef.current) return
          onSelectPostRef.current(post.id)
        })
        markersRef.current.set(post.id, {
          marker,
          postId: post.id,
          styleKey: s.key,
          el,
        })
      } else {
        const cur = entry.marker.position as google.maps.LatLngLiteral | null
        if (
          !cur ||
          Math.abs(Number(cur.lat) - pos.lat) > 1e-7 ||
          Math.abs(Number(cur.lng) - pos.lng) > 1e-7
        ) {
          entry.marker.position = pos
        }
        if (entry.styleKey !== s.key) {
          entry.el.style.width = `${s.size}px`
          entry.el.style.height = `${s.size}px`
          entry.el.style.background = s.color
          entry.el.style.borderColor = s.ring
          entry.styleKey = s.key
        }
        entry.marker.zIndex = s.z
        if (entry.marker.map !== map) entry.marker.map = map
      }
    }

    ;(window as Window & { __HOMEJI_MARKER_COUNT?: number }).__HOMEJI_MARKER_COUNT =
      markersRef.current.size
  }, [pins, selectedPostId, hoveredPostId])

  syncMarkersRef.current = syncMarkers

  useEffect(() => {
    if (!isLoaded || !apiKey) return
    const host = hostRef.current
    if (!host || mapRef.current) return

    let cancelled = false
    const listeners: google.maps.MapsEventListener[] = []
    let mapDiv: HTMLDivElement | null = null
    const colorScheme = resolveMapsColorScheme(mapColorScheme)

    void (async () => {
      // Vector/WebGL requires a laid-out container (0×0 → Raster fallback).
      await waitForMapHostSize(host)
      if (cancelled || mapRef.current) return

      mapDiv = document.createElement('div')
      mapDiv.className = 'rental-map__canvas'
      mapDiv.style.cssText = 'width:100%;height:100%;position:absolute;inset:0;'
      host.replaceChildren(mapDiv)

      const map = new google.maps.Map(
        mapDiv,
        createMapOptions(mapId, {
          gestureHandling: 'greedy',
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
      ;(window as Window & { __HOMEJI_MAP?: google.maps.Map }).__HOMEJI_MAP = map
      setMapReady(true)

      listeners.push(
        map.addListener('dragstart', () => {
          userGestureRef.current = true
          ignoreClickUntilRef.current = performance.now() + DRAG_CLICK_GUARD_MS
        }),
      )
      listeners.push(
        map.addListener('dragend', () => {
          userGestureRef.current = true
          ignoreClickUntilRef.current = performance.now() + DRAG_CLICK_GUARD_MS
        }),
      )
      listeners.push(
        map.addListener('click', (event: google.maps.MapMouseEvent) => {
          if (performance.now() < ignoreClickUntilRef.current) return

          if (isPlaceIconClick(event) && event.placeId) {
            event.stop()
            const placeId = event.placeId
            const seq = ++placeFetchSeqRef.current
            onClearSelectionRef.current?.()
            onPlaceLoadingRef.current?.(true)
            void fetchMapPlaceDetails(placeId)
              .then((details) => {
                if (seq !== placeFetchSeqRef.current) return
                onPlaceLoadingRef.current?.(false)
                if (details) onSelectPlaceRef.current?.(details)
              })
              .catch(() => {
                if (seq !== placeFetchSeqRef.current) return
                onPlaceLoadingRef.current?.(false)
              })
            return
          }

          onClearSelectionRef.current?.()
        }),
      )

      const lib = await loadMarkerLibrary()
      if (cancelled) return
      libRef.current = lib
      syncMarkersRef.current()
    })()

    return () => {
      cancelled = true
      listeners.forEach((l) => google.maps.event.removeListener(l))
      markersRef.current.forEach((e) => {
        e.marker.map = null
      })
      markersRef.current.clear()
      if (userMarkerRef.current) {
        userMarkerRef.current.map = null
        userMarkerRef.current = null
      }
      if (placePinRef.current) {
        placePinRef.current.map = null
        placePinRef.current = null
      }
      const w = window as Window & { __HOMEJI_MAP?: google.maps.Map }
      if (w.__HOMEJI_MAP === mapRef.current) delete w.__HOMEJI_MAP
      if (mapRef.current) {
        google.maps.event.clearInstanceListeners(mapRef.current)
        mapRef.current = null
      }
      libRef.current = null
      fittedKeyRef.current = ''
      focusAppliedRef.current = ''
      selectAppliedRef.current = ''
      if (mapDiv) {
        mapDiv.replaceChildren()
        mapDiv.remove()
      }
      host.replaceChildren()
      setMapReady(false)
    }
    // Remount when OS/UI light↔dark changes — colorScheme is init-only.
  }, [isLoaded, apiKey, mapId, mapColorScheme])

  useEffect(() => {
    if (!mapReady) return
    const map = mapRef.current
    if (!map) return
    let lastW = window.innerWidth
    let lastH = window.innerHeight
    let timer = 0
    const maybeResize = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      if (Math.abs(w - lastW) < 2 && Math.abs(h - lastH) < 120) return
      lastW = w
      lastH = h
      window.clearTimeout(timer)
      timer = window.setTimeout(() => google.maps.event.trigger(map, 'resize'), 180)
    }
    window.addEventListener('orientationchange', maybeResize)
    window.addEventListener('resize', maybeResize)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('orientationchange', maybeResize)
      window.removeEventListener('resize', maybeResize)
    }
  }, [mapReady])

  useEffect(() => {
    if (!mapReady) return
    syncMarkers()
  }, [mapReady, syncMarkers])

  useEffect(() => {
    const map = mapRef.current
    const lib = libRef.current
    if (!map || !mapReady || !lib) return

    if (!userLocation || !isValidCoord(userLocation.lat, userLocation.lng)) {
      if (userMarkerRef.current) {
        userMarkerRef.current.map = null
        userMarkerRef.current = null
      }
      return
    }

    const pos = { lat: userLocation.lat, lng: userLocation.lng }
    if (!userMarkerRef.current) {
      userMarkerRef.current = new lib.AdvancedMarkerElement({
        map,
        position: pos,
        content: makeDot('#1a73e8', 14),
        title: 'Vị trí của bạn',
        zIndex: 2000,
      })
    } else {
      userMarkerRef.current.map = map
      userMarkerRef.current.position = pos
    }
  }, [mapReady, userLocation])

  // Red pin for the place the user tapped on the map.
  useEffect(() => {
    const map = mapRef.current
    const lib = libRef.current
    if (!map || !mapReady || !lib) return

    if (
      !selectedPlacePin ||
      !isValidCoord(selectedPlacePin.lat, selectedPlacePin.lng)
    ) {
      if (placePinRef.current) {
        placePinRef.current.map = null
        placePinRef.current = null
      }
      return
    }

    const pos = { lat: selectedPlacePin.lat, lng: selectedPlacePin.lng }
    if (!placePinRef.current) {
      placePinRef.current = new lib.AdvancedMarkerElement({
        map,
        position: pos,
        content: makePlacePin(),
        title: selectedPlacePin.title || 'Địa điểm đã chọn',
        zIndex: 2500,
      })
    } else {
      placePinRef.current.map = map
      placePinRef.current.position = pos
      placePinRef.current.title = selectedPlacePin.title || 'Địa điểm đã chọn'
    }

    map.panTo(pos)
  }, [mapReady, selectedPlacePin])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady || pins.length === 0) return
    if (userGestureRef.current) return
    const key = pins.map((p) => p.id).join('|')
    if (key === fittedKeyRef.current) return
    fittedKeyRef.current = key
    if (pins.length === 1) {
      map.setCenter({ lat: pins[0].latitude, lng: pins[0].longitude })
      map.setZoom(14)
      return
    }
    const bounds = new google.maps.LatLngBounds()
    for (const p of pins) bounds.extend({ lat: p.latitude, lng: p.longitude })
    map.fitBounds(bounds, {
      top: selectionPad.top,
      bottom: selectionPad.bottom,
      left: 48,
      right: 48,
    })
  }, [mapReady, pins, selectionPad.top, selectionPad.bottom])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady || !focus) return
    const key = `${focus.lat},${focus.lng},${focus.zoom ?? ''}:${focusToken}`
    if (key === focusAppliedRef.current) return
    focusAppliedRef.current = key
    map.panTo({ lat: focus.lat, lng: focus.lng })
    if (focus.zoom != null) map.setZoom(focus.zoom)
  }, [mapReady, focus, focusToken])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady || !selectedPost) return
    const key = `${selectedPost.id}:${focusToken}`
    if (key === selectAppliedRef.current) return
    selectAppliedRef.current = key
    map.panTo({ lat: selectedPost.latitude, lng: selectedPost.longitude })
  }, [mapReady, selectedPost, focusToken])

  const zoomBy = useCallback((delta: number) => {
    const map = mapRef.current
    if (!map) return
    const z = map.getZoom()
    if (z == null) return
    map.setZoom(z + delta)
  }, [])

  if (!apiKey) {
    return (
      <div className="rental-map rental-map--placeholder">
        <p>
          Thêm <code>VITE_GOOGLE_MAPS_API_KEY</code> vào file <code>.env</code>.
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

  return (
    <div className="rental-map">
      <div ref={hostRef} className="rental-map__host" />

      {!mapReady ? (
        <div className="rental-map__loader" aria-hidden>
          <HomejiLoader label="Đang tải bản đồ..." />
        </div>
      ) : null}

      <div className="rental-map__controls" aria-label="Điều khiển bản đồ">
        {onLocate ? (
          <button
            type="button"
            className="rental-map__btn"
            onClick={onLocate}
            disabled={locating}
            title="Vị trí của tôi"
            aria-label="Vị trí của tôi"
          >
            ⌖
          </button>
        ) : null}
        <div className="rental-map__zoom" role="group" aria-label="Thu phóng">
          <button
            type="button"
            className="rental-map__btn rental-map__btn--zoom"
            onClick={() => zoomBy(1)}
            aria-label="Phóng to"
          >
            +
          </button>
          <button
            type="button"
            className="rental-map__btn rental-map__btn--zoom"
            onClick={() => zoomBy(-1)}
            aria-label="Thu nhỏ"
          >
            −
          </button>
        </div>
        {locationError ? (
          <p className="rental-map__error" role="status">
            {locationError}
          </p>
        ) : null}
      </div>

      {mapReady && pins.length === 0 && posts.length > 0 ? (
        <div className="rental-map__hint">Các tin đăng chưa có tọa độ trên bản đồ.</div>
      ) : null}
    </div>
  )
}

function propsEqual(prev: RentalMapProps, next: RentalMapProps) {
  const focusOk =
    prev.focus === next.focus ||
    (prev.focus == null && next.focus == null) ||
    (prev.focus != null &&
      next.focus != null &&
      prev.focus.lat === next.focus.lat &&
      prev.focus.lng === next.focus.lng &&
      prev.focus.zoom === next.focus.zoom)

  const userOk =
    prev.userLocation === next.userLocation ||
    (prev.userLocation == null && next.userLocation == null) ||
    (prev.userLocation != null &&
      next.userLocation != null &&
      prev.userLocation.lat === next.userLocation.lat &&
      prev.userLocation.lng === next.userLocation.lng)

  return (
    prev.posts === next.posts &&
    prev.selectedPostId === next.selectedPostId &&
    prev.hoveredPostId === next.hoveredPostId &&
    prev.onSelectPost === next.onSelectPost &&
    prev.onClearSelection === next.onClearSelection &&
    prev.onSelectPlace === next.onSelectPlace &&
    prev.onPlaceLoading === next.onPlaceLoading &&
    prev.selectedPlacePin?.lat === next.selectedPlacePin?.lat &&
    prev.selectedPlacePin?.lng === next.selectedPlacePin?.lng &&
    prev.selectedPlacePin?.title === next.selectedPlacePin?.title &&
    focusOk &&
    userOk &&
    prev.onLocate === next.onLocate &&
    prev.locating === next.locating &&
    prev.locationError === next.locationError &&
    prev.focusToken === next.focusToken &&
    prev.selectionPad?.top === next.selectionPad?.top &&
    prev.selectionPad?.bottom === next.selectionPad?.bottom
  )
}

export const RentalMap = memo(RentalMapComponent, propsEqual)
