import { memo, useMemo, useState, type ReactNode, type RefObject } from 'react'
import { Link } from 'react-router-dom'
import type { RentalPostSummary } from '../../../api/types'
import { exploreListUrl } from '../../chrome'
import chevronDownUrl from '../../../assets/figma-map/icons/chevron-down-dark.svg'
import chevronDownLightUrl from '../../../assets/figma-map/icons/chevron-down.svg'
import scanUrl from '../../../assets/figma-map/icons/scan.svg'
import slidersUrl from '../../../assets/figma-map/icons/sliders-horizontal.svg'
import { HomeListingSkeleton } from '../../HomeListingSkeleton'
import { MapExploreListingCard } from './MapExploreListingCard'
import { MapExplorePinPreview } from './MapExplorePinPreview'
import './MapExploreDestination.css'

export type MapExplorePriceBand = 'any' | 'under-5' | '5-8' | 'over-8'
export type MapExploreRoomKind = 'any' | 'studio' | 'furnished' | 'pets'

type Props = {
  posts: RentalPostSummary[]
  selectedListingId: string | null
  hoveredListingId: string | null
  isLoading: boolean
  error: string
  mapNode: ReactNode
  listRef?: RefObject<HTMLDivElement | null>
  previewPost: RentalPostSummary | null
  savedIds?: Set<string>
  saveBusy?: boolean
  searchOnMove: boolean
  priceBand: MapExplorePriceBand
  roomKind: MapExploreRoomKind
  onPriceBandChange: (band: MapExplorePriceBand) => void
  onRoomKindChange: (kind: MapExploreRoomKind) => void
  onToggleSearchOnMove: () => void
  onHoverListing: (id: string) => void
  onLeaveListing: () => void
  onSelectListing: (id: string) => void
  onClearSelection: () => void
  onToggleSave?: (id: string) => void
  onResetFilters: () => void
  onOpenListingDetail?: (id: string) => void
}

const PRICE_OPTIONS: { id: MapExplorePriceBand; label: string }[] = [
  { id: 'any', label: 'Mọi giá' },
  { id: 'under-5', label: 'Dưới 5 triệu' },
  { id: '5-8', label: '5–8 triệu' },
  { id: 'over-8', label: 'Trên 8 triệu' },
]

const KIND_OPTIONS: { id: MapExploreRoomKind; label: string }[] = [
  { id: 'any', label: 'Mọi loại' },
  { id: 'studio', label: 'Studio' },
  { id: 'furnished', label: 'Nội thất' },
  { id: 'pets', label: 'Cho nuôi mèo' },
]

