import { createPortal } from 'react-dom'
import { useEffect, useId, useRef, useState } from 'react'
import { getRentalSource, rentalSourceImageHref, rentalSourceLabel, type RentalSourceListing } from '../../../api/rentalSources'
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
  const [now] = useState(Date.now)
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
  const images = listing?.imageUrls.map(rentalSourceImageHref).filter((value): value is string => Boolean(value)) ?? []
  const phone = loaded && /^0\d{9,10}$/.test(listing?.contactPhone ?? '') ? listing!.contactPhone! : null
  const expired = Boolean(listing?.sourceExpiresAt && Date.parse(listing.sourceExpiresAt) <= now)
  const publisher = listing?.publisherName?.trim() || 'Chưa có tên người đăng'
  const source = listing ? rentalSourceLabel(listing.source) : ''
  const date = listing?.detailsCollectedAt ?? listing?.collectedAt
  async function copyPhone() {
    if (!phone) return
    try { await navigator.clipboard.writeText(phone); setCopyState('Đã sao chép số điện thoại') }
    catch { setCopyState('Chưa sao chép được. Bạn có thể chọn số điện thoại để sao chép.') }
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
            <dl><div><dt>Diện tích</dt><dd>{formatListingArea(listing.area)}</dd></div><div><dt>Khu vực</dt><dd>{listing.district === 'quan-9' ? 'Quận 9' : 'Thủ Đức'}</dd></div><div><dt>Mã tin</dt><dd>{listingReference(listing.id, listing.source, listing.sourceId)}</dd></div></dl>
          </div>
          <section className="source-room-detail__description"><h2>Không gian & thông tin phòng</h2><p>{loaded ? listing.description || 'Nguồn đăng chưa cung cấp mô tả chi tiết cho phòng này.' : 'Đang tải mô tả…'}</p></section>
          <section className="source-room-detail__provenance"><h2>Thông tin cập nhật</h2><p>Dữ liệu từ {source}{date ? ` · lưu tại Homeji ngày ${new Date(date).toLocaleDateString('vi-VN')}` : ''}.</p><p>{expired ? 'Tin đã hết hạn tại nguồn đăng. Liên hệ để kiểm tra lại trước khi đến.' : 'Tình trạng còn phòng và các chi phí cần được xác nhận với người đăng.'}</p></section>
        </> : null}
      </section>
      <aside className="source-room-detail__contact" id={`${labelId}-contact`} aria-label="Thông tin liên hệ">
        <div className="source-room-detail__contact-card"><span className="source-room-detail__eyebrow">LIÊN HỆ NGƯỜI ĐĂNG</span><div className="source-room-detail__person"><span aria-hidden>{publisher.charAt(0)}</span><div><h2>{publisher}</h2><p>Người đăng trên {source || 'nguồn dữ liệu'}</p></div></div>
          <p className="source-room-detail__verification">Chưa xác minh danh tính trên Homeji</p>
          {phone ? <><button type="button" className="source-room-detail__phone" onClick={() => setRevealed(true)}>{revealed ? phone : `${phone.slice(0, 4)} ••• •••`}<small>{revealed ? 'Số công khai trong tin đăng' : 'Nhấn để hiện số'}</small></button>{revealed ? <div className="source-room-detail__contact-actions"><a href={`tel:${phone}`}>Gọi người đăng</a><button type="button" onClick={() => void copyPhone()}>Sao chép số</button></div> : null}</> : <p className="source-room-detail__missing" role="status">{loaded ? 'Chưa có số liên hệ công khai của người đăng trong dữ liệu thu thập.' : error ? 'Chưa tải được thông tin liên hệ.' : 'Đang tải thông tin liên hệ…'}</p>}
          {copyState ? <p role="status">{copyState}</p> : null}
          <div className="source-room-detail__contact-note"><strong>Trao đổi trước khi đến xem</strong><p>Hỏi lại giá thuê, tiền cọc, điện nước và thời gian xem phòng. Chưa liên kết tài khoản người đăng với chat Homeji.</p></div>
        </div>
        <small className="source-room-detail__attribution">Thông tin và ảnh được lưu từ {source}. Homeji không thay mặt người đăng cam kết tình trạng phòng.</small>
      </aside>
    </div>
  </dialog>, document.body)
}
