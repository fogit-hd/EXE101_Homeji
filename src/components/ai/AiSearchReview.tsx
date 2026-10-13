import { Link } from 'react-router-dom'
import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { aiFeatureFlags } from '../../lib/aiFeatureFlags'
import type { AiHighlightResponse } from '../../api'
import { RentalPostType } from '../../api'
import { amenityLabel, formatPrice, formatListingRent, formatListingArea } from '../../lib/labels'
import './AiSearchReview.css'
import { ShortlistCommutePlanner, type CommuteConfirmation } from './ShortlistCommutePlanner'
import { RentalCostCalculator } from './RentalCostCalculator'
import { rentalPriceBasis, rentalPriceLabel } from './rentalPriceBasis'
import { buildRentalSearchChips } from './rentalSearchChips'

export function AiSearchReview({ result, onApply, onRefine, variant = 'full' }: {
  result: AiHighlightResponse
  onApply: (result: AiHighlightResponse) => void
  onRefine?: (message: string) => void
  /** `compact` is the minimalist search-bar panel: summary, chips, small cards, caveats collapsed. */
  variant?: 'full' | 'compact'
}) {
  return <AiSearchReviewSession key={JSON.stringify(result)} result={result} onApply={onApply} onRefine={onRefine} variant={variant} />
}

