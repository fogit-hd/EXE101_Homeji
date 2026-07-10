import { useMapsLibrary } from '@vis.gl/react-google-maps'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { searchRentalPosts, type RentalPostSummary } from '../api'
import { HomejiLoader, SERVICE_RETRY_MS, useHomejiLoading } from '../components/HomejiLoader'
import { MapListingCard } from '../components/MapListingCard'
import { RentalMap } from '../components/map/RentalMap'
import { useAuth } from '../contexts/AuthContext'
import { useGoogleMaps } from '../contexts/GoogleMapsProvider'
import { useOnReconnect } from '../contexts/NetworkStatusContext'
import { getErrorMessage, isServiceDisruption } from '../lib/errors'
import { AMENITY_OPTIONS } from '../lib/labels'
import './HomePage.css'

type AreaSuggestion = {
  id: string
  label: string
  subtitle?: string
  keyword: string
  lat?: number
  lng?: number
  placeId?: string
}

/** Chỉ mount khi có API key + APIProvider — tránh crash useMapsLibrary. */
function usePlacePredictions(keyword: string, enabled: boolean): AreaSuggestion[] {
  const placesLib = useMapsLibrary('places')
  const [placeSuggestions, setPlaceSuggestions] = useState<AreaSuggestion[]>([])

  useEffect(() => {
    const q = keyword.trim()
    if (!enabled || !q || q.length < 2 || !placesLib) {
      setPlaceSuggestions([])
      return
    }

    let cancelled = false
    const t = window.setTimeout(() => {
      const service = new placesLib.AutocompleteService()
      service.getPlacePredictions(
        {
          input: q,
          componentRestrictions: { country: 'vn' },
          types: ['geocode', 'establishment'],
        },
        (predictions, status) => {
          if (cancelled) return
          if (status !== google.maps.places.PlacesServiceStatus.OK || !predictions) {
            setPlaceSuggestions([])
            return
          }
          setPlaceSuggestions(
            predictions.slice(0, 5).map((p) => ({
              id: `place:${p.place_id}`,
              placeId: p.place_id,
              label: p.structured_formatting?.main_text ?? p.description,
              subtitle: p.structured_formatting?.secondary_text,
              keyword: p.structured_formatting?.main_text ?? p.description,
            })),
          )
        },
      )
    }, 220)

    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [keyword, placesLib, enabled])

  return placeSuggestions
}

function PlacePredictionsBridge({
  keyword,
  onResults,
}: {
  keyword: string
  onResults: (items: AreaSuggestion[]) => void
}) {
  const items = usePlacePredictions(keyword, true)
  useEffect(() => {
    onResults(items)
  }, [items, onResults])
  return null
}

/** Gợi ý khu vực Thủ Đức / Q.9 — hiện ngay dưới ô tìm kiếm khi gõ. */
const AREA_SUGGESTIONS: AreaSuggestion[] = [
  {
    id: 'lang-dh',
    label: 'Làng Đại học',
    subtitle: 'Thủ Đức',
    keyword: 'Làng Đại học',
    lat: 10.8701,
    lng: 106.803,
  },
  {
    id: 'uit',
    label: 'Đại học Công nghệ Thông tin',
    subtitle: 'UIT · Thủ Đức',
    keyword: 'UIT',
    lat: 10.8701,
    lng: 106.803,
  },
  {
    id: 'bk',
    label: 'Đại học Bách Khoa',
    subtitle: 'CS2 · Thủ Đức',
    keyword: 'Bách Khoa',
    lat: 10.8413,
    lng: 106.8099,
  },
  {
    id: 'vincom',
    label: 'Vincom Mega Mall Grand Park',
    subtitle: 'Q.9 · Thủ Đức',
    keyword: 'Vincom Grand Park',
    lat: 10.8431,
    lng: 106.8435,
  },
  {
    id: 'suoi-tien',
    label: 'Suối Tiên',
    subtitle: 'Thủ Đức',
    keyword: 'Suối Tiên',
    lat: 10.866,
    lng: 106.805,
  },
  {
    id: 'vlu',
    label: 'Đại học Văn Lang',
    subtitle: 'CS3 · Thủ Đức',
    keyword: 'Văn Lang',
    lat: 10.855,
    lng: 106.786,
  },
  {
    id: 'q9',
    label: 'Quận 9',
    subtitle: 'Thủ Đức',
    keyword: 'Quận 9',
    lat: 10.842,
    lng: 106.828,
  },
  {
    id: 'thu-duc',
    label: 'Thủ Đức',
    subtitle: 'TP. Hồ Chí Minh',
    keyword: 'Thủ Đức',
    lat: 10.8505,
    lng: 106.772,
  },
]

function matchLocalSuggestions(query: string): AreaSuggestion[] {
  const q = query.trim().toLowerCase()
  if (!q) return AREA_SUGGESTIONS.slice(0, 5)
  return AREA_SUGGESTIONS.filter(
    (s) =>
      s.label.toLowerCase().includes(q) ||
      s.keyword.toLowerCase().includes(q) ||
      (s.subtitle?.toLowerCase().includes(q) ?? false),
  ).slice(0, 6)
}

export function HomePage() {
  const { isAuthenticated, isLoading, needsProfileSetup } = useAuth()
  const { apiKey, isLoaded: mapsLoaded } = useGoogleMaps()
  const [posts, setPosts] = useState<RentalPostSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [disrupted, setDisrupted] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([])
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [searchExpanded, setSearchExpanded] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const [placeSuggestions, setPlaceSuggestions] = useState<AreaSuggestion[]>([])
  const [mapFocus, setMapFocus] = useState<{ lat: number; lng: number; zoom?: number } | null>(
    null,
  )
  const listRef = useRef<HTMLDivElement>(null)
  const searchWrapRef = useRef<HTMLDivElement>(null)
  const disruptedRef = useRef(false)
  disruptedRef.current = disrupted
  const filtersRef = useRef({ keyword, minPrice, maxPrice, selectedAmenities })
  filtersRef.current = { keyword, minPrice, maxPrice, selectedAmenities }
  const authGate = useHomejiLoading(isLoading)
  const postsGate = useHomejiLoading(loading, disrupted)
  const placesEnabled = Boolean(apiKey && mapsLoaded)

  const onPlaceResults = useCallback((items: AreaSuggestion[]) => {
    setPlaceSuggestions(items)
  }, [])

  const loadPosts = useCallback(async () => {
    if (!disruptedRef.current) setLoading(true)
    setError('')
    const { keyword: kw, minPrice: minP, maxPrice: maxP, selectedAmenities: am } =
      filtersRef.current
    try {
      const data = await searchRentalPosts({
        keyword: kw || undefined,
        minPrice: minP ? Number(minP) : undefined,
        maxPrice: maxP ? Number(maxP) : undefined,
        amenities: am.length ? am : undefined,
      })
      setPosts(data)
      setSelectedPostId((prev) => (prev && data.some((p) => p.id === prev) ? prev : null))
      setDisrupted(false)
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể tải danh sách phòng'))
      setDisrupted(isServiceDisruption(err))
    } finally {
      setLoading(false)
    }
  }, [])

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

  // Chip amenity → auto search (debounce)
  const amenitiesKey = selectedAmenities.slice().sort().join('|')
  const skipAmenitySearch = useRef(true)
  useEffect(() => {
    if (!isAuthenticated || isLoading) return
    if (skipAmenitySearch.current) {
      skipAmenitySearch.current = false
      return
    }
    const t = window.setTimeout(() => void loadPosts(), 350)
    return () => window.clearTimeout(t)
  }, [amenitiesKey, isAuthenticated, isLoading, loadPosts])

  useEffect(() => {
    if (!placesEnabled) setPlaceSuggestions([])
  }, [placesEnabled])

  useEffect(() => {
    const onPointer = (e: MouseEvent) => {
      if (!searchWrapRef.current?.contains(e.target as Node)) {
        setSearchFocused(false)
      }
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [])

  const localSuggestions = useMemo(() => matchLocalSuggestions(keyword), [keyword])

  const suggestions = useMemo(() => {
    const seen = new Set<string>()
    const merged: AreaSuggestion[] = []
    for (const s of [...localSuggestions, ...placeSuggestions]) {
      const key = s.label.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      merged.push(s)
      if (merged.length >= 7) break
    }
    return merged
  }, [localSuggestions, placeSuggestions])

  const showSuggestions = searchFocused && suggestions.length > 0

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity],
    )
  }

  const handleSelectPost = (postId: string) => {
    setSelectedPostId(postId)
    const el = listRef.current?.querySelector(`[data-post-id="${postId}"]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  const applySuggestion = (s: AreaSuggestion) => {
    setKeyword(s.keyword)
    setSearchFocused(false)
    setSearchExpanded(false)
    if (s.lat != null && s.lng != null) {
      setMapFocus({ lat: s.lat, lng: s.lng, zoom: 15 })
    } else if (s.placeId && placesEnabled && typeof google !== 'undefined') {
      const div = document.createElement('div')
      const svc = new google.maps.places.PlacesService(div)
      svc.getDetails(
        { placeId: s.placeId, fields: ['geometry', 'name', 'formatted_address'] },
        (place) => {
          const loc = place?.geometry?.location
          if (loc) setMapFocus({ lat: loc.lat(), lng: loc.lng(), zoom: 15 })
        },
      )
    }
    filtersRef.current = {
      ...filtersRef.current,
      keyword: s.keyword,
    }
    void loadPosts()
  }

  if (authGate.showLoader) {
    return <HomejiLoader fullPage onIntroComplete={authGate.onIntroComplete} />
  }

  if (!isAuthenticated) {
    return (
      <section className="hero-section">
        <div className="container hero-content">
          <h1 className="page-title">Tìm phòng trọ & bạn ở ghép dễ dàng</h1>
          <p className="page-subtitle">
            Homeji kết nối người thuê, chủ nhà và bạn cùng phòng — nhanh chóng, minh bạch, an toàn.
          </p>
          <div className="hero-actions">
            <Link to="/register" className="btn btn-primary">
              Bắt đầu ngay
            </Link>
            <Link to="/login" className="btn btn-secondary">
              Đăng nhập
            </Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <div className="home-map-page">
      {placesEnabled && (
        <PlacePredictionsBridge keyword={keyword} onResults={onPlaceResults} />
      )}
      <section className="home-map-panel">
        <RentalMap
          posts={posts}
          selectedPostId={selectedPostId}
          onSelectPost={handleSelectPost}
          onClearSelection={() => setSelectedPostId(null)}
          focus={mapFocus}
        />

        <div className={`home-map-overlay${searchExpanded ? ' is-expanded' : ''}`}>
          <button
            type="button"
            className="home-map-search-toggle"
            aria-expanded={searchExpanded}
            onClick={() => setSearchExpanded((v) => !v)}
          >
            <span aria-hidden>⌕</span>
            <span className="home-map-search-toggle-text">
              {keyword || 'Tìm khu vực, giá, tiện ích…'}
            </span>
            <span className="home-map-search-toggle-chevron" aria-hidden>
              {searchExpanded ? '▴' : '▾'}
            </span>
          </button>

          <form
            className="home-map-search"
            onSubmit={(e) => {
              e.preventDefault()
              setSearchFocused(false)
              void loadPosts()
              setSearchExpanded(false)
            }}
          >
            <div className="home-map-search-field home-map-search-field-grow" ref={searchWrapRef}>
              <span className="home-map-search-icon" aria-hidden>
                ⌕
              </span>
              <input
                className="home-map-search-input"
                placeholder="Tìm kiếm khu vực (ví dụ: Làng Đại học)..."
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value)
                  setSearchFocused(true)
                }}
                onFocus={() => setSearchFocused(true)}
                autoComplete="off"
                role="combobox"
                aria-expanded={showSuggestions}
                aria-controls="home-search-suggestions"
                aria-autocomplete="list"
              />
              {showSuggestions && (
                <ul
                  id="home-search-suggestions"
                  className="home-search-suggestions"
                  role="listbox"
                >
                  {suggestions.map((s) => (
                    <li key={s.id} role="option">
                      <button
                        type="button"
                        className="home-search-suggestion"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => applySuggestion(s)}
                      >
                        <span className="home-search-suggestion-label">{s.label}</span>
                        {s.subtitle && (
                          <span className="home-search-suggestion-sub">{s.subtitle}</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="home-map-search-field">
              <span className="home-map-search-label">Giá tối thiểu</span>
              <input
                className="home-map-search-input home-map-search-input-sm"
                type="number"
                placeholder="VND"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
              />
            </div>
            <div className="home-map-search-field">
              <span className="home-map-search-label">Giá tối đa</span>
              <input
                className="home-map-search-input home-map-search-input-sm"
                type="number"
                placeholder="VND"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-sm">
              Tìm
            </button>
          </form>

          <div className="home-map-chips">
            {AMENITY_OPTIONS.slice(0, 6).map((amenity) => (
              <button
                key={amenity}
                type="button"
                className={`amenity-chip ${selectedAmenities.includes(amenity) ? 'active' : ''}`}
                onClick={() => toggleAmenity(amenity)}
              >
                {amenity}
              </button>
            ))}
          </div>
        </div>

        {needsProfileSetup && (
          <div className="home-map-banner">
            Chào mừng! <Link to="/profile">Hoàn thiện hồ sơ</Link> để được gợi ý phòng tốt hơn.
          </div>
        )}
      </section>

      <aside className="home-list-panel">
        <div className="home-list-header">
          <h1>Khu vực Thủ Đức & Q.9</h1>
          <p>
            {loading
              ? 'Đang tải tin đăng...'
              : `${posts.length} phòng phù hợp dành cho sinh viên`}
          </p>
        </div>

        <div className="home-list-body" ref={listRef}>
          {error && !disrupted && <div className="alert alert-error">{error}</div>}

          {postsGate.showLoader ? (
            <HomejiLoader
              label="Đang tải tin đăng..."
              message={disrupted ? error : undefined}
              onIntroComplete={postsGate.onIntroComplete}
            />
          ) : posts.length === 0 ? (
            <p className="home-list-empty-hint">
              Chưa có tin phù hợp — thử gõ khu vực trên thanh tìm kiếm bản đồ.
            </p>
          ) : (
            posts.map((post, index) => (
              <div key={post.id} data-post-id={post.id}>
                <MapListingCard
                  post={post}
                  active={selectedPostId === post.id}
                  staggerIndex={index}
                  onHover={() => setSelectedPostId(post.id)}
                  onLeave={() => {
                    if (window.matchMedia('(hover: hover)').matches) {
                      setSelectedPostId(null)
                    }
                  }}
                  onSelect={() => handleSelectPost(post.id)}
                />
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  )
}
