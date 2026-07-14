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
  MAP_FIT_MAX_ZOOM,
  MAP_FOCUS_ZOOM,
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
import {
  createMapCameraScheduler,
  type MapCameraScheduler,
} from '../../lib/mapCamera'
import { waitForMapHostSize } from '../../lib/mapWebGL'
import {
  useSystemMapColorScheme,
} from '../../hooks/useSystemMapColorScheme'
import { MapErrorPanel } from './MapErrorPanel'
import {
  createAvatarLocationPinContent,
  createMarketplacePinContent,
  createRentalPinContent,
  type MapPinContentHandle,
} from './mapLocationPins'
import {
  createSharedLocationPinContent,
  type LocationLottieContentHandle,
} from './locationLottieContent'
import { computeDrivingRoute } from '../../lib/mapRoutes'
import {
  DEFAULT_MAP_PIN_LAYERS,
  type MapPinLayers,
} from '../../lib/mapPinLayers'
import './RentalMap.css'

export type { MapPlaceDetails }

export { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM }

export type MapFocus = { lat: number; lng: number; zoom?: number }
export type MapViewportPad = { top: number; bottom: number }

export type MarketplaceMapPin = {
  id: string
  title: string
  lat: number
  lng: number
  price?: number
}

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
  /** Google Maps–style red pin while a place is selected (cleared when panel closes). */
  selectedPlacePin?: (LatLng & { title?: string }) | null
  /**
   * Chat / external "open on map" highlight — separate from selectedPlacePin
   * so opening a shared location does not move the place pin.
   */
  sharedLocationPin?: (LatLng & { title?: string; kindLabel?: string; token?: number }) | null
  /** Chợ đồ pins (address / lat-lng from marketplace API). */
  marketplacePins?: MarketplaceMapPin[]
  selectedMarketplaceId?: string | null
  onSelectMarketplace?: (id: string) => void
  /** Which pin layers are visible (default: all on). */
  pinLayers?: MapPinLayers
  focus?: MapFocus | null
  userLocation?: LatLng | null
  /** Account avatar for “vị trí của tôi” pin. */
  userAvatarUrl?: string | null
  userAvatarInitials?: string
  zoomControlSide?: 'LEFT' | 'RIGHT'
  onLocate?: () => void
  locating?: boolean
  selectionPad?: MapViewportPad
  focusToken?: number
  /** After filter search — force-fit camera to all matching rental pins. */
  listingsFitToken?: number
  /** In-map driving directions (Routes API) — drawn as polylines on this map. */
  navigationRequest?: {
    origin: LatLng
    destination: LatLng
    token: number
    trafficAware?: boolean
    mode?: 'preview' | 'navigate'
  } | null
  onNavigationResult?: (
    summary: {
      distanceMeters: number
      durationMillis: number
      distanceText: string
      durationText: string
      steps: import('../../lib/mapRoutes').MapRouteStep[]
      trafficAware: boolean
      mode: 'preview' | 'navigate'
    } | null,
    error?: string | null,
  ) => void
}

const DEFAULT_PAD: MapViewportPad = { top: 100, bottom: 230 }
const DRAG_CLICK_GUARD_MS = 800

type MarkerEntry = {
  marker: google.maps.marker.AdvancedMarkerElement
  postId: string
  styleKey: string
  el: HTMLDivElement
  dispose?: () => void
}

function mappablePosts(posts: RentalPostSummary[], layers: MapPinLayers) {
  return posts.filter((p) => {
    if (!isValidCoord(p.latitude, p.longitude)) return false
    const roommate = p.type === RentalPostType.RoommateShare
    return roommate ? layers.roommate : layers.vacant
  })
}

function styleFor(
  post: RentalPostSummary,
  selected: boolean,
  hot: boolean,
): { kind: 'vacant' | 'roommate'; key: string; z: number } {
  const roommate = post.type === RentalPostType.RoommateShare
  const kind = roommate ? 'roommate' : 'vacant'
  return {
    kind,
    key: `${kind}|${selected ? 'sel' : hot ? 'hot' : 'idle'}`,
    // Same base z for vacant & roommate — neither layer should feel prioritized.
    z: selected ? 1000 : hot ? 500 : 40,
  }
}

