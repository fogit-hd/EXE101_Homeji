import { createPortal } from 'react-dom'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { useAuthModal } from '../../../contexts/AuthModalContext.logic'
import { getRentalSource, getRentalSourceContact, rentalSourcePublisher, rentalSourceImageHref, type RentalSourceListing } from '../../../api/rentalSources'
import { formatListingArea, formatMonthlyRent, formatPrice } from '../../../lib/labels'
import { listingReference } from '../../../lib/listingReference'
import { getErrorMessage } from '../../../lib/errors'
import { pauseGuestCoast, resumeGuestCoast, isGuestCoastPaused } from '../../landing/guestCoast'
import { RoomDetailHeader, RoomEssentials, RoomOwnerProfile, RoomOwnerPhone } from './RoomDetailPresentation'
import { PhotoGallery } from './RoomPhotoGallery'
import { isApartmentListing } from '../../../lib/rentalPropertyCategory'
import { sourcePublisherLink } from '../../../lib/sourcePublisherLinks'
import { OwnerSocialContacts } from '../../profile/OwnerSocialContacts'
import mapPinUrl from '../../../assets/room-detail/map-pin.svg'
import './SourceRoomDetail.css'
import { useIsMobile } from '../../../mobile/useIsMobile'
import { MobileDetailPage, MobileDetailSection } from '../../../mobile/detail/MobileDetailPage'

