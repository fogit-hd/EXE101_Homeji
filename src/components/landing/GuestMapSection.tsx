import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getRentalPost,
  searchRentalPosts,
  type RentalPost,
  type RentalPostSummary,
} from '../../api'
import { RentalPostCard } from '../RentalPostCard'
import { RentalMap } from '../map/RentalMap'
import { MapPlaceDetailPanel } from '../map/MapPlaceDetailPanel'
import { useAuthModal } from '../../contexts/AuthModalContext'
import { useGoogleMaps } from '../../contexts/GoogleMapsProvider'
import { getErrorMessage } from '../../lib/errors'
import type { MapPlaceDetails } from '../../lib/mapPlace'
import {
  GUEST_CITY,
  GUEST_DEFAULT_FOCUS,
  GUEST_DISTRICTS,
  buildGuestSearchKeyword,
  wardsForDistrict,
  type MapFocusPoint,
} from './guestMapAreas'
import { useNearbyGuestSchools } from './useNearbyGuestSchools'
import '../map/MapPlaceDetailPanel.css'
import './GuestMapSection.css'

const PAGE_SIZE = 24
const GUEST_SELECTION_PAD = { top: 24, bottom: 80 }

type GateIntent = 'contact' | 'save' | 'invite' | 'browse'

export function GuestMapSection() {
  const { openAuthModal } = useAuthModal()
  const { apiKey, isLoaded: mapsLoaded } = useGoogleMaps()
  const mapsReady = Boolean(apiKey && mapsLoaded)
  const { schools, loading: schoolsLoading } =
    useNearbyGuestSchools(mapsReady)

  const [districtId, setDistrictId] = useState(GUEST_DISTRICTS[0].id)
  const [wardId, setWardId] = useState('')
  const [schoolId, setSchoolId] = useState('')
  const [posts, setPosts] = useState<RentalPostSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [hoveredPostId, setHoveredPostId] = useState<string | null>(null)
  const [selectedPlace, setSelectedPlace] = useState<MapPlaceDetails | null>(null)
  const [placeLoading, setPlaceLoading] = useState(false)
  const [listingDetail, setListingDetail] = useState<RentalPost | null>(null)
  const [listingLoading, setListingLoading] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState(
    buildGuestSearchKeyword({ districtKeyword: GUEST_DISTRICTS[0].keyword }),
  )
  const [mapFocus, setMapFocus] = useState<MapFocusPoint | null>(GUEST_DEFAULT_FOCUS)
  const [mapFocusToken, setMapFocusToken] = useState(0)

  const wards = useMemo(() => wardsForDistrict(districtId), [districtId])

  const load = useCallback(async (keyword: string) => {
    setLoading(true)
    setError('')
    try {
      const data = await searchRentalPosts(
        {
          keyword: keyword.trim() || 'Thủ Đức',
          page: 1,
          pageSize: PAGE_SIZE,
        },
        { auth: false },
      )
      setPosts(data)
      setSelectedPostId(null)
      setHoveredPostId(null)
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          'Không thể tải tin đăng. Máy chủ hoặc database có thể đang lỗi — thử lại sau.',
        ),
      )
      setPosts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(searchKeyword)
  }, [load, searchKeyword])

  const applyFilters = useCallback(
    (next: { districtId?: string; wardId?: string; schoolId?: string }) => {
      const nextDistrictId = next.districtId ?? districtId
      const nextWardId = next.wardId ?? wardId
      const nextSchoolId = next.schoolId ?? schoolId

      const nextDistrict =
        GUEST_DISTRICTS.find((d) => d.id === nextDistrictId) ?? GUEST_DISTRICTS[0]
      const nextWards = wardsForDistrict(nextDistrictId)
      const nextWard = nextWards.find((w) => w.id === nextWardId)
      const nextSchool = schools.find((s) => s.id === nextSchoolId)

      const keyword = buildGuestSearchKeyword({
        schoolKeyword: nextSchool?.keyword,
        wardKeyword: nextWard?.keyword,
        districtKeyword: nextDistrict.keyword,
      })

      const focus =
        nextSchool?.focus ?? nextWard?.focus ?? nextDistrict.focus ?? GUEST_DEFAULT_FOCUS

      setSearchKeyword(keyword)
      setMapFocus({ ...focus })
      setSelectedPostId(null)
      setHoveredPostId(null)
    },
    [districtId, wardId, schoolId, schools],
  )

  const openGate = (intent: GateIntent) => {
    openAuthModal({ mode: 'register', intent })
  }

  const handleSelectPost = useCallback((postId: string) => {
    setSelectedPostId(postId)
    setSelectedPlace(null)
    setPlaceLoading(false)
    setMapFocusToken((n) => n + 1)
    setHoveredPostId(null)
  }, [])

  const handleClearSelection = useCallback(() => {
    setSelectedPostId(null)
    setSelectedPlace(null)
    setPlaceLoading(false)
    setListingDetail(null)
    setListingLoading(false)
  }, [])

  const handleSelectPlace = useCallback((place: MapPlaceDetails) => {
    setSelectedPostId(null)
    setListingDetail(null)
    setListingLoading(false)
    setSelectedPlace(place)
    setPlaceLoading(false)
  }, [])

  const handleHoverPost = useCallback((postId: string | null) => {
    if (!window.matchMedia('(hover: hover)').matches) return
    setHoveredPostId(postId)
  }, [])

  const selectedPost = useMemo(
    () => posts.find((p) => p.id === selectedPostId) ?? null,
    [posts, selectedPostId],
  )

  useEffect(() => {
    if (!selectedPostId) {
      setListingDetail(null)
      setListingLoading(false)
      return
    }
    let cancelled = false
    setListingLoading(true)
    void getRentalPost(selectedPostId, { auth: false })
      .then((post) => {
        if (cancelled) return
        setListingDetail(post)
        setListingLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setListingDetail(null)
        setListingLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedPostId])

  const detailOpen = !!(selectedPost || selectedPlace || placeLoading)

  const selectedPlacePin = useMemo(() => {
    if (selectedPost) return null
    if (!selectedPlace?.location) return null
    return {
      lat: selectedPlace.location.lat,
      lng: selectedPlace.location.lng,
      title: selectedPlace.name,
    }
  }, [selectedPost, selectedPlace])

  const handleNearby = useCallback((loc: { lat: number; lng: number }) => {
    setMapFocus({ lat: loc.lat, lng: loc.lng, zoom: 16 })
    setMapFocusToken((n) => n + 1)
  }, [])

  return (
    <section className="guest-map" id="map" aria-label="Bản đồ khu vực Thủ Đức và Quận 9">
      <div className="guest-map__shell">
        <div className="guest-map__intro">
          <p className="guest-map__eyebrow">Bản đồ</p>
          <h2 className="guest-map__title">Khám phá phòng quanh Thủ Đức &amp; Q.9</h2>

          <form
            className="guest-map__filters"
            onSubmit={(e) => {
              e.preventDefault()
              applyFilters({})
            }}
          >
            <label className="guest-map__field">
              <span>Tỉnh / Thành phố</span>
              <select className="guest-map__select" value={GUEST_CITY.id} disabled>
                <option value={GUEST_CITY.id}>{GUEST_CITY.label}</option>
              </select>
            </label>

            <label className="guest-map__field">
              <span>Quận / TP Thủ Đức</span>
              <select
                className="guest-map__select"
                value={districtId}
                onChange={(e) => {
                  const id = e.target.value
                  setDistrictId(id)
                  setWardId('')
                  setSchoolId('')
                  applyFilters({ districtId: id, wardId: '', schoolId: '' })
                }}
              >
                {GUEST_DISTRICTS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="guest-map__field">
              <span>Phường</span>
              <select
                className="guest-map__select"
                value={wardId}
                onChange={(e) => {
                  const id = e.target.value
                  setWardId(id)
                  applyFilters({ wardId: id })
                }}
              >
                <option value="">Tất cả phường</option>
                {wards.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="guest-map__field">
              <span>Gần trường {schoolsLoading ? '(đang tải…)' : ''}</span>
              <select
                className="guest-map__select"
                value={schoolId}
                onChange={(e) => {
                  const id = e.target.value
                  setSchoolId(id)
                  applyFilters({ schoolId: id })
                }}
              >
                <option value="">Chọn trường (tuỳ chọn)</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              className="guest-map__advanced"
              onClick={() => openGate('browse')}
            >
              Bộ lọc nâng cao
            </button>
          </form>

          <p className="guest-map__hint">
            {/* Đang lọc: <strong>{school?.label || ward?.label || district.label}</strong> */}
            {/* {' · '} */}
            {/* Danh sách trường: {schoolSource === 'google' ? 'Google Maps' : 'danh sách Homeji'} */}
          </p>
        </div>

        <div className="guest-map__workspace">
          <div className="guest-map__map-frame">
            <div className={`guest-map__map${detailOpen ? ' has-place-detail' : ''}`} aria-label="Bản đồ phòng trọ Google Maps">
              {mapsReady ? (
                <RentalMap
                  posts={posts}
                  selectedPostId={selectedPostId}
                  hoveredPostId={hoveredPostId}
                  onSelectPost={handleSelectPost}
                  onClearSelection={handleClearSelection}
                  onSelectPlace={handleSelectPlace}
                  onPlaceLoading={setPlaceLoading}
                  selectedPlacePin={selectedPlacePin}
                  focus={mapFocus}
                  focusToken={mapFocusToken}
                  selectionPad={GUEST_SELECTION_PAD}
                />
              ) : (
                <div className="guest-map__map-fallback">
                  <p>
                    {apiKey
                      ? 'Đang tải Google Maps…'
                      : 'Chưa có VITE_GOOGLE_MAPS_API_KEY — kiểm tra file .env.'}
                  </p>
                </div>
              )}

              <MapPlaceDetailPanel
                open={detailOpen}
                onClose={handleClearSelection}
                place={selectedPost ? null : selectedPlace}
                placeLoading={selectedPost ? false : placeLoading}
                listing={selectedPost ? listingDetail : null}
                listingSummary={selectedPost}
                listingLoading={!!selectedPost && listingLoading}
                onNearby={handleNearby}
                onSaveListing={() => openGate('save')}
                listingSaved={false}
              />
            </div>
          </div>

          <aside className="guest-map__list">
            {error ? <div className="guest-map__alert">{error}</div> : null}

            {loading ? (
              <p className="guest-map__status">Đang tải tin…</p>
            ) : posts.length === 0 ? (
              <p className="guest-map__status">
                Chưa có tin phù hợp khu vực này. Thử phường/trường khác hoặc đăng nhập để lọc
                nâng cao.
              </p>
            ) : (
              <>
                <p className="guest-map__count">{posts.length} tin trên bản đồ</p>
                <div className="guest-map__cards">
                  {posts.map((post) => (
                    <div
                      key={post.id}
                      className={`guest-map__card-wrap${selectedPostId === post.id ? ' is-active' : ''}${hoveredPostId === post.id ? ' is-highlighted' : ''}`}
                      onMouseEnter={() => handleHoverPost(post.id)}
                      onMouseLeave={() => handleHoverPost(null)}
                      onClick={() => handleSelectPost(post.id)}
                    >
                      <RentalPostCard
                        post={post}
                        showSave
                        onSave={() => openGate('save')}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="guest-map__cta">
              <p className="guest-map__cta-copy">
                Đăng ký để mở SĐT chủ nhà, nhắn tin ở ghép, lọc nâng cao và lưu tin yêu thích.
              </p>
              <button
                type="button"
                className="guest-map__cta-btn"
                onClick={() => openGate('browse')}
              >
                Đăng ký / Đăng nhập miễn phí
              </button>
            </div>
          </aside>
        </div>
      </div>
    </section>
  )
}
