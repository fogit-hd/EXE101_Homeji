import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getRentalPost, MediaType, searchRentalPosts, type RentalPost, type RentalPostSummary } from '../../api'
import { rentalPriceBasis, rentalPriceLabel } from '../ai/rentalPriceBasis'
import { amenityLabel, formatListingArea, formatListingRent, rentalPostTypeLabel } from '../../lib/labels'
import { getErrorMessage } from '../../lib/errors'
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [selected, setSelected] = useState<RentalPostSummary | null>(null)
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
    const element = rail.current
    if (!element) return
    const update = () => setArrows({
      previous: element.scrollLeft > 2,
      next: element.scrollLeft + element.clientWidth < element.scrollWidth - 2,
    })
    const frame = requestAnimationFrame(update)
    const observer = new ResizeObserver(update)
    observer.observe(element)
    element.addEventListener('scroll', update, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      element.removeEventListener('scroll', update)
    }
  }, [posts.length, loading, error])

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
      {error ? <div className="guest-preview__state" role="alert">
        <p>{error}</p>
        <button type="button" onClick={() => { setLoading(true); setError(''); setAttempt(value => value + 1) }}>Thử lại</button>
      </div> : !loading && !posts.length ? <p className="guest-preview__state" role="status">Hiện chưa có phòng nổi bật. Bạn quay lại sau nhé.</p> : <ul
        ref={rail} className="guest-preview__rail" aria-label="Danh sách phòng nổi bật" aria-busy={loading} tabIndex={0}
        onKeyDown={event => {
          if (event.target !== event.currentTarget || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return
          event.preventDefault()
          scroll(event.key === 'ArrowLeft' ? -1 : 1)
        }}>
        {loading ? Array.from({ length: 3 }, (_, index) => <li key={index} className="guest-preview__skeleton" aria-hidden="true">
          <div /><span /><span />
        </li>) : posts.map(post => <li key={post.id}>
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
        </li>)}
      </ul>}
      {loading ? <span className="guest-preview__sr-only" role="status">Đang tải phòng nổi bật…</span> : null}
    </div>
    {selected ? <GuestRoomPreview key={selected.id} summary={selected} onClose={() => setSelected(null)} /> : null}
  </section>
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
            <Link to="/login">Đăng nhập để liên hệ <Arrow /></Link>
          </footer>
        </div>
      </>}
      {!post ? <h2 id={titleId} className="guest-preview__sr-only">{summary.title}</h2> : null}
    </div>
  </dialog>
}