export const MapExploreDestination = memo(function MapExploreDestination({
  posts,
  selectedListingId,
  hoveredListingId,
  isLoading,
  error,
  mapNode,
  listRef,
  previewPost,
  savedIds,
  saveBusy,
  searchOnMove,
  priceBand,
  roomKind,
  onPriceBandChange,
  onRoomKindChange,
  onToggleSearchOnMove,
  onHoverListing,
  onLeaveListing,
  onSelectListing,
  onClearSelection,
  onToggleSave,
  onResetFilters,
  onOpenListingDetail,
}: Props) {
  const [mobileView, setMobileView] = useState<'map' | 'list'>('map')
  const [priceMenuOpen, setPriceMenuOpen] = useState(false)
  const [kindMenuOpen, setKindMenuOpen] = useState(false)

  const priceLabel =
    PRICE_OPTIONS.find((o) => o.id === priceBand)?.label ?? 'Mọi giá'
  const kindLabel =
    KIND_OPTIONS.find((o) => o.id === roomKind)?.label ?? 'Mọi loại'

  const countLabel = isLoading
    ? 'Đang tải phòng…'
    : `${posts.length} phòng trong vùng bản đồ`

  const listBody = useMemo(() => {
    if (error) {
      return (
        <div className="map-explore__state map-explore__state--error" role="alert">
          <p>{error}</p>
          <button type="button" className="map-explore__state-btn" onClick={onResetFilters}>
            Thử lại bộ lọc
          </button>
        </div>
      )
    }
    if (isLoading) {
      return <HomeListingSkeleton count={3} />
    }
    if (posts.length === 0) {
      return (
        <div className="map-explore__state" role="status">
          <p className="map-explore__state-title">Không có phòng trong vùng này</p>
          <p className="map-explore__state-copy">
            Thử đổi bộ lọc hoặc di chuyển bản đồ rồi tìm lại.
          </p>
          <button type="button" className="map-explore__state-btn" onClick={onResetFilters}>
            Đặt lại bộ lọc
          </button>
        </div>
      )
    }
    return posts.map((post) => (
      <MapExploreListingCard
        key={post.id}
        post={post}
        active={selectedListingId === post.id}
        highlighted={hoveredListingId === post.id}
        saved={savedIds?.has(post.id)}
        saveBusy={saveBusy && selectedListingId === post.id}
        onHover={() => onHoverListing(post.id)}
        onLeave={onLeaveListing}
        onSelect={() => onSelectListing(post.id)}
        onToggleSave={onToggleSave ? () => onToggleSave(post.id) : undefined}
      />
    ))
  }, [
    error,
    isLoading,
    posts,
    selectedListingId,
    hoveredListingId,
    savedIds,
    saveBusy,
    onHoverListing,
    onLeaveListing,
    onSelectListing,
    onToggleSave,
    onResetFilters,
  ])

  return (
    <div
      className={[
        'map-explore',
        mobileView === 'list' ? 'is-mobile-list' : 'is-mobile-map',
      ].join(' ')}
    >
      <header className="map-explore__header">
        <div className="map-explore__titles">
          <p className="map-explore__eyebrow">Khám phá theo khu vực</p>
          <h1 className="map-explore__title">Phòng quanh nhịp sống của bạn</h1>
        </div>
        <p className="map-explore__count">{countLabel}</p>
      </header>

      <div className="map-explore__filters" role="toolbar" aria-label="Bộ lọc bản đồ">
        <div className="map-explore__filter-wrap">
          <button
            type="button"
            className={`map-explore__filter${priceBand !== 'any' ? ' is-active' : ''}`}
            aria-haspopup="listbox"
            aria-expanded={priceMenuOpen}
            onClick={() => {
              setPriceMenuOpen((v) => !v)
              setKindMenuOpen(false)
            }}
          >
            <span>{priceLabel}</span>
            <img
              src={priceBand !== 'any' ? chevronDownLightUrl : chevronDownUrl}
              alt=""
              width={13}
              height={13}
            />
          </button>
          {priceMenuOpen ? (
            <ul className="map-explore__menu" role="listbox" aria-label="Khoảng giá">
              {PRICE_OPTIONS.map((opt) => (
                <li key={opt.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={priceBand === opt.id}
                    className={priceBand === opt.id ? 'is-selected' : undefined}
                    onClick={() => {
                      onPriceBandChange(opt.id)
                      setPriceMenuOpen(false)
                    }}
                  >
                    {opt.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="map-explore__filter-wrap">
          <button
            type="button"
            className={`map-explore__filter${roomKind !== 'any' ? ' is-active' : ''}`}
            aria-haspopup="listbox"
            aria-expanded={kindMenuOpen}
            onClick={() => {
              setKindMenuOpen((v) => !v)
              setPriceMenuOpen(false)
            }}
          >
            <span>{kindLabel}</span>
            <img src={chevronDownUrl} alt="" width={13} height={13} />
          </button>
          {kindMenuOpen ? (
            <ul className="map-explore__menu" role="listbox" aria-label="Loại phòng">
              {KIND_OPTIONS.map((opt) => (
                <li key={opt.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={roomKind === opt.id}
                    className={roomKind === opt.id ? 'is-selected' : undefined}
                    onClick={() => {
                      onRoomKindChange(opt.id)
                      setKindMenuOpen(false)
                    }}
                  >
                    {opt.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="map-explore__filter-spacer" aria-hidden />

        <button
          type="button"
          className={`map-explore__search-move${searchOnMove ? ' is-on' : ''}`}
          aria-pressed={searchOnMove}
          onClick={onToggleSearchOnMove}
        >
          <img src={scanUrl} alt="" width={16} height={16} />
          <span>Tìm khi di chuyển bản đồ</span>
        </button>
      </div>

      <div className="map-explore__mobile-toggle" role="group" aria-label="Chế độ xem">
        <button
          type="button"
          className={mobileView === 'map' ? 'is-active' : undefined}
          aria-pressed={mobileView === 'map'}
          onClick={() => setMobileView('map')}
        >
          Bản đồ
        </button>
        <button
          type="button"
          className={mobileView === 'list' ? 'is-active' : undefined}
          aria-pressed={mobileView === 'list'}
          onClick={() => setMobileView('list')}
        >
          Danh sách
        </button>
      </div>

      <div className="map-explore__workspace">
        <section className="map-explore__map" aria-label="Bản đồ phòng trọ">
          <div className="map-explore__map-stage">{mapNode}</div>
          {previewPost ? (
            <MapExplorePinPreview
              post={previewPost}
              onOpen={
                onOpenListingDetail
                  ? () => onOpenListingDetail(previewPost.id)
                  : undefined
              }
              onClose={onClearSelection}
            />
          ) : null}
        </section>

        <aside className="map-explore__panel" aria-label="Gần tâm bản đồ">
          <div className="map-explore__panel-head">
            <div>
              <h2 className="map-explore__panel-title">Gần tâm bản đồ</h2>
              <p className="map-explore__panel-sub">Sắp xếp theo độ phù hợp</p>
            </div>
            <img src={slidersUrl} alt="" width={17} height={17} />
          </div>

          <div ref={listRef} className="map-explore__list">
            {listBody}
          </div>

          <Link to={exploreListUrl()} className="map-explore__view-all">
            {isLoading ? 'Đang tải…' : `Xem ${posts.length} phòng`}
          </Link>
        </aside>
      </div>
    </div>
  )
})
