import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getRentalPost, MediaType, RentalPostType, searchRentalPosts, type RentalPost, type RentalPostSummary } from '../../api'
import { rentalPriceBasis, rentalPriceLabel } from '../ai/rentalPriceBasis'
import { amenityLabel, formatListingArea, formatListingRent, rentalPostTypeLabel } from '../../lib/labels'
import { getErrorMessage } from '../../lib/errors'
import { rentalSourceHref, rentalSourceImageHref, rentalSourceLabel, searchRentalSources, type RentalSourceListing } from '../../api/rentalSources'
import { isGuestCoastPaused, pauseGuestCoast, resumeGuestCoast } from './guestCoast'
import './GuestListingPreview.css'

function Arrow({ previous = false }: { previous?: boolean }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={previous ? 'M19 12H5m6 6-6-6 6-6' : 'M5 12h14m-6-6 6 6-6 6'} />
  </svg>
}

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
  const [budget, setBudget] = useState<(typeof BUDGETS)[number]['id']>('all')
  const [visibleCount, setVisibleCount] = useState(8)
  const [selected, setSelected] = useState<RentalPostSummary | null>(null)
  const [selectedSource, setSelectedSource] = useState<RentalSourceListing | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    void Promise.allSettled([
      searchRentalPosts({ page: 1, pageSize: 12 }, { auth: false, signal: controller.signal }),
      searchRentalSources({ keyword: '', district: '', page: 1, pageSize: 24 }, controller.signal),
    ]).then(([native, sourced]) => {
      if (controller.signal.aborted) return
      setPosts(native.status === 'fulfilled' ? [...new Map(native.value.filter(post => !post.isSynthetic).map(post => [post.id, post])).values()] : [])
      setSourceListings(sourced.status === 'fulfilled' ? [...new Map(sourced.value.filter(item => rentalSourceHref(item.sourceUrl)).map(item => [item.sourceUrl, item])).values()] : [])
      setError(native.status === 'rejected' || sourced.status === 'rejected' ? 'Một phần danh sách chưa tải được. Bạn có thể thử lại.' : '')
      setLoading(false)
    })
    return () => controller.abort()
  }, [attempt])

  const items: PreviewItem[] = [...posts.map(data => ({ kind: 'post' as const, data })), ...sourceListings.map(data => ({ kind: 'source' as const, data }))]
  const filtered = items.filter(({ data: { price } }) => budget === 'all' || price > 0 && (budget === 'low' ? price < 3_000_000 : budget === 'mid' ? price >= 3_000_000 && price <= 5_000_000 : price > 5_000_000))
  const shown = filtered.slice(0, visibleCount)

  return <section className="guest-preview" id="listings" aria-labelledby="guest-featured-title">
    <div className="guest-preview__inner">
      <header className="guest-preview__heading">
        <div><span className="guest-preview__eyebrow">KHÔNG GIAN CHO BẠN</span><h2 id="guest-featured-title">Một góc nhà, nhiều lựa chọn.</h2></div>
        <Link to="/explore" className="guest-preview__explore">Khám phá bản đồ <Arrow /></Link>
      </header>
      <div className="guest-preview__toolbar">
        <div className="guest-preview__budgets" role="group" aria-label="Lọc theo giá trong tin">
          {BUDGETS.map(option => <button key={option.id} type="button" aria-pressed={budget === option.id} onClick={() => { setBudget(option.id); setVisibleCount(8) }}>{option.label}</button>)}
        </div>
        {!loading ? <span className="guest-preview__count" role="status">{filtered.length} lựa chọn trong danh sách</span> : null}
      </div>
      <p className="guest-preview__note">Giá và thông tin theo người đăng hoặc nguồn công khai. Xác nhận tình trạng phòng trước khi liên hệ.</p>
      {error ? <div className="guest-preview__state" role="alert"><p>{error}</p><button type="button" onClick={() => { setLoading(true); setError(''); setAttempt(value => value + 1) }}>Thử lại</button></div> : null}
      <ul className="guest-preview__rail" aria-label="Danh sách phòng nổi bật" aria-busy={loading}>
        {loading ? Array.from({ length: 8 }, (_, index) => <li key={index} className="guest-preview__skeleton" aria-hidden="true"><div /><span /><span /></li>) : shown.map(item => {
          const data = item.data
          const isSource = item.kind === 'source'
          const photos = item.kind === 'source' ? item.data.imageUrls.map(rentalSourceImageHref).filter((url): url is string => Boolean(url)) : item.data.thumbnailPath ? [item.data.thumbnailPath] : []
          const basis = item.kind === 'post' ? rentalPriceBasis(item.data) : 'unknown'
          return <li key={`${item.kind}-${data.id}`}>
            <article className="guest-preview__card" data-glass-exclude>
              <button type="button" className="guest-preview__card-open" aria-label={`Xem ${isSource ? 'tin phòng' : 'phòng'}: ${data.title}`} onClick={() => item.kind === 'post' ? setSelected(item.data) : setSelectedSource(item.data)}>
                <span className="guest-preview__photo">
                  <span>Chưa có ảnh</span>
                  {photos[0] ? <img src={photos[0]} alt="" loading="lazy" decoding="async" referrerPolicy={isSource ? 'no-referrer' : undefined} onError={event => { event.currentTarget.hidden = true }} /> : null}
                  <span className="guest-preview__source-badge">{item.kind === 'source' ? rentalSourceLabel(item.data.source) : item.data.type === RentalPostType.VacantRoom ? 'Cho thuê' : rentalPostTypeLabel[item.data.type]}</span>
                  {item.kind === 'source' && photos.length > 1 ? <span className="guest-preview__photo-count">{photos.length} ảnh</span> : null}
                </span>
                <span className="guest-preview__copy">
                  <span className="guest-preview__price">{formatListingRent(data.price)}<small>{basis === 'person' ? ' / người / tháng' : basis === 'room' ? ' / tháng' : data.price > 0 ? ' · theo tin' : ''}</small></span>
                  <span className="guest-preview__name">{data.title}</span>
                  <span className="guest-preview__address">{data.address || 'Chưa có địa chỉ'}</span>
                  <span className="guest-preview__meta"><span>{formatListingArea(data.area)}</span>{item.kind === 'post' && item.data.maxOccupants && item.data.maxOccupants > 0 ? <span>Tối đa {item.data.maxOccupants} người</span> : null}{item.kind === 'source' ? <span>{item.data.district === 'thu-duc' ? 'Thủ Đức' : item.data.district === 'quan-9' ? 'Quận 9' : item.data.district}</span> : null}</span>
                  {item.kind === 'post' && item.data.descriptionExcerpt ? <span className="guest-preview__excerpt">{item.data.descriptionExcerpt}</span> : null}
                  <span className="guest-preview__card-footer"><span>{item.kind === 'post' && item.data.ownerDisplayName ? item.data.ownerDisplayName : isSource ? 'Tin từ nguồn công khai' : 'Tin trên Homeji'}</span><strong>Xem chi tiết <Arrow /></strong></span>
                </span>
              </button>
            </article>
          </li>
        })}
      </ul>
      {!loading && !filtered.length ? <p className="guest-preview__state">{items.length ? 'Chưa có tin trong khoảng giá này. Thử một khoảng giá khác.' : 'Chưa có tin để hiển thị. Bạn có thể khám phá khu vực trên bản đồ.'}</p> : null}
      {!loading && shown.length < filtered.length ? <div className="guest-preview__more"><button type="button" onClick={() => setVisibleCount(count => count + 8)}>Xem thêm {Math.min(8, filtered.length - shown.length)} lựa chọn <Arrow /></button></div> : null}
      {loading ? <span className="guest-preview__sr-only" role="status">Đang tải phòng nổi bật…</span> : null}
    </div>
    {selected ? <GuestRoomPreview key={selected.id} summary={selected} onClose={() => setSelected(null)} /> : null}
    {selectedSource ? <GuestSourcePreview key={selectedSource.id} listing={selectedSource} onClose={() => setSelectedSource(null)} /> : null}
  </section>
}

