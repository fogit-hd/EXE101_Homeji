import { createPortal } from 'react-dom'
import { useEffect, useId, useRef, useState } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { useAuthModal } from '../../../contexts/AuthModalContext.logic'
import { getRentalSource, getRentalSourceContact, rentalSourceImageHref, type RentalSourceListing } from '../../../api/rentalSources'
import { formatListingArea, formatListingRent } from '../../../lib/labels'
import { listingReference } from '../../../lib/listingReference'
import { getErrorMessage } from '../../../lib/errors'
import { pauseGuestCoast, resumeGuestCoast, isGuestCoastPaused } from '../../landing/guestCoast'
import './SourceRoomDetail.css'

export function SourceRoomDetail({ id, summary, onClose }: { id: string; summary?: RentalSourceListing; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const labelId = useId()
  const [listing, setListing] = useState(summary ?? null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [tab, setTab] = useState<'room' | 'contact'>('room')
  const [photo, setPhoto] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [copyState, setCopyState] = useState('')
  const [contactRequest, setContactRequest] = useState<{ id: string; state: 'loading' | 'ready' | 'error'; phone: string | null; phones: string[]; error?: string } | null>(null)
  const [now] = useState(Date.now)
  const { isAuthenticated } = useAuth()
  const { openAuthModal } = useAuthModal()
  const currentContact = contactRequest?.id === id ? contactRequest : null
  const phones = currentContact?.state === 'ready'
    ? [...new Set([...(currentContact.phones ?? []), currentContact.phone ?? ''].filter(value => /^0\d{9,10}$/.test(value)))]
    : []
  const phoneVisible = isAuthenticated && revealed && phones.length > 0
  useEffect(() => {
    const element = dialog.current
    if (!element) return
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    const wasPaused = isGuestCoastPaused()
    pauseGuestCoast(); document.body.style.overflow = 'hidden'; element.showModal()
    return () => { element.close(); document.body.style.overflow = previousOverflow; if (!wasPaused) resumeGuestCoast(); previousFocus?.focus() }
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    void getRentalSource(id, controller.signal).then(row => { if (!controller.signal.aborted) { setListing(row); setLoaded(true); setError('') } })
      .catch(reason => { if (!controller.signal.aborted) setError(getErrorMessage(reason, 'Chưa tải được thông tin phòng. Bạn thử lại.')) })
    return () => controller.abort()
  }, [id, attempt])
  useEffect(() => {
    if (!isAuthenticated || !revealed || currentContact?.state !== 'loading') return undefined
    const controller = new AbortController()
    void getRentalSourceContact(id, controller.signal)
      .then(result => { if (!controller.signal.aborted) setContactRequest({ id, state: 'ready', phone: result.phone, phones: result.phones ?? [] }) })
      .catch(reason => { if (!controller.signal.aborted) setContactRequest({ id, state: 'error', phone: null, phones: [], error: getErrorMessage(reason, 'Chưa tải được số điện thoại. Vui lòng thử lại.') }) })
    return () => controller.abort()
  }, [id, isAuthenticated, revealed, currentContact?.state])
  const images = listing?.imageUrls.map(rentalSourceImageHref).filter((value): value is string => Boolean(value)) ?? []
  const expired = Boolean(listing?.sourceExpiresAt && Date.parse(listing.sourceExpiresAt) <= now)
  const publisher = listing?.publisherName?.trim() || 'Chưa có tên người đăng'
  const date = listing?.detailsCollectedAt ?? listing?.collectedAt
  async function copyPhone(phone: string) {
    if (!/^0\d{9,10}$/.test(phone)) return
    if (!isAuthenticated) {
      openAuthModal({ intent: 'contact', onSuccess: requestPhone })
      return
    }
    try { await navigator.clipboard.writeText(phone); setCopyState('Đã sao chép số điện thoại') }
    catch { setCopyState('Chưa sao chép được. Bạn có thể chọn số điện thoại để sao chép.') }
  }
  function requestPhone() {
    setRevealed(true)
    setContactRequest({ id, state: 'loading', phone: null, phones: [] })
  }
  function handleRevealPhone() {
    if (!isAuthenticated) {
      openAuthModal({ intent: 'contact', onSuccess: requestPhone })
      return
    }
    if (currentContact?.state === 'ready' && phones.length) { setRevealed(value => !value); return }
    requestPhone()
  }
  return createPortal(<dialog ref={dialog} className="source-room-detail" aria-labelledby={labelId}
    onCancel={event => { event.preventDefault(); onClose() }} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <header className="source-room-detail__header"><div><span>HOMEJI · CHI TIẾT PHÒNG</span><strong id={labelId}>{listing?.title ?? 'Thông tin phòng'}</strong></div><button type="button" autoFocus aria-label="Đóng chi tiết phòng" onClick={onClose}>×</button></header>
    <div className="source-room-detail__tabs" role="tablist" aria-label="Thông tin phòng và liên hệ">
      {(['room', 'contact'] as const).map((value, index) => <button id={`${labelId}-${value}-tab`} type="button" key={value} role="tab" aria-selected={tab === value} aria-controls={`${labelId}-${value}`} tabIndex={tab === value ? 0 : -1} onClick={() => setTab(value)} onKeyDown={event => {
        if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const next = event.key === 'Home' ? 'room' : event.key === 'End' ? 'contact' : index === 0 ? 'contact' : 'room'; setTab(next); document.getElementById(`${labelId}-${next}-tab`)?.focus() }
      }}>{value === 'room' ? 'Thông tin phòng' : 'Liên hệ'}</button>)}
    </div>
    <div className="source-room-detail__columns" data-tab={tab}>
      <section className="source-room-detail__room" id={`${labelId}-room`} aria-label="Thông tin phòng" tabIndex={0}>
        {error ? <p className="source-room-detail__error" role="alert">{error} <button type="button" onClick={() => setAttempt(value => value + 1)}>Thử lại</button></p> : null}
        {!loaded && !error ? <p role="status">Đang tải thông tin phòng…</p> : null}
        {listing ? <>
          <div className="source-room-detail__gallery">
            {images[photo] ? <img src={images[photo]} alt={`Ảnh phòng ${photo + 1} trong ${images.length}`} referrerPolicy="no-referrer" onError={event => { event.currentTarget.style.opacity = '.15' }} /> : <span>Chưa có ảnh</span>}
            {images.length > 1 ? <><button type="button" aria-label="Ảnh trước" onClick={() => setPhoto(value => (value + images.length - 1) % images.length)}>‹</button><button type="button" aria-label="Ảnh tiếp theo" onClick={() => setPhoto(value => (value + 1) % images.length)}>›</button><span>{photo + 1} / {images.length}</span></> : null}
          </div>
          {images.length > 1 ? <div className="source-room-detail__thumbnails" aria-label="Chọn ảnh phòng">{images.map((image, index) => <button type="button" key={image} aria-label={`Xem ảnh ${index + 1}`} aria-pressed={index === photo} onClick={() => setPhoto(index)}><img src={image} loading="lazy" alt="" referrerPolicy="no-referrer" /></button>)}</div> : null}
          <div className="source-room-detail__intro"><p className="source-room-detail__price">{formatListingRent(listing.price)}<small> / tháng</small></p><h1>{listing.title}</h1><p>{listing.address}</p>
            <dl><div><dt>Diện tích</dt><dd>{formatListingArea(listing.area)}</dd></div><div><dt>Khu vực</dt><dd>{listing.district === 'quan-9' ? 'Quận 9' : 'Thủ Đức'}</dd></div><div><dt>Mã tin</dt><dd>{listingReference(listing.id)}</dd></div></dl>
          </div>
          <section className="source-room-detail__description"><h2>Không gian & thông tin phòng</h2><p>{loaded ? listing.description || 'Chưa có mô tả chi tiết cho phòng này.' : 'Đang tải mô tả…'}</p></section>
          <section className="source-room-detail__provenance"><h2>Thông tin cập nhật</h2><p>{date ? `Cập nhật ngày ${new Date(date).toLocaleDateString('vi-VN')}.` : 'Chưa có ngày cập nhật.'}</p><p>{expired ? 'Tin đã hết hạn. Liên hệ để kiểm tra lại trước khi đến.' : 'Tình trạng còn phòng và các chi phí cần được xác nhận với người đăng.'}</p></section>
        </> : null}
      </section>
      <aside className="source-room-detail__contact" id={`${labelId}-contact`} aria-label="Thông tin liên hệ">
        <div className="source-room-detail__contact-card"><span className="source-room-detail__eyebrow">LIÊN HỆ NGƯỜI ĐĂNG</span><div className="source-room-detail__person"><span aria-hidden>{publisher.charAt(0)}</span><div><h2>{publisher}</h2><p>Thông tin liên hệ</p></div></div>
          <p className="source-room-detail__verification">Chưa xác minh danh tính trên Homeji</p>
        {isAuthenticated && currentContact?.state === 'ready' && !phones.length
            ? <p className="source-room-detail__missing" role="status">Tin này chưa có số điện thoại để liên hệ.</p>
            : <>
              <button type="button" className="source-room-detail__phone" disabled={currentContact?.state === 'loading'} onClick={handleRevealPhone}>
                {phoneVisible ? `Ẩn ${phones.length} số điện thoại` : !isAuthenticated ? 'Đăng nhập để xem số' : currentContact?.state === 'loading' ? 'Đang tải số điện thoại…' : currentContact?.state === 'error' ? 'Thử tải lại số' : 'Nhấn để xem số điện thoại'}
                <small>{phoneVisible ? 'Số công khai trong tin đăng' : isAuthenticated ? 'Xem thông tin liên hệ' : 'Cần đăng nhập để liên hệ'}</small>
              </button>
              {phoneVisible ? <div className="source-room-detail__contact-actions" aria-label="Các số điện thoại người đăng">
                {phones.map((phone, index) => <div className="source-room-detail__contact-number" key={phone}>
                  <a href={`tel:${phone}`} aria-label={`Gọi người đăng, số ${index + 1}`}>{phone}</a>
                  <button type="button" onClick={() => void copyPhone(phone)}>Sao chép</button>
                </div>)}
              </div> : null}
              {currentContact?.state === 'error' ? <p className="source-room-detail__missing" role="alert">{currentContact.error}</p> : null}
            </>}
          {copyState ? <p role="status">{copyState}</p> : null}
          <div className="source-room-detail__contact-note"><strong>Trao đổi trước khi đến xem</strong><p>Hỏi lại giá thuê, tiền cọc, điện nước và thời gian xem phòng. Chưa liên kết tài khoản người đăng với chat Homeji.</p></div>
        </div>
        <small className="source-room-detail__attribution">Xác nhận tình trạng phòng và chi phí với người đăng trước khi đặt lịch hoặc đặt cọc.</small>
      </aside>
    </div>
  </dialog>, document.body)
}
