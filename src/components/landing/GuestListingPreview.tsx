import { useEffect, useId, useRef, useState } from 'react'
import { observeElementResize } from '../../lib/observeElementResize'
import { Link } from 'react-router-dom'
import { getRentalPost, MediaType, searchRentalPosts, type RentalPost, type RentalPostSummary } from '../../api'
import { rentalPriceBasis, rentalPriceLabel } from '../ai/rentalPriceBasis'
import { amenityLabel, formatListingArea, formatListingRent, rentalPostTypeLabel } from '../../lib/labels'
import { getErrorMessage } from '../../lib/errors'
import { searchRentalSources, type RentalSourceListing } from '../../api/rentalSources'
import { isGuestCoastPaused, pauseGuestCoast, resumeGuestCoast } from './guestCoast'
import './GuestListingPreview.css'

function Arrow({ previous = false }: { previous?: boolean }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={previous ? 'M19 12H5m6 6-6-6 6-6' : 'M5 12h14m-6-6 6 6-6 6'} />
  </svg>
}

/** Public API only. External advertisements and synthetic rooms are never substituted. */
export function GuestListingPreview() {
  const [posts, setPosts] = useState<RentalPostSummary[]>([])
  const [sourceListings, setSourceListings] = useState<RentalSourceListing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [selected, setSelected] = useState<RentalPostSummary | null>(null)
  const [selectedSource, setSelectedSource] = useState<RentalSourceListing | null>(null)
  const rail = useRef<HTMLUListElement>(null)
  const [arrows, setArrows] = useState({ previous: false, next: false })

  useEffect(() => {
    const controller = new AbortController()
    void searchRentalPosts({ page: 1, pageSize: 6 }, { auth: false, signal: controller.signal })
      .then(data => {
        if (!controller.signal.aborted) setPosts(data.filter(post => !post.isSynthetic))
      })
      .catch(reason => {
        if (!controller.signal.aborted) setError(getErrorMessage(reason, 'Chưa tải được phòng nổi bật.'))
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [attempt])

  useEffect(() => {
    let active = true
    void searchRentalSources({ keyword: '', district: 'quan-9', page: 1 })
      .then(data => { if (active) setSourceListings(data.filter(item => item.source === 'mogi').slice(0, 6)) })
      .catch(() => { if (active) setSourceListings([]) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    const element = rail.current
    if (!element) return
    const update = () => setArrows({
      previous: element.scrollLeft > 2,
      next: element.scrollLeft + element.clientWidth < element.scrollWidth - 2,
    })
    const frame = requestAnimationFrame(update)
    const stopObserving = observeElementResize([element], update)
    element.addEventListener('scroll', update, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      stopObserving()
      element.removeEventListener('scroll', update)
    }
  }, [posts.length, sourceListings.length, loading, error])

  const scroll = (direction: number) => {
    const element = rail.current
    if (element) element.scrollBy({ left: direction * element.clientWidth * .85, behavior: 'smooth' })
  }

  return <section className="guest-preview" id="listings" aria-labelledby="guest-featured-title">
    <div className="guest-preview__inner">
      <header className="guest-preview__heading">
        <h2 id="guest-featured-title">Phòng nổi bật</h2>
        {arrows.previous || arrows.next ? <div className="guest-preview__arrows">
          <button type="button" aria-label="Xem phòng phía trước" disabled={!arrows.previous} onClick={() => scroll(-1)}><Arrow previous /></button>
          <button type="button" aria-label="Xem phòng tiếp theo" disabled={!arrows.next} onClick={() => scroll(1)}><Arrow /></button>
        </div> : null}
      </header>
      <p className="guest-preview__note">Căn hộ tham khảo được lưu trong Homeji từ dữ liệu Mogi. Mở thẻ để xem chi tiết tại đây; Homeji chưa xác minh tình trạng phòng.</p>
      {error ? <div className="guest-preview__state" role="alert">
        <p>{error}</p>
        <button type="button" onClick={() => { setLoading(true); setError(''); setAttempt(value => value + 1) }}>Thử lại</button>
      </div> : null}
      <ul
        ref={rail} className="guest-preview__rail" aria-label="Danh sách phòng nổi bật" aria-busy={loading} tabIndex={0}
        onKeyDown={event => {
          if (event.target !== event.currentTarget || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return
          event.preventDefault()
          scroll(event.key === 'ArrowLeft' ? -1 : 1)
        }}>
        {loading ? Array.from({ length: 3 }, (_, index) => <li key={index} className="guest-preview__skeleton" aria-hidden="true">
          <div /><span /><span />
        </li>) : <>{posts.map(post => <li key={post.id}>
          <article className="guest-preview__card">
            <button type="button" className="guest-preview__card-open" aria-label={`Xem phòng: ${post.title}`} onClick={() => setSelected(post)}>
              <span className="guest-preview__photo">
                <span>Chưa có ảnh</span>
                {post.thumbnailPath ? <img src={post.thumbnailPath} alt="" loading="lazy" decoding="async" onError={event => { event.currentTarget.hidden = true }} /> : null}
              </span>
              <span className="guest-preview__copy">
                <span className="guest-preview__price">{formatListingRent(post.price)}
                  {post.price > 0 ? <small>{rentalPriceBasis(post) === 'person' ? ' / người / tháng' : rentalPriceBasis(post) === 'room' ? ' / tháng' : ' · theo tin'}</small> : null}
                </span>
                <span className="guest-preview__name">{post.title}</span>
                <span className="guest-preview__address">{post.address || 'Chưa có địa chỉ'}</span>
                <span className="guest-preview__meta">{formatListingArea(post.area)}<span aria-hidden="true">·</span>{rentalPostTypeLabel[post.type]}</span>
              </span>
            </button>
          </article>
        </li>)}{sourceListings.map(listing => <li key={listing.id}>
          <article className="guest-preview__card">
            <button type="button" className="guest-preview__card-open guest-preview__source-button" onClick={() => setSelectedSource(listing)} aria-label={`Xem căn hộ tham khảo: ${listing.title}`}>
              <span className="guest-preview__photo">
                <span>Chưa có ảnh</span>
                {listing.imageUrls[0] ? <img src={listing.imageUrls[0]} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={event => { event.currentTarget.hidden = true }} /> : null}
                <span className="guest-preview__source-badge">Tin tham khảo · Mogi</span>
              </span>
              <span className="guest-preview__copy">
                <span className="guest-preview__price">{formatListingRent(listing.price)}<small> / tháng</small></span>
                <span className="guest-preview__name">{listing.title}</span>
                <span className="guest-preview__address">{listing.address}</span>
                <span className="guest-preview__meta">{formatListingArea(listing.area)}<span aria-hidden="true">·</span>Căn hộ · Xem chi tiết</span>
              </span>
            </button>
          </article>
        </li>)}</>}
      </ul>
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

  const photos = listing.imageUrls.filter(raw => {
    try {
      const url = new URL(raw)
      return url.protocol === 'https:' && url.hostname === 'cloud.mogi.vn' && !url.username && !url.password
    } catch { return false }
  })

  return <dialog ref={dialog} className="guest-preview-dialog" aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); onClose() }}
    onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <div className="guest-preview-dialog__inner">
      <header className="guest-preview-dialog__heading">
        <span></span>
        <button type="button" aria-label="Đóng chi tiết căn hộ" onClick={onClose} autoFocus>×</button>
      </header>
      {photos.length ? <div className="guest-preview-dialog__gallery" aria-label="Ảnh căn hộ">
        {photos.map((photo, index) => <img key={photo} src={photo} alt={`Ảnh căn hộ ${index + 1}`} loading="lazy" referrerPolicy="no-referrer" onError={event => { event.currentTarget.hidden = true }} />)}
      </div> : null}
      <div className="guest-preview-dialog__body">
        <h2 id={titleId}>{listing.title}</h2>
        <p className="guest-preview-dialog__address">{listing.address}</p>
        <div className="guest-preview-dialog__facts">
          <div><span>Giá tham khảo / tháng</span><strong>{formatListingRent(listing.price)}</strong></div>
          <div><span>Diện tích</span><strong>{formatListingArea(listing.area)}</strong></div>
          <div><span>Nguồn dữ liệu</span><strong>Mogi · {listing.sourceId}</strong></div>
        </div>
        <p className="guest-preview-dialog__description">Đây là tin tham khảo được lưu trong Homeji từ nguồn công khai. Giá, hình ảnh và tình trạng cho thuê do nguồn đăng cung cấp, Homeji chưa xác minh và không thể dùng tin này để đặt lịch xem phòng.</p>
        <footer className="guest-preview-dialog__footer">
          <span>Đã lưu dữ liệu trong Homeji · Cập nhật {new Date(listing.collectedAt).toLocaleDateString('vi-VN')}</span>
          <Link to="/explore" className="liquid-action">Tìm phòng trên Homeji <Arrow /></Link>
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
