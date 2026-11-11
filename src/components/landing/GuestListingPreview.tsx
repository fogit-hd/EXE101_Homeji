import { useEffect, useRef, useState } from 'react'
import { RentalPostType, searchRentalPosts, type RentalPostSummary } from '../../api'
import { rentalPriceBasis } from '../ai/rentalPriceBasis'
import { amenityLabel, formatListingArea, formatListingRent, rentalPostTypeLabel } from '../../lib/labels'
import { rentalSourcePublisher, rentalSourceHref, rentalSourceImageHref, getRentalSourceCatalog, type RentalSourceListing } from '../../api/rentalSources'
import { RoomDetailModal } from '../map/listings/RoomDetailModal'
import { SourceRoomDetail } from '../map/listings/SourceRoomDetail'
import { isGuestCoastPaused, pauseGuestCoast, resumeGuestCoast } from './guestCoast'
import { GUEST_SEARCH_EVENT, navigateGuestLanding } from './guestLandingNav'
import { matchesRentalPropertyCategory } from '../../lib/rentalPropertyCategory'
import './GuestListingPreview.css'
import { attachTraceTilt } from '../motion/traceTilt'
import { ActionWheel, type WheelAction } from '../motion/ActionWheel'
import { RoomDirectionsDialog } from './RoomDirectionsDialog'
import { useHoldWheel } from '../motion/useHoldWheel'
import { mapPostUrl } from '../../lib/mapDeepLinks'
import { AreaMapIcon, DirectionsIcon, ShareRoomIcon, ViewRoomIcon } from './wheelIcons'
import { useStreetSearchPlaceholder } from '../../hooks/useStreetSearchPlaceholder'
import { matchesListingText } from '../../lib/searchQuery'
import { isImportedRentalPost, sourcePublisherLink } from '../../lib/sourcePublisherLinks'

function Arrow({ previous = false }: { previous?: boolean }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={previous ? 'M19 12H5m6 6-6-6 6-6' : 'M5 12h14m-6-6 6 6-6 6'} />
  </svg>
}

const WHEEL_ACTIONS: readonly WheelAction[] = [
  { label: 'Xem chi tiết', tone: '#14b8a6', icon: <ViewRoomIcon /> },
  { label: 'Chỉ đường', tone: '#ff7a59', icon: <DirectionsIcon /> },
  { label: 'Bản đồ', tone: '#22c55e', icon: <AreaMapIcon /> },
  { label: 'Chia sẻ', tone: '#8b5cf6', icon: <ShareRoomIcon /> },
]
const itemKey = (item: PreviewItem) => `${item.kind}-${item.data.id}`
const PAGE_SIZE = 8

type PreviewItem = { kind: 'post'; data: RentalPostSummary } | { kind: 'source'; data: RentalSourceListing }
const BUDGETS = [
  { id: 'all', label: 'Tất cả' }, { id: 'low', label: 'Dưới 3 triệu' },
  { id: 'mid', label: '3–5 triệu' }, { id: 'high', label: 'Trên 5 triệu' },
] as const

