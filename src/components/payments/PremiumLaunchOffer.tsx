import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { getSubscriptionPackages, NotificationType, type SubscriptionPackage } from '../../api'
import { getPremiumPriceAnnouncements, type PremiumPriceAnnouncement } from '../../api/premiumPricing'
import { getMaintenanceAnnouncements, type MaintenanceAnnouncement } from '../../api/maintenance'
import { NOTIFICATION_RECEIVED, NOTIFICATION_CONNECTED } from '../../lib/sellerOrderAlerts'
import { formatPrice } from '../../lib/labels'
import { formatDailyEquivalentPrice, getDailyEquivalentAmount } from '../../lib/subscriptionPlanDisplay'
import { useBrandIntroComplete } from '../../hooks/useBrandIntroComplete'
import './PremiumLaunchOffer.css'

const seenKey = 'homeji-seen-price-announcements'
function readSeen(): string[] { try { const value: unknown = JSON.parse(localStorage.getItem(seenKey) || '[]'); return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [] } catch { return [] } }
export function PremiumLaunchOffer() {
  const [plan, setPlan] = useState<SubscriptionPackage | null>(null)
  const [catalog, setCatalog] = useState<SubscriptionPackage[]>([])
  const [changes, setChanges] = useState<PremiumPriceAnnouncement[]>([])
  const [maintenanceNotices, setMaintenanceNotices] = useState<MaintenanceAnnouncement[]>([])
  const [maintenanceLoaded, setMaintenanceLoaded] = useState(false)
  const [seen, setSeen] = useState(readSeen)
  const [dismissed, setDismissed] = useState(false)
  const [now, setNow] = useState(Date.now)
  const dialog = useRef<HTMLDialogElement>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const brandIntroComplete = useBrandIntroComplete()
  useEffect(() => {
    let active = true
    const load = () => {
      void getMaintenanceAnnouncements().then(rows => {
        if (active) { setMaintenanceNotices(rows); setNow(Date.now()) }
      }).catch(() => {}).finally(() => { if (active) setMaintenanceLoaded(true) })
    }
    const onNotification = (event: Event) => {
      const notification = (event as CustomEvent<{ notification?: { type: number } }>).detail?.notification
      if (notification?.type === NotificationType.MaintenanceAnnouncement) load()
    }
    load()
    const timer = setInterval(load, 30_000)
    window.addEventListener('focus', load)
    window.addEventListener(NOTIFICATION_RECEIVED, onNotification)
    window.addEventListener(NOTIFICATION_CONNECTED, load)
    return () => {
      active = false
      clearInterval(timer)
      window.removeEventListener('focus', load)
      window.removeEventListener(NOTIFICATION_RECEIVED, onNotification)
      window.removeEventListener(NOTIFICATION_CONNECTED, load)
    }
  }, [])
  useEffect(() => {
    let active = true
    const load = () => {
      void getSubscriptionPackages().then(plans => {
        if (!active) return
        setCatalog(plans)
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
  const maintenance = maintenanceNotices.find(row => !seen.includes(row.id) && Date.parse(row.expiresAt) > now)
  const showOffer = !!plan?.offerEndsAt && !dismissed && now < Date.parse(plan.offerEndsAt)
  const visible = brandIntroComplete && maintenanceLoaded && !!(maintenance || announcement || showOffer) && !location.pathname.startsWith('/admin') && (maintenance || new URLSearchParams(location.search).get('section') !== 'payments')
  useEffect(() => {
    const node = dialog.current
    if (visible && node && !node.open) node.showModal()
    else if (!visible && node?.open) node.close()
  }, [visible, announcement?.id, maintenance?.id])
  const announcementId = maintenance?.id ?? announcement?.id
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
  if (maintenance) return createPortal(<dialog ref={dialog} data-glass-exclude className="premium-launch-offer maintenance-banner" aria-labelledby="maintenance-banner-title" aria-describedby="maintenance-banner-description" onCancel={event => { event.preventDefault(); dismiss() }}>
    <button className="premium-launch-offer__close" type="button" aria-label="Đóng thông báo bảo trì" autoFocus onClick={dismiss}>×</button>
    <header className="premium-launch-offer__banner">
      <img className="premium-launch-offer__art" src="/images/maintenance-notice-art.svg" alt="" aria-hidden="true" />
      <div className="premium-launch-offer__banner-copy">
      <span className="premium-launch-offer__eyebrow">THÔNG BÁO TỪ HOMEJI</span>
      <h2 id="maintenance-banner-title">{maintenance.title}</h2>
      </div>
    </header>
    <div className="premium-launch-offer__body">
      <p id="maintenance-banner-description">{maintenance.message}</p>
      {maintenance.scheduledStartAt ? <div className="maintenance-banner__schedule"><span>Bắt đầu</span><strong>{formatMaintenanceTime(maintenance.scheduledStartAt)}</strong>{maintenance.scheduledEndAt ? <><span>Dự kiến hoàn tất</span><strong>{formatMaintenanceTime(maintenance.scheduledEndAt)}</strong></> : null}</div> : null}
      <button className="premium-launch-offer__cta" type="button" onClick={dismiss}>Đã hiểu</button>
      <PopupAutoClose key={maintenance.id} onClose={dismiss} />
    </div>
  </dialog>, document.body)
  const previousPrice = announcement?.previousPrice ?? plan!.originalPrice!
  const currentPrice = announcement?.price ?? plan!.price
  const pricePlan = announcement ? catalog.find(row => row.code === announcement.packageCode) : plan
  const durationDays = pricePlan?.durationDays ?? 0
  const dailyEquivalent = formatDailyEquivalentPrice(currentPrice, durationDays)
  const currentDailyAmount = getDailyEquivalentAmount(currentPrice, durationDays)
  const previousDailyAmount = getDailyEquivalentAmount(previousPrice, durationDays)
  const saving = previousPrice - currentPrice
  const percent = previousPrice > 0 ? Math.round(Math.abs(saving) / previousPrice * 100) : 0
  const reduced = saving > 0
  return createPortal(<dialog ref={dialog} data-glass-exclude className={`premium-launch-offer ${reduced ? 'is-reduction' : 'is-increase'}`} aria-labelledby="premium-offer-title" aria-describedby="premium-offer-description" onCancel={event => { event.preventDefault(); dismiss() }}>
    <button className="premium-launch-offer__close" type="button" aria-label="Đóng thông báo Premium" autoFocus onClick={dismiss}>×</button>
    <header className="premium-launch-offer__banner">
      <img className="premium-launch-offer__art" src="/images/premium-offer-art.svg" alt="" aria-hidden="true" />
      <div className="premium-launch-offer__banner-copy">
        <div className="premium-launch-offer__banner-top">
          <span className="premium-launch-offer__eyebrow">{announcement ? 'HOMEJI PREMIUM · CẬP NHẬT GIÁ' : 'HOMEJI PREMIUM · ƯU ĐÃI THÀNH VIÊN'}</span>
          <span className="premium-launch-offer__discount">{reduced ? `GIẢM ${percent}%` : `ĐIỀU CHỈNH TĂNG ${percent}%`}</span>
        </div>
        <h2 id="premium-offer-title">{announcement ? `Giá mới cho ${announcement.packageName}` : <>Bạn gửi ảnh.<br />Homeji lo bản nháp.</>}</h2>
      </div>
    </header>
    <div className="premium-launch-offer__body">
    <p id="premium-offer-description">{announcement ? announcement.reason : 'Để AI soạn tin từ ảnh. Bạn chỉnh sửa, duyệt nội dung rồi xác nhận đăng lên Chợ đồ.'}</p>
    <div className="premium-launch-offer__price-card">
      <div className="premium-launch-offer__price-copy">
        <span>{durationDays > 0 ? 'MỖI NGÀY CHỈ KHOẢNG' : announcement ? 'GIÁ THÀNH VIÊN' : 'GÓI PREMIUM'}</span>
        <p className="premium-launch-offer__saving">{reduced ? `Tiết kiệm ${formatPrice(saving)}` : `Tăng ${formatPrice(-saving)} so với giá trước`}</p>
      </div>
      <div className="premium-launch-offer__price">
        {previousDailyAmount !== null ? <del>{formatPrice(previousDailyAmount)} / ngày</del> : <del>{formatPrice(previousPrice)}</del>}
        <b>{currentDailyAmount !== null ? formatPrice(currentDailyAmount) : formatPrice(currentPrice)}</b>
        <span>{currentDailyAmount !== null ? '/ ngày' : durationDays > 0 ? `/ ${durationDays} ngày` : ''}</span>
      </div>
    </div>
    {dailyEquivalent ? <p className="premium-launch-offer__daily">Tổng <strong>{formatPrice(currentPrice)}</strong> cho {durationDays} ngày Premium.</p> : null}
    <button className="premium-launch-offer__cta" type="button" onClick={() => { dismiss(); navigate('/?section=payments&tab=plans') }}>Xem gói thành viên <span aria-hidden>↗</span></button>
    <button className="premium-launch-offer__later" type="button" onClick={dismiss}>Tiếp tục khám phá Homeji</button>
    <PopupAutoClose key={announcementId ?? offerEndsAt} onClose={dismiss} />
    </div>
  </dialog>, document.body)
}

function formatMaintenanceTime(value: string) {
  return new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }).format(new Date(value))
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