function AiSearchReviewSession({ result, onApply, onRefine, variant }: {
  result: AiHighlightResponse; onApply: (result: AiHighlightResponse) => void; onRefine?: (message: string) => void; variant: 'full' | 'compact'
}) {
  const [caveatsOpen, setCaveatsOpen] = useState(false)
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
  const chips = buildRentalSearchChips(c)
  const unknownPriceUnit = result.posts.some(item => rentalPriceBasis(item.post) === 'unknown')
  const unresolved = Boolean(c.unknown?.length) || unknownPriceUnit
  const shownPosts = pendingCosts ? routedPosts : visiblePosts
  const renderListing = (item: AiHighlightResponse['posts'][number], compact = false): ReactNode => <article key={item.post.id} className={compact ? 'ai-suggest-review__detail' : 'ai-search-review__listing'}>
      <Link to={`/?section=listings&post=${encodeURIComponent(item.post.id)}`}>{item.post.title}</Link>
      <strong>{formatListingRent(item.post.price)} · {rentalPriceLabel(rentalPriceBasis(item.post))} · {formatListingArea(item.post.area)}</strong>
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
    </article>
  const apply = () => onApply({ ...result, criteria: c, posts: visiblePosts })

  if (variant === 'compact') {
    const notes = [
      unresolved ? 'Cần xác nhận thông tin còn thiếu trước khi áp dụng. Bạn có thể sửa yêu cầu hoặc dùng công cụ bên dưới.' : null,
      !unresolved && pendingCosts ? 'Chỉ áp dụng những phòng trong ngân sách theo kịch bản chi phí bạn đã xác nhận. Các khoản này do bạn nhập, chưa phải báo giá của chủ phòng.' : null,
      unknownPriceUnit ? 'Một số tin ở ghép chưa rõ giá theo người hay cả phòng. Hỏi người đăng đơn vị hoặc sửa yêu cầu để loại các tin này trước khi áp dụng ngân sách.' : null,
      pendingCommute && !aiFeatureFlags.commute ? 'Kiểm tra thời gian đi học chưa được bật. Bạn có thể sửa yêu cầu để tìm theo giá, diện tích và tiện ích trước.' : null,
      unresolved && routedPosts.length ? 'Tin ứng viên cần xác nhận phí hoặc đường đi; chưa đáp ứng toàn bộ yêu cầu.' : null,
      'Giá, diện tích và tiện ích theo tin chủ đăng. Chưa xác nhận tình trạng phòng trống và phí phát sinh.',
    ].filter((note): note is string => Boolean(note))
    const cards = shownPosts.slice(0, 3)
    return <section className="ai-suggest-review" aria-label="Tiêu chí và tin phòng có nguồn">
      <p className="ai-suggest-review__summary" role="status">
        {shownPosts.length
          ? <>Tìm thấy <b>{shownPosts.length} tin</b> phù hợp{unresolved ? ', cần xác nhận vài điểm trước khi áp dụng.' : '.'}</>
          : 'Chưa có tin phù hợp. Các điều kiện được giữ nguyên.'}
      </p>
      {chips.length ? <div className="ai-suggest-review__chips">{chips.map(chip => onRefine
        ? <button type="button" key={chip.text} onClick={() => onRefine(chip.edit)} title="Sửa tiêu chí">{chip.text}<span aria-hidden="true"> ✎</span></button>
        : <span key={chip.text}>{chip.text}</span>)}</div> : null}
      {cards.length ? <div className="ai-suggest-review__cards">{cards.map((item, index) => <motion.div key={item.post.id}
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: index * 0.05 } }}>
        <Link className="ai-suggest-review__card" to={`/?section=listings&post=${encodeURIComponent(item.post.id)}`}>
          <span className="ai-suggest-review__thumb">{item.post.thumbnailPath ? <img src={item.post.thumbnailPath} alt="" loading="lazy" /> : null}</span>
          <span className="ai-suggest-review__card-title">{item.post.title}</span>
          <span className="ai-suggest-review__card-price">{formatListingRent(item.post.price)}</span>
        </Link>
      </motion.div>)}</div> : null}
      {shownPosts.length > cards.length ? <p className="ai-suggest-review__more">+{shownPosts.length - cards.length} tin khác khi áp dụng lên bản đồ</p> : null}
      <div className={`ai-suggest-review__caveats${unresolved ? ' is-warn' : ''}`}>
        <button type="button" className="ai-suggest-review__caveats-toggle" aria-expanded={caveatsOpen} onClick={() => setCaveatsOpen(open => !open)}>
          <span className="ai-suggest-review__caveats-mark" aria-hidden="true">!</span>
          <span>{unresolved ? 'Cần xác nhận trước khi áp dụng' : 'Giá & phòng trống theo tin chủ đăng'} · {caveatsOpen ? 'Ẩn lưu ý' : 'Xem lưu ý'}</span>
          <motion.svg animate={{ rotate: caveatsOpen ? 180 : 0 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 9l6 6 6-6" /></motion.svg>
        </button>
        <AnimatePresence initial={false}>
          {caveatsOpen ? <motion.div key="body" className="ai-suggest-review__caveats-body"
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}>
            <ul className="ai-suggest-review__notes">{notes.map(note => <li key={note}>{note}</li>)}</ul>
            {aiFeatureFlags.commute && pendingCommute && result.posts.length ? <ShortlistCommutePlanner origins={result.posts.slice(0, 5).map(item => item.post)}
              destinationHint={c.destination} modeHint={c.travelMode} ceilingHint={c.maxCommuteMinutes} onConfirm={setCommute} onInvalidate={() => setCommute(null)} /> : null}
            {shownPosts.slice(0, 5).map(item => renderListing(item, true))}
          </motion.div> : null}
        </AnimatePresence>
      </div>
      <button type="button" className="ai-suggest-review__apply" disabled={unresolved} onClick={apply}>
        {unresolved ? 'Xác nhận lưu ý để áp dụng' : 'Áp dụng lên bản đồ'}
      </button>
    </section>
  }

  return <section className="ai-search-review" aria-label="Tiêu chí và tin phòng có nguồn">
    <strong>Homeji hiểu bạn muốn…</strong>
    <div className="ai-search-review__chips">{chips.map(chip => onRefine
      ? <button type="button" key={chip.text} onClick={() => onRefine(chip.edit)} title="Sửa tiêu chí">{chip.text} ✎</button>
      : <span key={chip.text}>{chip.text}</span>)}</div>
    {unresolved ? <p role="status">Cần xác nhận thông tin còn thiếu trước khi áp dụng. Bạn có thể sửa yêu cầu hoặc dùng công cụ bên dưới.</p> : <>
      <button type="button" className="ai-search-review__apply ai-spectrum-button" onClick={apply}>Xác nhận · áp dụng lên bản đồ</button>
      {visiblePosts.length === 0 ? <p>Chưa có tin phù hợp. Các điều kiện được giữ nguyên.</p> : null}
      {pendingCosts ? <p>Chỉ áp dụng những phòng trong ngân sách theo kịch bản chi phí bạn đã xác nhận. Các khoản này do bạn nhập, chưa phải báo giá của chủ phòng.</p> : null}
    </>}
    {unknownPriceUnit ? <p role="status">Một số tin ở ghép chưa rõ giá theo người hay cả phòng. Hỏi người đăng đơn vị hoặc sửa yêu cầu để loại các tin này trước khi áp dụng ngân sách.</p> : null}
    {pendingCommute && !aiFeatureFlags.commute ? <p>Kiểm tra thời gian đi học chưa được bật. Bạn có thể sửa yêu cầu để tìm theo giá, diện tích và tiện ích trước.</p> : null}
    {aiFeatureFlags.commute && pendingCommute && result.posts.length ? <ShortlistCommutePlanner origins={result.posts.slice(0, 5).map(item => item.post)}
      destinationHint={c.destination} modeHint={c.travelMode} ceilingHint={c.maxCommuteMinutes} onConfirm={setCommute} onInvalidate={() => setCommute(null)} /> : null}
    {unresolved && routedPosts.length ? <strong>Tin ứng viên cần xác nhận phí hoặc đường đi; chưa đáp ứng toàn bộ yêu cầu.</strong> : null}
    {shownPosts.slice(0, 5).map(item => renderListing(item))}
  </section>
}
