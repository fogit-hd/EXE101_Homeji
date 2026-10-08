import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { AiSearchReview } from '../components/ai/AiSearchReview'
import {
  getRentalPost,
  highlightRentalPosts,
  searchMarketplacePosts,
  searchRentalPosts,
  type AiHighlightResponse,
  type MarketplacePost,
  type RentalPostSummary,
} from '../api'
import { SERVICE_RETRY_MS, useHomejiLoading } from '../components/HomejiLoader'
import {
  isExploreSurface,
  parseExploreView,
  type ExploreView,
} from '../components/chrome'
import { AuthenticatedHomeMapShell } from '../components/map/AuthenticatedHomeMapShell'
import type { HomeMapFocus } from '../components/map/HomeMapStage'
import { MapOmnibox, type MapOmniboxSuggestion } from '../components/map/MapOmnibox'
import type { MapAppSection } from '../components/map/MapAppPanel'
import { useAuth } from '../contexts/AuthContext'
import { useGoogleMaps } from '../contexts/GoogleMapsProvider'
import { useOnReconnect } from '../contexts/NetworkStatusContext'
import { getErrorMessage, isServiceDisruption } from '../lib/errors'
import { DeviceLocationError, getDeviceLocation } from '../lib/geolocation'
import { MAP_FIT_MAX_ZOOM, MAP_FOCUS_ZOOM } from '../lib/googleMaps'
import {
  loadMapPinLayers,
  saveMapPinLayers,
  type MapPinLayer,
  type MapPinLayers,
} from '../lib/mapPinLayers'
import { AMENITY_OPTIONS } from '../lib/labels'
import {
  listingQueryToMarketplaceParams,
  listingQueryToSearchParams,
  nonBoundsSignature,
  parseFiltersFromURL,
  serializeFiltersToQuery,
} from '../components/map/listings/listingAdapters'
import {
  bboxAround,
  resolvePlaceCoordinates,
  resolveSearchLocation,
  type MapSearchBBox,
  type ResolvedPlaceLocation,
} from '../lib/placeAutocomplete'
import { AuthenticatedHub } from '../components/hub/AuthenticatedHub'
import { GuestChrome } from '../components/landing/GuestChrome'
import { GuestHero } from '../components/landing/GuestHero'
import { GuestMapSection } from '../components/landing/GuestMapSection'
import { HorizontalScrollShowcase } from '../components/landing/HorizontalScrollShowcase'
import { MissionConfetti } from '../components/landing/MissionConfetti'
import { FeatureWorkspace } from '../components/layout/FeatureWorkspace'
import {
  GUEST_DEFAULT_FOCUS,
  GUEST_DISTRICTS,
  GUEST_WARDS,
  buildGuestSearchKeyword,
  wardsForDistrict,
} from '../components/landing/guestMapAreas'
import { useNearbyGuestSchools } from '../components/landing/useNearbyGuestSchools'
import '../components/map/MapMotion.css'
import './HomePage.css'

const AMENITY_OPTIONS_LIST = [...AMENITY_OPTIONS]

const HOME_SECTIONS: MapAppSection[] = [
  'listings',
  'saved',
  'invitations',
  'notifications',
  'messages',
  'appointments',
  'payments',
  'profile',
  'marketplace',
  'wanted',
  'activities',
  'myPosts',
]

/**
 * Camera focus lives in a ref — updating .current does not re-render HomePage.
 * Only bumping mapFocusToken (intentional fly-to) notifies the memoized map.
 */
