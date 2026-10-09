import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getRentalDecision, type CostScenario, type CommuteDestination, type DecisionResponse } from '../../api/rentalAssistant'
import { AddressAutocomplete } from '../map/AddressAutocomplete'
import { formatPrice, amenityLabel } from '../../lib/labels'
import { mapPostUrl } from '../../lib/mapDeepLinks'
import { getErrorMessage } from '../../lib/errors'
import './RentalAssistant.css'

const initialScenario: CostScenario = { occupants: 1, electricityKwh: 0, waterM3: 0, electricityUnit: 'unknown', waterUnit: 'unknown', internetUnit: 'unknown' }

export function RentalDecisionPanel({ postIds, maxCommuteMinutes, budgetCeiling, onUnavailable, autoLoad = false, occupants = 1 }: {
  postIds: string[]; maxCommuteMinutes?: number | null; budgetCeiling?: number | null
  onUnavailable?: (ids: string[]) => void
  autoLoad?: boolean
  occupants?: number
}) {
  const [scenario, setScenario] = useState(() => ({ ...initialScenario, occupants }))
  const [destination, setDestination] = useState<CommuteDestination>()
  const [address, setAddress] = useState('')
  const [mode, setMode] = useState<'WALK' | 'DRIVE'>('WALK')
  const [departure, setDeparture] = useState('')
  const [result, setResult] = useState<{ key: string; data: DecisionResponse }>()
  const [pendingKey, setPendingKey] = useState('')
  const [error, setError] = useState('')
  const requestRef = useRef<AbortController | null>(null)
  const key = JSON.stringify([postIds, scenario, destination, mode, departure])
  const data = result?.key === key ? result.data : undefined
  const busy = pendingKey === key
  useEffect(() => {
    return () => { requestRef.current?.abort() }
  }, [key])
  const idKey = postIds.join(',')
  useEffect(() => {
    if (!autoLoad || !idKey) return
    const controller = new AbortController()
    requestRef.current?.abort()
    requestRef.current = controller
    const ids = idKey.split(',')
    const autoScenario = { ...initialScenario, occupants }
    const initialKey = JSON.stringify([ids, autoScenario, undefined, 'WALK', ''])
    void getRentalDecision(ids, autoScenario, undefined, controller.signal).then(response => {
      if (!controller.signal.aborted) setResult({ key: initialKey, data: response })
    }).catch(e => { if (!controller.signal.aborted) setError(getErrorMessage(e, 'Chưa tải được dữ liệu so sánh')) })
    return () => { controller.abort() }
  }, [autoLoad, idKey, occupants])

  const calculate = async () => {
    if (busy || postIds.length === 0) return
    const controller = new AbortController()
    requestRef.current?.abort()
    requestRef.current = controller
    setPendingKey(key); setError(''); setResult(undefined)
    try {
      const response = await getRentalDecision(postIds, scenario, destination ? {
        ...destination, mode, departureTime: mode === 'DRIVE' && departure ? new Date(departure).toISOString() : undefined,
      } : undefined, controller.signal)
      if (controller.signal.aborted) return
      setResult({ key, data: response })
      if (response.unavailablePostIds.length) onUnavailable?.(response.unavailablePostIds)
    } catch (e) {
      if (!controller.signal.aborted) setError(getErrorMessage(e, 'Chưa tải được dữ liệu so sánh. Vui lòng thử lại.'))
    } finally { if (requestRef.current === controller) setPendingKey('') }
  }

  return <section className="rental-assistant" aria-label="So sánh phòng và kịch bản chi phí">
    <h3>So sánh & chi phí dự kiến</h3>
    <p>Đơn giá lấy từ tin đăng. Chọn đơn vị theo thông tin bạn đã hỏi chủ phòng; các khoản thiếu vẫn cần xác nhận. Cọc tính riêng.</p>
    <div className="rental-assistant__fields">
      {([
        ['occupants', 'Số người', 1, 50], ['electricityKwh', 'Điện dự kiến (kWh/tháng)', 0, 10000], ['waterM3', 'Nước dự kiến (m³/tháng)', 0, 1000],
      ] as const).map(([field, label, min, max]) => <label key={field}>{label}<input type="number" min={min} max={max} value={scenario[field]} onChange={e => setScenario(s => ({ ...s, [field]: Number(e.target.value) }))} /></label>)}
      {(['electricityUnit', 'waterUnit', 'internetUnit'] as const).map((field, i) => <label key={field}>{['Đơn vị điện', 'Đơn vị nước', 'Đơn vị internet'][i]}
        <select value={scenario[field]} onChange={e => setScenario(s => ({ ...s, [field]: e.target.value }))}>
          <option value="unknown">Chưa xác nhận</option><option value="month">đồng/tháng</option><option value="person">đồng/người/tháng</option>
          {field === 'electricityUnit' ? <option value="kwh">đồng/kWh</option> : field === 'waterUnit' ? <option value="m3">đồng/m³</option> : null}
        </select></label>)}
      {(['otherMonthlyFees', 'otherInitialFees'] as const).map((field, i) => <label key={field}>{i === 0 ? 'Phí cố định khác / tháng (đồng)' : 'Khoản thu ban đầu khác (đồng)'}<input type="number" min="0" max="100000000" value={scenario[field] ?? ''} placeholder="Chưa xác nhận" onChange={e => setScenario(s => ({ ...s, [field]: e.target.value === '' ? null : Number(e.target.value) }))} /></label>)}
    </div>
    <details><summary>Xác nhận khoản bằng 0 trong kịch bản</summary><p>Chỉ chọn sau khi đã hỏi chủ phòng. Đây là xác nhận của bạn cho kịch bản, không phải Homeji xác minh.</p>
      {(['electricityFreeConfirmed', 'waterFreeConfirmed', 'internetFreeConfirmed', 'depositFreeConfirmed'] as const).map((field, i) => <label key={field}><span><input type="checkbox" checked={scenario[field] ?? false} onChange={e => setScenario(s => ({ ...s, [field]: e.target.checked }))} /> {['Điện miễn phí', 'Nước miễn phí', 'Internet miễn phí', 'Không thu cọc'][i]}</span></label>)}
    </details>
    <details><summary>Tính đường đi tới điểm đến bạn chọn</summary>
      <p>Chỉ gửi tọa độ các phòng được chọn và điểm đến này tới Google Maps khi nhấn tính. Không sử dụng vị trí thiết bị.</p>
      <AddressAutocomplete value={address} onChange={value => { setAddress(value); setDestination(undefined) }}
        onPlaceSelect={place => { setAddress(place.address); setDestination({ label: place.address, latitude: place.lat, longitude: place.lng, mode }) }} placeholder="Chọn đúng cơ sở trường / điểm đến" />
      <label>Phương tiện<select value={mode} onChange={e => setMode(e.target.value as 'WALK' | 'DRIVE')}><option value="WALK">Đi bộ</option><option value="DRIVE">Ô tô (không phải xe máy)</option></select></label>
      {mode === 'DRIVE' ? <label>Giờ đi dự kiến<input type="datetime-local" value={departure} onChange={e => setDeparture(e.target.value)} /></label> : null}
      <button type="button" onClick={() => { setDestination(undefined); setAddress('') }}>Bỏ điểm đến</button>
      {address && !destination ? <p>Hãy chọn một gợi ý địa điểm để xác nhận tọa độ.</p> : null}
    </details>
    <button type="button" className="btn btn-secondary" disabled={busy || !postIds.length || !!address && !destination} onClick={() => void calculate()}>{busy ? 'Đang tính…' : 'Làm mới so sánh / tính kịch bản'}</button>
    {error ? <p role="alert">{error}</p> : null}
    {data ? <>
      <p role="status">{data.summary}</p>
      {data.unavailablePostIds.length ? <p>Tin bị ẩn, hết hạn hoặc không còn phù hợp đã được bỏ khỏi so sánh.</p> : null}
      <div className="rental-assistant__table-wrap"><table><caption>Thông tin chủ tin và kịch bản bạn nhập</caption><thead><tr><th>Tiêu chí</th>{data.posts.map(item => <th key={item.post.id}><Link to={mapPostUrl(item.post.id)}>{item.post.title}</Link></th>)}</tr></thead><tbody>
        {[
          ['Tiền thuê / tháng', (item: typeof data.posts[number]) => formatPrice(item.post.price)],
          ['Diện tích', (item: typeof data.posts[number]) => `${item.post.area} m²`],
          ['Chỗ trống / tối đa', (item: typeof data.posts[number]) => `${item.post.availableSlots ?? 'Chưa rõ'} / ${item.post.maxOccupants ?? 'Chưa rõ'}`],
          ['Tiện ích theo tin', (item: typeof data.posts[number]) => item.post.amenities.map(amenityLabel).join(', ') || 'Chưa có thông tin'],
          ['Chi phí đã tính / tháng', (item: typeof data.posts[number]) => formatPrice(item.cost.knownMonthlySubtotal) + (item.cost.unknown.length ? ' (chưa đủ phí)' : ' (kịch bản bạn nhập)')],
          ['Tổng tháng', (item: typeof data.posts[number]) => item.cost.estimatedMonthlyTotal == null ? 'Chưa đủ thông tin' : formatPrice(item.cost.estimatedMonthlyTotal)],
          ['Cọc theo tin', (item: typeof data.posts[number]) => item.post.deposit > 0 ? formatPrice(item.post.deposit) : 'Chưa xác nhận'],
          ['Ban đầu: thuê + cọc + phí pass + khoản khác', (item: typeof data.posts[number]) => item.cost.initialPayment == null ? 'Chưa đủ thông tin' : formatPrice(item.cost.initialPayment) + ' (kịch bản bạn nhập)'],
          ['Đường đi', (item: typeof data.posts[number]) => !item.commute ? 'Chưa chọn điểm đến' : item.commute.durationMinutes == null ? 'Chưa tính được' : `${Math.ceil(item.commute.durationMinutes)} phút · ${item.commute.distanceMeters} m · ${item.commute.mode === 'DRIVE' ? 'Ô tô' : 'Đi bộ'}${maxCommuteMinutes ? item.commute.durationMinutes <= maxCommuteMinutes ? ' · Đáp ứng trần thời gian' : ' · Vượt trần thời gian' : ''}`],
          ['Thời điểm tuyến', (item: typeof data.posts[number]) => item.commute ? new Date(item.commute.departureTime ?? item.commute.calculatedAt).toLocaleString('vi-VN') : 'Chưa tính'],
          ['Nguồn / cập nhật', (item: typeof data.posts[number]) => `Chủ tin · ${new Date(item.cost.updatedAt).toLocaleDateString('vi-VN')} · chưa xác minh phí`],
        ].map(([label, render]) => <tr key={String(label)}><th scope="row">{String(label)}</th>{data.posts.map(item => <td key={item.post.id}>{typeof render === 'function' ? render(item) : null}</td>)}</tr>)}
      </tbody></table></div>
      {budgetCeiling ? <p>Ngân sách tổng {formatPrice(budgetCeiling)}: {data.posts.map(item => `${item.post.title}: ${item.cost.estimatedMonthlyTotal == null ? 'cần xác nhận' : item.cost.estimatedMonthlyTotal <= budgetCeiling ? 'trong trần theo kịch bản bạn nhập' : 'vượt trần theo kịch bản bạn nhập'}`).join(' · ')}.</p> : null}
      {data.posts.map(item => <details key={item.post.id}><summary>Những điều cần hỏi — {item.post.title}</summary><ul>{[...item.cost.unknown, ...item.cost.questions].map(text => <li key={text}>{text}</li>)}</ul></details>)}
      {destination ? <small>Google Maps · Thời gian thay đổi theo tuyến và giao thông.</small> : null}
    </> : null}
  </section>
}
