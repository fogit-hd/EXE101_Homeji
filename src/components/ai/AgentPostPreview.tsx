import { AMENITY_OPTIONS, amenityLabel } from '../../lib/labels'
import { agentMissingFields } from '../../lib/agentPostBusiness'
import { MoneyInput } from '../ui/MoneyInput'
import { useEffect, useRef, useState } from 'react'
import { cancelAgentPost, confirmAgentPost, type AgentPostDraft } from '../../api/chatbotAgent'
import { getErrorMessage } from '../../lib/errors'
import { AddressAutocomplete } from '../map/AddressAutocomplete'
import './AgentPostPreview.css'
import type { ChatbotLocation } from '../../lib/chatbotLocation'
import { useChangedInputs } from '../../hooks/useChangedInputs'

export function AgentPostPreview({ draft, active, sharedLocation, onFinished }: { draft: AgentPostDraft; active: boolean; sharedLocation?: ChatbotLocation | null; onFinished: () => void }) {
  const kind = draft.details.kind ?? 'secondHand'
  const room = kind === 'rental' || kind === 'roomTransfer' || kind === 'roommate'
  const wanted = kind === 'wanted'
  const food = kind === 'food'
  const labels = { secondHand: 'Bán đồ cũ', food: 'Bán đồ ăn', rental: 'Cho thuê phòng', roomTransfer: 'Nhượng phòng', roommate: 'Phòng tìm người ở ghép', wanted: 'Đăng nhu cầu tìm trọ' }
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
  const postHref = room ? `/?section=listings&post=${encodeURIComponent(postId ?? '')}` : wanted ? '/?section=wanted' : `/?section=marketplace&item=${encodeURIComponent(postId ?? '')}`
  const missing = agentMissingFields(details)
  if (!room && !wanted && draft.images.length < 1) missing.push('ảnh thật (gửi trong chat)')
  if (room && draft.images.length < 3) missing.push('ít nhất 3 ảnh thật (gửi bổ sung trong chat)')
  type NumberField = 'deposit' | 'area' | 'maxOccupants' | 'availableSlots' | 'minimumLeaseMonths' | 'passFee' | 'availableQuantity' | 'preparationMinutes'
  function numberField(key: NumberField, label: string) { return <label>{label}<input type="number" min="0" step={key === 'area' ? 'any' : '1'} value={details[key] ?? ''} onChange={e => setDetails({ ...details, [key]: e.target.value === '' ? null : Number(e.target.value) })} /></label> }
  function moneyField(key: 'deposit' | 'passFee', label: string) { return <label>{label}<MoneyInput value={details[key] == null ? '' : String(details[key])} onValueChange={value => setDetails({ ...details, [key]: value === '' ? null : Number(value) })} /></label> }
  if (status === 'published') return <section className="agent-post-preview" aria-label="Kết quả đăng bài"><strong>{room ? 'Đã gửi tin phòng để kiểm duyệt' : wanted ? 'Đã đăng tin tìm trọ' : 'Đã đăng lên Chợ Homeji'}</strong><a href={postHref}>Xem bài vừa đăng</a></section>
  if (status === 'cancelled') return <p role="status">Đã hủy bản nháp. Chưa đăng bài.</p>
  return <section className="agent-post-preview" aria-label="Xác nhận bài đăng AI">
    <header><span>HOMEJI AGENT · PREMIUM · {labels[kind]}</span><strong>Xem lại bài đăng trước khi gửi</strong><small>{expired ? 'Bản nháp đã hết hạn' : !active ? 'Bản nháp cũ · xem bản mới nhất bên dưới' : 'Chưa đăng · chỉ đăng khi bạn xác nhận'}</small></header>
    <div className={`agent-post-preview__editor${draft.images.length ? '' : ' has-no-images'}`}>
    <div className="agent-post-preview__images">{draft.images.map((src, i) => <img key={i} src={src} alt={`Ảnh bài đăng ${i + 1}`} />)}</div>
    <fieldset disabled={disabled}>
      <label>Tiêu đề<input value={details.title} maxLength={200} onChange={e => setDetails({ ...details, title: e.target.value })} /></label>
      <label>{room ? 'Tiền thuê / tháng (đ)' : wanted ? 'Ngân sách tối đa / tháng (đ)' : food ? 'Giá mỗi đơn vị (đ)' : 'Giá bán (đ)'}<MoneyInput value={String(details.price || '')} onValueChange={value => setDetails({ ...details, price: Number(value) })} /></label>
      <label>Mô tả<textarea rows={4} maxLength={3000} value={details.description} onChange={e => setDetails({ ...details, description: e.target.value })} /></label>
      {!room && !wanted && !food ? <div className="agent-post-preview__pair"><label>Tình trạng<input value={details.condition} maxLength={80} onChange={e => setDetails({ ...details, condition: e.target.value })} /></label><label>Danh mục<input value={details.category} maxLength={80} onChange={e => setDetails({ ...details, category: e.target.value })} /></label></div> : null}
      {room ? <>
        <div className="agent-post-preview__pair">{moneyField('deposit', 'Tiền cọc (đ)')}{numberField('area', 'Diện tích (m²)')}</div>
        <div className="agent-post-preview__pair">{numberField('maxOccupants', 'Số người tối đa')}{numberField('availableSlots', 'Số chỗ còn trống')}</div>
        {numberField('minimumLeaseMonths', 'Thuê tối thiểu (tháng) · tùy chọn')}
        <label>Nội quy<textarea value={details.houseRules ?? ''} maxLength={1000} onChange={e => setDetails({ ...details, houseRules: e.target.value })} /></label>
      </> : null}
      {room || wanted ? <div className="agent-post-preview__amenities" role="group" aria-label="Tiện ích">{AMENITY_OPTIONS.map(option => <label key={option}><input type="checkbox" checked={details.amenities?.includes(option) ?? false} onChange={event => setDetails({ ...details, amenities: event.target.checked ? [...(details.amenities ?? []), option] : (details.amenities ?? []).filter(code => code !== option) })} />{amenityLabel(option)}</label>)}</div> : null}
      {wanted ? numberField('maxOccupants', 'Số người muốn thuê') : null}
      {room || wanted ? <label>Ngày dự kiến nhận phòng<input type="date" value={details.availableFrom ?? ''} onChange={e => setDetails({ ...details, availableFrom: e.target.value || null })} /></label> : null}
      {kind === 'roomTransfer' ? <>
        <label>Hình thức nhượng<select value={details.transferKind ?? ''} onChange={e => setDetails({ ...details, transferKind: Number(e.target.value) || null })}><option value="">Chọn hình thức</option><option value="1">Chuyển hợp đồng</option><option value="2">Cho thuê lại</option></select></label>
        <label>Ngày hợp đồng kết thúc<input type="date" value={details.originalLeaseEndsOn ?? ''} onChange={e => setDetails({ ...details, originalLeaseEndsOn: e.target.value || null })} /></label>
        {moneyField('passFee', 'Phí nhượng (đ) · nhập 0 nếu không có')}
        <label>Lý do nhượng<textarea value={details.transferReason ?? ''} onChange={e => setDetails({ ...details, transferReason: e.target.value })} /></label>
        <label>Liên hệ chủ nhà<input value={details.ownerConsentContact ?? ''} maxLength={200} onChange={e => setDetails({ ...details, ownerConsentContact: e.target.value })} /></label>
        <label className="agent-post-preview__consent"><input type="checkbox" checked={details.ownerConsentConfirmed ?? false} onChange={e => setDetails({ ...details, ownerConsentConfirmed: e.target.checked })} />Tôi xác nhận chủ nhà đã đồng ý việc nhượng hoặc cho thuê lại.</label>
      </> : null}
      {food ? <>
        <div className="agent-post-preview__pair">{numberField('availableQuantity', 'Số lượng đang bán')}{numberField('preparationMinutes', 'Chuẩn bị (phút)')}</div>
        <label>Đơn vị bán<input value={details.unit ?? ''} maxLength={30} placeholder="phần, ly, hộp…" onChange={e => setDetails({ ...details, unit: e.target.value })} /></label>
        <label>Nhóm món<input value={details.category} maxLength={80} onChange={e => setDetails({ ...details, category: e.target.value })} /></label>
      </> : null}
      <label>{wanted ? 'Khu vực mong muốn' : room ? 'Địa chỉ phòng' : food ? 'Địa chỉ bán / nhận món' : 'Địa chỉ giao dịch'}<AddressAutocomplete value={details.address} onChange={address => setDetails({ ...details, address, latitude: 0, longitude: 0 })} onPlaceSelect={place => setDetails({ ...details, address: place.address, latitude: place.lat, longitude: place.lng })} placeholder="Chọn địa chỉ từ gợi ý" disabled={disabled} /></label>
    </fieldset>
    {missing.length && active ? <p className="agent-post-preview__note">Cần bổ sung: {missing.join(', ')}.</p> : null}
    {room ? <p className="agent-post-preview__note">Tin được gửi vào hàng chờ kiểm duyệt, chưa hiển thị công khai ngay.</p> : null}
    {error ? <p role="alert">{error}</p> : null}
    {active && !expired ? <p className="agent-post-preview__note">Ảnh và thông tin trên sẽ hiển thị công khai. Kiểm tra trước khi xác nhận.</p> : null}
    </div>
    {active && !expired ? <footer><button type="button" disabled={disabled} onClick={() => void finish(false)}>Hủy bản nháp</button><button type="button" disabled={disabled || missing.length > 0} onClick={() => void finish(true)}>{status === 'publishing' ? 'Đang xử lý…' : 'Xác nhận đăng bài'}</button></footer> : null}
  </section>
}
