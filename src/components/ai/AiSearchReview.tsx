import { Link } from 'react-router-dom'
import { useState } from 'react'
import { aiFeatureFlags } from '../../lib/aiFeatureFlags'
import type { AiHighlightResponse } from '../../api'
import { RentalPostType } from '../../api'
import { amenityLabel, formatPrice } from '../../lib/labels'
import './AiSearchReview.css'
import { ShortlistCommutePlanner, type CommuteConfirmation } from './ShortlistCommutePlanner'
import { RentalCostCalculator } from './RentalCostCalculator'
import { rentalPriceBasis, rentalPriceLabel } from './rentalPriceBasis'

export function AiSearchReview({ result, onApply, onRefine }: {
  result: AiHighlightResponse
  onApply: (result: AiHighlightResponse) => void
  onRefine?: (message: string) => void
}) {
  return <AiSearchReviewSession key={JSON.stringify(result)} result={result} onApply={onApply} onRefine={onRefine} />
}

function AiSearchReviewSession({ result, onApply, onRefine }: {
  result: AiHighlightResponse; onApply: (result: AiHighlightResponse) => void; onRefine?: (message: string) => void
}) {
  const [commute, setCommute] = useState<CommuteConfirmation | null>(null)
  const [confirmedCosts, setConfirmedCosts] = useState<Record<string, number>>({})
  const pendingCosts = result.criteria.budgetBasis === 'total' && result.criteria.unknown?.includes('feeUnits')
  const pendingCommute = result.criteria.unknown?.some(value => ['commute', 'destination', 'motorcycleCoverage'].includes(value))
  const c = { ...result.criteria, ...(commute ? { destination: commute.destination.address, travelMode: commute.mode, maxCommuteMinutes: commute.minuteCeiling } : {}),
    unknown: result.criteria.unknown?.filter(value => !(commute && ['commute', 'destination', 'motorcycleCoverage'].includes(value)) &&
      !(pendingCosts && Object.keys(confirmedCosts).length > 0 && value === 'feeUnits')) }
  const routedPosts = commute ? result.posts.filter(item => {
    const route = commute.routes.find(value => value.postId === item.post.id)
    return route?.durationMillis != null && route.durationMillis <= commute.minuteCeiling * 60000
  }) : result.posts
  const visiblePosts = pendingCosts ? routedPosts.filter(item => {
    const monthly = confirmedCosts[item.post.id]
    return monthly != null && (c.priceMax == null || monthly <= c.priceMax) && (c.priceMin == null || monthly >= c.priceMin)
  }) : routedPosts
  const chips = [
    ...(c.location ? [{ text: c.location, edit: 'Tìm lại phòng ở ' }] : []),
    ...(c.priceMax != null ? [{ text: `${c.budgetBasis === 'total' ? 'Cả phí' : 'Tiền thuê'} ≤ ${formatPrice(c.priceMax)}`, edit: 'Đổi ngân sách dưới ' }] : []),
    ...(c.priceMin != null ? [{ text: `Từ ${formatPrice(c.priceMin)}`, edit: 'Từ ' }] : []),
    ...(c.occupants ? [{ text: `${c.occupants} người`, edit: 'Phòng cho ' }] : []),
    ...(c.areaMin != null ? [{ text: `Diện tích ≥ ${c.areaMin} m²`, edit: 'Bỏ diện tích' }] : []),
    ...(c.areaMax != null ? [{ text: `Diện tích ≤ ${c.areaMax} m²`, edit: 'Bỏ diện tích' }] : []),
    ...(c.destination ? [{ text: `Điểm đến: ${c.destination}`, edit: 'Bỏ điểm đến' }] : []),
    ...(c.maxCommuteMinutes ? [{ text: `Đường đi ≤ ${c.maxCommuteMinutes} phút`, edit: 'Bỏ điểm đến' }] : []),
    ...(c.travelMode ? [{ text: c.travelMode === 'DRIVING' ? 'Ô tô' : c.travelMode === 'WALKING' ? 'Đi bộ' : 'Phương tiện công cộng', edit: 'Phương tiện đi học: ' }] : []),
    ...(c.requiredAmenities ?? []).map(code => ({ text: `Cần ${amenityLabel(code)}`, edit: `Không cần ${amenityLabel(code)}` })),
    ...(c.criteria ?? []).map(code => ({ text: `Ưu tiên ${amenityLabel(code)}`, edit: `Không cần ${amenityLabel(code)}` })),
    ...(c.excludedAmenities ?? []).map(code => ({ text: `Không có ${amenityLabel(code)}`, edit: `Không cần ${amenityLabel(code)}` })),
    ...(c.excludeRoommateShare ? [{ text: 'Không ở ghép', edit: 'Chấp nhận ở ghép' }] : []),
  ]
  const unknownPriceUnit = result.posts.some(item => rentalPriceBasis(item.post) === 'unknown')
  const unresolved = Boolean(c.unknown?.length) || unknownPriceUnit
  return <section className="ai-search-review" aria-label="Tiêu chí và tin phòng có nguồn">
    <strong>Homeji hiểu bạn muốn…</strong>
    <div className="ai-search-review__chips">{chips.map(chip => onRefine
      ? <button type="button" key={chip.text} onClick={() => onRefine(chip.edit)} title="Sửa tiêu chí">{chip.text} ✎</button>
      : <span key={chip.text}>{chip.text}</span>)}</div>
    {unresolved ? <p role="status">Cần xác nhận thông tin còn thiếu trước khi áp dụng. Bạn có thể sửa yêu cầu hoặc dùng công cụ bên dưới.</p> : <>
      <button type="button" className="ai-search-review__apply ai-spectrum-button" onClick={() => onApply({ ...result, criteria: c, posts: visiblePosts })}>Xác nhận · áp dụng lên bản đồ</button>
      {visiblePosts.length === 0 ? <p>Chưa có tin phù hợp. Các điều kiện được giữ nguyên.</p> : null}
      {pendingCosts ? <p>Chỉ áp dụng những phòng trong ngân sách theo kịch bản chi phí bạn đã xác nhận. Các khoản này do bạn nhập, chưa phải báo giá của chủ phòng.</p> : null}
    </>}
    {unknownPriceUnit ? <p role="status">Một số tin ở ghép chưa rõ giá theo người hay cả phòng. Hỏi người đăng đơn vị hoặc sửa yêu cầu để loại các tin này trước khi áp dụng ngân sách.</p> : null}
    {pendingCommute && !aiFeatureFlags.commute ? <p>Kiểm tra thời gian đi học chưa được bật. Bạn có thể sửa yêu cầu để tìm theo giá, diện tích và tiện ích trước.</p> : null}
    {aiFeatureFlags.commute && pendingCommute && result.posts.length ? <ShortlistCommutePlanner origins={result.posts.slice(0, 5).map(item => item.post)}
      destinationHint={c.destination} modeHint={c.travelMode} ceilingHint={c.maxCommuteMinutes} onConfirm={setCommute} onInvalidate={() => setCommute(null)} /> : null}
    {unresolved && routedPosts.length ? <strong>Tin ứng viên cần xác nhận phí hoặc đường đi; chưa đáp ứng toàn bộ yêu cầu.</strong> : null}
    {(pendingCosts ? routedPosts : visiblePosts).slice(0, 5).map(item => <article key={item.post.id} className="ai-search-review__listing">
      <Link to={`/?section=listings&post=${encodeURIComponent(item.post.id)}`}>{item.post.title}</Link>
      <strong>{formatPrice(item.post.price)} · {rentalPriceLabel(rentalPriceBasis(item.post))} · {item.post.area} m²</strong>
      <span>{item.post.address}</span>
      {item.post.type === RentalPostType.RoomTransfer ? <small>Tin pass phòng dùng vị trí gần đúng. Tuyến từ ghim này chưa thay thế đường đi từ cửa phòng.</small> : null}
      {item.post.isOwnerPremium ? <small>Chủ tin Premium · ưu tiên thương mại riêng</small> : null}
      <p>Giá, diện tích và tiện ích theo tin chủ đăng.</p>
      <ul>{item.reasonEvidence?.length ? item.reasonEvidence.filter(reason => reason.postId === item.post.id && reason.sourceType === 'listing').map(reason => <li key={`${reason.field}-${reason.value}`}>
        {reason.field === 'amenities' ? `Có ${amenityLabel(reason.value)} theo tin chủ đăng.` : reason.text}
        <small> · căn cứ: {reason.field === 'amenities' ? 'tiện ích' : reason.field === 'price' ? 'giá thuê' : reason.field === 'address' ? 'địa chỉ' : reason.field === 'title' ? 'tiêu đề' : 'trạng thái'} của tin này</small>
        {reason.field === 'amenities' && onRefine && (c.requiredAmenities ?? []).includes(reason.value) ? <button type="button" onClick={() => onRefine(`Ưu tiên ${amenityLabel(reason.value)}`)}>Đổi thành mong muốn</button> : null}
      </li>) : item.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>
      {item.updatedAt && Number.isFinite(Date.parse(item.updatedAt)) ? <small>Tin cập nhật: {new Date(item.updatedAt).toLocaleDateString('vi-VN')}</small> : null}
      <small>Chưa xác nhận tình trạng phòng trống và phí phát sinh.</small>
      {pendingCosts ? <>
        {confirmedCosts[item.post.id] != null ? <p role="status">Kịch bản đã xác nhận: {formatPrice(confirmedCosts[item.post.id])} / tháng · {visiblePosts.some(post => post.post.id === item.post.id) ? 'trong ngân sách' : 'vượt ngân sách'}</p> : null}
        {rentalPriceBasis(item.post) === 'room' ? <RentalCostCalculator rent={item.post.price} occupantsHint={c.occupants ?? 1} monthlyCeiling={c.priceMax}
          onConfirmMonthly={monthly => setConfirmedCosts(current => ({ ...current, [item.post.id]: monthly }))}
          onInvalidate={() => setConfirmedCosts(current => {
            if (!(item.post.id in current)) return current
            const next = { ...current }; delete next[item.post.id]; return next
          })} /> : <p>Không dùng giá mỗi người hoặc giá chưa rõ đơn vị để tính tổng chi phí cả phòng. Tin này chưa được xác nhận cho bộ lọc ngân sách cả phí; hỏi người đăng hoặc sửa yêu cầu.</p>}
      </> : null}
    </article>)}
  </section>
}
