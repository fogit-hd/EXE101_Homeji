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
import { GuestChrome } from '../components/landing/GuestChrome'
import { GuestHero } from '../components/landing/GuestHero'
import { HorizontalScrollShowcase } from '../components/landing/HorizontalScrollShowcase'
import { MissionConfetti } from '../components/landing/MissionConfetti'
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
      </div>
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
