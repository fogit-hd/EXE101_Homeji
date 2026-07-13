import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getRentalPost,
  getSavedPosts,
  savePost,
  unsavePost,
  type RentalPost,
  type RentalPostSummary,
} from '../../api'
import type { MapPlaceDetails } from '../../lib/mapPlace'
import { useAuth } from '../../contexts/AuthContext'
import { HomeListingSkeleton } from '../HomeListingSkeleton'
import { MapListingCard } from '../MapListingCard'
import { MapAppPanel, type MapAppSection } from './MapAppPanel'
import { HomeMapStage, type HomeMapFocus } from './HomeMapStage'
import { MapPlaceDetailPanel } from './MapPlaceDetailPanel'
import { useMountTransition } from './useMountTransition'
import './MapPlaceDetailPanel.css'

type AuthenticatedHomeMapShellProps = {
  posts: RentalPostSummary[]
  selectedPostId: string | null
  selectedPost: RentalPostSummary | null
  onSelectPost: (postId: string) => void
  onClearSelection: () => void
  focus: HomeMapFocus | null
  focusToken: number
  userLocation: { lat: number; lng: number } | null
  onLocate: () => void
  locating: boolean
  locationError: string
  panelOpen: boolean
  panelSection: MapAppSection | null
  closePanel: () => void
  openListingsPanel: () => void
  loading: boolean
  showPostsLoader: boolean
  error: string
  onResetFilters: () => void
  needsProfileSetup: boolean
  /** Omnibox + other chrome rendered inside the map frame (sibling of map). */
  omnibox: React.ReactNode
  /** Sync search bar text with the open place/listing title (Google Maps pattern). */
  onDetailLabelChange?: (label: string | null) => void
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
  userLocation,
  onLocate,
  locating,
  locationError,
  panelOpen,
  panelSection,
  closePanel,
  openListingsPanel,
  loading,
  showPostsLoader,
  error,
  onResetFilters,
  needsProfileSetup,
  omnibox,
  onDetailLabelChange,
}: AuthenticatedHomeMapShellProps) {
  const { isAuthenticated } = useAuth()
  const [hoveredPostId, setHoveredPostId] = useState<string | null>(null)
  const [selectedPlace, setSelectedPlace] = useState<MapPlaceDetails | null>(null)
  const [placeLoading, setPlaceLoading] = useState(false)
  const [listingDetail, setListingDetail] = useState<RentalPost | null>(null)
  const [listingLoading, setListingLoading] = useState(false)
  const [listingSaved, setListingSaved] = useState(false)
  const [saveBusy, setSaveBusy] = useState(false)
  const [nearbyFocus, setNearbyFocus] = useState<HomeMapFocus | null>(null)
  const [nearbyToken, setNearbyToken] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const hoverLeaveTimerRef = useRef<number | null>(null)
  const listingFetchSeq = useRef(0)

  const detailOpen = !!(selectedPost || selectedPlace || placeLoading)
  const detailMotion = useMountTransition(detailOpen, 360)

  const selectedPlacePin = useMemo(() => {
    if (selectedPost) return null
    if (!selectedPlace?.location) return null
    return {
      lat: selectedPlace.location.lat,
      lng: selectedPlace.location.lng,
      title: selectedPlace.name,
    }
  }, [selectedPost, selectedPlace])

  const mapFocus = nearbyFocus ?? focus
  const mapFocusToken = nearbyFocus ? nearbyToken : focusToken

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
    }
  }, [])

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
    setSelectedPlace(null)
    setPlaceLoading(false)
    setListingDetail(null)
    setListingLoading(false)
    setNearbyFocus(null)
    onClearSelection()
  }, [onClearSelection])

  const handleSelectPlace = useCallback((place: MapPlaceDetails) => {
    setSelectedPlace(place)
    setPlaceLoading(false)
    setNearbyFocus(null)
  }, [])

  const handleSelectPost = useCallback(
    (postId: string) => {
      setHoveredPostId(null)
      setSelectedPlace(null)
      setPlaceLoading(false)
      setNearbyFocus(null)
      onSelectPost(postId)
      if (panelSection !== 'listings') return
      const el = listRef.current?.querySelector(`[data-post-id="${postId}"]`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    },
    [onSelectPost, panelSection],
  )

  const handleNearby = useCallback((loc: { lat: number; lng: number }) => {
    setNearbyFocus({ lat: loc.lat, lng: loc.lng, zoom: 16 })
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
                active={selectedPostId === post.id}
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
      selectedPostId,
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
        detailMotion.mounted ? ' has-place-detail' : ''
      }`}
    >
      <section className="home-map-panel">
        <div className="home-map-frame">
          <HomeMapStage
            posts={posts}
            selectedPostId={selectedPostId}
            hoveredPostId={hoveredPostId}
            onSelectPost={handleSelectPost}
            onClearSelection={handleClearMapSelection}
            onSelectPlace={handleSelectPlace}
            onPlaceLoading={setPlaceLoading}
            selectedPlacePin={selectedPlacePin}
            focus={mapFocus}
            focusToken={mapFocusToken}
            userLocation={userLocation}
            onLocate={onLocate}
            locating={locating}
            locationError={locationError}
          />
          {omnibox}
        </div>

        <MapPlaceDetailPanel
          open={detailOpen}
          onClose={handleClearMapSelection}
          place={selectedPost ? null : selectedPlace}
          placeLoading={selectedPost ? false : placeLoading}
          listing={selectedPost ? listingDetail : null}
          listingSummary={selectedPost}
          listingLoading={!!selectedPost && listingLoading}
          userLocation={userLocation}
          onNearby={handleNearby}
          onSaveListing={
            selectedPost && isAuthenticated ? () => void handleSaveListing() : undefined
          }
          listingSaved={listingSaved}
          saveBusy={saveBusy}
        />

        {needsProfileSetup && (
          <div className="home-map-banner">
            Chào mừng! <Link to="/profile">Hoàn thiện hồ sơ</Link> để được gợi ý phòng tốt hơn.
          </div>
        )}

        <button
          type="button"
          className="home-sidebar-toggle"
          aria-expanded={panelOpen}
          aria-controls="home-list-panel"
          onClick={() => {
            if (panelOpen) closePanel()
            else openListingsPanel()
          }}
        >
          {panelOpen ? 'Thu gọn danh sách' : 'Mở danh sách'}
          <span aria-hidden>{panelOpen ? '›' : '‹'}</span>
        </button>
      </section>

      <MapAppPanel
        section={panelSection ?? 'listings'}
        open={panelOpen}
        onClose={closePanel}
        listingsSubtitle={
          loading ? 'Đang tìm phòng phù hợp…' : `${posts.length} phòng phù hợp`
        }
        listingsContent={listingsContent}
      />
    </div>
  )
})
