import { ChoicePicker } from '../../ui/ChoicePicker'
import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { MarketplaceSellerCatalog } from '../../marketplace/MarketplaceSellerCatalog'
import { marketplaceItemUrl } from '../../../lib/marketplaceSellers'
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
import { useDismissOnOutside } from '../../../lib/useDismissOnOutside'
import { shortListingAddress } from '../../MapListingCard'
import { Sk, SkCard } from '../../skeletons/Skeleton'
import './MapListingsWorkspace.css'

const PAGE_SIZE = 20

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
  /** Contextual map content shares the results slot, outside the map's isolated layer. */
  contextPanel?: ReactNode
  unreadNotifications?: number
  onHoverListing: (id: string) => void
  onLeaveListing: () => void
  onSelectListing: (id: string) => void
  onOpenRoomDetail?: (id: string) => void
  onToggleSave?: (id: string) => void
  onResetFilters: () => void
  onUserSearch?: () => void
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
  contextPanel,
  onHoverListing,
  onLeaveListing,
  onSelectListing,
  onOpenRoomDetail,
  onToggleSave,
  onResetFilters,
  onUserSearch,
}: Props) {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
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

  const setView = (view: MapListingsView) => {
    setMobilePane(view === 'list' ? 'list' : 'map')
    setPanelOpen(true)
    writeQuery({ view })
  }
  const [filtersOpen, setFiltersOpen] = useState(false)
  const filterAnchor = useRef<HTMLButtonElement>(null)
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
    setFiltersOpen(false)
    onResetFilters()
  }
  const activeFilterCount = Number(query.minPrice != null || query.maxPrice != null)
    + Number(query.minArea != null || query.maxArea != null) + query.amenities.length
    + (query.excludedAmenities?.length ?? 0) + Number(query.excludeRoommateShare)
    + Number(query.minAvailableSlots != null)
  const openFilters = () => {
    setPriceDraft({ min: query.minPrice != null ? String(query.minPrice) : '', max: query.maxPrice != null ? String(query.maxPrice) : '' })
    setAreaDraft({ min: query.minArea != null ? String(query.minArea) : '', max: query.maxArea != null ? String(query.maxArea) : '' })
    setAmenityDraft(query.amenities)
    setFiltersOpen(true)
  }

  const showMap = query.view !== 'list' && mapNode != null
  const showList = query.view !== 'map'
  const contextPanelOpen = showMap && Boolean(contextPanel)
  const mapFirst = query.view !== 'list'
  const [panelOpen, setPanelOpen] = useState(true)
  const [mobilePane, setMobilePane] = useState<'map' | 'list'>(query.view === 'list' ? 'list' : 'map')
  const viewChoices = [
    ['map', 'Bản đồ'],
    ['split', 'Chia đôi'],
    ['list', 'Danh sách'],
  ] as const

  const renderListingCard = (id: string, view: ReturnType<typeof mapMarketplacePostToListingViewModel>) => {
    const selectedCard = selectedListingId === id
    const hovered = hoveredListingId === id
    return (
        <article
          className={`map-listings__card${selectedCard ? ' is-selected' : ''}${hovered ? ' is-hot' : ''}`}
        >
          <button
            type="button"
            className="map-listings__card-hit"
            data-glass-exclude
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
              if (marketMode && query.view === 'list') {
                const post = marketPosts.find(item => item.id === id)
                if (post) navigate(marketplaceItemUrl(post))
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
            </span>
            <span className="map-listings__card-copy">
              <span className="map-listings__price">{view.priceLabel}{!marketMode ? <small> / tháng</small> : null}</span>
              <span className="map-listings__name">{view.title}</span>
                <span className="map-listings__address">
                  <img src="/figma/map/map-pin.svg" alt="" width={13} height={13} />
                  <span className="map-listings__address-text" title={view.address}>{shortListingAddress(view.address) || 'Chưa có địa chỉ'}</span>
                </span>
              <span className="map-listings__meta">
                {view.areaLabel ? <span>{view.areaLabel}</span> : null}
                {view.typeLabel ? <span>{view.typeLabel}</span> : null}
                {view.highlightTag ? <span>{view.highlightTag}</span> : null}
                {!marketMode && view.ownerBadge ? <span>{view.ownerBadge}</span> : null}
              </span>
            </span>
          </button>
          {!marketMode && onOpenRoomDetail ? <button type="button" className="map-listings__card-open" data-glass-exclude onClick={() => onOpenRoomDetail(id)}>Chi tiết & liên hệ <span aria-hidden="true">↗</span></button> : null}
          {!marketMode && onToggleSave ? (
            <button
              type="button"
              className={`map-listings__save${savedIds?.has(id) ? ' is-on' : ''}`}
              data-glass-exclude aria-pressed={Boolean(savedIds?.has(id))}
              aria-label={savedIds?.has(id) ? 'Bỏ lưu phòng' : 'Lưu phòng'}
              disabled={saveBusy && selectedListingId === id}
              onClick={(event) => {
                event.stopPropagation()
                onToggleSave(id)
              }}
            >
              <BookmarkIcon saved={savedIds?.has(id)} />
            </button>
          ) : null}
        </article>
    )
  }


  return (
    <div className={`map-listings map-listings--${query.view}${mapFirst ? ' is-map-first' : ''}`}>
      <header className="map-listings__header">
        <div className="map-listings__toolbar" aria-label="Tùy chỉnh kết quả">
          <div className="map-listings__catalog" role="group" aria-label="Nguồn tin" data-glass-exclude>
            {SOURCE_OPTIONS.map((option) => (
              <button key={option.id} type="button" className={query.catalog === option.id ? 'is-on' : ''}
                aria-pressed={query.catalog === option.id}
                onClick={() => {
                  if (query.catalog === option.id) return
                  setFiltersOpen(false)
                  writeQuery({ catalog: option.id, page: 1 }, { fit: true })
                }}>
                {option.label}
              </button>
            ))}
          </div>
          <div className="map-listings__tools">
            <button ref={filterAnchor} type="button"
              className={`map-listings__filter-trigger${activeFilterCount ? ' is-active' : ''}`}
              aria-expanded={filtersOpen} aria-haspopup="dialog" onClick={() => filtersOpen ? setFiltersOpen(false) : openFilters()}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <path d="M4 7h9m4 0h3M4 17h3m4 0h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" />
              </svg>
              Lọc {activeFilterCount > 0 ? <span className="map-listings__filter-count">{activeFilterCount}</span> : null}
            </button>
            <label className="map-listings__display">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <rect x="3.5" y="4" width="17" height="16" rx="2" /><path d="M10 4v16" />
              </svg>
              <span className="map-listings__sr-only">Chế độ xem</span>
              <ChoicePicker value={query.view} onChange={(event) => setView(event.target.value as MapListingsView)}>
                {viewChoices.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </ChoicePicker>
            </label>
          </div>
        </div>
        <FilterPopover anchorRef={filterAnchor} open={filtersOpen} onClose={() => setFiltersOpen(false)}
          className="map-listings__popover map-listings__filter-sheet"
          onSubmit={() => {
            writeQuery({
              minPrice: readDraft(priceDraft.min), maxPrice: readDraft(priceDraft.max),
              ...(filterConfig.area ? { minArea: readDraft(areaDraft.min), maxArea: readDraft(areaDraft.max), amenities: amenityDraft } : {}),
              page: 1,
            }, { fit: true })
            setFiltersOpen(false)
          }}>
          <div className="map-listings__sheet-heading">
            <div><strong>Bộ lọc</strong><p>Chọn những điều bạn cần.</p></div>
            <button type="button" className="map-listings__sheet-close" aria-label="Đóng bộ lọc" onClick={() => setFiltersOpen(false)}>×</button>
          </div>
          <div className="map-listings__sheet-body">
            {filterConfig.price ? <FilterRange label="Khoảng giá" unit="đ" draft={priceDraft} onChange={setPriceDraft} /> : null}
            {filterConfig.area ? <FilterRange label="Diện tích" unit="m²" draft={areaDraft} onChange={setAreaDraft} /> : null}
            {filterConfig.amenities.length > 0 ? <fieldset className="map-listings__amenity-group">
              <legend>Tiện ích</legend>
              <div className="map-listings__amenity-grid">
                {filterConfig.amenities.map((option) => <label key={option.code}>
                  <input type="checkbox" checked={amenityDraft.includes(option.code)}
                    onChange={() => setAmenityDraft(current => current.includes(option.code) ? current.filter(code => code !== option.code) : [...current, option.code])} />
                  <span>{option.label}</span>
                </label>)}
              </div>
            </fieldset> : null}
          </div>
          <div className="map-listings__sheet-footer">
            <button type="button" className="map-listings__sheet-reset" disabled={!queryHasActiveFilters(query) && !priceDraft.min && !priceDraft.max && !areaDraft.min && !areaDraft.max && !amenityDraft.length} onClick={resetFilters}>Đặt lại</button>
            <button type="submit" className="map-listings__sheet-apply">Áp dụng</button>
          </div>
        </FilterPopover>
      </header>

      <div className={`map-listings__stage${contextPanelOpen ? ' has-context-panel' : ''}`}>
        {showMap && showList && !contextPanelOpen ? <div className="map-listings__mobile-toggle" role="group" aria-label="Bản đồ hoặc danh sách">
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
        </div> : null}

        {showMap ? (
          <section
            className={`map-listings__map${mobilePane === 'list' && !contextPanelOpen ? ' is-mobile-hidden' : ''}`}
            aria-label="Bản đồ khu vực"
          >
            {mapNode}
            {query.view === 'split' && !panelOpen && !contextPanelOpen ? (
              <button type="button" className="map-listings__panel-open" onClick={() => setPanelOpen(true)}>
                Danh sách
              </button>
            ) : null}
            <button
                type="button"
                className={`map-listings__move${query.searchOnMove ? ' is-on' : ''}`}
                data-glass-exclude aria-pressed={query.searchOnMove}
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
                monthly={!marketMode}
                saved={savedIds?.has(selected.id)}
                saveBusy={saveBusy}
                onToggleSave={!marketMode && onToggleSave ? () => onToggleSave(selected.id) : undefined}
                onOpen={() => {
                  if (!marketMode && onOpenRoomDetail) onOpenRoomDetail(selected.id)
                  else if (marketMode) { const post = marketPosts.find(item => item.id === selected.id); if (post) navigate(marketplaceItemUrl(post)) }
                  else onSelectListing(selected.id)
                }}
              />
            ) : null}
          </section>
        ) : null}

        {contextPanelOpen ? <div className="map-listings__context-panel">{contextPanel}</div> : null}

        {showList && !contextPanelOpen ? (
          <aside
            className={`map-listings__panel${mobilePane === 'map' && showMap ? ' is-mobile-hidden' : ''}${panelOpen ? '' : ' is-collapsed'}`}
            aria-label="Danh sách kết quả"
          >
            {query.view === 'split' ? <div className="map-listings__panel-head">
              <div><strong className="map-listings__panel-caption">{marketMode ? 'Đồ dùng trong khu vực' : 'Phòng trong khu vực'}</strong><p className="map-listings__result-count">{loading ? 'Đang tìm kết quả…' : `${cards.length} tin đang hiển thị`}</p></div>
              <button type="button" className="map-listings__panel-close" onClick={() => setPanelOpen(false)}>Thu gọn</button>
            </div> : null}
            <div className="map-listings__panel-body">
              {error ? (
                <div className="map-listings__state" role="alert">
                  <p>{error}</p>
                  <button type="button" onClick={resetFilters}>
                    Thử lại
                  </button>
                </div>
              ) : loading && cards.length === 0 ? (
                <ul className="map-listings__cards sk-screen" role="status" aria-busy="true" aria-label={marketMode ? 'Đang tải chợ đồ…' : 'Đang tải phòng…'}>
                  {Array.from({ length: 8 }, (_, i) => (
                    <li key={i}>
                      <SkCard style={{ padding: 0, overflow: 'hidden', gap: 0, width: '100%' }}>
                        <Sk h={140} r={0} />
                        <div className="sk-stack" style={{ padding: 12 }}>
                          <Sk w="85%" h={14} />
                          <Sk w="55%" h={11} />
                          <Sk w={100} h={16} />
                          <Sk w="70%" h={10} />
                        </div>
                      </SkCard>
                    </li>
                  ))}
                </ul>
              ) : cards.length === 0 ? (
                <div className="map-listings__state" role="status">
                  <p>{marketMode ? 'Không có tin chợ khớp bộ lọc.' : 'Không có phòng khớp bộ lọc.'}</p>
                  <button type="button" onClick={resetFilters}>
                    Đặt lại bộ lọc
                  </button>
                </div>
              ) : (
                marketMode ? <MarketplaceSellerCatalog posts={marketPosts}
                  renderItem={post => renderListingCard(post.id, mapMarketplacePostToListingViewModel(post))} /> :
                <ul className="map-listings__cards">
                  {cards.map(({ id, view }) => <li key={id}>{renderListingCard(id, view)}</li>)}
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
    const form = popRef.current
    const trigger = anchorRef.current
    form?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true })
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
      if (form?.contains(document.activeElement)) trigger?.focus({ preventScroll: true })
    }
  }, [open, anchorRef])
  if (!open || typeof document === 'undefined') return null
  return createPortal(
    <form
      ref={popRef}
      role="dialog"
      aria-label="Bộ lọc tìm kiếm"
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

function FilterRange({ label, unit, draft, onChange }: {
  label: string; unit: string; draft: RangeDraft; onChange: (draft: RangeDraft) => void
}) {
  return <fieldset className="map-listings__range-group">
    <legend>{label}</legend>
    <div className="map-listings__range-inputs" data-glass-exclude>
      <label>Từ<div><input type="number" min="0" step="any" inputMode="decimal" aria-label={`${label} tối thiểu`}
        placeholder="Không giới hạn" value={draft.min} onChange={event => onChange({ ...draft, min: event.target.value })} /><span>{unit}</span></div></label>
      <span className="map-listings__range-dash" aria-hidden="true">—</span>
      <label>Đến<div><input type="number" min={draft.min || '0'} step="any" inputMode="decimal" aria-label={`${label} tối đa`}
        placeholder="Không giới hạn" value={draft.max} onChange={event => onChange({ ...draft, max: event.target.value })} /><span>{unit}</span></div></label>
    </div>
  </fieldset>
}

function BookmarkIcon({ saved = false }: { saved?: boolean }) { return <svg width="20" height="20" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4Z" /></svg> }

function PreviewCard({
  view,
  monthly,
  saved,
  saveBusy,
  onToggleSave,
  onOpen,
}: {
  view: ReturnType<typeof mapBackendListingToListingViewModel>
  monthly: boolean
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
            <strong>{view.priceLabel}{monthly ? <small> / tháng</small> : null}</strong>
            {onToggleSave ? (
              <button
                type="button"
                data-glass-exclude aria-pressed={Boolean(saved)}
                aria-label={saved ? 'Bỏ lưu' : 'Lưu phòng'}
                disabled={saveBusy}
                onClick={(event) => {
                  event.stopPropagation()
                  onToggleSave()
                }}
              >
                <BookmarkIcon saved={saved} />
              </button>
            ) : null}
          </div>
          <p>{view.title}</p>
          <p className="map-listings__preview-sub">
            {shortListingAddress(view.address)}
          </p>
        </div>
      </div>
      <div className="map-listings__preview-tags">
        {view.areaLabel ? <span>{view.areaLabel}</span> : null}
        {view.typeLabel ? <span>{view.typeLabel}</span> : null}
        {view.highlightTag ? <span>{view.highlightTag}</span> : null}
        {view.ownerBadge ? <span>{view.ownerBadge}</span> : null}
      </div>
      <button type="button" className="map-listings__preview-open" onClick={onOpen}>
        {monthly ? 'Xem phòng & liên hệ' : 'Xem chi tiết'}
        <img src="/figma/map/arrow-right.svg" alt="" width={13} height={13} />
      </button>
    </article>
  )
}
