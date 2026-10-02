import { cloneElement, isValidElement, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  getNotifications,
  getRentalPost,
  getSavedPosts,
  savePost,
  searchMarketplacePosts,
  unsavePost,
  type MarketplacePost,
  type RentalPost,
  type RentalPostSummary,
} from '../../api'
import type { MapPlaceDetails } from '../../lib/mapPlace'
import { buildSyntheticMapPlace, fetchMapPlaceDetails } from '../../lib/mapPlace'
import { DEFAULT_MAP_CENTER, MAP_FOCUS_ZOOM, isValidCoord } from '../../lib/googleMaps'
import type { MapPinLayers } from '../../lib/mapPinLayers'
import { useAuth } from '../../contexts/AuthContext'
import {
  DeferredMapBlock,
  type ExploreView,
} from '../chrome'
import { HomeListingSkeleton } from '../HomeListingSkeleton'
import { PageNotice } from '../toast/PageNotice'
import { MapListingCard } from '../MapListingCard'
import { MapAppPanel, isWideMapSection, type MapAppSection } from './MapAppPanel'
import { MapChatbot } from './MapChatbot'
import { HomeMapStage, type HomeMapFocus } from './HomeMapStage'
import { MapEdgeToggle } from './MapEdgeToggle'
import { MapPlaceDetailPanel } from './MapPlaceDetailPanel'
import { MapToast } from './MapToast'
import type { MarketplaceMapPin } from './RentalMap'
import { marketplacePostsToSellerPins } from '../../lib/marketplaceSellerPins'
import { useNotificationHub } from '../../hooks/useNotificationHub'
import { NotificationType, type Notification } from '../../api'
import type { NotificationReadChange } from '../../pages/NotificationsPage'
import { MapListingsWorkspace } from './listings/MapListingsWorkspace'
import { RoomDetailModal } from './listings/RoomDetailModal'
import {
  marketplacePostsToListingPins,
  parseFiltersFromURL,
  serializeFiltersToQuery,
} from './listings/listingAdapters'
import './MapPlaceDetailPanel.css'

const MOBILE_SHEET_MEDIA = '(max-width: 900px)'

function isMobileSheetViewport(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(MOBILE_SHEET_MEDIA).matches
}

type AuthenticatedHomeMapShellProps = {
  posts: RentalPostSummary[]
  marketPosts?: MarketplacePost[]
  selectedPostId: string | null
  selectedPost: RentalPostSummary | null
  onSelectPost: (postId: string) => void
  onClearSelection: () => void
  focus: HomeMapFocus | null
  focusToken: number
  /** Bumped after filter search — map auto-fits / pins matching listings. */
  listingsFitToken?: number
  /** Omnibox address search — fly map + open place detail (not listings panel). */
  placeFocus?: {
    placeId?: string
    lat: number
    lng: number
    name: string
    address: string
  } | null
  placeFocusToken?: number
  userLocation: { lat: number; lng: number } | null
  onLocate: () => void
  locating: boolean
  locationError: string
  onClearLocationError?: () => void
  panelOpen: boolean
  panelSection: MapAppSection | null
  closePanel: () => void
  openAppSection?: (section: MapAppSection) => void
  loading: boolean
  showPostsLoader: boolean
  error: string
  onResetFilters: () => void
  needsProfileSetup: boolean
  omnibox: React.ReactNode
  pinLayers?: MapPinLayers
  onDetailLabelChange?: (label: string | null) => void
  onAiSearchUpdate?: (update: import('../../api').AiHighlightResponse) => void
  /** Map as a product destination inside AppChrome (not the old app shell). */
  destinationMode?: boolean
  /** Khám phá mode from URL (`view=list` → list-first, no map mount). */
  exploreView?: ExploreView
}

/**
 * Owns map↔list hover state so HomePage does not re-render on card hover.
 * RentalMap stays behind HomeMapStage (memo) + RentalMap (memo).
 */
