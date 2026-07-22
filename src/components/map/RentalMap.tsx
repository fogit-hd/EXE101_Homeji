import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  MarkerClusterer,
  SuperClusterAlgorithm,
  type Renderer,
} from '@googlemaps/markerclusterer'
import type { RentalPostSummary } from '../../api/types'
import { RentalPostType } from '../../api/types'
import { ContentSkeleton } from '../ContentSkeleton'
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
  loadStreetViewLibrary,
  readAdvancedMarkerLatLng,
  resolveMapsColorScheme,
} from '../../lib/googleMaps'
import { createSpiderfyPositions, shouldSpiderfyCluster } from '../../lib/mapSpiderfy'
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
  createUserLocationDotContent,
  createMapClusterContent,
  createMarketplacePinContent,
  createRentalPinContent,
  type MapClusterKind,
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
import { isInHomejiServiceArea } from '../../lib/homejiServiceArea'
import type { MarketplaceMapPin } from '../../lib/marketplaceSellerPins'
import './RentalMap.css'

export type { MapPlaceDetails }

export { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM }

export type MapFocus = { lat: number; lng: number; zoom?: number }
export type MapViewportPad = { top: number; bottom: number }

export type { MarketplaceMapPin } from '../../lib/marketplaceSellerPins'

type LatLng = { lat: number; lng: number }
type BaseMapMode = 'roadmap' | 'satellite'
type MapDisplayMode = BaseMapMode | 'streetview-select' | 'streetview'

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
  kind: MapClusterKind
}

type SpiderfyState = {
  markers: Array<{
    marker: google.maps.marker.AdvancedMarkerElement
    originalPosition: google.maps.LatLngLiteral
    originalZIndex: number | null
  }>
  lines: google.maps.Polyline[]
}

