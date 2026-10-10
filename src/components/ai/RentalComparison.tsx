import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { compareRentalPosts, getRentalPost, RentalPostStatus, RentalPostType, type CompareRentalPostItem } from '../../api'
import { AddressAutocomplete, type PlaceResult } from '../map/AddressAutocomplete'
import { useGoogleMaps } from '../../contexts/GoogleMapsProvider'
import { calculateShortlistCommute, type CommuteMode, type CommuteResult } from '../../lib/shortlistCommute'
import { aiFeatureFlags } from '../../lib/aiFeatureFlags'
import { getErrorMessage } from '../../lib/errors'
import { amenityLabel, formatPrice } from '../../lib/labels'
import { RentalCostCalculator } from './RentalCostCalculator'
import { ApiRequestError } from '../../api/client'
import { isLowestComparablePrice, rentalPriceBasis, rentalPriceLabel } from './rentalPriceBasis'
import './RentalComparison.css'

const modeLabels: Record<CommuteMode, string> = { DRIVING: 'Ô tô', WALKING: 'Đi bộ', TRANSIT: 'Phương tiện công cộng' }

export function RentalComparison({ postIds, onClose }: { postIds: string[]; onClose: () => void }) {
  const [items, setItems] = useState<CompareRentalPostItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [destinationText, setDestinationText] = useState('')
  const [destination, setDestination] = useState<PlaceResult | null>(null)
  const [mode, setMode] = useState<CommuteMode | ''>('')
  const [departure, setDeparture] = useState('')
  const [minuteCeiling, setMinuteCeiling] = useState('')
  const [routes, setRoutes] = useState<CommuteResult[]>([])
  const [routing, setRouting] = useState(false)
  const routeRequest = useRef(0)
  const { isLoaded: mapsLoaded } = useGoogleMaps()
  const selection = postIds.join(',')

  useEffect(() => {
    let cancelled = false
    const ids = selection.split(',').filter(Boolean)
    const load = async () => {
      routeRequest.current += 1; setRoutes([]); setRouting(false)
      setLoading(true); setError(''); setItems([])
      try {
        const comparison = await compareRentalPosts(ids)
        if (!cancelled) setItems(comparison.posts)
      } catch (reason) {
        if (cancelled) return
        if (!(reason instanceof ApiRequestError) || reason.status !== 404) {
          setError(getErrorMessage(reason, 'Không tải được so sánh.'))
          return
        }
        // If one selected post has disappeared, retain only freshly authorized active posts.
        const refreshed = await Promise.allSettled(ids.map(id => getRentalPost(id, { auth: true })))
        const available = refreshed.flatMap(result => result.status === 'fulfilled' && result.value.status === RentalPostStatus.Active
          ? [{ post: result.value, averageRating: 0, reviewCount: 0 }] : [])
        if (!cancelled) {
          setItems(available)
          setError(available.length < ids.length ? 'Một số tin không còn công khai và đã được bỏ khỏi so sánh.' : getErrorMessage(reason, 'Không tải được so sánh.'))
        }
      } finally { if (!cancelled) setLoading(false) }
    }
    void load()
    return () => { cancelled = true; routeRequest.current += 1 }
  }, [selection, attempt])

  const invalidateRoutes = () => { routeRequest.current += 1; setRoutes([]); setRouting(false) }
  const computeRoutes = async () => {
    if (!destination || !mode || routing || !mapsLoaded) return
    const request = ++routeRequest.current
    setRouting(true); setError(''); setRoutes([])
    try {
      const departureTime = departure && mode !== 'WALKING' ? new Date(departure) : new Date()
      const result = await calculateShortlistCommute(items.map(item => item.post), destination, mode, departureTime)
      if (routeRequest.current === request) setRoutes(result)
    } catch (reason) {
      if (routeRequest.current === request) setError(getErrorMessage(reason, 'Chưa tính được đường đi.'))
    } finally { if (routeRequest.current === request) setRouting(false) }
  }
  const largest = items.length > 1 ? Math.max(...items.map(item => item.post.area)) : null

  return <section className="rental-comparison" aria-labelledby="rental-comparison-title">
    <header><div><span>SHORTLIST CỦA BẠN</span><h2 id="rental-comparison-title">So sánh có căn cứ</h2></div>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Đóng so sánh</button></header>
    <p>Thông tin được tải lại từ tin đang công khai. Chỉ so giá thấp nhất giữa các tin cùng đơn vị: cả phòng hoặc mỗi người. Giá mỗi người không được tự quy đổi thành giá cả phòng.</p>
    {error ? <p role="alert">{error} <button type="button" onClick={() => setAttempt(value => value + 1)}>Tải lại tin</button></p> : null}
    {loading ? <p role="status">Đang cập nhật thông tin phòng…</p> : <>
      {aiFeatureFlags.commute ? <div className="rental-comparison__commute">
        <label htmlFor="compare-destination">Trường / nơi làm việc bạn chọn</label>
        <AddressAutocomplete id="compare-destination" value={destinationText}
          onChange={value => { setDestinationText(value); setDestination(null); invalidateRoutes() }}
          onPlaceSelect={place => { setDestination(place); invalidateRoutes() }} placeholder="Chọn địa chỉ điểm đến cụ thể" />
        <label htmlFor="compare-mode">Phương tiện</label><select id="compare-mode" value={mode} onChange={event => { setMode(event.target.value as CommuteMode | ''); invalidateRoutes() }}>
          <option value="">Chọn phương tiện</option>
          {Object.entries(modeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
        <label htmlFor="compare-departure">Giờ đi (bỏ trống: bây giờ)</label>
        <input id="compare-departure" type="datetime-local" value={departure} disabled={mode === 'WALKING'} onChange={event => { setDeparture(event.target.value); invalidateRoutes() }} />
        <label htmlFor="compare-ceiling">Mốc thời gian muốn kiểm tra (phút)</label>
        <input id="compare-ceiling" type="number" min="1" max="240" value={minuteCeiling} onChange={event => setMinuteCeiling(event.target.value)} placeholder="Ví dụ: 20" />
        <button type="button" className="btn btn-secondary" disabled={!destination || !mode || !mapsLoaded || routing || items.length === 0} onClick={() => void computeRoutes()}>{routing ? 'Đang tính…' : `Tính ${items.length} tuyến đến điểm đã chọn`}</button>
        <small>Khi nhấn tính, tọa độ các tin, giờ đi và điểm đến được gửi Google Maps; tối đa 3 tuyến. Giờ đi cần từ hiện tại trở đi; đi bộ không dùng giờ xuất phát. Ô tô không được dùng để suy ra thời gian xe máy.</small>
      </div> : null}
      <div className="rental-comparison__grid">{items.map(item => {
        const post = item.post
        const priceBasis = rentalPriceBasis(post)
        const route = routes.find(value => value.postId === post.id)
        return <article key={post.id}>
          <Link to={`/?section=listings&post=${encodeURIComponent(post.id)}`}><h3>{post.title}</h3></Link>
          <p>{post.address}</p>
          {post.type === RentalPostType.RoomTransfer ? <small>Tin pass phòng dùng vị trí gần đúng nếu bạn không phải chủ tin; cần xác nhận địa chỉ trước khi đi xem.</small> : null}
          <dl>
            <dt>{rentalPriceLabel(priceBasis)}</dt><dd>{formatPrice(post.price)}{isLowestComparablePrice(post, items.map(item => item.post)) ? ' · thấp nhất trong các tin cùng đơn vị' : ''}</dd>
            <dt>Diện tích</dt><dd>{post.area} m²{post.area === largest ? ' · rộng nhất trong lựa chọn' : ''}</dd>
            <dt>Số người tối đa theo tin</dt><dd>{post.maxOccupants ?? 'Chưa có thông tin'}</dd>
            <dt>Số chỗ còn lại theo tin</dt><dd>{post.availableSlots ?? 'Chưa có thông tin'}</dd>
            <dt>Tiện ích được chủ tin khai báo</dt><dd>{post.amenities.length ? post.amenities.map(amenityLabel).join(', ') : 'Chưa có thông tin'}</dd>
            <dt>Nguồn / cập nhật</dt><dd>Chủ tin · {new Date(post.updatedAt).toLocaleDateString('vi-VN')}</dd>
            <dt>Đường đi tới điểm đã chọn</dt><dd>{route?.durationMillis != null ? <>{Math.ceil(route.durationMillis / 60000)} phút · {((route.distanceMeters ?? 0) / 1000).toFixed(1)} km · {modeLabels[route.mode]}<br /><small>Google Maps · tính {new Date(route.calculatedAt).toLocaleString('vi-VN')} · giờ đi {new Date(route.departureAt).toLocaleString('vi-VN')}</small></> : route?.error ?? 'Chưa tính được'}</dd>
            {Number(minuteCeiling) >= 1 && Number(minuteCeiling) <= 240 ? <><dt>Mốc ≤ {Number(minuteCeiling)} phút</dt><dd>{route?.durationMillis != null ? route.durationMillis <= Number(minuteCeiling) * 60000 ? 'Đáp ứng theo tuyến vừa tính' : 'Vượt mốc theo tuyến vừa tính' : 'Chưa đủ dữ liệu; giữ tin để kiểm tra'}</dd></> : null}
          </dl>
          {priceBasis === 'room' ? <RentalCostCalculator rent={post.price} depositHint={post.deposit} />
            : <p>{priceBasis === 'person'
              ? 'Tin này ghi chi phí mỗi người. Hỏi người đăng các khoản đã bao gồm và khoản phát sinh; công cụ tính chi phí cả phòng không áp dụng cho đơn vị này.'
              : 'Tin chưa xác định giá theo người hay cả phòng. Hỏi người đăng đơn vị trước khi so tổng chi phí.'}</p>}
          <details><summary>Những điều cần hỏi trước khi xem</summary><ul>
            <li>Điện tính theo kWh hay theo người? Đơn giá và lượng dùng thế nào?</li><li>Nước, internet, giữ xe và phí chung được tính theo đơn vị nào?</li>
            <li>Tiền cọc, kỳ thanh toán, phí ban đầu và điều kiện hoàn cọc trong hợp đồng?</li><li>Phòng còn trống không? Giờ giấc, khách đến và thú cưng có điều kiện gì?</li>
            {!post.houseRules ? <li>Tin chưa có nội quy: đề nghị chủ phòng cung cấp trước.</li> : null}
          </ul></details>
        </article>
      })}</div>
      {routes.length ? <p className="rental-comparison__attribution">Google Maps · Kết quả thay đổi theo giao thông và độ phủ của phương tiện. Tuyến lỗi được giữ ở trạng thái chưa tính được.</p> : null}
    </>}
  </section>
}
