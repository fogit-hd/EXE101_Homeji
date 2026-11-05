import { ContactFlashlightIcon } from '../../profile/ContactFlashlightIcon'
import { createPortal } from 'react-dom'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { useAuthModal } from '../../../contexts/AuthModalContext.logic'
import { getRentalSource, getRentalSourceContact, rentalSourcePublisher, rentalSourceImageHref, type RentalSourceListing } from '../../../api/rentalSources'
import { formatListingArea, formatListingRent } from '../../../lib/labels'
import { listingReference } from '../../../lib/listingReference'
import { getErrorMessage } from '../../../lib/errors'
import { pauseGuestCoast, resumeGuestCoast, isGuestCoastPaused } from '../../landing/guestCoast'
import { RoomDetailHeader, RoomEssentials } from './RoomDetailPresentation'
import { PhotoGallery } from './RoomPhotoGallery'
import { isApartmentListing } from '../../../lib/rentalPropertyCategory'
import './SourceRoomDetail.css'

export function SourceRoomDetail({ id, summary, onClose }: { id: string; summary?: RentalSourceListing; onClose: () => void }) {
  const dialog = useRef<HTMLDivElement>(null)
  const contact = useRef<HTMLElement>(null)
  const closeRef = useRef(onClose)
  useLayoutEffect(() => { closeRef.current = onClose }, [onClose])
  const labelId = useId()
  const [listing, setListing] = useState(summary ?? null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
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
    pauseGuestCoast(); document.body.style.overflow = 'hidden'; element.querySelector<HTMLButtonElement>('[data-room-detail-close]')?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || element.querySelector('dialog[open]') || document.querySelector('.auth-modal-overlay')) return
      if (event.target instanceof Element && event.target !== document.body && !element.contains(event.target)) return
      event.preventDefault(); event.stopImmediatePropagation(); closeRef.current()
    }
    window.addEventListener('keydown', onKey, true)
    return () => { window.removeEventListener('keydown', onKey, true); document.body.style.overflow = previousOverflow; if (!wasPaused) resumeGuestCoast(); previousFocus?.focus() }
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
  const attribution = rentalSourcePublisher(listing?.publisherName)
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
  const rent = listing ? formatListingRent(listing.price) : 'Chưa cung cấp'
  const deposit = listing?.depositLabel?.trim() || 'Chưa cung cấp'
  const apartment = listing ? isApartmentListing(listing.title) : false
  return createPortal(<div className="room-detail__backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <div ref={dialog} className="room-detail room-detail--source" role="dialog" aria-modal="true" aria-labelledby={labelId}
      onKeyDown={event => {
        if (event.target instanceof Element && event.target.closest('dialog')) return
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); return }
        if (event.key !== 'Tab') return
        const nodes = [...(dialog.current?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],[tabindex="0"]') ?? [])].filter(node => node.getClientRects().length > 0)
        const first = nodes[0], last = nodes[nodes.length - 1]
        if (event.shiftKey && document.activeElement === first && last) { event.preventDefault(); last.focus() }
        else if (!event.shiftKey && document.activeElement === last && first) { event.preventDefault(); first.focus() }
      }}>
    <RoomDetailHeader titleId={labelId} title={apartment ? 'Chi tiết căn hộ' : 'Chi tiết phòng trọ'} onClose={onClose} />
    <div className="room-detail__body">
      <section className="room-detail__main source-room-detail__room" aria-label="Thông tin chi tiết phòng" tabIndex={0}>
        {error ? <div className="room-detail__status" role="alert"><p>{error}</p><button type="button" className="room-detail__retry" onClick={() => setAttempt(value => value + 1)}>Thử lại</button></div> : null}
        {!loaded && !error ? <p role="status">Đang tải thông tin phòng…</p> : null}
        {listing ? <>
          <div className="room-detail__mobile-facts"><RoomEssentials rentLabel="Giá thuê / tháng" rent={rent} area={formatListingArea(listing.area)} deposit={deposit} /></div>
          <PhotoGallery key={id} urls={images} />
          <div className="room-detail__summary">
            <p className="room-detail__eyebrow">{apartment ? 'CĂN HỘ CHO THUÊ' : 'PHÒNG TRỌ CHO THUÊ'}</p>
            <h3>{listing.title}</h3>
            <p className="room-detail__muted">Mã tin: {listingReference(listing.id)}</p>
            <p className="room-detail__address">{listing.address || 'Chưa cung cấp địa chỉ'}</p>
            <ul className="room-detail__facts"><li>{apartment ? 'Căn hộ' : 'Phòng trọ'}</li></ul>
          </div>
          <section className="room-detail__costs" data-glass-exclude><h4>Chi phí thuê & tiền cọc</h4>
            {[['Tiền thuê', rent], ['Tiền cọc', deposit], ['Điện, nước', 'Chưa cung cấp'], ['Phí khác', 'Chưa cung cấp']].map(([label, value]) => <p key={label} className="room-detail__cost"><span>{label}</span><span>{value}</span></p>)}
            <p className="room-detail__muted">Xác nhận các khoản phí với người đăng trước khi quyết định.</p>
          </section>
          <section className="room-detail__section" data-glass-exclude><h4>Mô tả căn phòng</h4><p>{loaded ? listing.description || 'Chưa có mô tả chi tiết cho phòng này.' : 'Đang tải mô tả…'}</p></section>
          <section className="room-detail__section" data-glass-exclude><h4>Tiện ích trong phòng</h4>{listing.amenityHighlights?.length ? <ul className="room-detail__facts">{listing.amenityHighlights.map(label => <li key={label}>{label}</li>)}</ul> : <p className="room-detail__muted">Chưa cung cấp</p>}</section>
          <section className="room-detail__section"><h4>Thông tin cập nhật</h4><p className="room-detail__muted">{date ? `Cập nhật ngày ${new Date(date).toLocaleDateString('vi-VN')}.` : 'Chưa có ngày cập nhật.'} {expired ? 'Tin đã hết hạn. Liên hệ để kiểm tra lại trước khi đến.' : 'Xác nhận tình trạng phòng với người đăng.'}</p></section>
        </> : null}
      </section>
      <aside ref={contact} className="room-detail__aside source-room-detail__contact" aria-label="Giá thuê và liên hệ" tabIndex={-1}>
        <div className="room-detail__price"><p className="room-detail__kicker">GIÁ THUÊ / THÁNG</p><p className="room-detail__amount">{rent}</p><p className="room-detail__muted">Giá thuê theo tin đăng</p></div>
        <RoomEssentials rentLabel="Giá thuê / tháng" area={listing ? formatListingArea(listing.area) : 'Chưa cung cấp'} deposit={deposit} /><hr />
        <section className="room-detail__owner-profile" data-glass-exclude><h4>Người liên hệ</h4>
          <p><strong>{attribution}</strong></p>
          <p className="room-detail__muted">Homeji chưa xác minh người đăng của tin này.</p>
        {isAuthenticated && currentContact?.state === 'ready' && !phones.length
            ? <p className="source-room-detail__missing" role="status">Tin này chưa có số điện thoại để liên hệ.</p>
            : <>
              <button type="button" className="source-room-detail__phone" aria-pressed={phoneVisible} disabled={currentContact?.state === 'loading'} onClick={handleRevealPhone}>
                <ContactFlashlightIcon />
                {phoneVisible ? `Ẩn ${phones.length} số điện thoại` : !isAuthenticated ? 'Đăng nhập để xem số điện thoại' : currentContact?.state === 'loading' ? 'Đang tải số điện thoại…' : currentContact?.state === 'error' ? 'Thử tải lại số' : 'Nhấn để xem số điện thoại'}
                {phoneVisible ? <small>Số công khai trong tin đăng</small> : null}
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

        </section>
        <div className="room-detail__note"><strong>Xem phòng trước khi quyết định</strong><p>Trao đổi trực tiếp để xác nhận thông tin và điều kiện thuê.</p></div>
      </aside>
    </div>
    <footer className="room-detail__footer"><div className="room-detail__footer-copy"><strong className="room-detail__footer-price">{rent}<small> / tháng</small></strong><p>{attribution}</p></div>
      <div className="room-detail__footer-actions"><button type="button" className="room-detail__message" disabled={!listing || currentContact?.state === 'loading'} onClick={() => { handleRevealPhone(); contact.current?.focus() }}>Liên hệ người đăng</button></div>
    </footer>
  </div></div>, document.body)
}
