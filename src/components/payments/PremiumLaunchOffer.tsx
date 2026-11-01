import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { getSubscriptionPackages, type SubscriptionPackage } from '../../api'
import { getPremiumPriceAnnouncements, type PremiumPriceAnnouncement } from '../../api/premiumPricing'
import { formatPrice } from '../../lib/labels'
import './PremiumLaunchOffer.css'

const seenKey = 'homeji-seen-price-announcements'
function readSeen(): string[] { try { const value: unknown = JSON.parse(localStorage.getItem(seenKey) || '[]'); return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [] } catch { return [] } }
export function PremiumLaunchOffer() {
  const [plan, setPlan] = useState<SubscriptionPackage | null>(null)
  const [changes, setChanges] = useState<PremiumPriceAnnouncement[]>([])
  const [seen, setSeen] = useState(readSeen)
  const [dismissed, setDismissed] = useState(false)
  const [now, setNow] = useState(Date.now)
  const dialog = useRef<HTMLDialogElement>(null)
  const location = useLocation()
  const navigate = useNavigate()
  useEffect(() => {
    let active = true
    const load = () => {
      void getSubscriptionPackages().then(plans => {
        if (!active) return
        const offer = plans.find(row => row.code === 'PREMIUM_MONTHLY' && row.originalPrice && row.offerEndsAt) ?? null
        setPlan(offer)
        if (offer) { try { setDismissed(sessionStorage.getItem('homeji-premium-offer-dismissed') === offer.offerEndsAt) } catch { /* Optional preference. */ } }
      }).catch(() => {})
      void getPremiumPriceAnnouncements().then(rows => { if (active) setChanges(rows) }).catch(() => {})
      setNow(Date.now())
    }
    load()
    const timer = setInterval(load, 60_000)
    window.addEventListener('focus', load)
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', load) }
  }, [])
  // Each published revision gets its own acknowledgement, including a price
  // changed back to an earlier value. No announcement invents an expiry date.
  const announcement = changes.filter(row => !seen.includes(row.id)).at(-1)
  const showOffer = !!plan?.offerEndsAt && !dismissed && now < Date.parse(plan.offerEndsAt)
  const visible = !!(announcement || showOffer) && !location.pathname.startsWith('/admin') && new URLSearchParams(location.search).get('section') !== 'payments'
  useEffect(() => {
    const node = dialog.current
    if (visible && node && !node.open) node.showModal()
    else if (!visible && node?.open) node.close()
  }, [visible, announcement?.id])
  const announcementId = announcement?.id
  const offerEndsAt = plan?.offerEndsAt
  const dismiss = () => {
    if (announcementId) {
      const next = [...readSeen(), announcementId].slice(-100)
      setSeen(next)
      try { localStorage.setItem(seenKey, JSON.stringify(next)) } catch { /* Still dismissed in memory. */ }
    } else {
      setDismissed(true)
      try { if (offerEndsAt) sessionStorage.setItem('homeji-premium-offer-dismissed', offerEndsAt) } catch { /* Optional preference. */ }
    }
  }
  if (!visible) return null
  const previousPrice = announcement?.previousPrice ?? plan!.originalPrice!
  const currentPrice = announcement?.price ?? plan!.price
  const saving = previousPrice - currentPrice
  const percent = previousPrice > 0 ? Math.round(Math.abs(saving) / previousPrice * 100) : 0
  const reduced = saving > 0
  const end = plan?.offerEndsAt ? new Date(plan.offerEndsAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''
  return createPortal(<dialog ref={dialog} data-glass-exclude className={`premium-launch-offer ${reduced ? 'is-reduction' : 'is-increase'}`} aria-labelledby="premium-offer-title" aria-describedby="premium-offer-description" onCancel={event => { event.preventDefault(); dismiss() }}>
    <button className="premium-launch-offer__close" type="button" aria-label="Đóng thông báo Premium" autoFocus onClick={dismiss}>×</button>
    <header className="premium-launch-offer__banner">
    <div className="premium-launch-offer__banner-top">
    <span className="premium-launch-offer__eyebrow">{announcement ? 'HOMEJI PREMIUM · CẬP NHẬT GIÁ' : 'MỚI · HOMEJI AGENT'}</span>
    <span className="premium-launch-offer__discount">{reduced ? `GIẢM ${percent}%` : `ĐIỀU CHỈNH TĂNG ${percent}%`}</span>
    </div>
    <h2 id="premium-offer-title">{announcement ? `Giá mới cho ${announcement.packageName}` : <>Bạn gửi ảnh.<br />Homeji lo bản nháp.</>}</h2>
    </header>
    <div className="premium-launch-offer__body">
    <p id="premium-offer-description">{announcement ? announcement.reason : 'Để AI soạn tin từ ảnh. Bạn chỉnh sửa, duyệt nội dung rồi xác nhận đăng lên Chợ đồ.'}</p>
    <div className="premium-launch-offer__price"><del>{formatPrice(previousPrice)}</del><b>{formatPrice(currentPrice)}</b>{!announcement ? <span>/ {plan!.durationDays} ngày</span> : null}</div>
    <p className="premium-launch-offer__saving">{reduced ? `Tiết kiệm ${formatPrice(saving)}` : `Tăng ${formatPrice(-saving)} so với giá trước`}</p>
    <small>{announcement ? `Áp dụng từ ${new Date(announcement.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} · Giờ Việt Nam` : `Ưu đãi đến ${end} · Giờ Việt Nam`}</small>
    <button className="premium-launch-offer__cta" type="button" onClick={() => { dismiss(); navigate('/?section=payments&tab=plans') }}>Xem gói thành viên <span aria-hidden>↗</span></button>
    <button className="premium-launch-offer__later" type="button" onClick={dismiss}>Tiếp tục khám phá Homeji</button>
    <PopupAutoClose key={announcementId ?? offerEndsAt} onClose={dismiss} />
    </div>
  </dialog>, document.body)
}

function PopupAutoClose({ onClose }: { onClose: () => void }) {
  const [seconds, setSeconds] = useState(15)
  const close = useEffectEvent(onClose)
  useEffect(() => {
    const deadline = Date.now() + 15_000
    const timeout = setTimeout(() => close(), 15_000)
    const interval = setInterval(() => setSeconds(Math.max(0, Math.ceil((deadline - Date.now()) / 1000))), 1000)
    return () => { clearTimeout(timeout); clearInterval(interval) }
  }, [])
  return <small className="premium-launch-offer__countdown" aria-live="off">Tự đóng sau {seconds} giây</small>
}
