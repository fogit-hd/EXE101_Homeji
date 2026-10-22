import { Link } from 'react-router-dom'
import type { DecisionResponse } from '../../api/rentalAssistant'
import { formatListingRent, formatPrice } from '../../lib/labels'
import { mapPostUrl } from '../../lib/mapDeepLinks'
import { rentalPriceBasis, rentalPriceLabel } from './rentalPriceBasis'
import './RentalContextCard.css'

/** Compact facts for one room; unknown charges never become a monthly total. */
export function RentalContextCard({ data, onOpenDetail }: { data: DecisionResponse; onOpenDetail?: () => void }) {
  return <div className="rental-context-card">
    {data.posts.length === 0 ? <p>Chưa có dữ liệu phòng để tính chi phí. Mở lại chi tiết để kiểm tra tin còn công khai.</p> : null}
    {data.posts.map(({ post, cost }) => {
      const basis = rentalPriceBasis(post)
      const monthlyKnown = basis === 'room' && (cost.priceBasis == null || cost.priceBasis === 'room')
        && cost.knownMonthlySubtotal != null && Number.isFinite(cost.knownMonthlySubtotal) && cost.knownMonthlySubtotal >= 0
      const sourceDate = Date.parse(cost.updatedAt)
      const questions = [...new Set([...cost.unknown, ...cost.questions])].filter(Boolean)
      return <article key={post.id}>
        <dl>
          <div><dt>Tiền thuê theo tin</dt><dd><strong>{formatListingRent(post.price)}</strong><small>{rentalPriceLabel(basis)}</small></dd></div>
          <div><dt>Cọc theo tin</dt><dd>{Number.isFinite(post.deposit) && post.deposit > 0 ? formatPrice(post.deposit) : 'Chưa xác nhận'}</dd></div>
          <div><dt>Phần chi phí đã biết / tháng</dt><dd>{monthlyKnown ? formatPrice(cost.knownMonthlySubtotal!) : 'Cần xác nhận đơn vị và phạm vi chi phí'}</dd></div>
        </dl>
        <p className="rental-context-card__notice">Chưa kết luận tổng tháng. Các khoản còn thiếu cần hỏi chủ tin.{!(post.price > 0) ? ' Tiền thuê chưa được xác nhận.' : ''}</p>
        <small className="rental-context-card__source">{cost.sourceType === 'listing' ? 'Theo tin chủ đăng' : 'Theo dữ liệu phản hồi'} · {Number.isFinite(sourceDate) ? `cập nhật ${new Date(sourceDate).toLocaleDateString('vi-VN')}` : 'chưa có ngày cập nhật'}. Homeji chưa xác minh phí.</small>
        {questions.length ? <details><summary>Khoản thiếu và câu hỏi ({questions.length})</summary><ul>{questions.map(question => <li key={question}>{question}</li>)}</ul></details> : null}
        <Link className="rental-context-card__detail" to={mapPostUrl(post.id)} onClick={onOpenDetail}>Mở chi tiết phòng</Link>
      </article>
    })}
  </div>
}
