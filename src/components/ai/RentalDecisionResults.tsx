import { Link } from 'react-router-dom'
import type { DecisionItem, DecisionResponse } from '../../api/rentalAssistant'
import { formatPrice, formatListingRent, formatListingArea, amenityLabel } from '../../lib/labels'
import { mapPostUrl } from '../../lib/mapDeepLinks'
import { rentalPriceBasis, rentalPriceLabel } from './rentalPriceBasis'
import { aiFeatureFlags } from '../../lib/aiFeatureFlags'

const validAmount = (value: number | null) => value !== null && Number.isFinite(value) && value >= 0
const knownRent = (item: DecisionItem) => Number.isFinite(item.post.price) && item.post.price > 0
const groupBasis = (item: DecisionItem) => rentalPriceBasis(item.post) === 'room'
  && (item.cost.priceBasis === undefined || item.cost.priceBasis === 'room')
const groupTotal = (item: DecisionItem, value: number | null) => groupBasis(item) && knownRent(item) && validAmount(value)

/** Rendering stays conservative when an older backend omits the cost basis. */
export function RentalDecisionResults({ data, budgetCeiling, maxCommuteMinutes }: {
  data: DecisionResponse; budgetCeiling?: number | null; maxCommuteMinutes?: number | null
}) {
  const bases = data.posts.map(item => rentalPriceBasis(item.post))
  const comparable = data.posts.every(knownRent) && !bases.includes('unknown') && new Set(bases).size <= 1
  const rows: [string, (item: DecisionItem) => string][] = [
    ['Tiền thuê theo tin', item => formatListingRent(item.post.price)],
    ['Đơn vị tiền thuê', item => rentalPriceLabel(rentalPriceBasis(item.post))],
    ['Diện tích', item => formatListingArea(item.post.area)],
    ['Chỗ trống / tối đa', item => `${item.post.availableSlots ?? 'Chưa rõ'} / ${item.post.maxOccupants != null && item.post.maxOccupants > 0 ? item.post.maxOccupants : 'Chưa rõ'}`],
    ['Tiện ích theo tin', item => item.post.amenities.map(amenityLabel).join(', ') || 'Chưa có thông tin'],
    ['Chi phí đã tính / tháng', item => groupBasis(item) && validAmount(item.cost.knownMonthlySubtotal)
      ? formatPrice(item.cost.knownMonthlySubtotal!) + (!knownRent(item) ? ' (chỉ các khoản đã biết; chưa có tiền thuê)' : item.cost.unknown.length ? ' (chưa đủ phí)' : ' (chi phí bạn nhập)')
      : 'Cần xác nhận đơn vị và phạm vi chi phí'],
    ['Tổng tháng', item => groupTotal(item, item.cost.estimatedMonthlyTotal) ? formatPrice(item.cost.estimatedMonthlyTotal!) : 'Chưa đủ thông tin'],
    ['Cọc theo tin', item => item.post.deposit > 0 ? formatPrice(item.post.deposit) : 'Chưa xác nhận'],
    ['Ban đầu: thuê + cọc + phí nhượng phòng + khoản khác', item => groupTotal(item, item.cost.initialPayment) ? formatPrice(item.cost.initialPayment!) + ' (chi phí bạn nhập)' : 'Chưa đủ thông tin'],
    ['Nguồn / cập nhật', item => `Chủ tin · ${new Date(item.cost.updatedAt).toLocaleDateString('vi-VN')} · chưa xác minh phí`],
  ]
  if (aiFeatureFlags.commute) rows.push(
    ['Đường đi', item => !item.commute ? 'Chưa chọn điểm đến' : item.commute.durationMinutes == null ? 'Chưa tính được' : `${Math.ceil(item.commute.durationMinutes)} phút · ${item.commute.distanceMeters} m · ${item.commute.mode === 'DRIVE' ? 'Ô tô' : 'Đi bộ'}${maxCommuteMinutes ? item.commute.durationMinutes <= maxCommuteMinutes ? ' · Trong thời gian đi lại bạn chọn' : ' · Vượt thời gian đi lại bạn chọn' : ''}`],
    ['Thời điểm tuyến', item => item.commute ? new Date(item.commute.departureTime ?? item.commute.calculatedAt).toLocaleString('vi-VN') : 'Chưa tính'],
  )
  return <>
    <p role="status">{comparable ? data.summary : 'Giá theo người, cả phòng hoặc chưa rõ đơn vị không được so chênh lệch trực tiếp. Cần xác nhận đơn vị và các khoản thiếu trước khi so ngân sách.'}</p>
    {data.unavailablePostIds.length ? <p>Tin bị ẩn, hết hạn hoặc không còn phù hợp đã được bỏ khỏi so sánh.</p> : null}
    <div className="rental-assistant__table-wrap" role="region" aria-label="Bảng so sánh phòng, cuộn ngang để xem các tin" tabIndex={0}><table><caption>Thông tin chủ tin và chi phí bạn nhập</caption><thead><tr><th scope="col">Tiêu chí</th>{data.posts.map(item => <th scope="col" key={item.post.id}><Link to={mapPostUrl(item.post.id)}>{item.post.title}</Link></th>)}</tr></thead><tbody>
      {rows.map(([label, render]) => <tr key={label}><th scope="row">{label}</th>{data.posts.map(item => <td key={item.post.id}>{render(item)}</td>)}</tr>)}
    </tbody></table></div>
    {budgetCeiling ? <p>Ngân sách tổng {formatPrice(budgetCeiling)}: {data.posts.map(item => `${item.post.title}: ${!groupTotal(item, item.cost.estimatedMonthlyTotal) ? 'cần xác nhận' : item.cost.estimatedMonthlyTotal! <= budgetCeiling ? 'trong ngân sách theo chi phí bạn nhập' : 'vượt ngân sách theo chi phí bạn nhập'}`).join(' · ')}.</p> : null}
    {data.posts.map(item => <details key={item.post.id}><summary>Những điều cần hỏi — {item.post.title}</summary><ul>{[...item.cost.unknown, ...item.cost.questions].map(text => <li key={text}>{text}</li>)}</ul></details>)}
    {aiFeatureFlags.commute && data.posts.some(item => item.commute) ? <small>Google Maps · Thời gian thay đổi theo tuyến và giao thông.</small> : null}
  </>
}
