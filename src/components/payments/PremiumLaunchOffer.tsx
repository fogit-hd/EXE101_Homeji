import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getSubscriptionPackages, type SubscriptionPackage } from '../../api'
import './PremiumLaunchOffer.css'

export function PremiumLaunchOffer() {
  const [plan, setPlan] = useState<SubscriptionPackage | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [now, setNow] = useState(Date.now)
  const location = useLocation()
  const navigate = useNavigate()
  useEffect(() => {
    let active = true
    void getSubscriptionPackages().then(plans => {
      const offer = plans.find(row => row.code === 'PREMIUM_MONTHLY' && row.originalPrice === 99000 && row.price === 49000 && row.offerEndsAt)
      if (active && offer) {
        setPlan(offer)
        try { setDismissed(sessionStorage.getItem('homeji-premium-offer-dismissed') === offer.offerEndsAt) } catch { /* Private browser storage may be unavailable. */ }
      }
    }).catch(() => { /* A promotion is optional; do not block the page when pricing is unavailable. */ })
    const timer = setInterval(() => setNow(Date.now()), 30000)
    return () => { active = false; clearInterval(timer) }
  }, [])
  if (!plan?.offerEndsAt || dismissed || now >= Date.parse(plan.offerEndsAt) || location.pathname.startsWith('/admin') || new URLSearchParams(location.search).get('section') === 'payments') return null
  const end = new Date(plan.offerEndsAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  return <aside className="premium-launch-offer" aria-label="Ưu đãi ra mắt Homeji Agent">
    <button className="premium-launch-offer__close" type="button" aria-label="Đóng ưu đãi Premium" onClick={() => { setDismissed(true); try { sessionStorage.setItem('homeji-premium-offer-dismissed', plan.offerEndsAt!) } catch { /* Optional preference. */ } }}>×</button>
    <span className="premium-launch-offer__eyebrow">MỚI · HOMEJI AGENT</span>
    <strong>Bạn gửi ảnh.<br />Homeji soạn bài.</strong>
    <p>Xem trước, chỉnh sửa và xác nhận để AI đăng lên Chợ đồ.</p>
    <div className="premium-launch-offer__price"><del>99.000đ</del><b>49.000đ</b><span>/ 30 ngày</span></div>
    <small>Ưu đãi ra mắt 7 ngày · đến {end} (giờ Việt Nam)</small>
    <button className="premium-launch-offer__cta" type="button" onClick={() => { setDismissed(true); navigate('/?section=payments') }}>Khám phá Premium <span aria-hidden>↗</span></button>
  </aside>
}
