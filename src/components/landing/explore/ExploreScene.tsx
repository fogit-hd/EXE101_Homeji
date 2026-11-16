import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useNearViewport } from '../../../hooks/useNearViewport'
import { useGoogleMapsStatus } from '../../../contexts/GoogleMapsProvider.logic'
import { DeviceLocationError, getDeviceLocation } from '../../../lib/geolocation'
import { MAP_FOCUS_ZOOM } from '../../../lib/googleMaps'
import { HOMEJI_SERVICE_AREA } from '../../../lib/homejiServiceArea'
import {
  resolvePlaceCoordinates,
  resolveSearchLocation,
  type MapSearchBBox,
} from '../../../lib/placeAutocomplete'
import { matchesRentalPropertyCategory } from '../../../lib/rentalPropertyCategory'
import { RentalMap } from '../../map/RentalMap'
import { SourceRoomDetail } from '../../map/listings/SourceRoomDetail'
import { useRentalPostSave } from '../../../hooks/useRentalPostSave'
import { scrollLandingTo } from '../scroll/landingScrollControl'
import {
  GUEST_DEFAULT_FOCUS,
  GUEST_DISTRICTS,
  GUEST_WARDS,
  wardsForDistrict,
  type GuestAreaOption,
} from '../guestMapAreas'
import { useNearbyGuestSchools } from '../useNearbyGuestSchools'
import { LANDING_SEARCH_EVENT } from '../landingSections'
import {
  EXPLORE_RADIUS_OPTIONS,
  readExploreUrlState,
  writeExploreUrlState,
  type ExploreRadiusKm,
} from './exploreUrlState'
import { ExploreListingCard } from './ExploreListingCard'
import { ExploreMapBoundary } from './ExploreMapBoundary'
import { ExploreNoteMarkers } from './ExploreNoteMarkers'
import { ExploreRadiusCircle } from './ExploreRadiusCircle'
import { ExploreSearch, type ExploreSuggestion } from './ExploreSearch'
import { useNearbyListings } from './useNearbyListings'
import type { NearbyListingItem } from './nearbyListings'
import './ExploreScene.css'

const RoomDetailModal = lazy(() =>
  import('../../map/listings/RoomDetailModal').then(module => ({ default: module.RoomDetailModal })),
)

type BudgetId = 'all' | 'low' | 'mid' | 'high'
type CategoryId = 'all' | 'room' | 'apartment'

const BUDGETS: Array<{ id: BudgetId; label: string; min?: number; max?: number }> = [
  { id: 'all', label: 'Giá' },
  { id: 'low', label: 'Dưới 3 triệu', max: 2_999_999 },
  { id: 'mid', label: '3–5 triệu', min: 3_000_000, max: 5_000_000 },
  { id: 'high', label: 'Trên 5 triệu', min: 5_000_001 },
]

const NO_POSTS: never[] = []
const NO_SOURCE_PINS: never[] = []

const MAP_FALLBACK = (
  <p className="explore-scene__map-fallback" role="status">
    Bản đồ đang tạm thời không khả dụng. Bạn vẫn xem được danh sách phòng.
  </p>
)

function priceBounds(budget: BudgetId): { minPrice?: number; maxPrice?: number } {
  const row = BUDGETS.find(item => item.id === budget)
  if (!row || budget === 'all') return {}
  return { minPrice: row.min, maxPrice: row.max }
}

/** Zoom that keeps the whole search circle (plus a margin) inside the map box. */
function zoomForRadius(lat: number, radiusKm: number, box: HTMLElement | null): number {
  const px = box ? Math.min(box.clientWidth, box.clientHeight) : 0
  if (px < 120) return MAP_FOCUS_ZOOM
  const metersPerPx = (radiusKm * 2000 * 1.18) / px
  const zoom = Math.log2((156543.03392 * Math.cos((lat * Math.PI) / 180)) / metersPerPx)
  return Math.max(11, Math.min(16, Math.round(zoom * 4) / 4))
}

const TODAY_LABEL = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' }).format(new Date())

function alignExploreScene() {
  scrollLandingTo('map', { immediate: true })
}