/**
 * AdvancedMarkerElement required when using Cloud Map ID.
 * Camera moves are coalesced + animated (pan/fitBounds). Map listeners stay on
 * dragstart/dragend (click guard) + click only — never bounds_changed.
 * Location selection uses Location Lottie via AdvancedMarker content.
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
  sharedLocationPin = null,
  marketplacePins = [],
  selectedMarketplaceId = null,
  onSelectMarketplace,
  pinLayers = DEFAULT_MAP_PIN_LAYERS,
  focus = null,
  userLocation = null,
  userAvatarUrl = null,
  userAvatarInitials = '?',
  onLocate,
  locating = false,
  selectionPad = DEFAULT_PAD,
  focusToken = 0,
  listingsFitToken = 0,
  navigationRequest = null,
  onNavigationResult,
}: RentalMapProps) {
  const { apiKey, mapId, isLoaded, loadError } = useGoogleMaps()
  const diagnostics = useGoogleMapsDiagnostics(apiKey, loadError, Boolean(loadError))
  const mapColorScheme = useSystemMapColorScheme()

  const hostRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<Map<string, MarkerEntry>>(new Map())
  const marketplaceMarkersRef = useRef<Map<string, MarkerEntry>>(new Map())
  const userMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null)
  const placePinRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null)
  const sharedPinRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null)
  const sharedPinContentRef = useRef<LocationLottieContentHandle | null>(null)
  const userPinContentRef = useRef<MapPinContentHandle | null>(null)
  const routePolylinesRef = useRef<google.maps.Polyline[]>([])
  const routeMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([])
  const onNavigationResultRef = useRef(onNavigationResult)
  onNavigationResultRef.current = onNavigationResult
  const libRef = useRef<google.maps.MarkerLibrary | null>(null)
  const onSelectMarketplaceRef = useRef(onSelectMarketplace)
  onSelectMarketplaceRef.current = onSelectMarketplace
  const fittedKeyRef = useRef('')
  const focusAppliedRef = useRef('')
  const selectAppliedRef = useRef('')
  const userGestureRef = useRef(false)
  /** First overview fit only — pin-layer chips must not re-zoom the map. */
  const overviewFitDoneRef = useRef(false)
  const ignoreClickUntilRef = useRef(0)
  const syncMarkersRef = useRef<() => void>(() => {})
  const cameraRef = useRef<MapCameraScheduler | null>(null)

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

  const pins = useMemo(() => mappablePosts(posts, pinLayers), [posts, pinLayers])
  const visibleMarketplacePins = useMemo(
    () => (pinLayers.marketplace ? marketplacePins : []),
    [marketplacePins, pinLayers.marketplace],
  )
  /** All on-map points for overview / filter fits — vacant, roommate, chợ đồ alike. */
  const visibleFitPoints = useMemo(() => {
    const pts: { lat: number; lng: number }[] = []
    for (const p of pins) pts.push({ lat: p.latitude, lng: p.longitude })
    for (const m of visibleMarketplacePins) pts.push({ lat: m.lat, lng: m.lng })
    return pts
  }, [pins, visibleMarketplacePins])
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
      entry.dispose?.()
      markersRef.current.delete(id)
    })

    for (const post of pins) {
      const selected = post.id === selectedPostId
      const hot = !selected && post.id === hoveredPostId
      const s = styleFor(post, selected, Boolean(hot))
      const pos = { lat: post.latitude, lng: post.longitude }
      const styleKey = `${s.key}|${post.title}`

      let entry = markersRef.current.get(post.id)
      if (!entry) {
        const content = createRentalPinContent({
          kind: s.kind,
          title: post.title || 'Tin đăng Homeji',
          selected,
          hot: Boolean(hot),
        })
        const marker = new AdvancedMarkerElement({
          map,
          position: pos,
          content: content.element,
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
          styleKey,
          el: content.element,
          dispose: content.dispose,
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
        if (entry.styleKey !== styleKey) {
          entry.dispose?.()
          const content = createRentalPinContent({
            kind: s.kind,
            title: post.title || 'Tin đăng Homeji',
            selected,
            hot: Boolean(hot),
          })
          entry.marker.content = content.element
          entry.el = content.element
          entry.dispose = content.dispose
          entry.styleKey = styleKey
        }
        entry.marker.zIndex = s.z
        if (entry.marker.map !== map) entry.marker.map = map
      }
    }

    ;(window as Window & { __HOMEJI_MARKER_COUNT?: number }).__HOMEJI_MARKER_COUNT =
      markersRef.current.size
  }, [pins, selectedPostId, hoveredPostId])

  syncMarkersRef.current = syncMarkers

  const syncMarketplaceMarkers = useCallback(() => {
    const map = mapRef.current
    const lib = libRef.current
    if (!map || !lib) return

    const { AdvancedMarkerElement } = lib
    const nextIds = new Set(visibleMarketplacePins.map((p) => p.id))

    marketplaceMarkersRef.current.forEach((entry, id) => {
      if (nextIds.has(id)) return
      entry.marker.map = null
      entry.dispose?.()
      marketplaceMarkersRef.current.delete(id)
    })

    for (const item of visibleMarketplacePins) {
      if (!isValidCoord(item.lat, item.lng)) continue
      const selected = item.id === selectedMarketplaceId
      const pos = { lat: item.lat, lng: item.lng }
      const styleKey = `${selected ? 'sel' : 'idle'}|${item.price ?? ''}|${item.title}`
      let entry = marketplaceMarkersRef.current.get(item.id)
      if (!entry) {
        const content = createMarketplacePinContent({
          title: item.title || 'Chợ đồ',
          price: item.price,
          selected,
        })
        const marker = new AdvancedMarkerElement({
          map,
          position: pos,
          content: content.element,
          title: item.title || 'Chợ đồ',
          zIndex: selected ? 2700 : 900,
          gmpClickable: true,
        })
        marker.addListener('gmp-click', () => {
          if (performance.now() < ignoreClickUntilRef.current) return
          onSelectMarketplaceRef.current?.(item.id)
        })
        marketplaceMarkersRef.current.set(item.id, {
          marker,
          postId: item.id,
          styleKey,
          el: content.element,
          dispose: content.dispose,
        })
      } else {
        entry.marker.position = pos
        if (entry.styleKey !== styleKey) {
          entry.dispose?.()
          const content = createMarketplacePinContent({
            title: item.title || 'Chợ đồ',
            price: item.price,
            selected,
          })
          entry.marker.content = content.element
          entry.el = content.element
          entry.dispose = content.dispose
          entry.styleKey = styleKey
        }
        entry.marker.zIndex = selected ? 2700 : 900
        if (entry.marker.map !== map) entry.marker.map = map
      }
    }
  }, [visibleMarketplacePins, selectedMarketplaceId])

  useEffect(() => {
    if (!mapReady) return
    syncMarketplaceMarkers()
  }, [mapReady, syncMarketplaceMarkers])

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
      const camera = createMapCameraScheduler({ debounceMs: 100 })
      camera.attach(map)
      cameraRef.current = camera
      ;(window as Window & { __HOMEJI_MAP?: google.maps.Map }).__HOMEJI_MAP = map
      setMapReady(true)

      // Click-guard only — never fetch listing data on drag / bounds_changed.
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
          // Always suppress Google's default white POI InfoWindow first.
          // (Early-returning for drag-guard without stop() lets that popup show —
          // and dark-theme text colors make its title nearly invisible.)
          if (isPlaceIconClick(event) && event.placeId) {
            event.stop()
            if (performance.now() < ignoreClickUntilRef.current) return

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

          if (performance.now() < ignoreClickUntilRef.current) return
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
      cameraRef.current?.dispose()
      cameraRef.current = null
      markersRef.current.forEach((e) => {
        e.marker.map = null
        e.dispose?.()
      })
      markersRef.current.clear()
      marketplaceMarkersRef.current.forEach((e) => {
        e.marker.map = null
        e.dispose?.()
      })
      marketplaceMarkersRef.current.clear()
      if (userMarkerRef.current) {
        userMarkerRef.current.map = null
        userMarkerRef.current = null
      }
      if (placePinRef.current) {
        placePinRef.current.map = null
        placePinRef.current = null
      }
      if (sharedPinRef.current) {
        sharedPinRef.current.map = null
        sharedPinRef.current = null
      }
      userPinContentRef.current?.dispose()
      userPinContentRef.current = null
      sharedPinContentRef.current?.dispose()
      sharedPinContentRef.current = null
      for (const line of routePolylinesRef.current) line.setMap(null)
      routePolylinesRef.current = []
      for (const m of routeMarkersRef.current) m.map = null
      routeMarkersRef.current = []
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
      overviewFitDoneRef.current = false
      userGestureRef.current = false
      if (mapDiv) {
        mapDiv.replaceChildren()
        mapDiv.remove()
      }
      host.replaceChildren()
      setMapReady(false)
    }
    // Remount when OS/UI light↔dark changes — colorScheme is init-only.
  }, [isLoaded, apiKey, mapId, mapColorScheme])

  // Debounced host resize only — avoid resize storms during chrome layout anim.
  useEffect(() => {
    if (!mapReady) return
    const map = mapRef.current
    const host = hostRef.current
    if (!map || !host) return

    let timer = 0
    let lastW = host.clientWidth
    let lastH = host.clientHeight

    const scheduleResize = () => {
      const w = host.clientWidth
      const h = host.clientHeight
      if (Math.abs(w - lastW) < 8 && Math.abs(h - lastH) < 8) return
      lastW = w
      lastH = h
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        google.maps.event.trigger(map, 'resize')
      }, 320)
    }

    const ro = new ResizeObserver(scheduleResize)
    ro.observe(host)
    return () => {
      window.clearTimeout(timer)
      ro.disconnect()
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
      userPinContentRef.current?.dispose()
      userPinContentRef.current = null
      return
    }

    const pos = { lat: userLocation.lat, lng: userLocation.lng }
    const title = 'Vị trí của bạn'

    if (userMarkerRef.current) {
      userMarkerRef.current.map = null
      userMarkerRef.current = null
    }
    userPinContentRef.current?.dispose()
    userPinContentRef.current = null

    const content = createAvatarLocationPinContent({
      avatarUrl: userAvatarUrl,
      initials: userAvatarInitials,
      title,
      size: 44,
    })
    userPinContentRef.current = content
    userMarkerRef.current = new lib.AdvancedMarkerElement({
      map,
      position: pos,
      content: content.element,
      title,
      zIndex: 2000,
    })
  }, [mapReady, userLocation, userAvatarUrl, userAvatarInitials])

  // Selected place — Google Maps–style red pin only while detail is open.
  // REQUIRED_AND_HIDES_OPTIONAL hides overlapping basemap POI icons/labels
  // (the purple pin behind), matching native Maps selection behavior.
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
    const title = selectedPlacePin.title || 'Địa điểm đã chọn'
    const collision =
      google.maps.CollisionBehavior?.REQUIRED_AND_HIDES_OPTIONAL ??
      'REQUIRED_AND_HIDES_OPTIONAL'

    if (!placePinRef.current) {
      const pin = new lib.PinElement({
        background: '#EA4335',
        borderColor: '#C5221F',
        glyphColor: '#FFFFFF',
        scale: 1.35,
      })
      placePinRef.current = new lib.AdvancedMarkerElement({
        map,
        position: pos,
        content: pin,
        title,
        zIndex: 2600,
        collisionBehavior: collision,
      })
    } else {
      placePinRef.current.map = map
      placePinRef.current.position = pos
      placePinRef.current.title = title
      placePinRef.current.collisionBehavior = collision
    }
  }, [mapReady, selectedPlacePin])

  // Chat shared location — Lottie pin + badge (distinct from my-location / place).
  useEffect(() => {
    const map = mapRef.current
    const lib = libRef.current
    if (!map || !mapReady || !lib) return

    if (
      !sharedLocationPin ||
      !isValidCoord(sharedLocationPin.lat, sharedLocationPin.lng)
    ) {
      if (sharedPinRef.current) {
        sharedPinRef.current.map = null
        sharedPinRef.current = null
      }
      sharedPinContentRef.current?.dispose()
      sharedPinContentRef.current = null
      return
    }

    const pos = { lat: sharedLocationPin.lat, lng: sharedLocationPin.lng }
    const title = sharedLocationPin.title?.trim() || 'Vị trí từ tin nhắn'
    const kindLabel = sharedLocationPin.kindLabel?.trim() || 'Từ tin nhắn'

    if (sharedPinRef.current) {
      sharedPinRef.current.map = null
      sharedPinRef.current = null
    }
    sharedPinContentRef.current?.dispose()
    sharedPinContentRef.current = null

    const content = createSharedLocationPinContent({ title, kindLabel, size: 72 })
    sharedPinContentRef.current = content
    sharedPinRef.current = new lib.AdvancedMarkerElement({
      map,
      position: pos,
      content: content.element,
      title,
      zIndex: 2800,
    })
  }, [mapReady, sharedLocationPin])

  const clearRouteOverlay = useCallback(() => {
    for (const line of routePolylinesRef.current) line.setMap(null)
    routePolylinesRef.current = []
    for (const m of routeMarkersRef.current) m.map = null
    routeMarkersRef.current = []
  }, [])

  // In-map directions (Routes API) — independent of place Lottie / chat shared pin.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    if (!navigationRequest) {
      clearRouteOverlay()
      return
    }

    let cancelled = false
    clearRouteOverlay()
    onNavigationResultRef.current?.(null, null)

    void computeDrivingRoute(
      navigationRequest.origin,
      navigationRequest.destination,
      {
        trafficAware: navigationRequest.trafficAware !== false,
        mode: navigationRequest.mode ?? (navigationRequest.trafficAware ? 'navigate' : 'preview'),
      },
    )
      .then(async (result) => {
        if (cancelled || !mapRef.current) return
        const strokeColor = result.mode === 'navigate' ? '#0B57D0' : '#1A73E8'
        const strokeWeight = result.mode === 'navigate' ? 7 : 5
        const lines = result.route.createPolylines({
          polylineOptions: {
            strokeColor,
            strokeOpacity: 0.92,
            strokeWeight,
            zIndex: 4,
          },
        })
        lines.forEach((line) => line.setMap(mapRef.current))
        routePolylinesRef.current = lines

        try {
          const markers = await result.route.createWaypointAdvancedMarkers({
            map: mapRef.current,
            zIndex: 2700,
          })
          if (!cancelled) routeMarkersRef.current = markers
        } catch {
          /* markers optional */
        }

        if (result.viewport) {
          mapRef.current.fitBounds(result.viewport, result.mode === 'navigate' ? 96 : 72)
        } else if (result.path.length > 0) {
          const bounds = new google.maps.LatLngBounds()
          for (const p of result.path) bounds.extend(p)
          mapRef.current.fitBounds(bounds, result.mode === 'navigate' ? 96 : 72)
        }

        onNavigationResultRef.current?.(
          {
            distanceMeters: result.distanceMeters,
            durationMillis: result.durationMillis,
            distanceText: result.distanceText,
            durationText: result.durationText,
            steps: result.steps,
            trafficAware: result.trafficAware,
            mode: result.mode,
          },
          null,
        )
      })
      .catch((err: unknown) => {
        if (cancelled) return
        clearRouteOverlay()
        const message =
          err instanceof Error ? err.message : 'Không thể tính đường đi'
        onNavigationResultRef.current?.(null, message)
      })

    return () => {
      cancelled = true
    }
  }, [mapReady, navigationRequest, clearRouteOverlay])

  /**
   * Single coalesced camera controller.
   * Priority: listingsFit (filter) > focus > place pin > selected listing > initial overview.
   * Pin-layer chips (Phòng trọ / Ở ghép / Chợ đồ) only show/hide markers — no re-zoom.
   * Filter/overview fits use the same maxZoom for every layer mix.
   */
  useEffect(() => {
    if (!mapReady) return
    const camera = cameraRef.current
    if (!camera) return

    const fitPad = {
      top: selectionPad.top,
      bottom: selectionPad.bottom,
      left: 48,
      right: 72,
    }

    const scheduleLayerFit = (
      key: string,
      points: { lat: number; lng: number }[],
    ) => {
      if (points.length === 0) return
      if (points.length === 1) {
        camera.schedule(key, {
          center: points[0],
          zoom: MAP_FIT_MAX_ZOOM,
          maxZoom: MAP_FIT_MAX_ZOOM,
        })
        return
      }
      const bounds = new google.maps.LatLngBounds()
      for (const p of points) bounds.extend(p)
      const mid = bounds.getCenter()
      camera.schedule(key, {
        center: { lat: mid.lat(), lng: mid.lng() },
        bounds,
        padding: fitPad,
        maxZoom: MAP_FIT_MAX_ZOOM,
      })
    }

    if (listingsFitToken > 0 && visibleFitPoints.length > 0) {
      const key = `listings-fit:${listingsFitToken}`
      if (key !== fittedKeyRef.current) {
        fittedKeyRef.current = key
        userGestureRef.current = false
        selectAppliedRef.current = ''
        focusAppliedRef.current = ''
        overviewFitDoneRef.current = true
        scheduleLayerFit(key, visibleFitPoints)
        return
      }
    }

    if (focus) {
      const key = `focus:${focus.lat},${focus.lng},${focus.zoom ?? ''}:${focusToken}`
      if (key === focusAppliedRef.current) return
      focusAppliedRef.current = key
      camera.schedule(key, {
        center: { lat: focus.lat, lng: focus.lng },
        zoom: focus.zoom ?? MAP_FOCUS_ZOOM,
      })
      return
    }

    // Keep route fitBounds — don't yank camera back to place pin.
    if (navigationRequest) return

    if (
      selectedPlacePin &&
      isValidCoord(selectedPlacePin.lat, selectedPlacePin.lng)
    ) {
      const key = `place:${selectedPlacePin.lat.toFixed(6)},${selectedPlacePin.lng.toFixed(6)}`
      if (key === selectAppliedRef.current) return
      selectAppliedRef.current = key
      camera.schedule(key, {
        center: {
          lat: selectedPlacePin.lat,
          lng: selectedPlacePin.lng,
        },
        zoom: MAP_FOCUS_ZOOM,
      })
      return
    }

    if (selectedPost) {
      const key = `post:${selectedPost.id}:${focusToken}`
      if (key === selectAppliedRef.current) return
      selectAppliedRef.current = key
      camera.schedule(key, {
        center: {
          lat: selectedPost.latitude,
          lng: selectedPost.longitude,
        },
        zoom: MAP_FOCUS_ZOOM,
      })
      return
    }

    // One overview fit on first pins — toggling layer chips must not re-fit.
    if (userGestureRef.current || overviewFitDoneRef.current) return
    if (visibleFitPoints.length === 0) return
    overviewFitDoneRef.current = true
    fittedKeyRef.current = `overview:${visibleFitPoints.length}`
    scheduleLayerFit(`overview:${fittedKeyRef.current}`, visibleFitPoints)
  }, [
    mapReady,
    listingsFitToken,
    focus,
    focusToken,
    navigationRequest,
    selectedPlacePin,
    selectedPost,
    visibleFitPoints,
    selectionPad.top,
    selectionPad.bottom,
  ])

  const zoomBy = useCallback((delta: number) => {
    const map = mapRef.current
    if (!map) return
    const z = map.getZoom()
    if (z == null) return
    const next = Math.min(21, Math.max(3, z + delta))
    // Single-step zoom is fine; pan elsewhere uses smooth camera.
    map.setZoom(next)
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
    prev.sharedLocationPin?.lat === next.sharedLocationPin?.lat &&
    prev.sharedLocationPin?.lng === next.sharedLocationPin?.lng &&
    prev.sharedLocationPin?.title === next.sharedLocationPin?.title &&
    prev.sharedLocationPin?.kindLabel === next.sharedLocationPin?.kindLabel &&
    prev.sharedLocationPin?.token === next.sharedLocationPin?.token &&
    prev.marketplacePins === next.marketplacePins &&
    prev.selectedMarketplaceId === next.selectedMarketplaceId &&
    prev.onSelectMarketplace === next.onSelectMarketplace &&
    prev.pinLayers?.vacant === next.pinLayers?.vacant &&
    prev.pinLayers?.roommate === next.pinLayers?.roommate &&
    prev.pinLayers?.marketplace === next.pinLayers?.marketplace &&
    focusOk &&
    userOk &&
    prev.userAvatarUrl === next.userAvatarUrl &&
    prev.userAvatarInitials === next.userAvatarInitials &&
    prev.onLocate === next.onLocate &&
    prev.locating === next.locating &&
    prev.focusToken === next.focusToken &&
    prev.listingsFitToken === next.listingsFitToken &&
    prev.navigationRequest?.token === next.navigationRequest?.token &&
    prev.navigationRequest?.origin.lat === next.navigationRequest?.origin.lat &&
    prev.navigationRequest?.origin.lng === next.navigationRequest?.origin.lng &&
    prev.navigationRequest?.destination.lat ===
      next.navigationRequest?.destination.lat &&
    prev.navigationRequest?.destination.lng ===
      next.navigationRequest?.destination.lng &&
    prev.navigationRequest?.trafficAware === next.navigationRequest?.trafficAware &&
    prev.navigationRequest?.mode === next.navigationRequest?.mode &&
    prev.onNavigationResult === next.onNavigationResult &&
    prev.selectionPad?.top === next.selectionPad?.top &&
    prev.selectionPad?.bottom === next.selectionPad?.bottom
  )
}

export const RentalMap = memo(RentalMapComponent, propsEqual)