function GuestSourcePreview({ listing, onClose }: { listing: RentalSourceListing; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    const previousOverflow = document.body.style.overflow
    const wasPaused = isGuestCoastPaused()
    pauseGuestCoast()
    document.body.style.overflow = 'hidden'
    element.showModal()
    return () => {
      element.close()
      document.body.style.overflow = previousOverflow
      if (!wasPaused) resumeGuestCoast()
    }
  }, [])

  const photos = listing.imageUrls.map(rentalSourceImageHref).filter((url): url is string => Boolean(url))
  const sourceHref = rentalSourceHref(listing.sourceUrl)

  return <dialog ref={dialog} className="guest-preview-dialog" aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); onClose() }}
    onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <div className="guest-preview-dialog__inner">
      <header className="guest-preview-dialog__heading">
        <span></span>
        <button type="button" aria-label="Đóng chi tiết tin phòng" onClick={onClose} autoFocus>×</button>
      </header>
      {photos.length ? <div className="guest-preview-dialog__gallery" aria-label="Ảnh từ tin đăng">
        {photos.map((photo, index) => <img key={photo} src={photo} alt={`Ảnh theo tin ${index + 1}`} loading="lazy" referrerPolicy="no-referrer" onError={event => { event.currentTarget.hidden = true }} />)}
      </div> : null}
      <div className="guest-preview-dialog__body">
        <h2 id={titleId}>{listing.title}</h2>
        <p className="guest-preview-dialog__address">{listing.address}</p>
        <div className="guest-preview-dialog__facts">
          <div><span>Giá thuê / tháng</span><strong>{formatListingRent(listing.price)}</strong></div>
          <div><span>Diện tích</span><strong>{formatListingArea(listing.area)}</strong></div>
          <div><span>Nguồn dữ liệu</span><strong>{rentalSourceLabel(listing.source)} · {listing.sourceId}</strong></div>
        </div>
        <p className="guest-preview-dialog__description">Tin được lưu trong Homeji từ nguồn công khai. Giá, hình ảnh và tình trạng cho thuê do nguồn đăng cung cấp, Homeji chưa xác minh và không thể dùng tin này để đặt lịch xem phòng.</p>
        <footer className="guest-preview-dialog__footer">
          <span>Đã lưu dữ liệu trong Homeji · Cập nhật {new Date(listing.collectedAt).toLocaleDateString('vi-VN')}</span>
          {sourceHref ? <a href={sourceHref} target="_blank" rel="noopener noreferrer" className="liquid-action">Xem tin gốc <Arrow /></a> : null}
        </footer>
      </div>
    </div>
  </dialog>
}

