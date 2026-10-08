import { useEffect, useRef, useState } from 'react'
import { AddressAutocomplete, type PlaceResult } from '../map/AddressAutocomplete'
import { useGoogleMaps } from '../../contexts/GoogleMapsProvider'
import { calculateShortlistCommute, type CommuteMode, type CommuteOrigin, type CommuteResult } from '../../lib/shortlistCommute'
import { getErrorMessage } from '../../lib/errors'

export type CommuteConfirmation = { routes: CommuteResult[]; minuteCeiling: number; destination: PlaceResult; mode: CommuteMode }
const labels: Record<CommuteMode, string> = { DRIVING: 'Ô tô', WALKING: 'Đi bộ', TRANSIT: 'Phương tiện công cộng' }

export function ShortlistCommutePlanner({ origins, destinationHint, modeHint, ceilingHint, onConfirm, onInvalidate }: {
  origins: (CommuteOrigin & { title: string })[]; destinationHint?: string | null; modeHint?: CommuteMode | null
  ceilingHint?: number | null; onConfirm: (confirmation: CommuteConfirmation) => void; onInvalidate: () => void
}) {
  const [text, setText] = useState(destinationHint ?? '')
  const [destination, setDestination] = useState<PlaceResult | null>(null)
  const [mode, setMode] = useState<CommuteMode | ''>(modeHint ?? '')
  const [ceiling, setCeiling] = useState(ceilingHint ? String(ceilingHint) : '')
  const [departure, setDeparture] = useState('')
  const [results, setResults] = useState<CommuteConfirmation | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const request = useRef(0)
  const { isLoaded } = useGoogleMaps()
  useEffect(() => () => { request.current += 1 }, [])
  const invalidate = () => { request.current += 1; setResults(null); setBusy(false); setError(''); onInvalidate() }
  const validCeiling = Number.isInteger(Number(ceiling)) && Number(ceiling) >= 1 && Number(ceiling) <= 240
  const calculate = async () => {
    if (!destination || !mode || !validCeiling || !isLoaded || busy) return
    const current = ++request.current
    setBusy(true); setResults(null); setError('')
    try {
      const routes = await calculateShortlistCommute(origins, destination, mode, mode === 'WALKING' || !departure ? new Date() : new Date(departure))
      if (current === request.current) setResults({ routes, minuteCeiling: Number(ceiling), destination, mode })
    } catch (reason) { if (current === request.current) setError(getErrorMessage(reason, 'Chưa tính được đường đi.')) }
    finally { if (current === request.current) setBusy(false) }
  }
  return <details className="shortlist-commute-planner" open>
    <summary>Kiểm chứng thời gian đi từ các tin ứng viên</summary>
    <p>Chọn địa chỉ điểm đến cụ thể và phương tiện. Tên trường chưa thay thế địa chỉ cơ sở.</p>
    <AddressAutocomplete id="intent-commute-destination" value={text}
      onChange={value => { invalidate(); setText(value); setDestination(null) }}
      onPlaceSelect={value => { invalidate(); setDestination(value); setText(value.address) }} placeholder="Chọn đúng cơ sở trường / nơi làm việc" />
    <label htmlFor="intent-commute-mode">Phương tiện</label><select id="intent-commute-mode" value={mode} onChange={event => { invalidate(); setMode(event.target.value as CommuteMode | '') }}>
      <option value="">Chọn phương tiện</option>{Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
    </select>
    <label htmlFor="intent-commute-ceiling">Thời gian tối đa (phút)</label><input id="intent-commute-ceiling" type="number" min="1" max="240" value={ceiling} onChange={event => { invalidate(); setCeiling(event.target.value) }} placeholder="Ví dụ: 20" />
    <label htmlFor="intent-commute-departure">Giờ đi (bỏ trống: bây giờ)</label><input id="intent-commute-departure" type="datetime-local" value={departure} disabled={mode === 'WALKING'} onChange={event => { invalidate(); setDeparture(event.target.value) }} />
    <p>Khi nhấn tính, tọa độ tối đa {origins.length} tin, điểm đến và giờ đi được gửi Google Maps. Kết quả ô tô không thể dùng để suy ra xe máy.</p>
    {!isLoaded ? <p role="status">Bản đồ chưa sẵn sàng; chưa thể xác nhận điều kiện đường đi.</p> : null}
    <button type="button" className="btn btn-secondary btn-sm" disabled={!destination || !mode || !validCeiling || !isLoaded || busy || !origins.length} onClick={() => void calculate()}>{busy ? 'Đang tính tuyến…' : 'Tính tuyến và kiểm tra mốc thời gian'}</button>
    {error ? <p role="alert">{error}</p> : null}
    {results ? <>
      <ul>{results.routes.map(route => <li key={route.postId}>
        {origins.find(origin => origin.id === route.postId)?.title}: {route.durationMillis != null
          ? `${Math.ceil(route.durationMillis / 60000)} phút · ${labels[route.mode]} · ${route.durationMillis <= results.minuteCeiling * 60000 ? 'đáp ứng' : 'vượt mốc'} ${results.minuteCeiling} phút`
          : 'Chưa tính được, cần kiểm tra lại'}
      </li>)}</ul>
      <small>Google Maps · giờ đi {new Date(results.routes[0].departureAt).toLocaleString('vi-VN')} · tính {new Date(results.routes[0].calculatedAt).toLocaleString('vi-VN')}. Kết quả thay đổi theo giao thông và độ phủ.</small>
      <button type="button" className="btn btn-primary btn-sm" onClick={() => onConfirm(results)}>Xác nhận các tuyến vừa tính cho tìm kiếm này</button>
    </> : null}
  </details>
}
