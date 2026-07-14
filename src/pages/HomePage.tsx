import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  getRentalPost,
  highlightRentalPosts,
  searchRentalPosts,
  type AiHighlightResponse,
  type RentalPostSummary,
} from '../api'
import { HomejiLoader, SERVICE_RETRY_MS, useHomejiLoading } from '../components/HomejiLoader'
import { AuthenticatedHomeMapShell } from '../components/map/AuthenticatedHomeMapShell'
import type { HomeMapFocus } from '../components/map/HomeMapStage'
import { MapOmnibox, type MapOmniboxSuggestion } from '../components/map/MapOmnibox'
import type { MapAppSection } from '../components/map/MapAppPanel'
import { useAuth } from '../contexts/AuthContext'
import { useGoogleMaps } from '../contexts/GoogleMapsProvider'
import { useOnReconnect } from '../contexts/NetworkStatusContext'
import { getErrorMessage, isServiceDisruption } from '../lib/errors'
import { DeviceLocationError, getDeviceLocation } from '../lib/geolocation'
import { MAP_FOCUS_ZOOM } from '../lib/googleMaps'
import {
  loadMapPinLayers,
  saveMapPinLayers,
  type MapPinLayer,
  type MapPinLayers,
} from '../lib/mapPinLayers'
import { AMENITY_OPTIONS } from '../lib/labels'
import {
  bboxAround,
  resolvePlaceCoordinates,
  resolveSearchLocation,
  type MapSearchBBox,
  type ResolvedPlaceLocation,
} from '../lib/placeAutocomplete'
import { GuestChrome } from '../components/landing/GuestChrome'
import { GuestHero } from '../components/landing/GuestHero'
import { GuestMapSection } from '../components/landing/GuestMapSection'
import { HorizontalScrollShowcase } from '../components/landing/HorizontalScrollShowcase'
import { MissionConfetti } from '../components/landing/MissionConfetti'
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

/**
 * Camera focus lives in a ref — updating .current does not re-render HomePage.
 * Only bumping mapFocusToken (intentional fly-to) notifies the memoized map.
 */