function HomePageComponent() {
  const { isAuthenticated, isLoading, needsProfileSetup } = useAuth()
  const { apiKey, isLoaded: mapsLoaded } = useGoogleMaps()
  const mapsReady = Boolean(apiKey && mapsLoaded)
  const { schools, loading: schoolsLoading } = useNearbyGuestSchools(mapsReady && isAuthenticated)
  const location = useLocation()
  const [pendingAiReview, setPendingAiReview] = useState<AiHighlightResponse | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const urlSectionRaw = searchParams.get('section')
  const urlPostId = searchParams.get('post')
  // Notifications open from the header bell. Old `section=notifications` links
  // must not mount the full-page workspace underneath the popup.
  const activeSection =
    urlSectionRaw &&
    urlSectionRaw !== 'notifications' &&
    (HOME_SECTIONS as string[]).includes(urlSectionRaw)
      ? (urlSectionRaw as MapAppSection)
      : null
  const exploreView: ExploreView | null = isAuthenticated
    ? parseExploreView(location.pathname, location.search)
    : null
  const isExploreView = isAuthenticated && isExploreSurface(location.pathname, location.search)
  const isHubView = isAuthenticated && !isExploreView && !activeSection
  const isFeatureView =
    isAuthenticated && Boolean(activeSection && activeSection !== 'listings')

  const [posts, setPosts] = useState<RentalPostSummary[]>([])
  const [marketPosts, setMarketPosts] = useState<MarketplacePost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [disrupted, setDisrupted] = useState(false)
  const [districtId, setDistrictId] = useState(GUEST_DISTRICTS[0].id)
  const [wardId, setWardId] = useState('')
  const [schoolId, setSchoolId] = useState('')
  const [keyword, setKeyword] = useState(
    buildGuestSearchKeyword({ districtKeyword: GUEST_DISTRICTS[0].keyword }),
  )
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([])
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [listingsPanelOpen, setListingsPanelOpen] = useState(true)
  const [searchQuery, setSearchQuery] = useState(GUEST_DISTRICTS[0].label)
  const [aiSearching, setAiSearching] = useState(false)
  const [pinLayers, setPinLayers] = useState<MapPinLayers>(() => loadMapPinLayers())
  const panelSection: MapAppSection | null = isExploreView ? 'listings' : null
  const panelOpen = isExploreView && listingsPanelOpen
  /** Local panel flag only — never rewrite `section` (would yank tabs back to map). */
  const openListingsPanel = useCallback(() => {
    setListingsPanelOpen(true)
  }, [])
  const closePanel = useCallback(() => setListingsPanelOpen(false), [])
  const openAppSection = useCallback(
    (section: MapAppSection) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.set('section', section)
        if (section !== 'listings') {
          next.delete('post')
          next.delete('view')
        }
        return next
      })
      if (section === 'listings') setListingsPanelOpen(true)
    },
    [setSearchParams],
  )
  const togglePinLayer = useCallback((layer: MapPinLayer) => {
    setPinLayers((prev) => {
      const next = { ...prev, [layer]: !prev[layer] }
      saveMapPinLayers(next)
      return next
    })
  }, [])

  const mapFocusRef = useRef<HomeMapFocus | null>({ ...GUEST_DEFAULT_FOCUS })
  const [mapFocusToken, setMapFocusToken] = useState(0)
  const [listingsFitToken, setListingsFitToken] = useState(0)
  const mapFocus = useMemo(
    () => (mapFocusRef.current ? { ...mapFocusRef.current } : null),
    [mapFocusToken],
  )

  // Deep links: /?section=… /?post=… stay in the URL (strategy A).
  // Gateway return params (paymentId, orderCode, …) are preserved for PaymentPage.
  useEffect(() => {
    if (!isAuthenticated || isLoading) return
    if (!urlPostId) return
    setSelectedPostId(urlPostId)
    setListingsPanelOpen(true)
    void getRentalPost(urlPostId, { auth: true })
      .then((post) => {
        setPosts((prev) => (prev.some((p) => p.id === post.id) ? prev : [post, ...prev]))
        mapFocusRef.current = {
          lat: post.latitude,
          lng: post.longitude,
          zoom: MAP_FOCUS_ZOOM,
        }
        setMapFocusToken((n) => n + 1)
      })
      .catch(() => {
        /* keep selection; detail panel will show load error state */
      })
  }, [isAuthenticated, isLoading, urlPostId])

  useEffect(() => {
    if (!isHubView) return
    setSelectedPostId(null)
  }, [isHubView])

  useEffect(() => {
    if (!isExploreView) return
    setListingsPanelOpen(true)
  }, [isExploreView, activeSection])

  const commitMapFocus = useCallback((focus: HomeMapFocus) => {
    mapFocusRef.current = { ...focus }
    setMapFocusToken((n) => n + 1)
  }, [])

  const [mapPlaceFocus, setMapPlaceFocus] = useState<{
    placeId?: string
    lat: number
    lng: number
    name: string
    address: string
  } | null>(null)
  const [mapPlaceFocusToken, setMapPlaceFocusToken] = useState(0)
  const searchPlaceId = searchParams.get('placeId')
  const searchPlaceName = searchParams.get('placeName') ?? ''
  const appliedPlaceFocus = useRef('')
  useEffect(() => {
    if (!searchPlaceId || !isExploreView) { appliedPlaceFocus.current = ''; return }
    if (!mapsReady) return
    const key = `${searchPlaceId}\0${searchPlaceName}`
    if (appliedPlaceFocus.current === key) return
    let cancelled = false
    void resolvePlaceCoordinates(searchPlaceId).then((resolved) => {
      if (cancelled) return
      if (!resolved) { setError('Không thể xác định vị trí địa điểm. Vui lòng thử lại.'); return }
      appliedPlaceFocus.current = key
      locateRequestRef.current += 1
      setLocating(false)
      setSelectedPostId(null)
      commitMapFocus({ lat: resolved.lat, lng: resolved.lng, zoom: MAP_FIT_MAX_ZOOM })
      setMapPlaceFocus({ placeId: searchPlaceId, name: searchPlaceName || resolved.name,
        address: resolved.address, lat: resolved.lat, lng: resolved.lng })
      setMapPlaceFocusToken((n) => n + 1)
      // The destination drives spatial retrieval, independent of a school's name
      // appearing in a rental title or address. Keep the user's price/amenity filters.
      setSearchParams(prev => {
        const next = new URLSearchParams(prev)
        next.delete('keyword')
        const filters = parseFiltersFromURL(next)
        return serializeFiltersToQuery({ ...filters, bounds: bboxAround(resolved.lat, resolved.lng, 1.8), searchOnMove: false, page: 1 }, next)
      }, { replace: true })
    }).catch(() => { if (!cancelled) setError('Không thể tải địa điểm từ Google Maps.') })
    return () => { cancelled = true }
  }, [searchPlaceId, searchPlaceName, isExploreView, mapsReady, commitMapFocus, setSearchParams])

  const pinFilterResults = useCallback(() => {
    // Prefer fitting pins over a prior area focus / user pan.
    mapFocusRef.current = null
    setMapFocusToken((n) => n + 1)
    setListingsFitToken((n) => n + 1)
  }, [])

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState('')
  const disruptedRef = useRef(false)
  const locateRequestRef = useRef(0)
  const userLocationRef = useRef(userLocation)
  userLocationRef.current = userLocation
  disruptedRef.current = disrupted
  const cancelLocationFocus = useCallback(() => {
    // A newer selection supersedes stored focus and late geolocation responses.
    locateRequestRef.current += 1
    setLocating(false)
    mapFocusRef.current = null
    setMapFocusToken((n) => n + 1)
  }, [])
  const filtersRef = useRef<{
    keyword: string
    minPrice: string
    maxPrice: string
    selectedAmenities: string[]
    bbox: MapSearchBBox | null
  }>({ keyword, minPrice, maxPrice, selectedAmenities, bbox: null })
  filtersRef.current = {
    keyword,
    minPrice,
    maxPrice,
    selectedAmenities,
    bbox: filtersRef.current.bbox,
  }
  const { showLoader: showPostsLoader, onIntroComplete: onPostsIntroComplete } = useHomejiLoading(
    loading,
    disrupted,
  )

  useEffect(() => {
    onPostsIntroComplete()
  }, [loading, disrupted, onPostsIntroComplete])

  const loadPosts = useCallback(async () => {
    if (!disruptedRef.current) setLoading(true)
    setError('')
    const {
      keyword: kw,
      minPrice: minP,
      maxPrice: maxP,
      selectedAmenities: am,
      bbox,
    } = filtersRef.current
    try {
      const data = await searchRentalPosts({
        // With a map bbox, skip the default "Thủ Đức" keyword so nearby pins show.
        keyword: bbox ? kw.trim() || undefined : kw.trim() || 'Thủ Đức',
        minPrice: minP ? Number(minP) : undefined,
        maxPrice: maxP ? Number(maxP) : undefined,
        amenities: am.length ? am : undefined,
        ...(bbox ?? {}),
      })
      setPosts(data)
      setSelectedPostId((prev) => (prev && data.some((p) => p.id === prev) ? prev : null))
      setDisrupted(false)
      // Keep intentional place focus; otherwise fit to filtered pins.
      if (!bbox) pinFilterResults()
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể tải danh sách phòng'))
      setDisrupted(isServiceDisruption(err))
    } finally {
      setLoading(false)
    }
  }, [pinFilterResults])

  const flyToResolvedPlace = useCallback(
    (resolved: ResolvedPlaceLocation, zoom = MAP_FOCUS_ZOOM) => {
      const bbox = bboxAround(resolved.lat, resolved.lng, 1.8)
      const label = resolved.address || resolved.name
      setKeyword('')
      setSearchQuery(label)
      setWardId('')
      setSchoolId('')
      setSelectedPostId(null)
      filtersRef.current = {
        ...filtersRef.current,
        keyword: '',
        bbox,
      }
      commitMapFocus({ lat: resolved.lat, lng: resolved.lng, zoom })
      // Close right "0 phòng" panel — show the place on the map instead.
      closePanel()
      setMapPlaceFocus({
        placeId: resolved.placeId || undefined,
        lat: resolved.lat,
        lng: resolved.lng,
        name: resolved.name,
        address: resolved.address,
      })
      setMapPlaceFocusToken((n) => n + 1)
      // Quietly refresh nearby pins without opening listings.
      void loadPosts()
    },
    [closePanel, commitMapFocus, loadPosts],
  )

  const applyAiSearchUpdate = useCallback(
    (update: AiHighlightResponse) => {
      const c = update.criteria
      if (c.unknown?.length) return
      const params = new URLSearchParams({ section: 'listings' })
      const nextKeyword = (c.keyword || c.location || '').trim()
      if (nextKeyword) params.set('keyword', nextKeyword)
        if (c.priceMin != null && c.budgetBasis !== 'total') params.set('minPrice', String(c.priceMin))
      if (c.priceMax != null) params.set('maxPrice', String(c.priceMax))
      if (c.areaMin != null) params.set('minArea', String(c.areaMin))
      if (c.areaMax != null) params.set('maxArea', String(c.areaMax))
      for (const code of c.requiredAmenities ?? []) params.append('amenities', code)
      for (const code of c.excludedAmenities ?? []) params.append('excludedAmenities', code)
      if (c.excludeRoommateShare) params.set('excludeRoommateShare', 'true')
      if (c.occupants) params.set('minAvailableSlots', String(c.occupants))
      for (const id of update.posts.length ? update.posts.map(item => item.post.id) : ['00000000-0000-0000-0000-000000000000']) params.append('ids', id)
      setSearchParams(params)
      setPendingAiReview(null)
      if (nextKeyword) {
        setKeyword(nextKeyword)
        setSearchQuery(nextKeyword)
      }
        setMinPrice(c.priceMin != null && c.budgetBasis !== 'total' ? String(Math.round(c.priceMin)) : '')
      setMaxPrice(c.priceMax != null ? String(Math.round(c.priceMax)) : '')
      setSelectedAmenities(c.requiredAmenities ?? [])
      filtersRef.current = {
        ...filtersRef.current,
        bbox: null,
        keyword: nextKeyword,
        minPrice: c.priceMin != null ? String(Math.round(c.priceMin)) : '',
        maxPrice: c.priceMax != null ? String(Math.round(c.priceMax)) : '',
        selectedAmenities: c.requiredAmenities ?? [],
      }
      if (update.posts.length > 0) {
        setPosts([])
        setLoading(true)
        setSelectedPostId(null)
        if (update.mapFocusLatitude == null || update.mapFocusLongitude == null) {
          pinFilterResults()
        }
      } else setPosts([])
      if (update.mapFocusLatitude != null && update.mapFocusLongitude != null) {
        commitMapFocus({
          lat: Number(update.mapFocusLatitude),
          lng: Number(update.mapFocusLongitude),
          zoom: MAP_FOCUS_ZOOM,
        })
      }
      openListingsPanel()
    },
    [commitMapFocus, openListingsPanel, pinFilterResults, setSearchParams],
  )

  useEffect(() => {
    const update = (location.state as { aiSearchUpdate?: AiHighlightResponse } | null)?.aiSearchUpdate
    if (!update || !isAuthenticated || isLoading) return
    // Consume the navigation event after the route mounts; cancelled navigations cannot apply stale filters.
    let cancelled = false
    queueMicrotask(() => { if (!cancelled) applyAiSearchUpdate(update) })
    return () => { cancelled = true }
  }, [location.state, isAuthenticated, isLoading, applyAiSearchUpdate])

  const handleAiSearch = useCallback(
    async (text: string) => {
      const q = text.trim()
      if (!q) return
      setAiSearching(true)
      setError('')
      try {
        const update = await highlightRentalPosts({ text: q, maxResults: 12 })
        setPendingAiReview(update)
      } catch (err) {
        setError(getErrorMessage(err, 'AI tìm kiếm tạm thời không khả dụng'))
      } finally {
        setAiSearching(false)
      }
    },
    [],
  )

  useEffect(() => {
    if (isLoading) return
    if (isExploreView) return
    if (isAuthenticated) {
      void loadPosts()
    } else {
      setLoading(false)
      setDisrupted(false)
    }
  }, [isAuthenticated, isLoading, isExploreView, loadPosts])

  const [exploreReload, setExploreReload] = useState(0)
  const exploreFitKey = useRef('')

  useEffect(() => {
    if (!isExploreView) return
    const next = serializeFiltersToQuery(parseFiltersFromURL(searchParams), searchParams)
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true })
    }
  }, [isExploreView, searchParams, setSearchParams])

  useEffect(() => {
    if (!isAuthenticated || isLoading || !isExploreView) return
    const query = parseFiltersFromURL(searchParams)
    const controller = new AbortController()
    let cancelled = false
    setLoading(true)
    setError('')
    const fitKey = nonBoundsSignature(query)
    const marketMode = query.catalog === 'market'
    const finish = (ids: string[]) => {
      setSelectedPostId((prev) => (prev && ids.includes(prev) ? prev : null))
      setDisrupted(false)
      if (!searchParams.get('placeId') && exploreFitKey.current !== fitKey) {
        exploreFitKey.current = fitKey
        pinFilterResults()
      }
    }
    const request = marketMode
      ? searchMarketplacePosts(listingQueryToMarketplaceParams(query), { signal: controller.signal }).then(
          (data) => {
            if (cancelled) return
            setPosts([])
            setMarketPosts(data)
            finish(data.map((post) => post.id))
          },
        )
      : searchRentalPosts(listingQueryToSearchParams(query), { signal: controller.signal }).then((data) => {
          if (cancelled) return
          setMarketPosts([])
          setPosts(data)
          finish(data.map((post) => post.id))
        })
    void request
      .catch((err: unknown) => {
        if (cancelled || controller.signal.aborted) return
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(
          getErrorMessage(err, marketMode ? 'Không thể tải chợ đồ' : 'Không thể tải danh sách phòng'),
        )
        setDisrupted(isServiceDisruption(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [
    isAuthenticated,
    isLoading,
    isExploreView,
    searchParams,
    exploreReload,
    pinFilterResults,
  ])

  useOnReconnect(() => {
    if (!isAuthenticated) return
    if (isExploreView) {
      setExploreReload((n) => n + 1)
      return
    }
    void loadPosts()
  })

  useEffect(() => {
    if (!isAuthenticated || !disrupted || isExploreView) return
    const t = window.setInterval(() => void loadPosts(), SERVICE_RETRY_MS)
    return () => window.clearInterval(t)
  }, [isAuthenticated, disrupted, isExploreView, loadPosts])

  // Chip amenity → auto search (debounce ~350ms) + pin on map.
  // Filters only exist on the map destination — leave map clears any pending timer
  // so tab switches (Chợ đồ / Tin nhắn) are not yanked back to listings.
  const amenitiesKey = selectedAmenities.slice().sort().join('|')
  const skipAmenitySearch = useRef(true)
  const isMapDestination = exploreView === 'map'
  useEffect(() => {
    if (!isAuthenticated || isLoading) return
    if (!isMapDestination) {
      skipAmenitySearch.current = true
      return
    }
    if (skipAmenitySearch.current) {
      skipAmenitySearch.current = false
      return
    }
    const t = window.setTimeout(() => {
      setSelectedPostId(null)
      openListingsPanel()
      void loadPosts()
    }, 350)
    return () => window.clearTimeout(t)
  }, [amenitiesKey, isAuthenticated, isLoading, isMapDestination, loadPosts, openListingsPanel])

  useEffect(() => {
    if (!selectedPostId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedPostId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedPostId])

  const selectedPost = useMemo(
    () => posts.find((p) => p.id === selectedPostId) ?? null,
    [posts, selectedPostId],
  )

  const toggleAmenity = useCallback((amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity],
    )
  }, [])

  const applyAreaFilters = useCallback(
    (next: { districtId?: string; wardId?: string; schoolId?: string }) => {
      const nextDistrictId = next.districtId ?? districtId
      const nextWardId = next.wardId ?? wardId
      const nextSchoolId = next.schoolId ?? schoolId

      const nextDistrict =
        GUEST_DISTRICTS.find((d) => d.id === nextDistrictId) ?? GUEST_DISTRICTS[0]
      const nextWards = wardsForDistrict(nextDistrictId)
      const nextWard = nextWards.find((w) => w.id === nextWardId)
      const nextSchool = schools.find((s) => s.id === nextSchoolId)

      const nextKeyword = buildGuestSearchKeyword({
        schoolKeyword: nextSchool?.keyword,
        wardKeyword: nextWard?.keyword,
        districtKeyword: nextDistrict.keyword,
      })
      const focus =
        nextSchool?.focus ?? nextWard?.focus ?? nextDistrict.focus ?? GUEST_DEFAULT_FOCUS

      setKeyword(nextKeyword)
      commitMapFocus({ ...focus })
      setSearchQuery(nextSchool?.label || nextWard?.label || nextDistrict.label)
      setSelectedPostId(null)
      filtersRef.current = {
        ...filtersRef.current,
        keyword: nextKeyword,
        bbox: null,
      }
      openListingsPanel()
      void loadPosts()
    },
    [districtId, wardId, schoolId, schools, loadPosts, openListingsPanel, commitMapFocus],
  )

  // Deep-link area filters on Khám phá: apply district/ward/school query once per key.
  const hubAreaQueryKeyRef = useRef<string | null>(null)
  useEffect(() => {
    if (!isExploreView) {
      hubAreaQueryKeyRef.current = null
      return
    }
    const district = searchParams.get('district')
    const ward = searchParams.get('ward') ?? ''
    const school = searchParams.get('school') ?? ''
    if (!district && !ward && !school) return
    const key = `${district ?? ''}|${ward}|${school}`
    if (hubAreaQueryKeyRef.current === key) return
    hubAreaQueryKeyRef.current = key

    const nextDistrictId =
      district && GUEST_DISTRICTS.some((d) => d.id === district)
        ? district
        : GUEST_DISTRICTS[0].id
    setDistrictId(nextDistrictId)
    setWardId(ward)
    setSchoolId(school)
    applyAreaFilters({
      districtId: nextDistrictId,
      wardId: ward,
      schoolId: school,
    })
  }, [isExploreView, searchParams, applyAreaFilters])

  const handleSelectPost = useCallback((postId: string) => {
    cancelLocationFocus()
    setSelectedPostId(postId)
  }, [cancelLocationFocus])

  const handleOmniboxPick = useCallback(
    (item: MapOmniboxSuggestion) => {
      if (item.kind === 'post' && item.postId) {
        setSearchQuery(item.title)
        filtersRef.current = { ...filtersRef.current, bbox: null }
        if (item.focus) commitMapFocus({ ...item.focus })
        handleSelectPost(item.postId)
        return
      }
      if (item.kind === 'place' && item.placeId) {
        void (async () => {
          const resolved = await resolvePlaceCoordinates(item.placeId!)
          if (!resolved) {
            const fallback = await resolveSearchLocation(item.title || item.keyword)
            if (fallback) {
              flyToResolvedPlace(fallback)
              return
            }
            const nextKeyword = item.title.trim() || item.keyword.trim() || 'Thủ Đức'
            setKeyword(nextKeyword)
            setSearchQuery(item.title)
            filtersRef.current = {
              ...filtersRef.current,
              keyword: nextKeyword,
              bbox: null,
            }
            setSelectedPostId(null)
            openListingsPanel()
            void loadPosts()
            return
          }
          flyToResolvedPlace(resolved)
        })()
        return
      }
      // Re-open a recent place suggestion that still carries a Place ID.
      if (item.placeId && (item.kind === 'recent' || item.kind === 'query')) {
        void (async () => {
          const resolved = await resolvePlaceCoordinates(item.placeId!)
          if (resolved) {
            flyToResolvedPlace(resolved)
            return
          }
          const fallback = await resolveSearchLocation(item.title || item.keyword)
          if (fallback) flyToResolvedPlace(fallback)
        })()
        return
      }
      if (item.kind === 'district' && item.districtId) {
        setDistrictId(item.districtId)
        setWardId('')
        setSchoolId('')
        applyAreaFilters({ districtId: item.districtId, wardId: '', schoolId: '' })
        return
      }
      if (item.kind === 'ward' && item.wardId) {
        const ward = GUEST_WARDS.find((w) => w.id === item.wardId)
        const nextDistrict = item.districtId || ward?.districtId || districtId
        setDistrictId(nextDistrict)
        setWardId(item.wardId)
        setSchoolId('')
        applyAreaFilters({
          districtId: nextDistrict,
          wardId: item.wardId,
          schoolId: '',
        })
        return
      }
      if (item.kind === 'school' && item.schoolId) {
        setSchoolId(item.schoolId)
        applyAreaFilters({ schoolId: item.schoolId })
        return
      }
      const nextKeyword = item.keyword.trim() || 'Thủ Đức'
      setKeyword(nextKeyword)
      setSearchQuery(item.title)
      filtersRef.current = { ...filtersRef.current, keyword: nextKeyword, bbox: null }
      if (item.focus) {
        commitMapFocus({ ...item.focus })
        if (item.kind === 'recent' && item.focus) {
          const bbox = bboxAround(item.focus.lat, item.focus.lng, 1.8)
          filtersRef.current = { ...filtersRef.current, keyword: nextKeyword, bbox }
        }
      }
      setSelectedPostId(null)
      openListingsPanel()
      void loadPosts()
    },
    [
      applyAreaFilters,
      districtId,
      loadPosts,
      handleSelectPost,
      openListingsPanel,
      commitMapFocus,
      flyToResolvedPlace,
    ],
  )

  const handleOmniboxSearch = useCallback(
    (raw: string) => {
      const nextKeyword = raw.trim()
      if (!nextKeyword) return

      void (async () => {
        // Always try to resolve a map location first (Places / text / geocode).
        const resolved = await resolveSearchLocation(nextKeyword)
        if (resolved) {
          flyToResolvedPlace(resolved)
          return
        }

        setKeyword(nextKeyword)
        setSearchQuery(nextKeyword)
        filtersRef.current = {
          ...filtersRef.current,
          keyword: nextKeyword,
          bbox: null,
        }
        setSelectedPostId(null)
        openListingsPanel()
        void loadPosts()
      })()
    },
    [loadPosts, openListingsPanel, flyToResolvedPlace],
  )

  const handleClearSelection = useCallback(() => {
    cancelLocationFocus()
    setSelectedPostId((prev) => (prev == null ? prev : null))
    if (urlPostId) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.delete('post')
          if (!next.get('section')) next.set('section', 'listings')
          return next
        },
        { replace: true },
      )
    }
  }, [cancelLocationFocus, setSearchParams, urlPostId])

  const handleDetailLabelChange = useCallback((label: string | null) => {
    // Open detail → sync title into omnibox; close (map click / X) → empty ready-to-type.
    setSearchQuery(label ?? '')
  }, [])

  const handleSearchQueryChange = useCallback(
    (value: string) => {
      setSearchQuery(value)
      if (!value.trim()) handleClearSelection()
    },
    [handleClearSelection],
  )

  const handleApplyPrice = useCallback(() => {
    filtersRef.current = {
      ...filtersRef.current,
      minPrice,
      maxPrice,
    }
    setSelectedPostId(null)
    openListingsPanel()
    void loadPosts()
  }, [minPrice, maxPrice, loadPosts, openListingsPanel])

  const locateMe = useCallback(() => {
    const requestId = ++locateRequestRef.current
    setLocating(true)
    setLocationError('')

    void (async () => {
      try {
        const loc = await getDeviceLocation()
        if (requestId !== locateRequestRef.current) return
        const next = { lat: loc.lat, lng: loc.lng }
        setUserLocation(next)
        commitMapFocus({ ...next, zoom: MAP_FOCUS_ZOOM })
        setSelectedPostId(null)
        setLocationError('')
      } catch (err) {
        if (requestId !== locateRequestRef.current) return
        const prev = userLocationRef.current
        if (prev) {
          commitMapFocus({ ...prev, zoom: MAP_FOCUS_ZOOM })
          setLocationError('')
        } else {
          setLocationError(
            err instanceof DeviceLocationError
              ? err.message
              : 'Không thể lấy vị trí hiện tại.',
          )
        }
      } finally {
        if (requestId === locateRequestRef.current) setLocating(false)
      }
    })()
  }, [commitMapFocus])

  const resetFilters = useCallback(() => {
    if (isExploreView) {
      setSearchParams((prev) => {
        const cleared = parseFiltersFromURL(prev)
        cleared.keyword = ''
        cleared.minPrice = undefined
        cleared.maxPrice = undefined
        cleared.minArea = undefined
        cleared.maxArea = undefined
        cleared.amenities = []
        cleared.excludedAmenities = []
        cleared.excludeRoommateShare = false
        cleared.minAvailableSlots = undefined
        cleared.ids = []
        cleared.page = 1
        cleared.bounds = null
        return serializeFiltersToQuery(cleared, prev)
      }, { replace: true })
      setSelectedPostId(null)
      return
    }
    const nextKeyword = buildGuestSearchKeyword({
      districtKeyword: GUEST_DISTRICTS[0].keyword,
    })
    setDistrictId(GUEST_DISTRICTS[0].id)
    setWardId('')
    setSchoolId('')
    setKeyword(nextKeyword)
    setMinPrice('')
    setMaxPrice('')
    setSelectedAmenities([])
    setSearchQuery(GUEST_DISTRICTS[0].label)
    commitMapFocus({ ...GUEST_DEFAULT_FOCUS })
    setSelectedPostId(null)
    filtersRef.current = {
      keyword: nextKeyword,
      minPrice: '',
      maxPrice: '',
      selectedAmenities: [],
      bbox: null,
    }
    void loadPosts()
  }, [loadPosts, commitMapFocus, isExploreView, setSearchParams])

  // Destination map keeps the list open; Escape clears selection via shell / map click.

  const omnibox = useMemo(
    () => (
      <MapOmnibox
        query={searchQuery}
        onQueryChange={handleSearchQueryChange}
        onSearch={handleOmniboxSearch}
        onPickSuggestion={handleOmniboxPick}
        posts={posts}
        schools={schools}
        schoolsLoading={schoolsLoading}
        districtId={districtId}
        wardId={wardId}
        schoolId={schoolId}
        amenities={AMENITY_OPTIONS_LIST}
        selectedAmenities={selectedAmenities}
        onToggleAmenity={toggleAmenity}
        minPrice={minPrice}
        maxPrice={maxPrice}
        onMinPriceChange={setMinPrice}
        onMaxPriceChange={setMaxPrice}
        onApplyPrice={handleApplyPrice}
        onReset={resetFilters}
        onOpenSection={openAppSection}
        activeSection={panelSection}
        onAiSearch={handleAiSearch}
        aiSearching={aiSearching}
        pinLayers={pinLayers}
        onTogglePinLayer={togglePinLayer}
        hideAppNav
      />
    ),
    [
      searchQuery,
      handleSearchQueryChange,
      handleOmniboxSearch,
      handleOmniboxPick,
      posts,
      schools,
      schoolsLoading,
      districtId,
      wardId,
      schoolId,
      selectedAmenities,
      toggleAmenity,
      minPrice,
      maxPrice,
      handleApplyPrice,
      resetFilters,
      openAppSection,
      panelSection,
      handleAiSearch,
      aiSearching,
      pinLayers,
      togglePinLayer,
    ],
  )

  if (!isAuthenticated) {
    return (
      <div className="guest-landing">
        <GuestChrome />
        <GuestHero />
        <section className="guest-mission" id="mission">
          <div className="guest-mission__grid">
            <div className="guest-mission__copy">
              <p className="guest-mission__eyebrow">Sứ mệnh</p>
              <h2 className="guest-mission__quote">
                Không chỉ tìm phòng — tìm nơi bạn thuộc về.
              </h2>
              <p className="guest-mission__body">
                Homeji kết nối sinh viên tìm phòng, bạn cùng phòng và chủ nhà quanh Thủ Đức &amp; Q.9.
                Minh bạch thông tin, rõ ràng quy trình — để việc chuyển nhà gần trường trở nên nhẹ nhàng
                hơn.
              </p>
              <div className="guest-mission__stats">
                <div className="guest-mission__stat">
                  <strong>Sinh viên</strong>
                  <span>Tìm phòng gần trường</span>
                </div>
                <div className="guest-mission__stat">
                  <strong>Bạn cùng phòng</strong>
                  <span>Kết nối có kiểm soát</span>
                </div>
                <div className="guest-mission__stat">
                  <strong>Chủ nhà</strong>
                  <span>Cho thuê đúng đối tượng</span>
                </div>
              </div>
            </div>
            <MissionConfetti />
          </div>
        </section>
        <HorizontalScrollShowcase />
        <section className="guest-steps" id="how" aria-label="Cách Homeji hoạt động">
          <p className="guest-steps__eyebrow">Cách hoạt động</p>
          <h2 className="guest-steps__title">Ba bước để tìm chỗ ở phù hợp</h2>
          <p className="guest-steps__lead">
            Từ phòng gần trường đến bạn cùng phòng — Homeji giữ quy trình ngắn, rõ và dễ theo dõi.
          </p>
          <ol className="guest-steps__list">
            <li className="guest-steps__item">
              <span className="guest-steps__n">01</span>
              <div>
                <strong>Chọn khu vực &amp; ngân sách</strong>
                <p>Lọc Thủ Đức, Q.9 và tiện ích gần trường theo mức chi phí sinh viên chấp nhận.</p>
              </div>
            </li>
            <li className="guest-steps__item">
              <span className="guest-steps__n">02</span>
              <div>
                <strong>Xem tin &amp; lưu phòng</strong>
                <p>Đọc mô tả, vị trí trên bản đồ, rồi lưu những lựa chọn đáng cân nhắc vào một chỗ.</p>
              </div>
            </li>
            <li className="guest-steps__item">
              <span className="guest-steps__n">03</span>
              <div>
                <strong>Tìm bạn cùng phòng có kiểm soát</strong>
                <p>Gửi lời mời, nhận thông báo, và thống nhất trước khi chuyển vào ở chung.</p>
              </div>
            </li>
          </ol>
        </section>

        <section className="guest-audience" id="for" aria-label="Dành cho ai">
          <p className="guest-audience__eyebrow">Dành cho ai</p>
          <h2 className="guest-audience__title">Ba vai trò trên</h2>
          <div className="guest-audience__grid">
            <article className="guest-audience__card">
              <h3>Sinh viên tìm phòng</h3>
              <p>
                Cần chỗ gần trường, rõ giá và tiện ích — bớt vòng hỏi đi hỏi lại giữa các group chat.
              </p>
            </article>
            <article className="guest-audience__card">
              <h3>Sinh viên tìm bạn cùng phòng</h3>
              <p>
                Muốn chia sẻ chi phí và không gian? Kết nối có kiểm soát qua lời mời và thông báo rõ
                ràng.
              </p>
            </article>
            <article className="guest-audience__card">
              <h3>Chủ nhà cho thuê</h3>
              <p>
                Đăng tin có cấu trúc, tiếp cận đúng sinh viên đang tìm — giảm tin nhắn trùng và thiếu
                thông tin.
              </p>
            </article>
          </div>
        </section>

        <section className="guest-trust" id="start" aria-label="Cam kết Homeji">
          <p className="guest-trust__eyebrow">Cam kết</p>
          <h2 className="guest-trust__title">Minh bạch trước, quyết định sau</h2>
          <p className="guest-trust__body">
            Homeji phục vụ hệ sinh thái quanh trường: sinh viên tìm phòng, tìm bạn cùng phòng, và chủ
            nhà cho thuê. Ưu tiên thông tin rõ — khu vực, giá, tiện ích và quy trình kết nối.
          </p>
          <ul className="guest-trust__points">
            <li>
              <strong>Không phí ẩn khi bắt đầu</strong>
              <span>Tạo tài khoản và khám phá tin miễn phí.</span>
            </li>
            <li>
              <strong>Gần trường là trọng tâm</strong>
              <span>Thủ Đức &amp; Q.9 — đúng nhịp sống sinh viên.</span>
            </li>
            <li>
              <strong>Bạn cùng phòng có dấu vết</strong>
              <span>Lời mời và thông báo giúp mọi người cùng nắm tiến độ.</span>
            </li>
          </ul>
        </section>

        <GuestMapSection />
      </div>
    )
  }

  if (isHubView) {
    return <AuthenticatedHub />
  }

  if (isFeatureView && activeSection && activeSection !== 'listings') {
    return <FeatureWorkspace section={activeSection} />
  }

  if (!isExploreView || !exploreView) {
    return <AuthenticatedHub />
  }

  void omnibox

  return (
    <>
    {pendingAiReview ? <aside className="home-ai-review" aria-label="Xác nhận tìm kiếm">
      <button type="button" onClick={() => setPendingAiReview(null)} aria-label="Đóng xác nhận tìm kiếm">×</button>
      <AiSearchReview result={pendingAiReview} onApply={applyAiSearchUpdate}
        onRefine={text => { setSearchQuery(text); setPendingAiReview(null) }} />
    </aside> : null}
    <AuthenticatedHomeMapShell
      destinationMode
      exploreView={exploreView}
      posts={posts}
      marketPosts={marketPosts}
      selectedPostId={selectedPostId}
      selectedPost={selectedPost}
      onSelectPost={handleSelectPost}
      onClearSelection={handleClearSelection}
      focus={mapFocus}
      focusToken={mapFocusToken}
      listingsFitToken={listingsFitToken}
      placeFocus={mapPlaceFocus}
      placeFocusToken={mapPlaceFocusToken}
      userLocation={userLocation}
      onLocate={locateMe}
      locating={locating}
      locationError={locationError}
      onClearLocationError={() => setLocationError('')}
      panelOpen={panelOpen}
      panelSection={panelSection}
      closePanel={closePanel}
      openAppSection={openAppSection}
      loading={loading}
      showPostsLoader={showPostsLoader}
      error={error}
      onResetFilters={resetFilters}
      needsProfileSetup={needsProfileSetup}
      omnibox={null}
      pinLayers={pinLayers}
      onDetailLabelChange={handleDetailLabelChange}
      onAiSearchUpdate={applyAiSearchUpdate}
    />
    </>
  )
}

export const HomePage = memo(HomePageComponent)