/** Public posts and labelled source listings; no synthetic inventory. */
export function GuestListingPreview() {
  const [posts, setPosts] = useState<RentalPostSummary[]>([])
  const [sourceListings, setSourceListings] = useState<RentalSourceListing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [category, setCategory] = useState<'rooms' | 'apartments'>('rooms')
  const [budget, setBudget] = useState<(typeof BUDGETS)[number]['id']>('all')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<RentalPostSummary | null>(null)
  const [selectedSource, setSelectedSource] = useState<RentalSourceListing | null>(null)
  const [keyword, setKeyword] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const rail = useRef<HTMLUListElement>(null)
  useEffect(() => rail.current ? attachTraceTilt(rail.current, '.guest-preview__rail > li') : undefined, [])
  const searchPlaceholder = useStreetSearchPlaceholder(!searchFocused && !keyword.trim(), 'Tìm theo đường, khu vực hoặc tiện ích')

  useEffect(() => {
    const onSearch = (event: Event) => { setKeyword((event as CustomEvent<string>).detail); setPage(1) }
    window.addEventListener(GUEST_SEARCH_EVENT, onSearch)
    return () => window.removeEventListener(GUEST_SEARCH_EVENT, onSearch)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void Promise.allSettled([
      searchRentalPosts({ page: 1, pageSize: 12 }, { auth: false, signal: controller.signal }),
      getRentalSourceCatalog(),
    ]).then(([native, sourced]) => {
      if (controller.signal.aborted) return
      setPosts(native.status === 'fulfilled' ? [...new Map(native.value.filter(post => !post.isSynthetic).map(post => [post.id, post])).values()] : [])
      setSourceListings(sourced.status === 'fulfilled' ? [...new Map(sourced.value.filter(item => rentalSourceHref(item.sourceUrl)).map(item => [item.sourceUrl, item])).values()] : [])
      setError(native.status === 'rejected' || sourced.status === 'rejected' ? 'Một phần danh sách chưa tải được. Bạn có thể thử lại.' : '')
      setLoading(false)
    })
    return () => controller.abort()
  }, [attempt])

  const nativeIds = new Set(posts.map(post => post.id))
  const items: PreviewItem[] = [...posts.map(data => ({ kind: 'post' as const, data })), ...sourceListings.filter(data => !nativeIds.has(data.id)).map(data => ({ kind: 'source' as const, data }))]
  const filtered = items.filter(item => {
    const { data } = item
    const amenities = item.kind === 'source' ? item.data.amenityHighlights ?? [] : (item.data.amenities ?? []).map(amenityLabel)
    return matchesRentalPropertyCategory(category, data.title)
      && matchesListingText(keyword, [data.title, data.address, ...amenities])
      && (budget === 'all' || data.price > 0 && (budget === 'low' ? data.price < 3_000_000 : budget === 'mid' ? data.price >= 3_000_000 && data.price <= 5_000_000 : data.price > 5_000_000))
  })
  const pageCount = Math.ceil(filtered.length / PAGE_SIZE)
  const firstIndex = (page - 1) * PAGE_SIZE
  const shown = filtered.slice(firstIndex, firstIndex + PAGE_SIZE)
  const pageLinks = pageCount <= 5 ? Array.from({ length: pageCount }, (_, index) => index + 1)
    : page <= 3 ? [1, 2, 3, 'after', pageCount]
    : page >= pageCount - 2 ? [1, 'before', pageCount - 2, pageCount - 1, pageCount]
    : [1, 'before', page, 'after', pageCount]
  const goToPage = (nextPage: number) => {
    if (nextPage === page) return
    setPage(nextPage)
    rail.current?.focus({ preventScroll: true })
    rail.current?.scrollIntoView({ block: 'start' })
  }
  const [directionsFor, setDirectionsFor] = useState<PreviewItem | null>(null)
  const [shareNote, setShareNote] = useState('')
  useEffect(() => {
    if (!shareNote) return
    const timer = window.setTimeout(() => setShareNote(''), 2400)
    return () => window.clearTimeout(timer)
  }, [shareNote])
  const runAction = (key: string, index: number) => {
    const item = shown.find(candidate => itemKey(candidate) === key)
    if (!item) return
    const { data } = item
    if (index === 0) {
      if (item.kind === 'post') setSelected(item.data)
      else setSelectedSource(item.data)
    } else if (index === 1) {
      setDirectionsFor(item)
    } else if (index === 2) {
      navigateGuestLanding('map')
    } else {
      const url = item.kind === 'post' ? new URL(mapPostUrl(item.data.id), location.origin).href : rentalSourceHref(item.data.sourceUrl) ?? location.href
      if (navigator.share) {
        void navigator.share({ title: data.title, url }).catch(() => { /* The visitor closed the share sheet. */ })
      } else {
        void navigator.clipboard?.writeText(url).then(() => setShareNote('Đã sao chép liên kết phòng'), () => setShareNote('Không sao chép được liên kết'))
      }
    }
  }
  const { wheel, bind, close, choose } = useHoldWheel(
    element => element.closest<HTMLElement>('.guest-preview__rail > li[data-wheel-key]')?.dataset.wheelKey ?? null,
    WHEEL_ACTIONS.length,
    runAction,
  )

  return <section className="guest-preview" id="listings" aria-labelledby="guest-featured-title">
    <div className="guest-preview__inner">
      <header className="guest-preview__heading">
        <div><h2 id="guest-featured-title">Phòng đang cho thuê</h2></div>
        <button type="button" className="guest-preview__explore" onClick={() => navigateGuestLanding('map')}>Xem trên bản đồ <Arrow /></button>
      </header>
      <form className="guest-preview__search" data-glass-exclude role="search" onSubmit={event => { event.preventDefault(); setPage(1) }}>
        <label htmlFor="guest-rental-search">Lọc theo khu vực hoặc tiện ích</label>
        <div><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg>
          <input id="guest-rental-search" type="search" value={keyword} maxLength={150} placeholder={searchPlaceholder} onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)} onChange={event => { setKeyword(event.target.value); setPage(1) }} autoComplete="off" enterKeyHint="search" />
          {keyword ? <button type="button" onClick={() => { setKeyword(''); setPage(1) }} aria-label="Xóa từ khóa tìm phòng">×</button> : null}
        </div>
      </form>
      <div className="guest-preview__categories" role="group" aria-label="Loại chỗ ở">
        {(['rooms', 'apartments'] as const).map(value => <button key={value} type="button" aria-pressed={category === value} onClick={() => { setCategory(value); setPage(1) }}>{value === 'rooms' ? 'Phòng trọ' : 'Căn hộ'} <span>{items.filter(item => matchesRentalPropertyCategory(value, item.data.title)).length}</span></button>)}
      </div>
      <div className="guest-preview__toolbar">
        <div className="guest-preview__budgets" role="group" aria-label="Lọc theo giá trong tin">
          {BUDGETS.map(option => <button key={option.id} type="button" aria-pressed={budget === option.id} onClick={() => { setBudget(option.id); setPage(1) }}>{option.label}</button>)}
        </div>
        {!loading ? <span className="guest-preview__count" role="status">{filtered.length} phòng</span> : null}
      </div>
      <p className="guest-preview__note">Giá và thông tin theo tin đăng. Hãy xác nhận lại với người đăng.</p>
      {error ? <div className="guest-preview__state" role="alert"><p>{error}</p><button type="button" onClick={() => { setPage(1); setLoading(true); setError(''); setAttempt(value => value + 1) }}>Thử lại</button></div> : null}
      <ul ref={rail} {...bind} className="guest-preview__rail" aria-label="Danh sách phòng" aria-busy={loading} tabIndex={-1}>
        {loading ? Array.from({ length: PAGE_SIZE }, (_, index) => <li key={index} className="guest-preview__skeleton" aria-hidden="true"><div /><span /><span /></li>) : shown.map(item => {
          const data = item.data
          const isSource = item.kind === 'source'
          const photos = item.kind === 'source' ? item.data.imageUrls.map(rentalSourceImageHref).filter((url): url is string => Boolean(url)) : item.data.thumbnailPath ? [item.data.thumbnailPath] : []
          const basis = item.kind === 'post' ? rentalPriceBasis(item.data) : 'unknown'
          return <li key={itemKey(item)} data-wheel-key={itemKey(item)}>
            <article className="guest-preview__card" data-glass-exclude>
              <button type="button" className="guest-preview__card-open" aria-label={`Xem ${isSource ? 'tin phòng' : 'phòng'}: ${data.title}`} onClick={() => item.kind === 'post' ? setSelected(item.data) : setSelectedSource(item.data)}>
                <span className="guest-preview__photo">
                  <span>Chưa có ảnh</span>
                  {photos[0] ? <img src={photos[0]} alt="" loading="lazy" decoding="async" referrerPolicy={isSource ? 'no-referrer' : undefined} onError={event => { event.currentTarget.hidden = true }} /> : null}
                  <span className="guest-preview__source-badge">{item.kind === 'post' && item.data.type !== RentalPostType.VacantRoom ? rentalPostTypeLabel[item.data.type] : category === 'apartments' ? 'Căn hộ' : 'Phòng trọ'}</span>
                  {item.kind === 'source' && photos.length > 1 ? <span className="guest-preview__photo-count">{photos.length} ảnh</span> : null}
                </span>
                <span className="guest-preview__copy">
                  <span className="guest-preview__price">{formatListingRent(data.price)}<small>{basis === 'person' ? ' / người / tháng' : basis === 'room' ? ' / tháng' : data.price > 0 ? ' · theo tin' : ''}</small></span>
                  <span className="guest-preview__name">{data.title}</span>
                  <span className="guest-preview__address">{data.address || 'Chưa có địa chỉ'}</span>
                  <span className="guest-preview__meta"><span>{formatListingArea(data.area)}</span>{item.kind === 'source' && item.data.depositLabel ? <span>{item.data.depositLabel}</span> : item.kind === 'post' && item.data.deposit && item.data.deposit > 0 ? <span>Cọc {formatListingRent(item.data.deposit)}</span> : null}{item.kind === 'post' && !isImportedRentalPost(item.data) && item.data.maxOccupants && item.data.maxOccupants > 0 ? <span>Tối đa {item.data.maxOccupants} người</span> : null}{item.kind === 'source' ? <span>{item.data.district === 'thu-duc' ? 'Thủ Đức' : item.data.district === 'quan-9' ? 'Quận 9' : item.data.district}</span> : null}</span>
                  <span className="guest-preview__meta">{(item.kind === 'source' ? item.data.amenityHighlights ?? [] : (item.data.amenities ?? []).map(amenityLabel)).slice(0, 3).map(value => <span key={value}>{value}</span>)}</span>
                  <span className="guest-preview__card-footer"><span>{item.kind === 'post' ? item.data.ownerDisplayName || 'Người đăng Homeji' : rentalSourcePublisher(item.data.publisherName)}</span><strong>Xem chi tiết <Arrow /></strong></span>
                </span>
              </button>
            </article>
          </li>
        })}
      </ul>
      {!loading && !filtered.length ? <p className="guest-preview__state">{items.length ? 'Chưa có tin khớp. Thử từ khóa, loại chỗ ở hoặc khoảng giá khác.' : 'Chưa có tin để hiển thị. Bạn có thể xem khu vực trên bản đồ.'}</p> : null}
      {!loading && pageCount > 1 ? <nav className="guest-preview__pagination" aria-label="Phân trang danh sách phòng" data-glass-exclude>
        <p role="status">Đang xem {firstIndex + 1}–{firstIndex + shown.length} / {filtered.length} phòng</p>
        <div>
          <button type="button" aria-label="Trang trước" disabled={page === 1} onClick={() => goToPage(page - 1)}><Arrow previous /></button>
          {pageLinks.map(link => typeof link === 'number'
            ? <button key={link} type="button" aria-label={`Trang ${link}`} aria-current={link === page ? 'page' : undefined} onClick={() => goToPage(link)}>{link}</button>
            : <span key={link} aria-hidden="true">…</span>)}
          <button type="button" aria-label="Trang sau" disabled={page === pageCount} onClick={() => goToPage(page + 1)}><Arrow /></button>
        </div>
      </nav> : null}
      {loading ? <span className="guest-preview__sr-only" role="status">Đang tải danh sách phòng…</span> : null}
      <p className="guest-preview__hint">Mẹo: nhấn giữ một phòng để mở nhanh chỉ đường, bản đồ hoặc chia sẻ.</p>
      <span className="guest-preview__share-note" role="status" data-visible={shareNote ? '' : undefined}>{shareNote}</span>
      {wheel ? <ActionWheel {...wheel} title={`Thao tác nhanh: ${shown.find(item => itemKey(item) === wheel.target)?.data.title ?? 'phòng'}`} actions={WHEEL_ACTIONS} onSelect={choose} onClose={close} /> : null}
    </div>
    {selected ? <GuestRoomPreview key={selected.id} id={selected.id} onClose={() => setSelected(null)} /> : null}
    {selectedSource ? <GuestSourcePreview key={selectedSource.id} listing={selectedSource} onClose={() => setSelectedSource(null)} /> : null}
    {directionsFor ? <RoomDirectionsDialog key={itemKey(directionsFor)} title={directionsFor.data.title} address={directionsFor.data.address}
      destination={directionsFor.data.latitude != null && directionsFor.data.longitude != null ? { lat: directionsFor.data.latitude, lng: directionsFor.data.longitude } : null}
      onClose={() => setDirectionsFor(null)} /> : null}
  </section>
}

function GuestSourcePreview({ listing, onClose }: { listing: RentalSourceListing; onClose: () => void }) {
  const nativeId = sourcePublisherLink(listing.id)?.nativePostId
  if (nativeId) return <GuestRoomPreview id={nativeId} onClose={onClose} />
  return <SourceRoomDetail id={listing.id} summary={listing} onClose={onClose} />
}

function GuestRoomPreview({ id, onClose }: { id: string; onClose: () => void }) {
  useEffect(() => {
    const wasPaused = isGuestCoastPaused()
    pauseGuestCoast()
    return () => { if (!wasPaused) resumeGuestCoast() }
  }, [])
  return <RoomDetailModal listingId={id} onClose={onClose} />
}
