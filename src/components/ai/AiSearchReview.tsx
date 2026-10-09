import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { AiHighlightResponse } from '../../api'
import { amenityLabel, formatPrice } from '../../lib/labels'
import { mapPostUrl } from '../../lib/mapDeepLinks'
import { RentalDecisionPanel } from './RentalDecisionPanel'
import './RentalAssistant.css'

export function AiSearchReview({ result, onApply, onCorrection, busy = false }: {
  result: AiHighlightResponse; onApply?: () => void; onCorrection?: (text: string) => void; busy?: boolean
}) {
  const [selected, setSelected] = useState<string[]>(() => result.compareRequested ? [...result.posts, ...(result.needsConfirmation ?? [])].slice(0, 2).map(item => item.post.id) : [])
  const [correction, setCorrection] = useState('')
  const c = result.criteria
  const available = [...result.posts, ...(result.needsConfirmation ?? [])].slice(0, 5)
  const selectedIds = selected.filter(id => available.some(item => item.post.id === id))
  const chips: Array<[string, string]> = []
  if (c.priceMin != null) chips.push([`${c.budgetKind === 'total' ? 'Tổng' : 'Thuê'} ≥ ${formatPrice(c.priceMin)}`, 'Bỏ ngân sách'])
  if (c.priceMax != null) chips.push([`${c.budgetKind === 'total' ? 'Tổng' : 'Thuê'} ≤ ${formatPrice(c.priceMax)}`, 'Bỏ ngân sách'])
  if (c.areaMin != null) chips.push([`Diện tích ≥ ${c.areaMin} m²`, 'Bỏ diện tích'])
  if (c.areaMax != null) chips.push([`Diện tích ≤ ${c.areaMax} m²`, 'Bỏ diện tích'])
  if (c.occupants) chips.push([`${c.occupants} người`, 'Bỏ số người'])
  if (c.location) chips.push([c.location, 'Bỏ khu vực'])
  if (c.destination) chips.push([`Điểm đến: ${c.destination}`, 'Bỏ điểm đến'])
  if (c.maxCommuteMinutes) chips.push([`≤ ${c.maxCommuteMinutes} phút`, 'Bỏ thời gian đi'])
  if (c.excludeShared) chips.push(['Không ở ghép', 'Chấp nhận ở ghép'])
  for (const code of c.requiredAmenities ?? []) chips.push([`Bắt buộc: ${amenityLabel(code)}`, `Không cần ${amenityLabel(code)}`])
  for (const code of c.criteria) chips.push([`Mong muốn: ${amenityLabel(code)}`, `Ít quan tâm ${amenityLabel(code)}`])
  for (const code of c.excludedAmenities ?? []) chips.push([`Loại trừ: ${amenityLabel(code)}`, `Không cần ${amenityLabel(code)}`])
  return <section className="rental-assistant" aria-label="Xác nhận tiêu chí tìm phòng">
    <h3>Homeji hiểu bạn muốn…</h3>
    <div className="rental-assistant__chips">{chips.map(([label, remove]) => <button key={label} type="button" disabled={busy || !onCorrection} title="Bỏ tiêu chí này" onClick={() => onCorrection?.(remove)}>{label} {onCorrection ? '×' : ''}</button>)}</div>
    {(result.clarifications ?? c.unknown ?? []).map(text => <p key={text}>{text}</p>)}
    {onCorrection ? <div className="rental-assistant__fields"><label>Sửa tiêu chí<input value={correction} maxLength={1000} placeholder="Ví dụ: dưới 3tr, không cần máy lạnh" onChange={e => setCorrection(e.target.value)} /></label><button type="button" disabled={busy || !correction.trim()} onClick={() => { onCorrection(correction); setCorrection('') }}>Cập nhật tiêu chí</button></div> : null}
    {onApply ? <button type="button" className="btn btn-primary" disabled={busy} onClick={onApply}>Xác nhận, xem kết quả trên bản đồ</button> : null}
    {!available.length ? <p>Chưa có tin phù hợp. Hãy chọn cụ thể điều kiện muốn sửa; Homeji giữ nguyên ngân sách.</p> : null}
    {available.map(item => <article className="rental-assistant__card" key={item.post.id}>
      <Link to={mapPostUrl(item.post.id)}>{item.post.title}</Link>
      <p>{formatPrice(item.post.price)}/tháng · {item.post.area} m²</p>
      {result.needsConfirmation?.some(p => p.post.id === item.post.id) ? <strong>Cần xác nhận phí / đường đi</strong> : null}
      {item.post.isOwnerPremium ? <small>Chủ tin Premium · điểm phù hợp không cộng ưu tiên thương mại</small> : null}
      {item.evidence?.map((evidence, i) => <small key={`${evidence.field}-${i}`}>{evidence.text} · Theo chủ tin · {new Date(evidence.updatedAt).toLocaleDateString('vi-VN')}</small>)}
      <label><span><input type="checkbox" checked={selectedIds.includes(item.post.id)} disabled={!selectedIds.includes(item.post.id) && selectedIds.length >= 3}
        onChange={e => setSelected(ids => e.target.checked ? [...ids, item.post.id] : ids.filter(id => id !== item.post.id))} /> Chọn để so sánh (tối đa 3)</span></label>
    </article>)}
    {selectedIds.length > 0 ? <RentalDecisionPanel key={c.occupants ?? 1} postIds={selectedIds} occupants={c.occupants ?? 1} autoLoad={result.compareRequested} maxCommuteMinutes={c.maxCommuteMinutes} budgetCeiling={c.budgetKind === 'total' ? c.priceMax : null} /> : null}
  </section>
}
