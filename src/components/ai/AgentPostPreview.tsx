import { useEffect, useRef, useState } from 'react'
import { cancelAgentPost, confirmAgentPost, type AgentPostDraft } from '../../api/chatbotAgent'
import { getErrorMessage } from '../../lib/errors'
import { AddressAutocomplete } from '../map/AddressAutocomplete'
import './AgentPostPreview.css'
import type { ChatbotLocation } from '../../lib/chatbotLocation'
import { useChangedInputs } from '../../hooks/useChangedInputs'

export function AgentPostPreview({ draft, active, sharedLocation, onFinished }: { draft: AgentPostDraft; active: boolean; sharedLocation?: ChatbotLocation | null; onFinished: () => void }) {
  const [details, setDetails] = useState(draft.details)
  const [status, setStatus] = useState<'draft' | 'publishing' | 'published' | 'cancelled'>('draft')
  const [postId, setPostId] = useState(draft.publishedPostId)
  const [error, setError] = useState('')
  const lock = useRef(false)
  const [now, setNow] = useState(Date.now)
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(timer) }, [])
  const expired = now >= Date.parse(draft.expiresAt)
  const disabled = !active || expired || status !== 'draft'
  if (useChangedInputs([sharedLocation?.capturedAt]) && sharedLocation && active && status === 'draft' && (!details.latitude || !details.address.trim()) && (sharedLocation.accuracyMeters == null || sharedLocation.accuracyMeters <= 1000)) {
    setDetails({ ...details, address: sharedLocation.address || details.address, latitude: sharedLocation.latitude, longitude: sharedLocation.longitude })
  }
  async function finish(publish: boolean) {
    if (lock.current || disabled) return
    lock.current = true; setStatus('publishing'); setError('')
    try {
      if (publish) { const result = await confirmAgentPost(draft.id, details); setPostId(result.postId); setStatus('published') }
      else { await cancelAgentPost(draft.id); setStatus('cancelled') }
      onFinished()
    } catch (reason) { setError(getErrorMessage(reason, 'Chưa hoàn tất. Kiểm tra lại trước khi thử lại.')); setStatus('draft') }
    finally { lock.current = false }
  }
  if (status === 'published') return <section className="agent-post-preview" aria-label="Kết quả đăng bài"><strong>Đã đăng lên Chợ đồ</strong><a href={`/?section=marketplace&item=${encodeURIComponent(postId ?? '')}`}>Xem bài vừa đăng</a></section>
  if (status === 'cancelled') return <p role="status">Đã hủy bản nháp. Chưa đăng bài.</p>
  return <section className="agent-post-preview" aria-label="Xác nhận bài đăng AI">
    <header><span>HOMEJI AGENT · PREMIUM</span><strong>Bài đăng của bạn, sẵn sàng để duyệt</strong><small>{expired ? 'Bản nháp đã hết hạn' : !active ? 'Bản nháp cũ · xem bản mới nhất bên dưới' : 'Chưa đăng · chỉ đăng khi bạn xác nhận'}</small></header>
    <div className="agent-post-preview__editor">
    <div className="agent-post-preview__images">{draft.images.map((src, i) => <img key={i} src={src} alt={`Ảnh món đồ ${i + 1} sẽ được đăng`} />)}</div>
    <fieldset disabled={disabled}>
      <label>Tiêu đề<input value={details.title} maxLength={200} onChange={e => setDetails({ ...details, title: e.target.value })} /></label>
      <label>Giá bán (đ)<input inputMode="numeric" value={details.price ? details.price.toLocaleString('vi-VN') : ''} onChange={e => setDetails({ ...details, price: Number(e.target.value.replace(/\D/g, '').slice(0, 10)) })} /></label>
      <label>Mô tả<textarea rows={4} maxLength={3000} value={details.description} onChange={e => setDetails({ ...details, description: e.target.value })} /></label>
      <div className="agent-post-preview__pair"><label>Tình trạng<input value={details.condition} maxLength={80} onChange={e => setDetails({ ...details, condition: e.target.value })} /></label><label>Danh mục<input value={details.category} maxLength={80} onChange={e => setDetails({ ...details, category: e.target.value })} /></label></div>
      <label>Địa chỉ giao dịch<AddressAutocomplete value={details.address} onChange={address => setDetails({ ...details, address, latitude: 0, longitude: 0 })} onPlaceSelect={place => setDetails({ ...details, address: place.address, latitude: place.lat, longitude: place.lng })} placeholder="Chọn địa chỉ từ gợi ý" disabled={disabled} /></label>
    </fieldset>
    {error ? <p role="alert">{error}</p> : null}
    {active && !expired ? <p className="agent-post-preview__note">Ảnh và thông tin trên sẽ hiển thị công khai. Kiểm tra trước khi xác nhận.</p> : null}
    </div>
    {active && !expired ? <footer><button type="button" disabled={disabled} onClick={() => void finish(false)}>Hủy bản nháp</button><button type="button" disabled={disabled || !details.title.trim() || !details.description.trim() || !details.address.trim() || details.price <= 0 || !details.latitude || !details.longitude} onClick={() => void finish(true)}>{status === 'publishing' ? 'Đang xử lý…' : 'Xác nhận đăng bài'}</button></footer> : null}
  </section>
}