export function SourceRoomDetail({ id, summary, onClose }: { id: string; summary?: RentalSourceListing; onClose: () => void }) {
  const dialog = useRef<HTMLDivElement>(null)
  const contact = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  useLayoutEffect(() => { closeRef.current = onClose }, [onClose])
  const labelId = useId()
  const phoneId = useId()
  const [listing, setListing] = useState(summary ?? null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [copyState, setCopyState] = useState('')
  const [viewingRequested, setViewingRequested] = useState(false)
  const [contactRequest, setContactRequest] = useState<{ id: string; state: 'loading' | 'ready' | 'error'; phone: string | null; phones: string[]; error?: string } | null>(null)
  const [now] = useState(Date.now)
  const isMobile = useIsMobile()
  const [descOpen, setDescOpen] = useState(false)
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
  const publisherId = sourcePublisherLink(id)?.ownerId
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
  const rent = listing ? formatMonthlyRent(listing.price) : 'Chưa cung cấp'
  const deposit = listing?.depositLabel?.trim() || 'Chưa cung cấp'
  const apartment = listing ? isApartmentListing(listing.title) : false
  const showContact = () => { contact.current?.scrollIntoView({ block: 'center' }); contact.current?.focus({ preventScroll: true }) }
  const contactDetails = <>
    {publisherId ? <OwnerSocialContacts userId={publisherId} /> : null}
    <RoomOwnerPhone id={phoneId} revealed={phoneVisible}
      value={phoneVisible ? <a href={`tel:${phones[0]}`} aria-label="Gọi người đăng, số 1" title="Gọi người đăng, số 1">{phones[0]}</a>
        : currentContact?.state === 'loading' ? 'Đang tải…' : currentContact?.state === 'ready' && !phones.length ? 'Chưa cập nhật' : isAuthenticated ? '••• ••• ••••' : 'Đăng nhập để xem số'}
      revealLabel={phoneVisible ? 'Ẩn số điện thoại' : !isAuthenticated ? 'Đăng nhập để xem số điện thoại' : currentContact?.state === 'loading' ? 'Đang tải số điện thoại…' : currentContact?.state === 'error' ? 'Thử tải lại số' : 'Hiện số điện thoại'}
      onReveal={handleRevealPhone} disabled={currentContact?.state === 'loading'}
      hint={phoneVisible ? 'Nhấn số điện thoại để gọi người đăng' : 'Xem số để liên hệ trực tiếp'} />
    {phoneVisible && phones.length > 1 ? <div className="source-room-detail__contact-actions" aria-label="Các số điện thoại khác của người đăng">
      {phones.slice(1).map((phone, index) => <div className="source-room-detail__contact-number" key={phone}>
        <a href={`tel:${phone}`} aria-label={`Gọi người đăng, số ${index + 2}`} title={`Gọi người đăng, số ${index + 2}`}>{phone}</a>
        <button type="button" onClick={() => void copyPhone(phone)}>Sao chép</button>
      </div>)}
    </div> : null}
    {phoneVisible ? <button type="button" className="source-room-detail__copy" onClick={() => void copyPhone(phones[0])}>Sao chép số điện thoại</button> : null}
    {viewingRequested ? <p className="room-detail__muted" role="status">Gọi người đăng để thống nhất thời gian xem phòng.</p> : null}
    {isAuthenticated && currentContact?.state === 'ready' && !phones.length ? <p className="source-room-detail__missing" role="status">Tin này chưa có số điện thoại để liên hệ.</p> : null}
    {currentContact?.state === 'error' ? <p className="source-room-detail__missing" role="alert">{currentContact.error}</p> : null}
    {copyState ? <p role="status">{copyState}</p> : null}
  </>
  if (isMobile) {
    const description = loaded ? listing?.description || 'Chưa có mô tả chi tiết cho phòng này.' : 'Đang tải mô tả…'
    const longDescription = description.length > 280
    const noPhone = currentContact?.state === 'ready' && !phones.length
    return <MobileDetailPage dialogRef={dialog} titleId={labelId} onClose={onClose} busy={!loaded && !error}
      title={apartment ? 'Chi tiết căn hộ' : 'Chi tiết phòng trọ'}
      bar={listing ? <>
        <button type="button" className="m-btn m-btn--secondary" disabled={currentContact?.state === 'loading' || noPhone}
          onClick={() => { setViewingRequested(true); if (!phoneVisible) handleRevealPhone(); showContact() }}>Đặt lịch xem</button>
        {phoneVisible ? <a className="m-btn m-btn--primary" href={`tel:${phones[0]}`}>Gọi điện</a>
          : <button type="button" className="m-btn m-btn--primary" disabled={currentContact?.state === 'loading' || noPhone}
            onClick={() => { handleRevealPhone(); showContact() }}>{currentContact?.state === 'loading' ? 'Đang tải số…' : 'Xem số để gọi'}</button>}
      </> : null}>
      {error ? <div className="m-detail__status" role="alert"><p>{error}</p><button type="button" className="m-btn m-btn--secondary" onClick={() => setAttempt(value => value + 1)}>Thử lại</button></div> : null}
      {!listing && !error ? <div role="status"><div className="m-detail__skel" /><p className="m-detail__status">Đang tải thông tin phòng…</p></div> : null}
      {listing ? <>
        <PhotoGallery key={id} urls={images} />
        <div className="m-detail__head">
          <p className="m-detail__price">{rent}</p>
          <h3 className="m-detail__name">{listing.title}</h3>
          <p className="m-detail__where"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" /><circle cx="12" cy="10" r="2.4" /></svg><span>{listing.address || 'Chưa cung cấp địa chỉ'}</span></p>
          <ul className="m-detail__tags"><li>{apartment ? 'Căn hộ' : 'Phòng trọ'}</li>{expired ? <li>Tin đã hết hạn</li> : null}</ul>
        </div>
        <div className="m-detail__facts" aria-label="Thông tin thuê chính">
          <div><span>Diện tích</span><strong>{formatListingArea(listing.area) || 'Chưa rõ'}</strong></div>
          <div><span>Tiền cọc</span><strong>{deposit}</strong></div>
          <div><span>Cập nhật</span><strong>{date ? new Date(date).toLocaleDateString('vi-VN') : 'Chưa rõ'}</strong></div>
        </div>
        <MobileDetailSection title="Chi phí thuê & tiền cọc">
          {[['Tiền thuê', rent], ['Tiền cọc', deposit], ['Điện, nước', 'Chưa cung cấp'], ['Phí khác', 'Chưa cung cấp']].map(([label, value]) => <p key={label} className="room-detail__cost"><span>{label}</span><span>{value}</span></p>)}
          <p className="m-detail__muted">Xác nhận các khoản phí với người đăng trước khi quyết định.</p>
        </MobileDetailSection>
        <MobileDetailSection title="Mô tả căn phòng">
          <p className={`m-detail__desc${longDescription && !descOpen ? ' is-clamped' : ''}`}>{description}</p>
          {longDescription ? <button type="button" className="m-detail__more" aria-expanded={descOpen} onClick={() => setDescOpen(value => !value)}>{descOpen ? 'Thu gọn' : 'Xem thêm'}</button> : null}
        </MobileDetailSection>
        <MobileDetailSection title="Tiện ích trong phòng">
          {listing.amenityHighlights?.length ? <ul className="m-detail__tags">{listing.amenityHighlights.map(label => <li key={label}>{label}</li>)}</ul> : <p className="m-detail__muted">Chưa cung cấp</p>}
        </MobileDetailSection>
        <MobileDetailSection title="Người đăng">
          <RoomOwnerProfile heading="Hồ sơ người đăng" name={attribution}>
            <p className="m-detail__muted">Homeji chưa xác minh người đăng của tin này.</p>
          </RoomOwnerProfile>
          <div className="m-detail__contacts" ref={contact} tabIndex={-1}>{contactDetails}</div>
        </MobileDetailSection>
        <div className="m-detail__note">
          <strong>Xem phòng trước khi quyết định</strong>
          {expired ? 'Tin đã hết hạn. Liên hệ để kiểm tra lại trước khi đến.' : 'Xác nhận tình trạng phòng với người đăng.'}
        </div>
        <div className="m-detail__foot"><p className="m-detail__muted">Mã tin: {listingReference(listing.id)}</p></div>
      </> : null}
    </MobileDetailPage>
  }
  return createPortal(<div className="room-detail__backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <div ref={dialog} className="room-detail room-detail--source" role="dialog" aria-modal="true" aria-labelledby={labelId}
      onKeyDown={event => {
        if (event.target instanceof Element && event.target.closest('dialog')) return
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); return }
        if (event.key !== 'Tab') return
        const nodes = [...(dialog.current?.querySelectorAll<HTMLElement>('summary,button:not([disabled]),a[href],[tabindex="0"]') ?? [])].filter(node => node.getClientRects().length > 0)
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

            <h3>{listing.title}</h3>
            <p className="room-detail__address"><img loading="lazy" decoding="async" src={mapPinUrl} alt="" width={18} height={18} /><span>{listing.address || 'Chưa cung cấp địa chỉ'}</span></p>
            <ul className="room-detail__facts"><li>{apartment ? 'Căn hộ' : 'Phòng trọ'}</li></ul>
          </div>
          <section className="room-detail__costs" data-glass-exclude><h4>Chi phí thuê & tiền cọc</h4>
            {[['Tiền thuê', rent], ['Tiền cọc', deposit], ['Điện, nước', 'Chưa cung cấp'], ['Phí khác', 'Chưa cung cấp']].map(([label, value]) => <p key={label} className="room-detail__cost"><span>{label}</span><span>{value}</span></p>)}
            <p className="room-detail__muted">Xác nhận các khoản phí với người đăng trước khi quyết định.</p>
          </section>
          <section className="room-detail__section" data-glass-exclude><h4>Mô tả căn phòng</h4><p>{loaded ? listing.description || 'Chưa có mô tả chi tiết cho phòng này.' : 'Đang tải mô tả…'}</p></section>
          <section className="room-detail__section" data-glass-exclude><h4>Tiện ích trong phòng</h4>{listing.amenityHighlights?.length ? <ul className="room-detail__facts">{listing.amenityHighlights.map(label => <li key={label}>{label}</li>)}</ul> : <p className="room-detail__muted">Chưa cung cấp</p>}</section>
          <section className="room-detail__section"><h4>Thông tin cập nhật</h4><p className="room-detail__muted">{date ? `Cập nhật ngày ${new Date(date).toLocaleDateString('vi-VN')}.` : 'Chưa có ngày cập nhật.'} {expired ? 'Tin đã hết hạn. Liên hệ để kiểm tra lại trước khi đến.' : 'Xác nhận tình trạng phòng với người đăng.'}</p></section>
          <p className="room-detail__muted room-detail__reference">Mã tin: {listingReference(listing.id)}</p>
        </> : null}
      </section>
      <aside className="room-detail__aside source-room-detail__contact" aria-label="Giá thuê và liên hệ" tabIndex={-1}>
        <div className="room-detail__price"><p className="room-detail__amount">{rent}</p>{listing && Number.isFinite(listing.price) && listing.price > 0 ? <p className="room-detail__exact-price">{formatPrice(listing.price)}/tháng</p> : null}<p className="room-detail__muted">Giá thuê theo tin đăng</p></div>
        <RoomEssentials rentLabel="Giá thuê / tháng" area={listing ? formatListingArea(listing.area) : 'Chưa cung cấp'} deposit={deposit} /><hr />
        <div className="room-detail__contact" data-glass-exclude>
        <RoomOwnerProfile heading="Hồ sơ người đăng" name={attribution}>
          <p className="room-detail__muted">Homeji chưa xác minh người đăng của tin này.</p>
          <div ref={contact} tabIndex={-1}>{contactDetails}</div>
        </RoomOwnerProfile>
        </div>
        <div className="room-detail__note"><strong>Xem phòng trước khi quyết định</strong><p>Trao đổi trực tiếp để xác nhận thông tin và điều kiện thuê.</p></div>
      </aside>
    </div>
    <footer className="room-detail__footer"><div className="room-detail__footer-copy"><strong className="room-detail__footer-price">{rent}</strong><p>{attribution}</p></div>
      <div className="room-detail__footer-actions">
      <button type="button" className="room-detail__book" data-glass-exclude disabled={!listing || currentContact?.state === 'loading' || currentContact?.state === 'ready' && !phones.length}
        onClick={() => { setViewingRequested(true); if (!phoneVisible) handleRevealPhone(); showContact() }}>Đặt lịch xem phòng</button>
      <button type="button" className="room-detail__call" disabled={!listing || currentContact?.state === 'loading'} onClick={() => { if (!phoneVisible) handleRevealPhone(); showContact() }}>
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-2 2v-9.5A8.5 8.5 0 0 1 10.5 4h2A8.5 8.5 0 0 1 21 11.5Z" /></svg>Liên hệ người đăng
      </button>
      {phoneVisible ? <a className="room-detail__call" href={`tel:${phones[0]}`}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m7 3 3 5-2 2c1.5 3 3 4.5 6 6l2-2 5 3c-1 5-4 5-8 3C7 17 3 13 3 7c0-3 2-4 4-4Z" /></svg>Gọi điện</a>
        : <button type="button" className="room-detail__call" disabled={!listing || currentContact?.state === 'loading' || currentContact?.state === 'ready' && !phones.length} onClick={() => { handleRevealPhone(); showContact() }}>Xem số để gọi</button>}

      </div>
    </footer>
  </div></div>, document.body)
}
