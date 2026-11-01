import { useEffect, useRef, useState } from 'react'
import { getSubscriptionPackages, type SubscriptionPackage } from '../../api'
import { changePremiumPrice, getPremiumPriceAnnouncements, type PremiumPriceAnnouncement } from '../../api/premiumPricing'
import { MoneyInput } from '../ui/MoneyInput'
import { getErrorMessage } from '../../lib/errors'
import { formatPrice } from '../../lib/labels'

export function AdminPremiumPricingPanel() {
  const [plans, setPlans] = useState<SubscriptionPackage[]>([])
  const [history, setHistory] = useState<PremiumPriceAnnouncement[]>([])
  const [selected, setSelected] = useState('')
  const [price, setPrice] = useState('')
  const [reason, setReason] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const lock = useRef(false)
  const [attempt, setAttempt] = useState(0)
  const plan = plans.find(row => row.code === selected)
  useEffect(() => {
    let active = true
    void Promise.all([getSubscriptionPackages(), getPremiumPriceAnnouncements()]).then(([packages, changes]) => {
      if (active) { setPlans(packages.filter(row => row.price > 0)); setHistory(changes); setError('') }
    }).catch(error => { if (active) setError(getErrorMessage(error, 'Chưa tải được bảng giá.')) })
    return () => { active = false }
  }, [attempt])
  async function publish() {
    if (!plan || lock.current) return
    lock.current = true; setBusy(true); setError(''); setMessage('')
    try {
      await changePremiumPrice(plan.code, { requestId: crypto.randomUUID(), expectedPrice: plan.price, price: Number(price), reason: reason.trim() })
      setMessage('Đã cập nhật giá và đăng thông báo cho người xem.'); setConfirming(false); setSelected(''); setReason(''); setPrice(''); setAttempt(value => value + 1)
    } catch (error) { setError(getErrorMessage(error, 'Chưa cập nhật được giá. Tải lại bảng giá rồi thử lại.')); setConfirming(false) }
    finally { lock.current = false; setBusy(false) }
  }
  const valid = !!plan && /^\d+$/.test(price) && Number(price) >= 1000 && Number(price) <= 100_000_000 && Number(price) !== plan.price && reason.trim().length >= 5
  return <section className="admin-pricing">
    <header><h2>Giá gói thành viên</h2><p>Mỗi lần sửa giá sẽ lưu lịch sử và hiển thị thông báo ở giữa màn hình cho người xem. Giá mới áp dụng cho lần mua tiếp theo.</p></header>
    {error ? <p role="alert">{error} <button type="button" onClick={() => setAttempt(value => value + 1)}>Tải lại</button></p> : null}
    {message ? <p role="status">{message}</p> : null}
    <form onSubmit={event => { event.preventDefault(); if (valid) setConfirming(true) }}>
      <fieldset disabled={busy || confirming}>
        <label>Gói thành viên<select aria-label="Gói thành viên" value={selected} required onChange={event => { setSelected(event.target.value); setPrice(String(plans.find(row => row.code === event.target.value)?.price ?? '')); setConfirming(false) }}><option value="">Chọn gói</option>{plans.map(row => <option key={row.code} value={row.code}>{row.name} · {formatPrice(row.price)} / {row.durationDays} ngày</option>)}</select></label>
        {plan ? <p>Giá hiện tại: <strong>{formatPrice(plan.price)}</strong></p> : null}
        <label>Giá mới (đ)<MoneyInput value={price} onValueChange={setPrice} required min="1000" max="100000000" /></label>
        <label>Lý do thay đổi · công khai cho người xem<textarea value={reason} onChange={event => setReason(event.target.value)} minLength={5} maxLength={500} required rows={3} placeholder="Ví dụ: Ưu đãi chào mừng sinh viên mới" /></label>
        <button type="submit" disabled={!valid}>Xem trước thông báo</button>
      </fieldset>
    </form>
    {confirming && plan ? <section className="admin-pricing__confirm" aria-label="Xác nhận đổi giá">
      <h3>Thông báo sẽ được công bố</h3><p>{plan.name}: <del>{formatPrice(plan.price)}</del> → <strong>{formatPrice(Number(price))}</strong></p><p>{reason.trim()}</p>
      <button type="button" disabled={busy} onClick={() => setConfirming(false)}>Quay lại sửa</button> <button type="button" disabled={busy} onClick={() => void publish()}>{busy ? 'Đang công bố…' : 'Xác nhận đổi giá & công bố'}</button>
    </section> : null}
    <h3>Lịch sử thay đổi</h3>
    {history.length === 0 ? <p>Chưa có thay đổi giá.</p> : <ol className="admin-pricing__history">{history.map(row => <li key={row.id}><strong>{row.packageName}</strong><p>{formatPrice(row.previousPrice)} → {formatPrice(row.price)}</p><p>{row.reason}</p><small>{new Date(row.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</small></li>)}</ol>}
  </section>
}