function GuestRoomPreview({ summary, onClose }: { summary: RentalPostSummary; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [post, setPost] = useState<RentalPost | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    const previousOverflow = document.body.style.overflow
    const wasPaused = isGuestCoastPaused()
    pauseGuestCoast()
    document.body.style.overflow = 'hidden'
    element.showModal()
    return () => {
      element.close()
      document.body.style.overflow = previousOverflow
      if (!wasPaused) resumeGuestCoast()
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void getRentalPost(summary.id, { auth: false, signal: controller.signal })
      .then(data => {
        if (!controller.signal.aborted) {
          if (data.isSynthetic) setError('Tin phòng này hiện không còn hiển thị.')
          else setPost(data)
        }
      })
      .catch(reason => { if (!controller.signal.aborted) setError(getErrorMessage(reason, 'Chưa tải được chi tiết phòng.')) })
    return () => controller.abort()
  }, [summary.id, attempt])

  const photos = post ? [...new Set(post.media.filter(media => media.mediaType === MediaType.Image).map(media => media.path).filter(Boolean))] : []
  if (post?.thumbnailPath && !photos.length) photos.push(post.thumbnailPath)

  return <dialog ref={dialog} className="guest-preview-dialog" aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); onClose() }}
    onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <div className="guest-preview-dialog__inner">
      <header className="guest-preview-dialog__heading">
        <span>Thông tin phòng</span>
        <button type="button" aria-label="Đóng chi tiết phòng" onClick={onClose} autoFocus>×</button>
      </header>
      {error ? <div className="guest-preview__state" role="alert"><p>{error}</p>
        <button type="button" onClick={() => { setError(''); setAttempt(value => value + 1) }}>Thử lại</button>
      </div> : !post ? <p className="guest-preview__state" role="status">Đang tải chi tiết phòng…</p> : <>
        {photos.length ? <div className="guest-preview-dialog__gallery" aria-label="Ảnh phòng">
          {photos.map((photo, index) => <img key={photo} src={photo} alt={`Ảnh phòng ${index + 1}`} loading="lazy" onError={event => { event.currentTarget.hidden = true }} />)}
        </div> : null}
        <div className="guest-preview-dialog__body">
          <h2 id={titleId}>{post.title}</h2>
          <p className="guest-preview-dialog__address">{post.address || 'Chưa có địa chỉ'}</p>
          <div className="guest-preview-dialog__facts">
            <div><span>{rentalPriceLabel(rentalPriceBasis(post))}</span><strong>{formatListingRent(post.price)}</strong></div>
            <div><span>Diện tích</span><strong>{formatListingArea(post.area)}</strong></div>
            <div><span>Tiền cọc</span><strong>{formatListingRent(post.deposit)}</strong></div>
          </div>
          {post.description ? <p className="guest-preview-dialog__description">{post.description}</p> : null}
          {post.amenities.length ? <div className="guest-preview-dialog__amenities" aria-label="Tiện ích">
            {[...new Set(post.amenities)].map(code => <span key={code}>{amenityLabel(code)}</span>)}
          </div> : null}
          <footer className="guest-preview-dialog__footer">
            <span>Bạn có thể xem phòng mà không cần tài khoản.</span>
            <Link to="/login" className="liquid-action">Đăng nhập để liên hệ <Arrow /></Link>
          </footer>
        </div>
      </>}
      {!post ? <h2 id={titleId} className="guest-preview__sr-only">{summary.title}</h2> : null}
    </div>
  </dialog>
}