function HomePageComponent() {
  const { isAuthenticated, isLoading, needsProfileSetup } = useAuth()
  const { apiKey, isLoaded: mapsLoaded } = useGoogleMaps()
  const mapsReady = Boolean(apiKey && mapsLoaded)
  const { schools, loading: schoolsLoading } = useNearbyGuestSchools(mapsReady && isAuthenticated)
  const [searchParams, setSearchParams] = useSearchParams()

  const [posts, setPosts] = useState<RentalPostSummary[]>([])
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
  const [panelSection, setPanelSection] = useState<MapAppSection | null>(null)
  const [searchQuery, setSearchQuery] = useState(GUEST_DISTRICTS[0].label)
  const [aiSearching, setAiSearching] = useState(false)
  const [pinLayers, setPinLayers] = useState<MapPinLayers>(() => loadMapPinLayers())
  const panelOpen = panelSection !== null
  const openListingsPanel = useCallback(() => setPanelSection('listings'), [])
  const closePanel = useCallback(() => setPanelSection(null), [])
  const openAppSection = useCallback((section: MapAppSection) => {
    setPanelSection(section)
  }, [])
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

  // Deep links from retired standalone pages: /?section=… /?post=…
  useEffect(() => {
    if (!isAuthenticated || isLoading) return
    const section = searchParams.get('section')
    const postId = searchParams.get('post')
    if (!section && !postId) return

    const allowed: MapAppSection[] = [
      'listings',
      'assistant',
      'saved',
      'invitations',
      'notifications',
      'appointments',
      'payments',
      'profile',
      'marketplace',
      'wanted',
      'activities',
      'myPosts',
    ]
    if (section && (allowed as string[]).includes(section)) {
      setPanelSection(section as MapAppSection)
    }
    if (postId) {
      setSelectedPostId(postId)
      void getRentalPost(postId, { auth: true })
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
    }
    setSearchParams({}, { replace: true })
  }, [isAuthenticated, isLoading, searchParams, setSearchParams])

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
  const authGate = useHomejiLoading(isLoading)
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
      const nextKeyword = (c.keyword || c.location || update.tag || '').trim()
      if (nextKeyword) {
        setKeyword(nextKeyword)
        setSearchQuery(nextKeyword)
      }
      if (c.priceMin != null) setMinPrice(String(Math.round(c.priceMin)))
      if (c.priceMax != null) setMaxPrice(String(Math.round(c.priceMax)))
      filtersRef.current = {
        ...filtersRef.current,
        bbox: null,
        keyword: nextKeyword || filtersRef.current.keyword,
        minPrice: c.priceMin != null ? String(Math.round(c.priceMin)) : filtersRef.current.minPrice,
        maxPrice: c.priceMax != null ? String(Math.round(c.priceMax)) : filtersRef.current.maxPrice,
      }
      if (update.posts.length > 0) {
        setPosts(update.posts.map((p) => p.post))
        setSelectedPostId(null)
        if (update.mapFocusLatitude == null || update.mapFocusLongitude == null) {
          pinFilterResults()
        }
      } else {
        void loadPosts()
      }
      if (update.mapFocusLatitude != null && update.mapFocusLongitude != null) {
        commitMapFocus({
          lat: Number(update.mapFocusLatitude),
          lng: Number(update.mapFocusLongitude),
          zoom: MAP_FOCUS_ZOOM,
        })
      }
      setPanelSection('listings')
    },
    [commitMapFocus, loadPosts, pinFilterResults],
  )

  const handleAiSearch = useCallback(
    async (text: string) => {
      const q = text.trim()
      if (!q) return
      setAiSearching(true)
      setError('')
      try {
        const update = await highlightRentalPosts({ text: q, maxResults: 12 })
        applyAiSearchUpdate(update)
      } catch (err) {
        setError(getErrorMessage(err, 'AI tìm kiếm tạm thời không khả dụng'))
      } finally {
        setAiSearching(false)
      }
    },
    [applyAiSearchUpdate],
  )

  useEffect(() => {
    if (isLoading) return
    if (isAuthenticated) {
      void loadPosts()
    } else {
      setLoading(false)
      setDisrupted(false)
    }
  }, [isAuthenticated, isLoading, loadPosts])

  useOnReconnect(() => {
    if (isAuthenticated) void loadPosts()
  })

  useEffect(() => {
    if (!isAuthenticated || !disrupted) return
    const t = window.setInterval(() => void loadPosts(), SERVICE_RETRY_MS)
    return () => window.clearInterval(t)
  }, [isAuthenticated, disrupted, loadPosts])

  // Chip amenity → auto search (debounce ~350ms) + open list + pin on map
  const amenitiesKey = selectedAmenities.slice().sort().join('|')
  const skipAmenitySearch = useRef(true)
  useEffect(() => {
    if (!isAuthenticated || isLoading) return
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
  }, [amenitiesKey, isAuthenticated, isLoading, loadPosts, openListingsPanel])

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

  const handleSelectPost = useCallback((postId: string) => {
    setSelectedPostId(postId)
    setMapFocusToken((n) => n + 1)
  }, [])

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
    setSelectedPostId((prev) => (prev == null ? prev : null))
  }, [])

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
  }, [loadPosts, commitMapFocus])

  useEffect(() => {
    if (!panelOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [panelOpen, closePanel])

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

  if (authGate.showLoader) {
    return <HomejiLoader fullPage onIntroComplete={authGate.onIntroComplete} />
  }

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

  return (
    <AuthenticatedHomeMapShell
      posts={posts}
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
      omnibox={omnibox}
      pinLayers={pinLayers}
      onDetailLabelChange={handleDetailLabelChange}
      onAiSearchUpdate={applyAiSearchUpdate}
    />
  )
}

export const HomePage = memo(HomePageComponent)
