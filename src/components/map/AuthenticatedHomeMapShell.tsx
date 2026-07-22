import { cloneElement, isValidElement, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getNotifications,
  getRentalPost,
  getSavedPosts,
  savePost,
  searchMarketplacePosts,
  unsavePost,
  type RentalPost,
  type RentalPostSummary,
} from '../../api'
import type { MapPlaceDetails } from '../../lib/mapPlace'
import { buildSyntheticMapPlace, fetchMapPlaceDetails } from '../../lib/mapPlace'
import { chatLocationKindLabel, type ChatLocationKind } from '../../lib/chatLocation'
import { DEFAULT_MAP_CENTER, MAP_FOCUS_ZOOM } from '../../lib/googleMaps'
import type { MapPinLayers } from '../../lib/mapPinLayers'
import { useAuth } from '../../contexts/AuthContext'
import { HomeListingSkeleton } from '../HomeListingSkeleton'
import { MapListingCard } from '../MapListingCard'
import { MapAppPanel, isWideMapSection, type MapAppSection } from './MapAppPanel'
import { MapChatDock } from './MapChatDock'
import { MapChatbot } from './MapChatbot'
import { HomeMapStage, type HomeMapFocus } from './HomeMapStage'
import { MapPlaceDetailPanel } from './MapPlaceDetailPanel'
import { MapToast } from './MapToast'
import type { MarketplaceMapPin } from './RentalMap'
import { marketplacePostsToSellerPins } from '../../lib/marketplaceSellerPins'
import { useNotificationHub } from '../../hooks/useNotificationHub'
import { NotificationType, type Notification } from '../../api'
import type { NotificationReadChange } from '../../pages/NotificationsPage'
import './MapPlaceDetailPanel.css'

const MOBILE_SHEET_MEDIA = '(max-width: 900px)'

function isMobileSheetViewport(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(MOBILE_SHEET_MEDIA).matches
}

type AuthenticatedHomeMapShellProps = {
  posts: RentalPostSummary[]
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
}

/**
 * Owns map↔list hover state so HomePage does not re-render on card hover.
 * RentalMap stays behind HomeMapStage (memo) + RentalMap (memo).
 */
