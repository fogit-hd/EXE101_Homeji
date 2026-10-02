import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import type { MarketplacePost, RentalPostSummary } from '../../../api/types'
import {
  mapBackendListingToListingViewModel,
  mapFilterMetadataToFilterConfig,
  mapMarketplacePostToListingViewModel,
  parseFiltersFromURL,
  queryHasActiveFilters,
  serializeFiltersToQuery,
  type ListingCatalog,
  type ListingQuery,
  type MapListingsView,
} from './listingAdapters'
import { isUsefulSearchQuery } from '../../../lib/searchQuery'
import { useSearch } from '../../../contexts/SearchContext'
import { useDismissOnOutside } from '../../../lib/useDismissOnOutside'
import './MapListingsWorkspace.css'

const RECENT_KEY = 'homeji:map-search-recent'
const PAGE_SIZE = 20

type RecentItem = { title: string; keyword: string; subtitle?: string }
type RangeDraft = { min: string; max: string }

type Props = {
  posts: RentalPostSummary[]
  marketPosts?: MarketplacePost[]
  selectedListingId: string | null
  hoveredListingId: string | null
  loading: boolean
  error: string
  savedIds?: Set<string>
  saveBusy?: boolean
  mapNode: ReactNode | null
  unreadNotifications?: number
  onHoverListing: (id: string) => void
  onLeaveListing: () => void
  onSelectListing: (id: string) => void
  onOpenRoomDetail?: (id: string) => void
  onToggleSave?: (id: string) => void
  onResetFilters: () => void
  onUserSearch?: () => void
}

function loadRecent(): RecentItem[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Array<{ title?: string; keyword?: string; subtitle?: string }>
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item) => item && typeof item.keyword === 'string' && isUsefulSearchQuery(item.keyword))
      .slice(0, 6)
      .map((item) => ({
        title: item.title?.trim() || item.keyword!.trim(),
        keyword: item.keyword!.trim(),
        subtitle: item.subtitle,
      }))
  } catch {
    return []
  }
}

function formatRange(label: string, min?: number, max?: number, unit = ''): string | null {
  if (min == null && max == null) return null
  if (min != null && max != null) return `${label} ${min}–${max}${unit}`
  if (min != null) return `${label} ≥ ${min}${unit}`
  return `${label} ≤ ${max}${unit}`
}

const SOURCE_OPTIONS: { id: ListingCatalog; label: string }[] = [
  { id: 'rooms', label: 'Phòng' },
  { id: 'market', label: 'Chợ đồ' },
]