export function ExploreScene() {
  const sectionNode = useRef<HTMLElement | null>(null)
  const [nearRef, nearSection] = useNearViewport<HTMLElement>('100% 0px')
  const setSectionRef = useCallback((node: HTMLElement | null) => {
    sectionNode.current = node
    nearRef(node)
  }, [nearRef])

  const { apiKey, isLoaded: mapsLoaded, loadError: mapsLoadError, requestLoad } = useGoogleMapsStatus()
  const mapsCrashedRef = useRef(false)
  const [mapsCrashed, setMapsCrashed] = useState(false)
  const [mapsAllowed, setMapsAllowed] = useState(false)
  const mapsUnavailable = Boolean(mapsLoadError) || mapsCrashed || (!apiKey && mapsLoaded)
  const mapsReady = Boolean(apiKey && mapsLoaded && !mapsLoadError && mapsAllowed && !mapsCrashed)

  const markMapsDown = useCallback((text = '') => {
    if (
      text &&
      !/RefererNotAllowed|InvalidKeyMapError|ApiNotActivated|BillingNotEnabled|ApiTargetBlocked|gm_authFailure|getRootNode|Google Maps JavaScript API error/i.test(
        text,
      )
    ) {
      return
    }
    mapsCrashedRef.current = true
    setMapsAllowed(false)
    setMapsCrashed(true)
  }, [])

  useEffect(() => {
    if (nearSection && !mapsUnavailable) requestLoad?.()
  }, [mapsUnavailable, nearSection, requestLoad])

  useEffect(() => {
    const previous = (window as Window & { gm_authFailure?: () => void }).gm_authFailure
    ;(window as Window & { gm_authFailure?: () => void }).gm_authFailure = () => {
      markMapsDown('gm_authFailure')
      previous?.()
    }

    const onWindowError = (event: ErrorEvent) => {
      markMapsDown(`${event.message ?? ''} ${event.error ?? ''}`)
    }
    const onRejection = (event: PromiseRejectionEvent) => {
      markMapsDown(String(event.reason ?? ''))
    }
    const originalError = console.error.bind(console)
    console.error = (...args: unknown[]) => {
      markMapsDown(args.map(String).join(' '))
      originalError(...args)
    }

    window.addEventListener('error', onWindowError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      if (previous) (window as Window & { gm_authFailure?: () => void }).gm_authFailure = previous
      else delete (window as Window & { gm_authFailure?: () => void }).gm_authFailure
      window.removeEventListener('error', onWindowError)
      window.removeEventListener('unhandledrejection', onRejection)
      console.error = originalError
    }
  }, [markMapsDown])

  /**
   * Probe a throwaway Map before mounting RentalMap. Referer/auth failures then
   * stay off the MarkerClusterer path (cluster cleanup throws getRootNode into App ErrorBoundary).
   */
  useEffect(() => {
    if (!nearSection || !mapsLoaded || !apiKey || mapsUnavailable) return undefined

    let cancelled = false
    let map: google.maps.Map | null = null
    let idleAllowTimer = 0
    let failTimer = 0
    const host = document.createElement('div')
    host.setAttribute('aria-hidden', 'true')
    host.style.cssText =
      'position:fixed;width:120px;height:120px;left:0;top:0;opacity:0;pointer-events:none;z-index:-1;overflow:hidden'

    const succeed = () => {
      if (cancelled || mapsCrashedRef.current) return
      window.clearTimeout(failTimer)
      window.clearTimeout(idleAllowTimer)
      setMapsAllowed(true)
    }

    // Defer probe work so setState stays in async callbacks (eslint react-hooks/set-state-in-effect).
    const startTimer = window.setTimeout(() => {
      if (cancelled) return
      if (typeof google === 'undefined' || !google.maps?.Map) {
        markMapsDown('Google Maps JavaScript API error')
        return
      }
      document.body.appendChild(host)
      // Only mount RentalMap after tiles prove auth works. Denied origins error out first.
      failTimer = window.setTimeout(() => markMapsDown('Google Maps JavaScript API error'), 3500)
      try {
        map = new google.maps.Map(host, {
          center: { lat: GUEST_DEFAULT_FOCUS.lat, lng: GUEST_DEFAULT_FOCUS.lng },
          zoom: 11,
          disableDefaultUI: true,
          gestureHandling: 'none',
          clickableIcons: false,
        })
        google.maps.event.addListenerOnce(map, 'tilesloaded', succeed)
        google.maps.event.addListenerOnce(map, 'idle', () => {
          // idle can beat auth console errors on denied origins — wait briefly.
          idleAllowTimer = window.setTimeout(succeed, 900)
        })
      } catch {
        markMapsDown('Google Maps JavaScript API error')
      }
    }, 0)

    return () => {
      cancelled = true
      window.clearTimeout(startTimer)
      window.clearTimeout(failTimer)
      window.clearTimeout(idleAllowTimer)
      try {
        if (map) google.maps.event.clearInstanceListeners(map)
      } catch {
        /* Maps may already be in a denied state */
      }
      host.remove()
    }
  }, [apiKey, mapsLoaded, mapsUnavailable, markMapsDown, nearSection])

  const { schools } = useNearbyGuestSchools(nearSection && mapsReady)

  const [searchParams, setSearchParams] = useSearchParams()
  const urlState = readExploreUrlState(searchParams)

  const [queryText, setQueryText] = useState(urlState.query)
  const [radiusKm, setRadiusKm] = useState<ExploreRadiusKm>(urlState.radiusKm)
  const [placeLabel, setPlaceLabel] = useState(urlState.query || 'Thủ Đức – Quận 9')
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(
    { lat: GUEST_DEFAULT_FOCUS.lat, lng: GUEST_DEFAULT_FOCUS.lng },
  )
  const [selectedPlacePin, setSelectedPlacePin] = useState<{ lat: number; lng: number; title?: string } | null>(null)
  const [defaultMode, setDefaultMode] = useState(!urlState.query)
  const [bounds, setBounds] = useState<MapSearchBBox | null>(null)
  const [pendingBounds, setPendingBounds] = useState<MapSearchBBox | null>(null)
  const [showSearchHere, setShowSearchHere] = useState(false)

  const [category, setCategory] = useState<CategoryId>('all')
  const [budget, setBudget] = useState<BudgetId>('all')
  const [districtId, setDistrictId] = useState('')
  const [wardId, setWardId] = useState('')
  const [schoolId, setSchoolId] = useState('')
  const [keywordFilter, setKeywordFilter] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)

  const [mapFocus, setMapFocus] = useState<{ lat: number; lng: number; zoom?: number } | null>({
    ...GUEST_DEFAULT_FOCUS,
  })
  const [focusToken, setFocusToken] = useState(0)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [locationHint, setLocationHint] = useState('')

  const [hoveredPostId, setHoveredPostId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detailPostId, setDetailPostId] = useState<string | null>(null)
  const [detailSource, setDetailSource] = useState<NearbyListingItem | null>(null)
  const [savedIds, setSavedIds] = useState<ReadonlySet<string>>(() => new Set())
  const [mobileExpanded, setMobileExpanded] = useState(
    () => searchParams.get('view') === 'list',
  )

  const listRef = useRef<HTMLDivElement>(null)
  const mapBoxRef = useRef<HTMLDivElement>(null)
  const detailSave = useRentalPostSave(detailPostId ?? '')

  const filters = useMemo(() => {
    const prices = priceBounds(budget)
    return {
      keyword: keywordFilter.trim() || undefined,
      propertyCategory: category === 'all' ? undefined : category,
      ...prices,
    }
  }, [budget, category, keywordFilter])

  const { items, status, error: listError, retry } = useNearbyListings({
    enabled: nearSection,
    center,
    radiusKm,
    bounds,
    defaultMode,
    filters,
  })

  const visibleItems = useMemo(() => {
    return items.filter(item => {
      if (category === 'all') return true
      return matchesRentalPropertyCategory(
        category === 'apartment' ? 'apartments' : 'rooms',
        item.title,
        item.address,
      )
    })
  }, [category, items])

  const syncUrl = useCallback((next: { query?: string | null; radiusKm?: ExploreRadiusKm | null }) => {
    setSearchParams(previous => writeExploreUrlState(previous, next), { replace: true })
  }, [setSearchParams])

  const flyTo = useCallback((lat: number, lng: number, title: string, options?: { writeUrl?: boolean; query?: string }) => {
    setCenter({ lat, lng })
    setSelectedPlacePin({ lat, lng, title })
    setMapFocus({ lat, lng, zoom: zoomForRadius(lat, radiusKm, mapBoxRef.current) })
    setFocusToken(token => token + 1)
    setPlaceLabel(title)
    setDefaultMode(false)
    setBounds(null)
    setShowSearchHere(false)
    setPendingBounds(null)
    if (options?.writeUrl !== false) {
      syncUrl({ query: options?.query ?? title, radiusKm })
    }
    requestAnimationFrame(() => alignExploreScene())
  }, [radiusKm, syncUrl])

  const applyArea = useCallback((area: GuestAreaOption) => {
    setKeywordFilter('')
    setQueryText(area.label)
    flyTo(area.focus.lat, area.focus.lng, area.label, { query: area.label })
  }, [flyTo])

  const onPickSuggestion = useCallback(async (suggestion: ExploreSuggestion) => {
    if (suggestion.kind === 'area') {
      applyArea(suggestion.area)
      return
    }
    const resolved = await resolvePlaceCoordinates(suggestion.placeId)
    if (!resolved) return
    setKeywordFilter('')
    setQueryText(resolved.name)
    flyTo(resolved.lat, resolved.lng, resolved.name, { query: resolved.name })
  }, [applyArea, flyTo])

  const onSubmitText = useCallback(async (raw: string) => {
    const text = raw.trim()
    if (text.length < 2) return
    const resolved = await resolveSearchLocation(text)
    if (resolved) {
      setKeywordFilter('')
      setQueryText(resolved.name)
      flyTo(resolved.lat, resolved.lng, resolved.name, { query: resolved.name })
      return
    }
    setKeywordFilter(text)
    setPlaceLabel(text)
    setDefaultMode(false)
    setSelectedPlacePin(null)
    setCenter(prev => prev ?? { lat: GUEST_DEFAULT_FOCUS.lat, lng: GUEST_DEFAULT_FOCUS.lng })
    syncUrl({ query: text, radiusKm })
    requestAnimationFrame(() => alignExploreScene())
  }, [flyTo, radiusKm, syncUrl])

  useEffect(() => {
    const onSearch = (event: Event) => {
      const keyword = (event as CustomEvent<string>).detail?.trim()
      if (!keyword) return
      setQueryText(keyword)
      void onSubmitText(keyword)
    }
    window.addEventListener(LANDING_SEARCH_EVENT, onSearch)
    return () => window.removeEventListener(LANDING_SEARCH_EVENT, onSearch)
  }, [onSubmitText])

  const bootQueryRef = useRef(urlState.query)
  useEffect(() => {
    const boot = bootQueryRef.current.trim()
    if (!boot) return undefined
    bootQueryRef.current = ''
    const timer = window.setTimeout(() => { void onSubmitText(boot) }, 0)
    return () => window.clearTimeout(timer)
  }, [onSubmitText])

  const onRadiusChange = (next: ExploreRadiusKm) => {
    setRadiusKm(next)
    if (!defaultMode && center) {
      setMapFocus({ lat: center.lat, lng: center.lng, zoom: zoomForRadius(center.lat, next, mapBoxRef.current) })
      setFocusToken(token => token + 1)
    }
    syncUrl({ radiusKm: next, query: defaultMode ? null : placeLabel })
  }

  const expandTo3km = () => onRadiusChange(3)

  const showWholeArea = () => {
    setQueryText('')
    setKeywordFilter('')
    setPlaceLabel('Thủ Đức – Quận 9')
    setDefaultMode(true)
    setCenter({ lat: GUEST_DEFAULT_FOCUS.lat, lng: GUEST_DEFAULT_FOCUS.lng })
    setSelectedPlacePin(null)
    setBounds({ ...HOMEJI_SERVICE_AREA })
    setMapFocus({ ...GUEST_DEFAULT_FOCUS })
    setFocusToken(token => token + 1)
    setShowSearchHere(false)
    syncUrl({ query: null, radiusKm })
  }

  const onLocate = async () => {
    setLocating(true)
    setLocationHint('')
    try {
      const location = await getDeviceLocation()
      setUserLocation({ lat: location.lat, lng: location.lng })
      setKeywordFilter('')
      flyTo(location.lat, location.lng, 'Vị trí của tôi', { writeUrl: false })
      setQueryText('')
      syncUrl({ query: null, radiusKm })
    } catch (reason) {
      const message = reason instanceof DeviceLocationError
        ? reason.message
        : 'Chưa lấy được vị trí. Bạn có thể tìm theo khu vực.'
      setLocationHint(message)
    } finally {
      setLocating(false)
    }
  }

  const scrollCardIntoView = (id: string) => {
    const node = listRef.current?.querySelector<HTMLElement>(`[data-listing-id="${CSS.escape(id)}"]`)
    node?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
  }

  const openItem = (item: NearbyListingItem) => {
    setSelectedId(item.id)
    if (item.kind === 'homeji') setDetailPostId(item.id)
    else setDetailSource(item)
  }

  const onSelectPost = (postId: string) => {
    setSelectedId(postId)
    scrollCardIntoView(postId)
    const item = visibleItems.find(row => row.id === postId)
    if (item) openItem(item)
  }

  const wards = useMemo(() => (districtId ? wardsForDistrict(districtId) : GUEST_WARDS), [districtId])
  const schoolsForFilter = useMemo(() => {
    if (!wardId) return schools
    return schools.filter(school => school.wardIds?.includes(wardId))
  }, [schools, wardId])

  const resultTitle = defaultMode
    ? `${visibleItems.length} phòng quanh ${placeLabel}`
    : `${visibleItems.length} phòng trong ${radiusKm} km quanh ${placeLabel}`

  const setSaved = (postId: string, saved: boolean) => {
    setSavedIds(previous => {
      const next = new Set(previous)
      if (saved) next.add(postId)
      else next.delete(postId)
      return next
    })
  }

  const filterControls = (
    <>
      <button type="button" className={category === 'room' ? 'is-active' : undefined} aria-pressed={category === 'room'} onClick={() => setCategory(value => value === 'room' ? 'all' : 'room')}>Phòng trọ</button>
      <button type="button" className={category === 'apartment' ? 'is-active' : undefined} aria-pressed={category === 'apartment'} onClick={() => setCategory(value => value === 'apartment' ? 'all' : 'apartment')}>Căn hộ</button>
      <label className="explore-scene__select">
        <span className="visually-hidden">Mức giá</span>
        <select value={budget} onChange={event => setBudget(event.target.value as BudgetId)} aria-label="Mức giá">
          {BUDGETS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </label>
      <label className="explore-scene__select">
        <span className="visually-hidden">Quận</span>
        <select
          value={districtId}
          aria-label="Quận"
          onChange={event => {
            const id = event.target.value
            setDistrictId(id)
            setWardId('')
            setSchoolId('')
            const district = GUEST_DISTRICTS.find(row => row.id === id)
            if (district) applyArea(district)
          }}
        >
          <option value="">Quận / khu vực</option>
          {GUEST_DISTRICTS.map(row => <option key={row.id} value={row.id}>{row.label}</option>)}
        </select>
      </label>
      <label className="explore-scene__select">
        <span className="visually-hidden">Phường</span>
        <select
          value={wardId}
          aria-label="Phường"
          onChange={event => {
            const id = event.target.value
            setWardId(id)
            setSchoolId('')
            const ward = wards.find(row => row.id === id)
            if (ward) applyArea(ward)
          }}
        >
          <option value="">Phường</option>
          {wards.map(row => <option key={row.id} value={row.id}>{row.label}</option>)}
        </select>
      </label>
      <label className="explore-scene__select">
        <span className="visually-hidden">Gần trường</span>
        <select
          value={schoolId}
          aria-label="Gần trường"
          onChange={event => {
            const id = event.target.value
            setSchoolId(id)
            const school = schoolsForFilter.find(row => row.id === id)
            if (school) applyArea(school)
          }}
        >
          <option value="">Gần trường</option>
          {schoolsForFilter.map(row => <option key={row.id} value={row.id}>{row.label}</option>)}
        </select>
      </label>
    </>
  )

  return (
    <section
      id="map"
      ref={setSectionRef}
      className={`explore-scene${mobileExpanded ? ' is-list-expanded' : ''}${mapsUnavailable ? ' is-mapless' : ''}${filtersOpen ? ' is-filters-open' : ''}`}
      data-landing-scene="map"
    >
      <p className="explore-scene__date" aria-hidden="true">{TODAY_LABEL}</p>
      <header className="explore-scene__heading">
        <h2 className="explore-scene__title">
          Tìm phòng <mark>quanh nơi bạn muốn ở</mark>
        </h2>
      </header>

      <div className="explore-scene__toolbar">
        <ExploreSearch
          value={queryText}
          onValueChange={setQueryText}
          onPickSuggestion={suggestion => void onPickSuggestion(suggestion)}
          onSubmitText={value => void onSubmitText(value)}
          schools={schools}
          mapsReady={mapsReady}
        />
        <div className="explore-scene__radius" role="group" aria-label="Bán kính tìm kiếm">
          {EXPLORE_RADIUS_OPTIONS.map(option => (
            <button
              key={option}
              type="button"
              className={radiusKm === option ? 'is-active' : undefined}
              aria-pressed={radiusKm === option}
              onClick={() => onRadiusChange(option)}
            >
              {option} km
            </button>
          ))}
        </div>
      </div>

      <div className="explore-scene__filters explore-scene__filters--desktop" role="toolbar" aria-label="Bộ lọc phòng">
        {filterControls}
      </div>

      <div className="explore-scene__filters-mobile">
        <button
          type="button"
          className="explore-scene__filters-toggle"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen(value => !value)}
        >
          Bộ lọc
        </button>
        {filtersOpen ? (
          <div className="explore-scene__filters-panel" role="dialog" aria-label="Bộ lọc phòng">
            {filterControls}
            <button type="button" className="explore-ink-btn" onClick={() => setFiltersOpen(false)}>Xong</button>
          </div>
        ) : null}
      </div>

      <div className="explore-scene__body">
        <div
          id="listings"
          className="explore-scene__list"
          data-lenis-prevent
          ref={listRef}
        >
          <div className="explore-scene__list-head">
            <h3>{resultTitle}</h3>
            <button
              type="button"
              className="explore-scene__expand-mobile"
              aria-expanded={mobileExpanded}
              onClick={() => setMobileExpanded(value => !value)}
            >
              {mobileExpanded ? 'Thu gọn' : 'Xem dạng danh sách'}
            </button>
            {locationHint ? <p className="explore-scene__hint" role="status">{locationHint}</p> : null}
          </div>

          {status === 'loading' || status === 'idle' ? (
            <ul className="explore-scene__skeletons" aria-busy="true" aria-label="Đang tải">
              {Array.from({ length: 5 }, (_, index) => (
                <li key={index} className="explore-card explore-card--skeleton" />
              ))}
            </ul>
          ) : null}

          {status === 'error' ? (
            <div className="explore-scene__state" role="alert">
              <p>Chưa tải được danh sách phòng.</p>
              {listError && listError !== 'Chưa tải được danh sách phòng.' ? (
                <p className="explore-scene__hint">{listError}</p>
              ) : null}
              <button type="button" className="explore-ink-btn" onClick={retry}>Thử lại</button>
            </div>
          ) : null}

          {status === 'empty' ? (
            <div className="explore-scene__state" role="status">
              <p>Chưa có phòng trong bán kính {radiusKm} km quanh đây.</p>
              <div className="explore-scene__state-actions">
                {radiusKm < 3 ? (
                  <button type="button" className="explore-ink-btn explore-ink-btn--marked" onClick={expandTo3km}>Mở rộng tới 3 km</button>
                ) : null}
                <button type="button" className="explore-ink-btn" onClick={showWholeArea}>Xem toàn khu Thủ Đức – Quận 9</button>
              </div>
            </div>
          ) : null}

          {status === 'ready' || (status === 'error' && visibleItems.length > 0) ? (
            <ul className="explore-scene__cards">
              {visibleItems.map((item, index) => (
                <li key={`${item.kind}:${item.id}`}>
                  <ExploreListingCard
                    item={item}
                    number={index + 1}
                    hot={hoveredPostId === item.id}
                    selected={selectedId === item.id}
                    saved={savedIds.has(item.id)}
                    onSavedChange={setSaved}
                    onHover={setHoveredPostId}
                    onSelect={openItem}
                  />
                </li>
              ))}
            </ul>
          ) : null}

        </div>

        <div className="explore-scene__map" data-lenis-prevent ref={mapBoxRef}>
          <span className="explore-scene__tape explore-scene__tape--tl" aria-hidden="true" />
          <span className="explore-scene__tape explore-scene__tape--tr" aria-hidden="true" />
          <span className="explore-scene__tape explore-scene__tape--br" aria-hidden="true" />
          <span className="explore-scene__tape explore-scene__tape--bl" aria-hidden="true" />
          {mapsUnavailable ? MAP_FALLBACK : nearSection && mapsAllowed ? (
            <ExploreMapBoundary
              fallback={MAP_FALLBACK}
              onError={() => {
                queueMicrotask(() => markMapsDown())
              }}
            >
              {status === 'loading' ? <div className="explore-scene__map-progress" aria-hidden="true" /> : null}
              <RentalMap
                posts={NO_POSTS}
                sourceRentalPins={NO_SOURCE_PINS}
                showSourceCatalog={false}
                selectedPostId={null}
                hoveredPostId={null}
                onSelectPost={onSelectPost}
                selectedPlacePin={null}
                focus={mapFocus}
                focusToken={focusToken}
                userLocation={userLocation}
                onLocate={() => void onLocate()}
                locating={locating}
                markerVariant="price-pill"
                hideViewSwitcher
                gestureHandling="cooperative"
                selectionPad={{ top: 24, bottom: 72 }}
                onViewportIdle={next => {
                  setPendingBounds(next)
                  setShowSearchHere(true)
                }}
              />
              <ExploreNoteMarkers
                items={visibleItems}
                enabled={mapsReady}
                activeId={hoveredPostId ?? selectedId}
                onHover={setHoveredPostId}
                onSelect={onSelectPost}
              />
              <ExploreRadiusCircle
                center={selectedPlacePin ?? (defaultMode ? null : center)}
                radiusKm={radiusKm}
                enabled={mapsReady && !defaultMode}
              />
              <div className="explore-scene__map-actions">
                {showSearchHere && pendingBounds ? (
                  <button
                    type="button"
                    className="explore-ink-btn explore-ink-btn--paper"
                    onClick={() => {
                      setBounds(pendingBounds)
                      setDefaultMode(false)
                      setKeywordFilter('')
                      setCenter({
                        lat: (pendingBounds.minLatitude + pendingBounds.maxLatitude) / 2,
                        lng: (pendingBounds.minLongitude + pendingBounds.maxLongitude) / 2,
                      })
                      setShowSearchHere(false)
                      setPlaceLabel('khu vực trên bản đồ')
                    }}
                  >
                    Tìm trong khu vực này
                  </button>
                ) : null}
              </div>
            </ExploreMapBoundary>
          ) : (
            <div className="explore-scene__map-placeholder" aria-hidden="true">
              {nearSection ? <div className="explore-scene__map-progress" aria-hidden="true" /> : null}
            </div>
          )}
        </div>
      </div>

      <div className="explore-scene__continue">
        <button
          type="button"
          className="explore-scene__continue-link"
          onClick={() => scrollLandingTo('how')}
        >
          Tiếp tục xem Homeji
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path d="M8 2.5v10M3.5 8.5 8 13l4.5-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {detailPostId ? (
        <Suspense fallback={null}>
          <RoomDetailModal
            listingId={detailPostId}
            saved={detailSave.saved || savedIds.has(detailPostId)}
            saveBusy={detailSave.busy}
            saveError={detailSave.error}
            onClose={() => setDetailPostId(null)}
            onToggleSave={() => { void detailSave.toggle() }}
          />
        </Suspense>
      ) : null}

      {detailSource?.source ? (
        <SourceRoomDetail
          id={detailSource.id}
          summary={detailSource.source}
          onClose={() => setDetailSource(null)}
        />
      ) : detailSource ? (
        <SourceRoomDetail
          id={detailSource.id}
          onClose={() => setDetailSource(null)}
        />
      ) : null}
    </section>
  )
}