export const AuthenticatedHomeMapShell = memo(function AuthenticatedHomeMapShell({
  posts,
  marketPosts = [],
  selectedPostId,
  selectedPost,
  onSelectPost,
  onClearSelection,
  focus,
  focusToken,
  listingsFitToken = 0,
  placeFocus = null,
  placeFocusToken = 0,
  userLocation,
  onLocate,
  locating,
  locationError,
  onClearLocationError,
  panelOpen,
  panelSection,
  closePanel,
  openAppSection,
  loading,
  showPostsLoader,
  error,
  onResetFilters,
  needsProfileSetup,
  omnibox,
  pinLayers,
  onDetailLabelChange,
  onAiSearchUpdate,
  destinationMode = false,
  exploreView = 'map',
}: AuthenticatedHomeMapShellProps) {
  const { isAuthenticated } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const listingCatalog = useMemo(() => parseFiltersFromURL(searchParams).catalog, [searchParams])
  const marketMode = listingCatalog === 'market'
  const marketListingPins = useMemo(() => marketplacePostsToListingPins(marketPosts), [marketPosts])
  const isListMode = exploreView === 'list'
  const isMapMode = exploreView === 'map'
  const [hoveredPostId, setHoveredPostId] = useState<string | null>(null)
  const [focusedPostId, setFocusedPostId] = useState<string | null>(selectedPostId)
  const [selectedPlace, setSelectedPlace] = useState<MapPlaceDetails | null>(null)
  const [placeLoading, setPlaceLoading] = useState(false)
  const [listingDetail, setListingDetail] = useState<RentalPost | null>(null)
  const [listingLoading, setListingLoading] = useState(false)
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set())
  const [roomDetailId, setRoomDetailId] = useState<string | null>(null)
  const listingSaved = Boolean(selectedPostId && savedIds.has(selectedPostId))
  const [saveBusy, setSaveBusy] = useState(false)
  const [nearbyFocus, setNearbyFocus] = useState<HomeMapFocus | null>(null)
  const [nearbyToken, setNearbyToken] = useState(0)
  /** Pin for chat "Mở trên bản đồ" — independent of selected place red pin. */
  const [sharedLocationPin, setSharedLocationPin] = useState<{
    lat: number
    lng: number
    title: string
    kindLabel: string
    token: number
    /** Chat window that opened this pin — cleared when that window closes. */
    conversationId?: string
  } | null>(null)
  const [navigationRequest, setNavigationRequest] = useState<{
    origin: { lat: number; lng: number }
    destination: { lat: number; lng: number }
    token: number
    trafficAware?: boolean
    mode?: 'preview' | 'navigate'
  } | null>(null)
  const [routeSummary, setRouteSummary] = useState<{
    distanceText: string
    durationText: string
    steps: import('../../lib/mapRoutes').MapRouteStep[]
    trafficAware: boolean
    mode: 'preview' | 'navigate'
  } | null>(null)
  const [routeError, setRouteError] = useState<string | null>(null)
  const [homieDismiss, setHomieDismiss] = useState(0)
  const [homieOpen, setHomieOpen] = useState(false)
  const [marketplaceCartOpen, setMarketplaceCartOpen] = useState(false)
  const [notificationRefreshKey, setNotificationRefreshKey] = useState(0)
  const [unreadBadge, setUnreadBadge] = useState(0)
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const [marketplacePins, setMarketplacePins] = useState<MarketplaceMapPin[]>([])
  const [selectedMarketplaceId, setSelectedMarketplaceId] = useState<string | null>(null)
  const [uiCollapsed, setUiCollapsed] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const focusedPostIdRef = useRef(focusedPostId)
  focusedPostIdRef.current = focusedPostId
  const hoverLeaveTimerRef = useRef<number | null>(null)
  const listScrollTimerRef = useRef<number | null>(null)
  const placeFocusRef = useRef(placeFocus)
  placeFocusRef.current = placeFocus
  const listingFetchSeq = useRef(0)
  const savedFetchSeq = useRef(0)

  const detailOpen = !!(selectedPostId || selectedPost || selectedPlace || placeLoading)

  /** Map destination always mounts the map; list mode never does. */
  const mapBlockVisible = isMapMode

  useNotificationHub({
    enabled: isAuthenticated,
    onNotification: (n: Notification) => {
      setNotificationRefreshKey((k) => k + 1)
      const isMessage =
        n.type === NotificationType.NewMessage || n.type === NotificationType.DirectMessage
      if (!n.isRead) {
        if (isMessage) setUnreadBadge((c) => c + 1)
        setUnreadNotificationCount((c) => c + 1)
      }
      setToast(n.title || 'Có thông báo mới')
    },
  })

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadBadge(0)
      setUnreadNotificationCount(0)
      return
    }
    let cancelled = false
    void getNotifications(true)
      .then((list) => {
        if (cancelled) return
        let messageUnread = 0
        let otherUnread = 0
        for (const n of list) {
          if (n.isRead) continue
          const isMessage =
            n.type === NotificationType.NewMessage || n.type === NotificationType.DirectMessage
          if (isMessage) messageUnread += 1
          else otherUnread += 1
        }
        setUnreadBadge(messageUnread)
        setUnreadNotificationCount(messageUnread + otherUnread)
      })
      .catch(() => {
        /* keep realtime counter */
      })
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, notificationRefreshKey])

  const dismissHomie = useCallback(() => {
    setHomieDismiss((n) => n + 1)
  }, [])

  const openAppSectionMobileSafe = useCallback(
    (section: MapAppSection) => {
      if (isMobileSheetViewport()) dismissHomie()
      openAppSection?.(section)
    },
    [openAppSection, dismissHomie],
  )

  const handleHomieOpenChange = useCallback(
    (open: boolean) => {
      setHomieOpen(open)
      if (!open || !isMobileSheetViewport()) return
      closePanel()
    },
    [closePanel],
  )

  useEffect(() => {
    if (!isMobileSheetViewport() || !panelOpen) return
    dismissHomie()
  }, [panelOpen, panelSection, dismissHomie])

  const handleNotificationReadStateChange = useCallback((change: NotificationReadChange) => {
    if (change.kind === 'all') {
      setUnreadBadge(0)
      setUnreadNotificationCount(0)
      return
    }
    const n = change.notification
    const isMessage =
      n.type === NotificationType.NewMessage || n.type === NotificationType.DirectMessage
    setUnreadNotificationCount((c) => Math.max(0, c - 1))
    if (isMessage) setUnreadBadge((c) => Math.max(0, c - 1))
  }, [])

  const openMessagesThread = useCallback((conversationId?: string | null) => {
    setUnreadBadge(0)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('section', 'messages')
      next.delete('post')
      next.delete('view')
      if (conversationId) next.set('conversation', conversationId)
      else next.delete('conversation')
      return next
    })
  }, [setSearchParams])

  const handleOpenAppSection = useCallback(
    (section: MapAppSection) => {
      if (section === 'messages') {
        openMessagesThread()
        return
      }
      openAppSectionMobileSafe(section)
    },
    [openAppSectionMobileSafe, openMessagesThread],
  )
  useEffect(() => {
    if (!error) return
    setToast(error)
  }, [error])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 4200)
    return () => window.clearTimeout(t)
  }, [toast])

  useEffect(() => {
    if (!locationError) return
    const t = window.setTimeout(() => onClearLocationError?.(), 4800)
    return () => window.clearTimeout(t)
  }, [locationError, onClearLocationError])

  const selectedPlacePin = useMemo(() => {
    if (selectedPost) return null
    // Chat shared pin owns the map marker — avoid a duplicate red place pin.
    if (sharedLocationPin) return null
    if (!selectedPlace?.location) return null
    return {
      lat: selectedPlace.location.lat,
      lng: selectedPlace.location.lng,
      title: selectedPlace.name,
    }
  }, [selectedPost, selectedPlace, sharedLocationPin])

  const mapFocus = nearbyFocus ?? focus
  const mapFocusToken = nearbyFocus ? nearbyToken : focusToken

  const handleSelectPlace = useCallback((place: MapPlaceDetails) => {
    setSelectedPlace(place)
    setPlaceLoading(false)
    setNearbyFocus(null)
  }, [])

  const handleMarketplacePostsForMap = useCallback((pins: MarketplaceMapPin[]) => {
    setMarketplacePins(pins)
  }, [])

  /** Marketplace pins only when the map is mounted (Khám phá bản đồ). */
  useEffect(() => {
    if (!isMapMode) {
      setMarketplacePins([])
      return
    }
    let cancelled = false
    void searchMarketplacePosts({
      latitude: DEFAULT_MAP_CENTER.lat,
      longitude: DEFAULT_MAP_CENTER.lng,
      radiusKm: 25,
      pageSize: 40,
    })
      .then((list) => {
        if (cancelled) return
        const pins = marketplacePostsToSellerPins(list)
        setMarketplacePins(pins)
      })
      .catch(() => {
        /* keep map usable without marketplace layer */
      })
    return () => {
      cancelled = true
    }
  }, [isMapMode])

  const handleMarketplaceFocusMap = useCallback(
    (loc: { lat: number; lng: number; zoom?: number }) => {
      setNearbyFocus({ lat: loc.lat, lng: loc.lng, zoom: loc.zoom ?? MAP_FOCUS_ZOOM })
      setNearbyToken((t) => t + 1)
    },
    [],
  )

  const handleSelectMarketplace = useCallback(
    (id: string) => {
      setSelectedMarketplaceId(id)
      const pin = marketplacePins.find((p) => p.id === id)
      if (pin) {
        setNearbyFocus({ lat: pin.lat, lng: pin.lng, zoom: MAP_FOCUS_ZOOM })
        setNearbyToken((t) => t + 1)
      }
      openAppSectionMobileSafe('marketplace')
    },
    [marketplacePins, openAppSectionMobileSafe],
  )

  useEffect(() => {
    if (panelSection !== 'marketplace') {
      setSelectedMarketplaceId(null)
    }
  }, [panelSection])

  useEffect(() => {
    if (!listingsFitToken) return
    setSelectedPlace(null)
    setPlaceLoading(false)
    setSelectedMarketplaceId(null)
    setNearbyFocus(null)
    setSharedLocationPin(null)
    setNavigationRequest(null)
    setRouteSummary(null)
    setRouteError(null)
  }, [listingsFitToken])

  // Keep omnibox text in sync with the open detail title.
  useEffect(() => {
    if (!onDetailLabelChange) return
    if (selectedPost) {
      onDetailLabelChange(selectedPost.title || 'Tin đăng Homeji')
      return
    }
    if (selectedPlace) {
      onDetailLabelChange(selectedPlace.name)
      return
    }
    if (!placeLoading && !selectedPostId) {
      onDetailLabelChange(null)
    }
  }, [
    selectedPost,
    selectedPlace,
    placeLoading,
    selectedPostId,
    onDetailLabelChange,
  ])

  useEffect(() => {
    return () => {
      if (hoverLeaveTimerRef.current != null) {
        window.clearTimeout(hoverLeaveTimerRef.current)
      }
      if (listScrollTimerRef.current != null) {
        window.clearTimeout(listScrollTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (selectedPostId) {
      focusedPostIdRef.current = selectedPostId
      setFocusedPostId(selectedPostId)
    }
  }, [selectedPostId])

  useEffect(() => {
    setHoveredPostId(null)
  }, [selectedPostId])

  // Listing selection wins over Google place card.
  useEffect(() => {
    if (selectedPostId) {
      setSelectedPlace(null)
      setPlaceLoading(false)
    } else {
      setListingDetail(null)
      setListingLoading(false)
    }
  }, [selectedPostId])

  // Fetch full listing when a pin/card is selected.
  useEffect(() => {
    if (!selectedPostId || marketMode) {
      setListingDetail(null)
      setListingLoading(false)
      return
    }
    const seq = ++listingFetchSeq.current
    setListingLoading(true)
    void getRentalPost(selectedPostId, { auth: isAuthenticated })
      .then((post) => {
        if (seq !== listingFetchSeq.current) return
        setListingDetail(post)
        setListingLoading(false)
      })
      .catch(() => {
        if (seq !== listingFetchSeq.current) return
        setListingDetail(null)
        setListingLoading(false)
      })

  }, [selectedPostId, isAuthenticated, marketMode])

  useEffect(() => {
    if (!isAuthenticated) {
      setSavedIds(new Set())
      return
    }
    const seq = ++savedFetchSeq.current
    let cancelled = false
    void getSavedPosts()
      .then((saved) => {
        if (cancelled || seq !== savedFetchSeq.current) return
        setSavedIds(new Set(saved.map((item) => item.id)))
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [isAuthenticated])

  const handleClearMapSelection = useCallback(() => {
    focusedPostIdRef.current = null
    setFocusedPostId(null)
    setSelectedPlace(null)
    setPlaceLoading(false)
    setListingDetail(null)
    setListingLoading(false)
    setNearbyFocus(null)
    setSharedLocationPin(null)
    setNavigationRequest(null)
    setRouteSummary(null)
    setRouteError(null)
    setSelectedMarketplaceId(null)
    onClearSelection()
  }, [onClearSelection])

  const handleNavigationResult = useCallback(
    (
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
    ) => {
      if (error) {
        setRouteSummary(null)
        setRouteError(error)
        setToast(error)
        return
      }
      setRouteError(null)
      setRouteSummary(
        summary
          ? {
              distanceText: summary.distanceText,
              durationText: summary.durationText,
              steps: summary.steps,
              trafficAware: summary.trafficAware,
              mode: summary.mode,
            }
          : null,
      )
    },
    [],
  )

  const startInMapDirections = useCallback(
    (destination: { lat: number; lng: number }) => {
      if (!userLocation) {
        setToast('Bật vị trí của bạn để xem đường đi trên bản đồ')
        onLocate()
        return
      }
      setNearbyFocus(null)
      setRouteError(null)
      setRouteSummary(null)
      setNavigationRequest((prev) => ({
        origin: { lat: userLocation.lat, lng: userLocation.lng },
        destination,
        trafficAware: false,
        mode: 'preview',
        token: (prev?.token ?? 0) + 1,
      }))
    },
    [userLocation, onLocate],
  )

  const handleClearNavigation = useCallback(() => {
    setNavigationRequest(null)
    setRouteSummary(null)
    setRouteError(null)
  }, [])

  // Omnibox address search → pin + place detail (left), not the listings empty panel.
  useEffect(() => {
    const next = placeFocusRef.current
    if (!placeFocusToken || !next) return
    onClearSelection()
    setSelectedMarketplaceId(null)
    setListingDetail(null)
    setNearbyFocus(null)

    const synthetic = buildSyntheticMapPlace({
      placeId: next.placeId,
      name: next.name,
      address: next.address,
      lat: next.lat,
      lng: next.lng,
    })

    const placeId = next.placeId?.trim()
    if (!placeId || placeId.startsWith('geo:') || placeId.startsWith('text:')) {
      handleSelectPlace(synthetic)
      return
    }

    let cancelled = false
    setPlaceLoading(true)
    handleSelectPlace(synthetic)
    void fetchMapPlaceDetails(placeId)
      .then((details) => {
        if (cancelled || !details) return
        handleSelectPlace(details)
      })
      .finally(() => {
        if (!cancelled) setPlaceLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [placeFocusToken, handleSelectPlace, onClearSelection])

  const handleSelectPost = useCallback(
    (postId: string) => {
      const openDetail = focusedPostId === postId
      setHoveredPostId(null)
      setSelectedPlace(null)
      setPlaceLoading(false)
      setNearbyFocus(null)
      focusedPostIdRef.current = postId
      setFocusedPostId(postId)

      // Map explore (Figma): one click selects marker + card + preview + URL.
      if (destinationMode && isMapMode) {
        onSelectPost(postId)
        const post = posts.find((p) => p.id === postId) ?? marketPosts.find((p) => p.id === postId)
        if (post && isValidCoord(post.latitude, post.longitude)) {
          setNearbyFocus({
            lat: post.latitude,
            lng: post.longitude,
            zoom: MAP_FOCUS_ZOOM,
          })
          setNearbyToken((t) => t + 1)
        }
        requestAnimationFrame(() => {
          const el = listRef.current?.querySelector(`[data-post-id="${postId}"]`)
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        })
        return
      }

      if (openDetail) {
        onSelectPost(postId)
      } else if (selectedPostId) {
        onClearSelection()
      }
      if (panelSection !== 'listings') return
      const el = listRef.current?.querySelector(`[data-post-id="${postId}"]`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    },
    [
      focusedPostId,
      selectedPostId,
      onSelectPost,
      onClearSelection,
      panelSection,
      destinationMode,
      isMapMode,
      posts,
      marketPosts,
    ],
  )

  useEffect(() => {
    // Scroll-sync focus only while Khám phá list is showing cards.
    if (!destinationMode || !isListMode) return
    if (posts.length === 0) return
    const list = listRef.current
    const scroller =
      list?.closest('.explore-list__rows') ??
      list?.closest('.home-map-dest__list-body') ??
      list?.closest('.map-app-panel__body')
    if (!(scroller instanceof HTMLElement) || !list) return

    const syncFocusedCard = () => {
      if (listScrollTimerRef.current != null) {
        window.clearTimeout(listScrollTimerRef.current)
      }
      listScrollTimerRef.current = window.setTimeout(() => {
        const viewport = scroller.getBoundingClientRect()
        const viewportCenter = viewport.top + viewport.height / 2
        let closestId: string | null = null
        let closestDistance = Number.POSITIVE_INFINITY

        for (const node of list.querySelectorAll<HTMLElement>('[data-post-id]')) {
          const rect = node.getBoundingClientRect()
          if (rect.bottom < viewport.top || rect.top > viewport.bottom) continue
          const distance = Math.abs(rect.top + rect.height / 2 - viewportCenter)
          if (distance < closestDistance) {
            closestDistance = distance
            closestId = node.dataset.postId ?? null
          }
        }

        if (!closestId) return
        if (focusedPostIdRef.current === closestId) return
        if (selectedPostId) onClearSelection()
        focusedPostIdRef.current = closestId
        setFocusedPostId(closestId)
      }, 140)
    }

    scroller.addEventListener('scroll', syncFocusedCard, { passive: true })
    return () => {
      scroller.removeEventListener('scroll', syncFocusedCard)
      if (listScrollTimerRef.current != null) {
        window.clearTimeout(listScrollTimerRef.current)
        listScrollTimerRef.current = null
      }
    }
  }, [destinationMode, isListMode, posts, selectedPostId, onClearSelection])

  const handleNearby = useCallback((loc: { lat: number; lng: number }) => {
    setNearbyFocus({ lat: loc.lat, lng: loc.lng, zoom: MAP_FOCUS_ZOOM })
    setNearbyToken((n) => n + 1)
  }, [])

  const toggleSavedPost = useCallback(
    async (postId: string) => {
      if (!isAuthenticated || saveBusy) return
      savedFetchSeq.current += 1
      const currentlySaved = savedIds.has(postId)
      setSaveBusy(true)
      try {
        if (currentlySaved) await unsavePost(postId)
        else await savePost(postId)
        setSavedIds((prev) => {
          const next = new Set(prev)
          if (currentlySaved) next.delete(postId)
          else next.add(postId)
          return next
        })
      } catch {
        /* keep prior save state */
      } finally {
        setSaveBusy(false)
      }
    },
    [isAuthenticated, saveBusy, savedIds],
  )

  const handleSaveListing = useCallback(async () => {
    if (!selectedPostId) return
    await toggleSavedPost(selectedPostId)
  }, [selectedPostId, toggleSavedPost])

  const openRoomDetail = useCallback((id: string) => {
    setRoomDetailId(id)
  }, [])

  const closeRoomDetail = useCallback(() => {
    setRoomDetailId(null)
  }, [])

  const handleCardHover = useCallback((postId: string) => {
    if (!window.matchMedia('(hover: hover)').matches) return
    if (hoverLeaveTimerRef.current != null) {
      window.clearTimeout(hoverLeaveTimerRef.current)
      hoverLeaveTimerRef.current = null
    }
    setHoveredPostId((prev) => (prev === postId ? prev : postId))
  }, [])

  const handleCardLeave = useCallback(() => {
    if (hoverLeaveTimerRef.current != null) {
      window.clearTimeout(hoverLeaveTimerRef.current)
    }
    hoverLeaveTimerRef.current = window.setTimeout(() => {
      setHoveredPostId((prev) => (prev == null ? prev : null))
      hoverLeaveTimerRef.current = null
    }, 60)
  }, [])

  const displayPosts = posts

  const listingsContent = useMemo(
    () => (
      <div ref={listRef} className="map-app-panel__listings">
        <PageNotice message={error} tone="error" />

        {showPostsLoader ? (
          <HomeListingSkeleton count={4} />
        ) : displayPosts.length === 0 ? (
          <div className="home-list-empty">
            <h2 className="home-list-empty__title">Không tìm thấy phòng phù hợp</h2>
            <p className="home-list-empty__copy">
              Thử đổi khu vực, khoảng giá hoặc bỏ bớt tiện ích.
            </p>
            <button type="button" className="btn btn-primary btn-sm" onClick={onResetFilters}>
              Đặt lại bộ lọc
            </button>
          </div>
        ) : (
          displayPosts.map((post, index) => (
            <div key={post.id} data-post-id={post.id}>
              <MapListingCard
                post={post}
                active={focusedPostId === post.id}
                highlighted={hoveredPostId === post.id}
                staggerIndex={index}
                onHover={() => handleCardHover(post.id)}
                onLeave={handleCardLeave}
                onSelect={() => handleSelectPost(post.id)}
              />
            </div>
          ))
        )}
      </div>
    ),
    [
      error,
      showPostsLoader,
      displayPosts,
      focusedPostId,
      hoveredPostId,
      onResetFilters,
      handleCardHover,
      handleCardLeave,
      handleSelectPost,
    ],
  )

  const omniboxNode =
    omnibox && isValidElement(omnibox)
      ? cloneElement(
          omnibox as React.ReactElement<{
            unreadMessageCount?: number
            unreadNotificationCount?: number
            onOpenSection?: (section: MapAppSection) => void
            activeSection?: MapAppSection | null
            onClosePlaceDetail?: () => void
            placeDetailOpen?: boolean
            uiCollapsed?: boolean
          }>,
          {
            unreadMessageCount: unreadBadge,
            unreadNotificationCount,
            onOpenSection: handleOpenAppSection,
            onClosePlaceDetail: handleClearMapSelection,
            placeDetailOpen: detailOpen && !uiCollapsed,
            uiCollapsed,
            activeSection: panelSection,
          },
        )
      : omnibox

  const handleViewportIdle = useCallback(
    (bounds: {
      minLatitude: number
      maxLatitude: number
      minLongitude: number
      maxLongitude: number
    }) => {
      if (!destinationMode || !isMapMode) return
      const current = parseFiltersFromURL(searchParams)
      if (!current.searchOnMove) return
      const round = (value: number) => Math.round(value * 1e4) / 1e4
      const prev = current.bounds
      if (
        prev &&
        round(prev.minLatitude) === round(bounds.minLatitude) &&
        round(prev.maxLatitude) === round(bounds.maxLatitude) &&
        round(prev.minLongitude) === round(bounds.minLongitude) &&
        round(prev.maxLongitude) === round(bounds.maxLongitude)
      ) {
        return
      }
      const next = serializeFiltersToQuery({ ...current, bounds, page: 1 }, searchParams)
      if (next.toString() !== searchParams.toString()) {
        setSearchParams(next, { replace: true })
      }
    },
    [destinationMode, isMapMode, searchParams, setSearchParams],
  )

  const mapStage = (
    <HomeMapStage
      posts={destinationMode && marketMode ? [] : posts}
      selectedPostId={focusedPostId}
      hoveredPostId={hoveredPostId}
      onSelectPost={handleSelectPost}
      onClearSelection={handleClearMapSelection}
      onSelectPlace={destinationMode && isMapMode ? undefined : handleSelectPlace}
      onPlaceLoading={setPlaceLoading}
      selectedPlacePin={destinationMode && isMapMode ? null : selectedPlacePin}
      sharedLocationPin={sharedLocationPin}
      marketplacePins={
        destinationMode && marketMode
          ? marketListingPins
          : destinationMode && isMapMode
            ? []
            : marketplacePins
      }
      selectedMarketplaceId={destinationMode && marketMode ? focusedPostId : selectedMarketplaceId}
      onSelectMarketplace={destinationMode && marketMode ? handleSelectPost : handleSelectMarketplace}
      pinLayers={
        destinationMode
          ? marketMode
            ? { vacant: false, roommate: false, marketplace: true }
            : { vacant: true, roommate: true, marketplace: false }
          : pinLayers
      }
      focus={mapFocus}
      focusToken={mapFocusToken}
      listingsFitToken={listingsFitToken}
      navigationRequest={navigationRequest}
      onNavigationResult={handleNavigationResult}
      userLocation={userLocation}
      onLocate={onLocate}
      locating={locating}
      markerVariant={destinationMode && isMapMode ? 'price-pill' : 'pin'}
      hideViewSwitcher={destinationMode && isMapMode}
      onViewportIdle={destinationMode && isMapMode ? handleViewportIdle : undefined}
    />
  )

  const placeDetail = (
    <MapPlaceDetailPanel
      open={detailOpen}
      collapsed={uiCollapsed}
      place={selectedPostId ? null : selectedPlace}
      placeLoading={selectedPostId ? false : placeLoading}
      listing={selectedPostId ? listingDetail : null}
      listingSummary={selectedPost ?? listingDetail}
      listingLoading={!!selectedPostId && listingLoading}
      userLocation={userLocation}
      onNearby={handleNearby}
      onDirections={startInMapDirections}
      onClearNavigation={handleClearNavigation}
      routeSummary={routeSummary}
      routeError={routeError}
      onSaveListing={
        selectedPostId && isAuthenticated ? () => void handleSaveListing() : undefined
      }
      listingSaved={listingSaved}
      saveBusy={saveBusy}
      onOpenMessages={(conversationId) => {
        if (conversationId) openMessagesThread(conversationId)
      }}
      onOpenAppointments={() => openAppSectionMobileSafe('appointments')}
    />
  )

  const hideHomieFab = destinationMode && isMapMode

  const chatAndOverlays = (
    <>
      <RoomDetailModal
        listingId={roomDetailId}
        saved={roomDetailId ? savedIds.has(roomDetailId) : false}
        saveBusy={saveBusy}
        onClose={closeRoomDetail}
        onToggleSave={isAuthenticated ? (id) => void toggleSavedPost(id) : undefined}
        onOpenMessages={(conversationId) => {
          if (conversationId) openMessagesThread(conversationId)
        }}
        onOpenAppointments={() => openAppSectionMobileSafe('appointments')}
      />

      {!hideHomieFab ? (
        <MapChatbot
          onSearchUpdate={onAiSearchUpdate}
          onOpenSection={handleOpenAppSection}
          dismissSignal={homieDismiss}
          onOpenChange={handleHomieOpenChange}
          avoidRightContent={panelOpen && panelSection === 'marketplace'}
          hideFab={
            (detailOpen && !uiCollapsed) ||
            marketplaceCartOpen ||
            (isMobileSheetViewport() && (panelOpen || homieOpen))
          }
        />
      ) : null}

      <MapToast
        message={locationError || toast}
        tone={locationError || error ? 'error' : 'info'}
        onDismiss={() => {
          if (locationError) onClearLocationError?.()
          else setToast(null)
        }}
      />
    </>
  )

  const handleMapExploreToggleSave = useCallback(
    async (postId: string) => {
      if (!isAuthenticated || saveBusy) return
      if (selectedPostId !== postId) {
        onSelectPost(postId)
        focusedPostIdRef.current = postId
        setFocusedPostId(postId)
      }
      await toggleSavedPost(postId)
    },
    [isAuthenticated, saveBusy, selectedPostId, onSelectPost, toggleSavedPost],
  )

  if (destinationMode) {
    const listingsSaved = isAuthenticated ? savedIds : undefined
    return (
      <div className={`home-map-page home-map-page--dest${isMapMode ? ' is-map-destination is-explore-map' : ' is-explore-list'}`}>
        <MapListingsWorkspace
          posts={posts}
          marketPosts={marketPosts}
          selectedListingId={focusedPostId}
          hoveredListingId={hoveredPostId}
          loading={showPostsLoader || loading}
          error={error}
          savedIds={listingsSaved}
          saveBusy={saveBusy}
          unreadNotifications={unreadNotificationCount}
          mapNode={
            isMapMode ? (
              <DeferredMapBlock visible={mapBlockVisible} className="map-listings__deferred">
                <div className="home-map-frame">{mapStage}</div>
              </DeferredMapBlock>
            ) : null
          }
          onHoverListing={handleCardHover}
          onLeaveListing={handleCardLeave}
          onSelectListing={handleSelectPost}
          onOpenRoomDetail={openRoomDetail}
          onToggleSave={isAuthenticated ? handleMapExploreToggleSave : undefined}
          onResetFilters={onResetFilters}
        />
        {needsProfileSetup ? (
          <div className="home-map-banner home-map-banner--dest">
            Chào mừng! <Link to="/?section=profile">Hoàn thiện hồ sơ</Link> để được gợi ý phòng tốt hơn.
          </div>
        ) : null}
        {chatAndOverlays}
      </div>
    )
  }

  return (
    <div
      className={`home-map-page${panelOpen ? '' : ' is-sidebar-collapsed'}${
        detailOpen && !uiCollapsed ? ' has-place-detail' : ''
      }${uiCollapsed ? ' is-ui-collapsed' : ''}${detailOpen ? ' has-place-detail-mounted' : ''}${
        panelOpen && panelSection === 'listings' ? ' has-listings-panel' : ''
      }${panelOpen && isWideMapSection(panelSection) ? ' has-wide-panel' : ''}`}
    >
      <section className="home-map-panel">
        <div className="home-map-frame">{mapStage}</div>
        {placeDetail}
        <MapEdgeToggle
          className={`home-map-master-toggle${uiCollapsed ? ' is-collapsed' : ''}${
            detailOpen && !uiCollapsed ? ' is-on-detail' : ''
          }`}
          expanded={!uiCollapsed}
          collapseLabel="Thu gọn khu vực điều khiển bản đồ"
          expandLabel="Mở lại khu vực điều khiển bản đồ"
          onToggle={() => setUiCollapsed((v) => !v)}
        />
        {omniboxNode}
        {needsProfileSetup && (
          <div className="home-map-banner">
            Chào mừng! <Link to="/?section=profile">Hoàn thiện hồ sơ</Link> để được gợi ý phòng tốt hơn.
          </div>
        )}
      </section>

      {chatAndOverlays}

      <MapAppPanel
        section={panelSection ?? 'listings'}
        open={panelOpen && panelSection !== 'messages'}
        onClose={closePanel}
        listingsSubtitle={
          loading ? 'Đang tìm phòng phù hợp…' : `${posts.length} phòng phù hợp`
        }
        listingsContent={listingsContent}
        notificationRefreshKey={notificationRefreshKey}
        onMarketplacePostsForMap={handleMarketplacePostsForMap}
        onMarketplaceFocusMap={handleMarketplaceFocusMap}
        selectedMarketplaceId={selectedMarketplaceId}
        onSelectMarketplaceId={setSelectedMarketplaceId}
        userLocation={userLocation}
        onRequestLocation={onLocate}
        locating={locating}
        onMarketplaceCartOpenChange={setMarketplaceCartOpen}
        onNotificationReadStateChange={handleNotificationReadStateChange}
        onOpenConversation={openMessagesThread}
        onNotificationOpen={(n) => {
          if (
            n.type === NotificationType.NewMessage ||
            n.type === NotificationType.DirectMessage
          ) {
            openMessagesThread(n.relatedEntityId)
            return
          }
          if (
            n.type === NotificationType.ViewingAppointmentRequested ||
            n.type === NotificationType.ViewingAppointmentUpdated
          ) {
            openAppSectionMobileSafe('appointments')
            return
          }
          if (
            n.type === NotificationType.RoommateInvitationReceived ||
            n.type === NotificationType.RoommateInvitationAccepted
          ) {
            openAppSectionMobileSafe('invitations')
            return
          }
          if (n.type === NotificationType.MarketplaceOrderUpdated) {
            openAppSectionMobileSafe('marketplace')
            return
          }
          if (n.type === NotificationType.LandlordVerificationUpdated) {
            openAppSectionMobileSafe('profile')
            return
          }
          openAppSectionMobileSafe('listings')
        }}
      />
    </div>
  )
})