export function MapListingsWorkspace({
  posts,
  marketPosts = [],
  selectedListingId,
  hoveredListingId,
  loading,
  error,
  savedIds,
  saveBusy,
  mapNode,
  onHoverListing,
  onLeaveListing,
  onSelectListing,
  onOpenRoomDetail,
  onToggleSave,
  onResetFilters,
  onUserSearch,
}: Props) {
  const { submit } = useSearch()
  const [searchParams, setSearchParams] = useSearchParams()
  const query = useMemo(() => parseFiltersFromURL(searchParams), [searchParams])
  const filterConfig = useMemo(() => mapFilterMetadataToFilterConfig(query.catalog), [query.catalog])
  const marketMode = query.catalog === 'market'
  const cards = useMemo(
    () =>
      marketMode
        ? marketPosts.map((post) => ({ id: post.id, view: mapMarketplacePostToListingViewModel(post) }))
        : posts.map((post) => ({ id: post.id, view: mapBackendListingToListingViewModel(post) })),
    [marketMode, marketPosts, posts],
  )
  const selected = cards.find((item) => item.id === selectedListingId) ?? null

  const writeQuery = (patch: Partial<ListingQuery>, options?: { fit?: boolean }) => {
    const nextQuery: ListingQuery = { ...query, ...patch }
    const next = serializeFiltersToQuery(nextQuery, searchParams)
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true })
    }
    if (options?.fit) onUserSearch?.()
  }

  const setView = (view: MapListingsView) => writeQuery({ view })
  const [openFilter, setOpenFilter] = useState<'price' | 'area' | 'amenities' | null>(null)
  const [priceDraft, setPriceDraft] = useState<RangeDraft>(() => ({
    min: query.minPrice != null ? String(query.minPrice) : '',
    max: query.maxPrice != null ? String(query.maxPrice) : '',
  }))
  const [areaDraft, setAreaDraft] = useState<RangeDraft>(() => ({
    min: query.minArea != null ? String(query.minArea) : '',
    max: query.maxArea != null ? String(query.maxArea) : '',
  }))
  const [amenityDraft, setAmenityDraft] = useState<string[]>(() => query.amenities)
  const resetFilters = () => {
    setPriceDraft({ min: '', max: '' })
    setAreaDraft({ min: '', max: '' })
    setAmenityDraft([])
    setOpenFilter(null)
    onResetFilters()
  }
  const toggleFilter = (id: 'price' | 'area' | 'amenities') => {
    setOpenFilter((current) => (current === id ? null : id))
  }

  const resultNoun = marketMode ? 'tin' : 'phòng'
  const countLabel = loading
    ? marketMode
      ? 'Đang tải chợ đồ…'
      : 'Đang tải phòng…'
    : `${cards.length} ${resultNoun} trên trang này`

  const showMap = query.view !== 'list' && mapNode != null
  const showList = query.view !== 'map'
  const mapFirst = query.view !== 'list'
  const [panelOpen, setPanelOpen] = useState(true)
  const [mobilePane, setMobilePane] = useState<'map' | 'list'>(query.view === 'list' ? 'list' : 'map')
  const viewChoices = [
    ['map', 'Bản đồ'],
    ['split', 'Chia đôi'],
    ['list', 'Danh sách'],
  ] as const

  return (
    <div className={`map-listings map-listings--${query.view}${mapFirst ? ' is-map-first' : ''}`}>
      <header className="map-listings__header">
        {mapFirst ? null : (
          <>
            <div className="map-listings__title-row">
              <div className="map-listings__title-block">
                <p className="map-listings__kicker">Khám phá</p>
                <h1>{marketMode ? 'Chợ đồ quanh khu bạn đang xem' : 'Tìm một căn phòng hợp nhịp sống'}</h1>
                <p>{countLabel}</p>
              </div>
            </div>
            <RecentRow onPick={(keyword) => submit(keyword)} />
          </>
        )}

        <div className="map-listings__filters" role="toolbar" aria-label="Bộ lọc tìm phòng">
          {mapFirst ? <span className="map-listings__place">Bản đồ</span> : null}
          {mapFirst ? <span className="map-listings__rule" aria-hidden /> : null}
          <div className="map-listings__sources" role="group" aria-label="Nguồn tin">
            {SOURCE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={query.catalog === option.id ? 'is-on' : ''}
                aria-pressed={query.catalog === option.id}
                onClick={() => {
                  if (query.catalog === option.id) return
                  setOpenFilter(null)
                  writeQuery({ catalog: option.id, page: 1 }, { fit: true })
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
          {filterConfig.price ? (
          <RangeFilter
            label="Giá"
            active={query.minPrice != null || query.maxPrice != null}
            summary={
              formatRange('', query.minPrice, query.maxPrice)
                ? `Giá ${formatRange('', query.minPrice, query.maxPrice)}`
                : 'Giá'
            }
            minPlaceholder="Từ (VND)"
            maxPlaceholder="Đến (VND)"
            draft={priceDraft}
            open={openFilter === 'price'}
            onOpen={() => toggleFilter('price')}
            onClose={() => setOpenFilter((current) => (current === 'price' ? null : current))}
            onDraft={setPriceDraft}
            onApply={(min, max) => {
              writeQuery({ minPrice: min, maxPrice: max, page: 1 }, { fit: true })
              setOpenFilter(null)
            }}
          />
          ) : null}
          {filterConfig.area ? (
          <RangeFilter
            label="Diện tích"
            active={query.minArea != null || query.maxArea != null}
            summary={formatRange('Diện tích', query.minArea, query.maxArea, ' m²') ?? 'Diện tích'}
            minPlaceholder="Từ (m²)"
            maxPlaceholder="Đến (m²)"
            draft={areaDraft}
            open={openFilter === 'area'}
            onOpen={() => toggleFilter('area')}
            onClose={() => setOpenFilter((current) => (current === 'area' ? null : current))}
            onDraft={setAreaDraft}
            onApply={(min, max) => {
              writeQuery({ minArea: min, maxArea: max, page: 1 }, { fit: true })
              setOpenFilter(null)
            }}
          />
          ) : null}
          {filterConfig.amenities.length > 0 ? (
          <AmenityFilter
            options={filterConfig.amenities}
            selected={query.amenities}
            draft={amenityDraft}
            open={openFilter === 'amenities'}
            onOpen={() => toggleFilter('amenities')}
            onClose={() => setOpenFilter((current) => (current === 'amenities' ? null : current))}
            onDraft={setAmenityDraft}
            onApply={(amenities) => {
              writeQuery({ amenities, page: 1 }, { fit: true })
              setOpenFilter(null)
            }}
          />
          ) : null}
          {queryHasActiveFilters(query) ? (
            <button type="button" className="map-listings__reset" onClick={resetFilters}>
              Đặt lại
            </button>
          ) : null}
          <span className="map-listings__filters-grow" />
          <div className="map-listings__view-switch map-listings__view-switch--bar" role="group" aria-label="Chế độ xem">
            {viewChoices.map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={query.view === id ? 'is-on' : ''}
                aria-pressed={query.view === id}
                onClick={() => setView(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="map-listings__stage">
        <div className="map-listings__mobile-toggle" role="group" aria-label="Bản đồ hoặc danh sách">
          <button
            type="button"
            aria-pressed={mobilePane === 'map'}
            className={mobilePane === 'map' ? 'is-on' : ''}
            onClick={() => setMobilePane('map')}
          >
            Bản đồ
          </button>
          <button
            type="button"
            aria-pressed={mobilePane === 'list'}
            className={mobilePane === 'list' ? 'is-on' : ''}
            onClick={() => setMobilePane('list')}
          >
            Danh sách
          </button>
        </div>

        {showMap ? (
          <section
            className={`map-listings__map${mobilePane === 'list' ? ' is-mobile-hidden' : ''}`}
            aria-label="Bản đồ khu vực"
          >
            {mapNode}
            {query.view === 'split' && !panelOpen ? (
              <button type="button" className="map-listings__panel-open" onClick={() => setPanelOpen(true)}>
                Danh sách
              </button>
            ) : null}
            <button
                type="button"
                className={`map-listings__move${query.searchOnMove ? ' is-on' : ''}`}
                aria-pressed={query.searchOnMove}
                onClick={() =>
                  writeQuery({
                    searchOnMove: !query.searchOnMove,
                    bounds: query.searchOnMove ? null : query.bounds,
                  })
                }
              >
                <span className="map-listings__move-check" aria-hidden>
                  {query.searchOnMove ? <img src="/figma/map/check.svg" alt="" width={11} height={11} /> : null}
                </span>
                Tìm khi di chuyển bản đồ
              </button>
            {selected && query.view !== 'list' ? (
              <PreviewCard
                view={selected.view}
                saved={savedIds?.has(selected.id)}
                saveBusy={saveBusy}
                onToggleSave={!marketMode && onToggleSave ? () => onToggleSave(selected.id) : undefined}
                onOpen={() => {
                  if (!marketMode && onOpenRoomDetail) onOpenRoomDetail(selected.id)
                  else onSelectListing(selected.id)
                }}
              />
            ) : null}
          </section>
        ) : null}

        {showList ? (
          <aside
            className={`map-listings__panel${mobilePane === 'map' && showMap ? ' is-mobile-hidden' : ''}${panelOpen ? '' : ' is-collapsed'}`}
            aria-label="Danh sách kết quả"
          >
            <div className="map-listings__panel-head">
              <div>
                <h2>{countLabel}</h2>
                <p>Trang {query.page}</p>
              </div>
              {query.view === 'split' ? (
                <button type="button" className="map-listings__panel-close" onClick={() => setPanelOpen(false)}>
                  Thu gọn
                </button>
              ) : null}
            </div>
            <div className="map-listings__panel-body">
              {error ? (
                <div className="map-listings__state" role="alert">
                  <p>{error}</p>
                  <button type="button" onClick={resetFilters}>
                    Thử lại
                  </button>
                </div>
              ) : loading && cards.length === 0 ? (
                <p className="map-listings__state" role="status">
                  {marketMode ? 'Đang tải chợ đồ…' : 'Đang tải phòng…'}
                </p>
              ) : cards.length === 0 ? (
                <div className="map-listings__state" role="status">
                  <p>{marketMode ? 'Không có tin chợ khớp bộ lọc.' : 'Không có phòng khớp bộ lọc.'}</p>
                  <button type="button" onClick={resetFilters}>
                    Đặt lại bộ lọc
                  </button>
                </div>
              ) : (
                <ul className="map-listings__cards">
                  {cards.map(({ id, view }) => {
                    const selectedCard = selectedListingId === id
                    const hovered = hoveredListingId === id
                    return (
                      <li key={id}>
                        <article
                          className={`map-listings__card${selectedCard ? ' is-selected' : ''}${hovered ? ' is-hot' : ''}`}
                        >
                          <button
                            type="button"
                            className="map-listings__card-hit"
                            aria-pressed={selectedCard}
                            onMouseEnter={() => onHoverListing(id)}
                            onMouseLeave={onLeaveListing}
                            onFocus={() => onHoverListing(id)}
                            onBlur={onLeaveListing}
                            onClick={() => {
                              if (!marketMode && query.view === 'list' && onOpenRoomDetail) {
                                onOpenRoomDetail(id)
                                return
                              }
                              onSelectListing(id)
                            }}
                          >
                            <span className="map-listings__card-photo">
                              <span className="map-listings__card-photo-empty">Chưa có ảnh</span>
                              {view.thumbnailUrl ? (
                                <img
                                  src={view.thumbnailUrl}
                                  alt=""
                                  onError={(event) => {
                                    event.currentTarget.hidden = true
                                  }}
                                />
                              ) : null}
                              {selectedCard ? <span className="map-listings__badge">Đang chọn</span> : null}
                            </span>
                            <span className="map-listings__card-copy">
                              <span className="map-listings__price">{view.priceLabel}</span>
                              <span className="map-listings__name">{view.title}</span>
                              {view.address ? (
                                <span className="map-listings__address">
                                  <img src="/figma/map/map-pin.svg" alt="" width={13} height={13} />
                                  {view.address}
                                </span>
                              ) : null}
                              <span className="map-listings__meta">
                                {view.areaLabel ? <span>{view.areaLabel}</span> : null}
                                {view.typeLabel ? <span>{view.typeLabel}</span> : null}
                                {view.highlightTag ? <span>{view.highlightTag}</span> : null}
                                {view.ownerBadge ? <span>{view.ownerBadge}</span> : null}
                              </span>
                            </span>
                          </button>
                          {!marketMode && onToggleSave ? (
                            <button
                              type="button"
                              className={`map-listings__save${savedIds?.has(id) ? ' is-on' : ''}`}
                              aria-pressed={Boolean(savedIds?.has(id))}
                              aria-label={savedIds?.has(id) ? 'Bỏ lưu phòng' : 'Lưu phòng'}
                              disabled={saveBusy && selectedListingId === id}
                              onClick={(event) => {
                                event.stopPropagation()
                                onToggleSave(id)
                              }}
                            >
                              <img src="/figma/map/bookmark.svg" alt="" width={15} height={15} />
                            </button>
                          ) : null}
                        </article>
                      </li>
                    )
                  })}
                </ul>
              )}
              {query.page > 1 || cards.length >= PAGE_SIZE ? (
                <div className="map-listings__pager">
                  {query.page > 1 ? (
                    <button type="button" onClick={() => writeQuery({ page: query.page - 1 })}>
                      Trang trước
                    </button>
                  ) : null}
                  {cards.length >= PAGE_SIZE ? (
                    <button type="button" onClick={() => writeQuery({ page: query.page + 1 })}>
                      Trang sau
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  )
}

function RecentRow({ onPick }: { onPick: (keyword: string) => void }) {
  const [items, setItems] = useState<RecentItem[]>(() => loadRecent())
  useEffect(() => {
    const refresh = () => setItems(loadRecent())
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [])
  if (items.length === 0) return null
  return (
    <ul className="map-listings__recent" aria-label="Tìm gần đây">
      {items.slice(0, 3).map((item) => (
        <li key={item.keyword}>
          <button type="button" onClick={() => onPick(item.keyword)}>
            <strong>{item.title}</strong>
            <span>{item.subtitle || 'Tìm gần đây'}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function readDraft(raw: string) {
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  const value = Number(trimmed)
  return Number.isFinite(value) ? value : undefined
}

function FilterPopover({
  anchorRef,
  open,
  onClose,
  className,
  children,
  onSubmit,
}: {
  anchorRef: RefObject<HTMLElement | null>
  open: boolean
  onClose: () => void
  className: string
  children: ReactNode
  onSubmit: () => void
}) {
  const popRef = useRef<HTMLFormElement>(null)
  useDismissOnOutside(open, [anchorRef, popRef], onClose)
  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const anchor = anchorRef.current
      const pop = popRef.current
      if (!anchor || !pop) return
      const rect = anchor.getBoundingClientRect()
      const margin = 8
      const width = pop.offsetWidth
      const height = pop.offsetHeight
      let left = rect.left
      let top = rect.bottom + 6
      if (left + width > window.innerWidth - margin) left = window.innerWidth - width - margin
      if (left < margin) left = margin
      if (top + height > window.innerHeight - margin) {
        const above = rect.top - height - 6
        top = above >= margin ? above : Math.max(margin, window.innerHeight - height - margin)
      }
      pop.style.position = 'fixed'
      pop.style.zIndex = '80'
      pop.style.left = `${left}px`
      pop.style.top = `${top}px`
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, anchorRef])
  if (!open || typeof document === 'undefined') return null
  return createPortal(
    <form
      ref={popRef}
      className={className}
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      {children}
    </form>,
    document.body,
  )
}

function RangeFilter({
  label,
  summary,
  active,
  minPlaceholder,
  maxPlaceholder,
  draft,
  open,
  onOpen,
  onClose,
  onDraft,
  onApply,
}: {
  label: string
  summary: string
  active: boolean
  minPlaceholder: string
  maxPlaceholder: string
  draft: RangeDraft
  open: boolean
  onOpen: () => void
  onClose: () => void
  onDraft: (draft: RangeDraft) => void
  onApply: (min?: number, max?: number) => void
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  return (
    <div className={`map-listings__filter${active ? ' is-on' : ''}`} ref={rootRef}>
      <button type="button" aria-expanded={open} onClick={onOpen}>
        <span>{summary || label}</span>
        <img src="/figma/map/chevron-down.svg" alt="" width={13} height={13} />
      </button>
      <FilterPopover
        anchorRef={rootRef}
        open={open}
        onClose={onClose}
        className="map-listings__popover"
        onSubmit={() => onApply(readDraft(draft.min), readDraft(draft.max))}
      >
        <label>
          Tối thiểu
          <input
            inputMode="decimal"
            value={draft.min}
            placeholder={minPlaceholder}
            onChange={(event) => onDraft({ ...draft, min: event.target.value })}
          />
        </label>
        <label>
          Tối đa
          <input
            inputMode="decimal"
            value={draft.max}
            placeholder={maxPlaceholder}
            onChange={(event) => onDraft({ ...draft, max: event.target.value })}
          />
        </label>
        <button type="submit">Áp dụng</button>
      </FilterPopover>
    </div>
  )
}

function AmenityFilter({
  options,
  selected,
  draft,
  open,
  onOpen,
  onClose,
  onDraft,
  onApply,
}: {
  options: { code: string; label: string }[]
  selected: string[]
  draft: string[]
  open: boolean
  onOpen: () => void
  onClose: () => void
  onDraft: (codes: string[]) => void
  onApply: (codes: string[]) => void
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const summary = selected.length ? `Tiện ích ${selected.length}` : 'Tiện ích'
  return (
    <div className={`map-listings__filter${selected.length ? ' is-on' : ''}`} ref={rootRef}>
      <button type="button" aria-expanded={open} onClick={onOpen}>
        <span>{summary}</span>
        <img src="/figma/map/chevron-down.svg" alt="" width={13} height={13} />
      </button>
      <FilterPopover
        anchorRef={rootRef}
        open={open}
        onClose={onClose}
        className="map-listings__popover map-listings__popover--list"
        onSubmit={() => onApply(draft)}
      >
        <div className="map-listings__popover-scroll">
          {options.map((option) => (
            <label key={option.code}>
              <input
                type="checkbox"
                checked={draft.includes(option.code)}
                onChange={() =>
                  onDraft(
                    draft.includes(option.code)
                      ? draft.filter((code) => code !== option.code)
                      : [...draft, option.code],
                  )
                }
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        <button type="submit">Áp dụng</button>
      </FilterPopover>
    </div>
  )
}

function PreviewCard({
  view,
  saved,
  saveBusy,
  onToggleSave,
  onOpen,
}: {
  view: ReturnType<typeof mapBackendListingToListingViewModel>
  saved?: boolean
  saveBusy?: boolean
  onToggleSave?: () => void
  onOpen: () => void
}) {
  return (
    <article className="map-listings__preview" aria-label="Phòng đang chọn">
      <div className="map-listings__preview-top">
        <div className="map-listings__preview-photo">
          {view.thumbnailUrl ? <img src={view.thumbnailUrl} alt="" /> : null}
        </div>
        <div>
          <div className="map-listings__preview-price">
            <strong>{view.priceLabel}</strong>
            {onToggleSave ? (
              <button
                type="button"
                aria-pressed={Boolean(saved)}
                aria-label={saved ? 'Bỏ lưu' : 'Lưu phòng'}
                disabled={saveBusy}
                onClick={(event) => {
                  event.stopPropagation()
                  onToggleSave()
                }}
              >
                <img src="/figma/map/bookmark.svg" alt="" width={16} height={16} />
              </button>
            ) : null}
          </div>
          <p>{view.title}</p>
          <p className="map-listings__preview-sub">
            {[view.address, view.areaLabel].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>
      <div className="map-listings__preview-tags">
        {view.typeLabel ? <span>{view.typeLabel}</span> : null}
        {view.highlightTag ? <span>{view.highlightTag}</span> : null}
        {view.ownerBadge ? <span>{view.ownerBadge}</span> : null}
      </div>
      <button type="button" className="map-listings__preview-open" onClick={onOpen}>
        Xem chi tiết
        <img src="/figma/map/arrow-right.svg" alt="" width={13} height={13} />
      </button>
    </article>
  )
}