function mappablePosts(posts: RentalPostSummary[], layers: MapPinLayers) {
  return posts.filter((p) => {
    if (
      !isValidCoord(p.latitude, p.longitude) ||
      !isInHomejiServiceArea(p.latitude, p.longitude)
    ) return false
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
  const markerClustererRef = useRef<MarkerClusterer | null>(null)
  const spiderfyStateRef = useRef<SpiderfyState | null>(null)
  const markerKindsRef = useRef<WeakMap<google.maps.marker.AdvancedMarkerElement, MapClusterKind>>(
    new WeakMap(),
  )
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
  const syncMarketplaceMarkersRef = useRef<() => void>(() => {})
  const cameraRef = useRef<MapCameraScheduler | null>(null)
  const baseMapModeRef = useRef<BaseMapMode>('roadmap')
  const streetViewCoverageRef = useRef<google.maps.StreetViewCoverageLayer | null>(null)
  const streetViewServiceRef = useRef<google.maps.StreetViewService | null>(null)
  const streetViewSelectRef = useRef(false)
  const streetViewBusyRef = useRef(false)
  const streetViewRequestRef = useRef(0)
  const openStreetViewAtRef = useRef<(position: google.maps.LatLng) => void>(() => {})

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
  const [displayMode, setDisplayMode] = useState<MapDisplayMode>('roadmap')
  const [streetViewBusy, setStreetViewBusy] = useState(false)
  const [streetViewError, setStreetViewError] = useState<string | null>(null)

  useEffect(() => {
    if (!streetViewError) return
    const timer = window.setTimeout(() => setStreetViewError(null), 5000)
    return () => window.clearTimeout(timer)
  }, [streetViewError])

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

  const collapseSpiderfiedMarkers = useCallback((renderClusters = true) => {
    const state = spiderfyStateRef.current
    if (!state) return

    state.lines.forEach((line) => line.setMap(null))
    state.markers.forEach(({ marker, originalPosition, originalZIndex }) => {
      marker.position = originalPosition
      marker.zIndex = originalZIndex
    })
    spiderfyStateRef.current = null

    if (renderClusters) markerClustererRef.current?.render()
  }, [])

  const spiderfyMarkers = useCallback((
    markers: google.maps.marker.AdvancedMarkerElement[],
    center: google.maps.LatLngLiteral,
    clusterMarker: google.maps.marker.AdvancedMarkerElement | null,
    map: google.maps.Map,
  ) => {
    collapseSpiderfiedMarkers(false)
    const zoom = map.getZoom() ?? MAP_FOCUS_ZOOM
    const positions = createSpiderfyPositions(center, markers.length, zoom)
    const lines: google.maps.Polyline[] = []
    const expandedMarkers: SpiderfyState['markers'] = []

    if (clusterMarker) clusterMarker.map = null

    markers.forEach((marker, index) => {
      const originalPosition = readAdvancedMarkerLatLng(marker)
      const expandedPosition = positions[index]
      if (!originalPosition || !expandedPosition) return

      expandedMarkers.push({
        marker,
        originalPosition,
        originalZIndex: marker.zIndex ?? null,
      })
      marker.position = expandedPosition
      marker.zIndex = 5000 + index
      marker.map = map
      lines.push(new google.maps.Polyline({
        map,
        path: [center, expandedPosition],
        clickable: false,
        strokeColor: '#7cb342',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        zIndex: 4900,
      }))
    })

    spiderfyStateRef.current = { markers: expandedMarkers, lines }
  }, [collapseSpiderfiedMarkers])

  const refreshClusters = useCallback(() => {
    const clusterer = markerClustererRef.current
    if (!clusterer) return
    collapseSpiderfiedMarkers(false)
    const markers = [
      ...Array.from(markersRef.current.values(), (entry) => entry.marker),
      ...Array.from(marketplaceMarkersRef.current.values(), (entry) => entry.marker),
    ]
    clusterer.clearMarkers(true)
    clusterer.addMarkers(markers, true)
    clusterer.render()
    ;(window as Window & { __HOMEJI_CLUSTERED_MARKER_COUNT?: number })
      .__HOMEJI_CLUSTERED_MARKER_COUNT = markers.length
  }, [collapseSpiderfiedMarkers])

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

      const entry = markersRef.current.get(post.id)
      if (!entry) {
        const content = createRentalPinContent({
          kind: s.kind,
          title: post.title || 'Tin đăng Homeji',
          selected,
          hot: Boolean(hot),
        })
        const marker = new AdvancedMarkerElement({
          position: pos,
          content: content.element,
          title: post.title || 'Tin đăng Homeji',
          zIndex: s.z,
          gmpClickable: true,
        })
        marker.addListener('gmp-click', () => {
          if (performance.now() < ignoreClickUntilRef.current) return
          collapseSpiderfiedMarkers()
          onSelectPostRef.current(post.id)
        })
        markersRef.current.set(post.id, {
          marker,
          postId: post.id,
          styleKey,
          el: content.element,
          dispose: content.dispose,
          kind: s.kind,
        })
        markerKindsRef.current.set(marker, s.kind)
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
      }
    }

    ;(window as Window & { __HOMEJI_MARKER_COUNT?: number }).__HOMEJI_MARKER_COUNT =
      markersRef.current.size
    refreshClusters()
  }, [pins, selectedPostId, hoveredPostId, refreshClusters, collapseSpiderfiedMarkers])

  useEffect(() => {
    syncMarkersRef.current = syncMarkers
  }, [syncMarkers])

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
      const styleKey = `${selected ? 'sel' : 'idle'}|${item.title}|${item.itemCount}`
      const entry = marketplaceMarkersRef.current.get(item.id)
      if (!entry) {
        const content = createMarketplacePinContent({
          title: item.title || 'Chợ đồ',
          itemCount: item.itemCount,
          selected,
        })
        const marker = new AdvancedMarkerElement({
          position: pos,
          content: content.element,
          title: item.title || 'Chợ đồ',
          zIndex: selected ? 2700 : 900,
          gmpClickable: true,
        })
        const raiseOnHover = () => {
          marker.zIndex = selected ? 2900 : 2800
        }
        const restoreAfterHover = () => {
          marker.zIndex = selected ? 2700 : 900
        }
        content.element.addEventListener('mouseenter', raiseOnHover)
        content.element.addEventListener('mouseleave', restoreAfterHover)
        marker.addListener('gmp-click', () => {
          if (performance.now() < ignoreClickUntilRef.current) return
          collapseSpiderfiedMarkers()
          onSelectMarketplaceRef.current?.(item.id)
        })
        marketplaceMarkersRef.current.set(item.id, {
          marker,
          postId: item.id,
          styleKey,
          el: content.element,
          dispose: () => {
            content.element.removeEventListener('mouseenter', raiseOnHover)
            content.element.removeEventListener('mouseleave', restoreAfterHover)
            content.dispose()
          },
          kind: 'marketplace',
        })
        markerKindsRef.current.set(marker, 'marketplace')
      } else {
        entry.marker.position = pos
        if (entry.styleKey !== styleKey) {
          entry.dispose?.()
          const content = createMarketplacePinContent({
            title: item.title || 'Chợ đồ',
            itemCount: item.itemCount,
            selected,
          })
          const raiseOnHover = () => {
            entry.marker.zIndex = selected ? 2900 : 2800
          }
          const restoreAfterHover = () => {
            entry.marker.zIndex = selected ? 2700 : 900
          }
          content.element.addEventListener('mouseenter', raiseOnHover)
          content.element.addEventListener('mouseleave', restoreAfterHover)
          entry.marker.content = content.element
          entry.el = content.element
          entry.dispose = () => {
            content.element.removeEventListener('mouseenter', raiseOnHover)
            content.element.removeEventListener('mouseleave', restoreAfterHover)
            content.dispose()
          }
          entry.styleKey = styleKey
        }
        entry.marker.zIndex = selected ? 2700 : 900
      }
    }
    refreshClusters()
  }, [visibleMarketplacePins, selectedMarketplaceId, refreshClusters, collapseSpiderfiedMarkers])

  useEffect(() => {
    syncMarketplaceMarkersRef.current = syncMarketplaceMarkers
  }, [syncMarketplaceMarkers])

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
      const panorama = map.getStreetView()
      panorama.setOptions({
        addressControl: false,
        enableCloseButton: false,
        fullscreenControl: false,
        linksControl: false,
        motionTrackingControl: false,
        panControl: false,
        zoomControl: false,
      })
      const camera = createMapCameraScheduler({ debounceMs: 100 })
      camera.attach(map)
      cameraRef.current = camera
      ;(window as Window & { __HOMEJI_MAP?: google.maps.Map }).__HOMEJI_MAP = map
      setMapReady(true)

      listeners.push(
        panorama.addListener('visible_changed', () => {
          setDisplayMode(panorama.getVisible() ? 'streetview' : baseMapModeRef.current)
        }),
      )

      // Click-guard only — never fetch listing data on drag / bounds_changed.
      listeners.push(
        map.addListener('dragstart', () => {
          collapseSpiderfiedMarkers()
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
        map.addListener('zoom_changed', () => {
          collapseSpiderfiedMarkers(false)
        }),
      )
      listeners.push(
        map.addListener('click', (event: google.maps.MapMouseEvent) => {
          collapseSpiderfiedMarkers()
          if (streetViewSelectRef.current) {
            event.stop()
            if (event.latLng) openStreetViewAtRef.current(event.latLng)
            return
          }

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
      const clusterRenderer: Renderer = {
        render: (cluster) => {
          const kindCounts: Record<MapClusterKind, number> = {
            vacant: 0,
            roommate: 0,
            marketplace: 0,
          }
          for (const marker of cluster.markers) {
            const kind = markerKindsRef.current.get(
              marker as google.maps.marker.AdvancedMarkerElement,
            )
            if (kind) kindCounts[kind] += 1
          }
          const content = createMapClusterContent({ count: cluster.count, kindCounts })
          return new lib.AdvancedMarkerElement({
            position: cluster.position,
            content,
            title: `${cluster.count} vị trí gần nhau. Nhấn để xem từng ghim.`,
            zIndex: 3000 + cluster.count,
            gmpClickable: true,
          })
        },
      }
      markerClustererRef.current = new MarkerClusterer({
        map,
        markers: [],
        algorithm: new SuperClusterAlgorithm({
          // Keep clustering active through the deepest useful map zoom. Without
          // this, exact-overlap markers split back into the same screen pixel at
          // zoom 18+ and one AdvancedMarker hides the other before spiderfy can run.
          radius: 96,
          maxZoom: 22,
        }),
        renderer: clusterRenderer,
        onClusterClick: (event, cluster, clusterMap) => {
          // MarkerClusterer may emit different click event shapes depending on marker type/version.
          // Guard all stop/prevent methods to avoid runtime errors.
          const evt = event as {
            stop?: () => void
            stopPropagation?: () => void
            preventDefault?: () => void
            domEvent?: {
              stopPropagation?: () => void
              preventDefault?: () => void
            }
          }
          evt.stop?.()
          evt.stopPropagation?.()
          evt.preventDefault?.()
          evt.domEvent?.stopPropagation?.()
          evt.domEvent?.preventDefault?.()
          const advancedMarkers = cluster.markers
            .map((marker) => marker as google.maps.marker.AdvancedMarkerElement)
            .filter((marker) => readAdvancedMarkerLatLng(marker) != null)
          const positions = advancedMarkers
            .map(readAdvancedMarkerLatLng)
            .filter((position): position is google.maps.LatLngLiteral => position != null)
          const zoom = clusterMap.getZoom() ?? DEFAULT_MAP_ZOOM
          if (shouldSpiderfyCluster(positions, zoom)) {
            spiderfyMarkers(
              advancedMarkers,
              { lat: cluster.position.lat(), lng: cluster.position.lng() },
              (cluster.marker as google.maps.marker.AdvancedMarkerElement | undefined) ?? null,
              clusterMap,
            )
            return
          }
          const bounds = cluster.bounds
          if (bounds) clusterMap.fitBounds(bounds, 72)
        },
      })
      syncMarkersRef.current()
      syncMarketplaceMarkersRef.current()
    })()

    return () => {
      cancelled = true
      collapseSpiderfiedMarkers(false)
      listeners.forEach((l) => google.maps.event.removeListener(l))
      cameraRef.current?.dispose()
      cameraRef.current = null
      markerClustererRef.current?.clearMarkers(true)
      markerClustererRef.current?.setMap(null)
      markerClustererRef.current = null
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
      streetViewRequestRef.current += 1
      streetViewSelectRef.current = false
      streetViewBusyRef.current = false
      streetViewCoverageRef.current?.setMap(null)
      streetViewCoverageRef.current = null
      streetViewServiceRef.current = null
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
      baseMapModeRef.current = 'roadmap'
      if (mapDiv) {
        mapDiv.replaceChildren()
        mapDiv.remove()
      }
      host.replaceChildren()
      setMapReady(false)
      setDisplayMode('roadmap')
      setStreetViewBusy(false)
      setStreetViewError(null)
    }
    // Remount when OS/UI light↔dark changes — colorScheme is init-only.
  }, [
    isLoaded,
    apiKey,
    mapId,
    mapColorScheme,
    collapseSpiderfiedMarkers,
    spiderfyMarkers,
  ])

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

    const content = createUserLocationDotContent({
      title,
      size: 46,
    })
    userPinContentRef.current = content
    userMarkerRef.current = new lib.AdvancedMarkerElement({
      map,
      position: pos,
      content: content.element,
      title,
      zIndex: 2000,
    })
  }, [mapReady, userLocation])

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

  const selectBaseMap = useCallback((mode: BaseMapMode) => {
    const map = mapRef.current
    if (!map) return
    streetViewRequestRef.current += 1
    streetViewSelectRef.current = false
    streetViewBusyRef.current = false
    streetViewCoverageRef.current?.setMap(null)
    map.setOptions({ draggableCursor: null })
    map.getStreetView().setVisible(false)
    map.setMapTypeId(mode)
    baseMapModeRef.current = mode
    setDisplayMode(mode)
    setStreetViewBusy(false)
    setStreetViewError(null)
  }, [])

  const openStreetViewAt = useCallback(async (position: google.maps.LatLng) => {
    const map = mapRef.current
    const service = streetViewServiceRef.current
    if (!map || !service || !streetViewSelectRef.current || streetViewBusyRef.current) return

    const requestId = ++streetViewRequestRef.current
    streetViewBusyRef.current = true
    setStreetViewBusy(true)
    setStreetViewError(null)
    try {
      const response = await service.getPanorama({
        location: position,
        radius: 80,
      })
      if (
        mapRef.current !== map ||
        requestId !== streetViewRequestRef.current ||
        !streetViewSelectRef.current
      ) {
        return
      }

      const panoramaId = response.data.location?.pano
      if (!panoramaId) throw new Error('Street View panorama unavailable')

      streetViewSelectRef.current = false
      streetViewCoverageRef.current?.setMap(null)
      map.setOptions({ draggableCursor: null })
      const panorama = map.getStreetView()
      panorama.setPano(panoramaId)
      panorama.setPov({ heading: 0, pitch: 0 })
      panorama.setVisible(true)
      setDisplayMode('streetview')
    } catch {
      if (mapRef.current === map && requestId === streetViewRequestRef.current) {
        setStreetViewError('Điểm này chưa có ảnh Xem phố. Hãy chọn một tuyến màu xanh khác.')
      }
    } finally {
      if (mapRef.current === map && requestId === streetViewRequestRef.current) {
        streetViewBusyRef.current = false
        setStreetViewBusy(false)
      }
    }
  }, [])

  openStreetViewAtRef.current = (position) => {
    void openStreetViewAt(position)
  }

  const toggleStreetView = useCallback(async () => {
    const map = mapRef.current
    if (!map || streetViewBusyRef.current) return

    const panorama = map.getStreetView()
    if (panorama.getVisible()) {
      panorama.setVisible(false)
      setDisplayMode(baseMapModeRef.current)
      setStreetViewError(null)
      return
    }

    if (streetViewSelectRef.current) {
      streetViewRequestRef.current += 1
      streetViewSelectRef.current = false
      streetViewCoverageRef.current?.setMap(null)
      map.setOptions({ draggableCursor: null })
      setDisplayMode(baseMapModeRef.current)
      setStreetViewError(null)
      return
    }

    const requestId = ++streetViewRequestRef.current
    streetViewBusyRef.current = true
    setStreetViewBusy(true)
    setStreetViewError(null)
    try {
      const { StreetViewCoverageLayer, StreetViewService } = await loadStreetViewLibrary()
      if (mapRef.current !== map || requestId !== streetViewRequestRef.current) return

      streetViewServiceRef.current ??= new StreetViewService()
      streetViewCoverageRef.current ??= new StreetViewCoverageLayer()
      streetViewCoverageRef.current.setMap(map)
      streetViewSelectRef.current = true
      map.setOptions({ draggableCursor: 'crosshair' })
      setDisplayMode('streetview-select')
    } catch {
      if (mapRef.current === map && requestId === streetViewRequestRef.current) {
        setStreetViewError('Không thể tải dữ liệu Xem phố. Vui lòng thử lại.')
      }
    } finally {
      if (mapRef.current === map && requestId === streetViewRequestRef.current) {
        streetViewBusyRef.current = false
        setStreetViewBusy(false)
      }
    }
  }, [])

  if (!apiKey) {
    return (
      <div className="rental-map rental-map--placeholder">
        <p>
          Bản đồ chưa được cấu hình trên hệ thống. Vui lòng thử lại sau hoặc liên hệ bộ phận hỗ trợ.
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
          <ContentSkeleton compact variant="detail" label="Đang tải bản đồ…" />
        </div>
      ) : null}

      {mapReady ? (
        <div className="rental-map__view-switcher-wrap">
          {displayMode === 'streetview-select' ? (
            <div className="rental-map__view-guide" role="status">
              <span aria-hidden />
              Chọn một tuyến đường màu xanh để mở Xem phố
            </div>
          ) : null}
          {streetViewError ? (
            <div className="rental-map__view-error" role="status">
              {streetViewError}
            </div>
          ) : null}
          <div className="rental-map__view-switcher" role="group" aria-label="Chế độ xem bản đồ">
            <button
              type="button"
              className={displayMode === 'roadmap' ? 'is-active' : ''}
              aria-pressed={displayMode === 'roadmap'}
              onClick={() => selectBaseMap('roadmap')}
            >
              Bản đồ
            </button>
            <button
              type="button"
              className={displayMode === 'satellite' ? 'is-active' : ''}
              aria-pressed={displayMode === 'satellite'}
              onClick={() => selectBaseMap('satellite')}
            >
              Vệ tinh
            </button>
            <button
              type="button"
              className={`${displayMode === 'streetview' || displayMode === 'streetview-select' ? 'is-active' : ''}${streetViewBusy ? ' is-loading' : ''}`}
              aria-pressed={
                displayMode === 'streetview' || displayMode === 'streetview-select'
              }
              aria-busy={streetViewBusy}
              disabled={streetViewBusy}
              onClick={() => void toggleStreetView()}
            >
              Xem phố
            </button>
          </div>
        </div>
      ) : null}

      {displayMode !== 'streetview' ? (
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
      ) : null}

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