export const AuthenticatedHomeMapShell = memo(function AuthenticatedHomeMapShell({
  posts,
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
}: AuthenticatedHomeMapShellProps) {
  const { isAuthenticated } = useAuth()
  const [hoveredPostId, setHoveredPostId] = useState<string | null>(null)
  const [focusedPostId, setFocusedPostId] = useState<string | null>(selectedPostId)
  const [selectedPlace, setSelectedPlace] = useState<MapPlaceDetails | null>(null)
  const [placeLoading, setPlaceLoading] = useState(false)
  const [listingDetail, setListingDetail] = useState<RentalPost | null>(null)
  const [listingLoading, setListingLoading] = useState(false)
  const [listingSaved, setListingSaved] = useState(false)
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
  const [chatInboxOpen, setChatInboxOpen] = useState(false)
  const [openChatIds, setOpenChatIds] = useState<string[]>([])
  const [homieDismiss, setHomieDismiss] = useState(0)
  const [homieOpen, setHomieOpen] = useState(false)
  const [marketplaceCartOpen, setMarketplaceCartOpen] = useState(false)
  const [notificationRefreshKey, setNotificationRefreshKey] = useState(0)
  const [unreadBadge, setUnreadBadge] = useState(0)
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const [marketplacePins, setMarketplacePins] = useState<MarketplaceMapPin[]>([])
  const [selectedMarketplaceId, setSelectedMarketplaceId] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const focusedPostIdRef = useRef(focusedPostId)
  focusedPostIdRef.current = focusedPostId
  const hoverLeaveTimerRef = useRef<number | null>(null)
  const listScrollTimerRef = useRef<number | null>(null)
  const placeFocusRef = useRef(placeFocus)
  placeFocusRef.current = placeFocus
  const listingFetchSeq = useRef(0)

  const detailOpen = !!(selectedPostId || selectedPost || selectedPlace || placeLoading)

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

  const closeChatAll = useCallback(() => {
    setChatInboxOpen(false)
    setOpenChatIds([])
  }, [])

  const prepareMobileChatOpen = useCallback(() => {
    if (!isMobileSheetViewport()) return
    dismissHomie()
    closePanel()
  }, [closePanel, dismissHomie])

  const openAppSectionMobileSafe = useCallback(
    (section: MapAppSection) => {
      if (isMobileSheetViewport()) {
        dismissHomie()
        closeChatAll()
      }
      openAppSection?.(section)
    },
    [openAppSection, dismissHomie, closeChatAll],
  )

  const handleHomieOpenChange = useCallback(
    (open: boolean) => {
      setHomieOpen(open)
      if (!open || !isMobileSheetViewport()) return
      closePanel()
      closeChatAll()
    },
    [closePanel, closeChatAll],
  )

  useEffect(() => {
    if (!isMobileSheetViewport() || !panelOpen) return
    dismissHomie()
    closeChatAll()
  }, [panelOpen, panelSection, dismissHomie, closeChatAll])

  useEffect(() => {
    if (!isMobileSheetViewport()) return
    if (!chatInboxOpen && openChatIds.length === 0) return
    dismissHomie()
    closePanel()
  }, [chatInboxOpen, openChatIds, closePanel, dismissHomie])

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

  useEffect(() => {
    if (chatInboxOpen || openChatIds.length > 0) setUnreadBadge(0)
  }, [chatInboxOpen, openChatIds])

  const openChatWindow = useCallback((conversationId: string) => {
    prepareMobileChatOpen()
    setOpenChatIds((prev) => {
      if (prev.includes(conversationId)) {
        // Move to front (most recent)
        return [...prev.filter((id) => id !== conversationId), conversationId]
      }
      return [...prev, conversationId].slice(-3)
    })
    setUnreadBadge(0)
  }, [prepareMobileChatOpen])

  const closeChatWindow = useCallback((conversationId: string) => {
    setOpenChatIds((prev) => prev.filter((id) => id !== conversationId))
    // Drop map pins that came from “Mở trên bản đồ” in this chat thread.
    setSharedLocationPin((pin) => {
      if (!pin) return null
      if (!pin.conversationId || pin.conversationId === conversationId) return null
      return pin
    })
  }, [])

  const toggleChatInbox = useCallback(() => {
    setChatInboxOpen((v) => {
      if (!v) prepareMobileChatOpen()
      return !v
    })
    setUnreadBadge(0)
  }, [prepareMobileChatOpen])

  const handleOpenAppSection = useCallback(
    (section: MapAppSection) => {
      if (section === 'messages') {
        toggleChatInbox()
        return
      }
      openAppSectionMobileSafe(section)
    },
    [openAppSectionMobileSafe, toggleChatInbox],
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

  const selectedPlaceShare = useMemo(() => {
    if (!selectedPlace) return null
    return {
      name: selectedPlace.name,
      address: selectedPlace.address || undefined,
      lat: selectedPlace.location?.lat,
      lng: selectedPlace.location?.lng,
    }
  }, [selectedPlace])

  const selectedListingShare = useMemo(() => {
    const listing = selectedPost
    if (!listing) return null
    return {
      name: listing.title,
      address: listing.address,
      lat: listing.latitude,
      lng: listing.longitude,
    }
  }, [selectedPost])

  const mapAreaShare = useMemo(() => {
    if (mapFocus && Number.isFinite(mapFocus.lat) && Number.isFinite(mapFocus.lng)) {
      return {
        name: 'Khu vực đang xem trên bản đồ',
        lat: mapFocus.lat,
        lng: mapFocus.lng,
      }
    }
    return {
      name: 'Thủ Đức & Quận 9',
      lat: 10.8494,
      lng: 106.7537,
    }
  }, [mapFocus])

  const handleSelectPlace = useCallback((place: MapPlaceDetails) => {
    setSelectedPlace(place)
    setPlaceLoading(false)
    setNearbyFocus(null)
  }, [])

  const handleFocusMapFromChat = useCallback(
    (loc: {
      lat: number
      lng: number
      title?: string
      address?: string
      kind?: ChatLocationKind
      conversationId?: string
    }) => {
      if (isMobileSheetViewport()) {
        dismissHomie()
        closePanel()
      }

      const title = loc.title?.trim() || 'Vị trí từ tin nhắn'
      const kindLabel = loc.kind
        ? `Tin nhắn · ${chatLocationKindLabel(loc.kind)}`
        : 'Từ tin nhắn'

      // Open place detail only when no app tab / detail panel is already open.
      const detailAlreadyOpen = !!(selectedPostId || selectedPlace || placeLoading)
      if (!panelOpen && !detailAlreadyOpen) {
        handleSelectPlace(
          buildSyntheticMapPlace({
            name: title,
            address: loc.address,
            lat: loc.lat,
            lng: loc.lng,
            typeLabel: kindLabel,
          }),
        )
      }

      // Always fly camera + show chat shared pin (after select — select clears nearbyFocus).
      setNearbyFocus({ lat: loc.lat, lng: loc.lng, zoom: MAP_FOCUS_ZOOM })
      setNearbyToken((t) => t + 1)
      setSharedLocationPin((prev) => ({
        lat: loc.lat,
        lng: loc.lng,
        title,
        kindLabel,
        token: (prev?.token ?? 0) + 1,
        conversationId: loc.conversationId,
      }))
      setToast('Đang xem vị trí đối phương gửi trên bản đồ')
    },
    [panelOpen, selectedPostId, selectedPlace, placeLoading, handleSelectPlace, closePanel, dismissHomie],
  )

  const handleMarketplacePostsForMap = useCallback((pins: MarketplaceMapPin[]) => {
    setMarketplacePins(pins)
  }, [])

  /** Load marketplace pins with the home map so all layers show on first paint. */
  useEffect(() => {
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
  }, [])

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
      setListingSaved(false)
    }
  }, [selectedPostId])

  // Fetch full listing when a pin/card is selected.
  useEffect(() => {
    if (!selectedPostId) return
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

    if (isAuthenticated) {
      void getSavedPosts()
        .then((saved) => {
          if (seq !== listingFetchSeq.current) return
          setListingSaved(saved.some((s) => s.id === selectedPostId))
        })
        .catch(() => {
          /* ignore */
        })
    } else {
      setListingSaved(false)
    }
  }, [selectedPostId, isAuthenticated])

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
      if (openDetail) {
        onSelectPost(postId)
      } else if (selectedPostId) {
        onClearSelection()
      }
      if (panelSection !== 'listings') return
      const el = listRef.current?.querySelector(`[data-post-id="${postId}"]`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    },
    [focusedPostId, selectedPostId, onSelectPost, onClearSelection, panelSection],
  )

  useEffect(() => {
    if (!panelOpen || panelSection !== 'listings' || posts.length === 0) return
    const list = listRef.current
    const scroller = list?.closest('.map-app-panel__body')
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
  }, [panelOpen, panelSection, posts, selectedPostId, onClearSelection])

  const handleNearby = useCallback((loc: { lat: number; lng: number }) => {
    setNearbyFocus({ lat: loc.lat, lng: loc.lng, zoom: MAP_FOCUS_ZOOM })
    setNearbyToken((n) => n + 1)
  }, [])

  const handleSaveListing = useCallback(async () => {
    if (!selectedPostId || !isAuthenticated || saveBusy) return
    setSaveBusy(true)
    try {
      if (listingSaved) {
        await unsavePost(selectedPostId)
        setListingSaved(false)
      } else {
        await savePost(selectedPostId)
        setListingSaved(true)
      }
    } catch {
      /* ignore */
    } finally {
      setSaveBusy(false)
    }
  }, [selectedPostId, isAuthenticated, saveBusy, listingSaved])

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

  const listingsContent = useMemo(
    () => (
      <div ref={listRef} className="map-app-panel__listings">
        {error ? <div className="alert alert-error">{error}</div> : null}

        {showPostsLoader ? (
          <HomeListingSkeleton count={4} />
        ) : posts.length === 0 ? (
          <div className="home-list-empty">
            <div className="home-list-empty__icon" aria-hidden>
              ⌕
            </div>
            <h2 className="home-list-empty__title">Không tìm thấy phòng phù hợp</h2>
            <p className="home-list-empty__copy">
              Thử đổi khu vực, khoảng giá hoặc bỏ bớt tiện ích để xem thêm kết quả.
            </p>
            <button type="button" className="btn btn-primary btn-sm" onClick={onResetFilters}>
              Đặt lại bộ lọc
            </button>
          </div>
        ) : (
          posts.map((post, index) => (
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
      posts,
      focusedPostId,
      hoveredPostId,
      onResetFilters,
      handleCardHover,
      handleCardLeave,
      handleSelectPost,
    ],
  )

  return (
    <div
      className={`home-map-page${panelOpen ? '' : ' is-sidebar-collapsed'}${
        detailOpen ? ' has-place-detail' : ''
      }${panelOpen && panelSection === 'listings' ? ' has-listings-panel' : ''}${
        panelOpen && isWideMapSection(panelSection) ? ' has-wide-panel' : ''
      }`}
    >
      <section className="home-map-panel">
        <div className="home-map-frame">
          <HomeMapStage
            posts={posts}
            selectedPostId={focusedPostId}
            hoveredPostId={hoveredPostId}
            onSelectPost={handleSelectPost}
            onClearSelection={handleClearMapSelection}
            onSelectPlace={handleSelectPlace}
            onPlaceLoading={setPlaceLoading}
            selectedPlacePin={selectedPlacePin}
            sharedLocationPin={sharedLocationPin}
            marketplacePins={marketplacePins}
            selectedMarketplaceId={selectedMarketplaceId}
            onSelectMarketplace={handleSelectMarketplace}
            pinLayers={pinLayers}
            focus={mapFocus}
            focusToken={mapFocusToken}
            listingsFitToken={listingsFitToken}
            navigationRequest={navigationRequest}
            onNavigationResult={handleNavigationResult}
            userLocation={userLocation}
            onLocate={onLocate}
            locating={locating}
          />
        </div>

        <MapPlaceDetailPanel
          open={detailOpen}
          onClose={handleClearMapSelection}
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
            if (conversationId) openChatWindow(conversationId)
            else toggleChatInbox()
          }}
          onOpenAppointments={() => openAppSectionMobileSafe('appointments')}
        />

        {/* Outside .home-map-frame so z-index can sit above MapPlaceDetailPanel
            (frame uses isolation:isolate and would trap omnibox underneath). */}
        {omnibox && isValidElement(omnibox)
          ? cloneElement(
              omnibox as React.ReactElement<{
                unreadMessageCount?: number
                unreadNotificationCount?: number
                onOpenSection?: (section: MapAppSection) => void
                activeSection?: MapAppSection | null
                onClosePlaceDetail?: () => void
                placeDetailOpen?: boolean
              }>,
              {
                unreadMessageCount: unreadBadge,
                unreadNotificationCount,
                onOpenSection: handleOpenAppSection,
                onClosePlaceDetail: handleClearMapSelection,
                placeDetailOpen: detailOpen,
                activeSection:
                  chatInboxOpen || openChatIds.length > 0
                    ? 'messages'
                    : panelSection,
              },
            )
          : omnibox}

        {needsProfileSetup && (
          <div className="home-map-banner">
            Chào mừng! <Link to="/?section=profile">Hoàn thiện hồ sơ</Link> để được gợi ý phòng tốt hơn.
          </div>
        )}
      </section>

      <MapChatDock
        inboxOpen={chatInboxOpen}
        openChatIds={openChatIds}
        onCloseInbox={() => setChatInboxOpen(false)}
        onCloseChat={closeChatWindow}
        onOpenChat={openChatWindow}
        userLocation={userLocation}
        selectedPlace={selectedPlaceShare}
        selectedListing={selectedListingShare}
        mapArea={mapAreaShare}
        onFocusMap={handleFocusMapFromChat}
        refreshKey={notificationRefreshKey}
      />

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
        onNotificationOpen={(n) => {
          if (
            n.type === NotificationType.NewMessage ||
            n.type === NotificationType.DirectMessage
          ) {
            if (n.relatedEntityId) openChatWindow(n.relatedEntityId)
            else toggleChatInbox()
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

      {/* After list panel so Homie stays above the right section */}
      <MapChatbot
        onSearchUpdate={onAiSearchUpdate}
        onOpenSection={handleOpenAppSection}
        dismissSignal={homieDismiss}
        onOpenChange={handleHomieOpenChange}
        avoidRightContent={panelOpen && panelSection === 'marketplace'}
        hideFab={
          detailOpen ||
          marketplaceCartOpen ||
          (isMobileSheetViewport() &&
            (panelOpen || chatInboxOpen || openChatIds.length > 0 || homieOpen))
        }
      />

      <MapToast
        message={locationError || toast}
        tone={locationError || error ? 'error' : 'info'}
        onDismiss={() => {
          if (locationError) onClearLocationError?.()
          else setToast(null)
        }}
      />
    </div>
  )
})
