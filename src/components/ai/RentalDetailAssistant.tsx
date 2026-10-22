import { useId, useState } from 'react'
import type { RentalPost } from '../../api/types'
import { formatListingRent, formatPrice } from '../../lib/labels'
import { buildRentalOwnerDraft, normalizeRentalOwnerDraft, RENTAL_OWNER_DRAFT_MAX_LENGTH } from '../../lib/rentalOwnerQuestions'
import { RentalCostCalculator } from './RentalCostCalculator'
import { rentalPriceBasis, rentalPriceLabel } from './rentalPriceBasis'
import './RentalDetailAssistant.css'

type RentalDetailAssistantProps = {
  post: RentalPost
  onPrepareMessage: (draft: string) => void
  canMessage?: boolean
}

export function RentalDetailAssistant(props: RentalDetailAssistantProps) {
  // A different listing or updated source must never retain the previous draft/scenario.
  return <RentalDetailAssistantContent key={`${props.post.id}:${props.post.updatedAt}`} {...props} />
}

function RentalDetailAssistantContent({ post, onPrepareMessage, canMessage = true }: RentalDetailAssistantProps) {
  const id = useId()
  const [draft, setDraft] = useState<string | null>(null)
  const basis = rentalPriceBasis(post)
  const validAmount = (amount: number | undefined) => typeof amount === 'number' && Number.isFinite(amount) && amount > 0
  const updatedAt = new Date(post.updatedAt)
  const fees = [ ['Điện', post.electricityPrice], ['Nước', post.waterPrice], ['Internet', post.internetPrice] ] as const

  return <section className="rental-detail-assistant" aria-labelledby={`${id}-heading`}>
    <div className="rental-detail-assistant__heading">
      <span aria-hidden="true">✦</span><h3 id={`${id}-heading`}>Hiểu chi phí, hỏi đúng điều cần biết</h3>
    </div>
    <p className="rental-detail-assistant__source">Dữ liệu do người đăng cung cấp{Number.isNaN(updatedAt.getTime()) ? '' : ` · cập nhật ${updatedAt.toLocaleDateString('vi-VN')}`}. Chưa xác minh tình trạng còn phòng.</p>
    <dl className="rental-detail-assistant__facts">
      <div><dt>{rentalPriceLabel(basis)}</dt><dd>{formatListingRent(post.price)}</dd></div>
      <div><dt>Tiền cọc · khoản riêng</dt><dd>{validAmount(post.deposit) ? formatPrice(post.deposit) : 'Chưa xác nhận'}</dd></div>
    </dl>
    <p className="rental-detail-assistant__note">{basis === 'person'
      ? 'Giá mỗi người có thể đã gồm một số khoản. Cần hỏi cách chia phí trước khi tính tổng.'
      : basis === 'unknown' ? 'Cần hỏi giá theo người hay cả phòng trước khi tính tổng.'
        : 'Tiền thuê chưa phải tổng chi phí hằng tháng. Tiền cọc không cộng vào phí hằng tháng.'}</p>
    <details className="rental-detail-assistant__fees"><summary>Những khoản cần xác nhận</summary>
      <ul>{fees.map(([label, amount]) => <li key={label}><strong>{label}:</strong> {validAmount(amount)
        ? `${formatPrice(amount!)} theo tin · chưa rõ đơn vị tính và khoản đã bao gồm.`
        : 'Chưa xác nhận mức phí và đơn vị tính.'}</li>)}
        <li>Giữ xe, vệ sinh, dịch vụ và phí ban đầu: cần hỏi người đăng.</li>
      </ul><p>Khoản ghi 0 hoặc bỏ trống chưa được coi là miễn phí.</p>
    </details>
    {basis === 'room' ? <RentalCostCalculator rent={post.price} depositHint={post.deposit} /> : null}
    {draft === null ? <button type="button" className="btn btn-secondary rental-detail-assistant__prepare" onClick={() => setDraft(buildRentalOwnerDraft(post, basis))}>Soạn câu hỏi cho người đăng</button>
      : <div className="rental-detail-assistant__draft">
        <label htmlFor={`${id}-draft`}>Bản nháp câu hỏi · bạn có thể sửa trước khi mở tin nhắn</label>
        <textarea id={`${id}-draft`} rows={8} maxLength={RENTAL_OWNER_DRAFT_MAX_LENGTH} value={draft} onChange={event => setDraft(event.target.value)} aria-describedby={`${id}-review`} />
        <p id={`${id}-review`} className="rental-detail-assistant__source">Kiểm tra nội dung trước khi tiếp tục. Bản nháp tạo từ tin đang xem; chưa gửi cho người đăng. {draft.length}/{RENTAL_OWNER_DRAFT_MAX_LENGTH}</p>
        <div className="rental-detail-assistant__actions">
          <button type="button" className="btn btn-primary" disabled={!canMessage || !normalizeRentalOwnerDraft(draft)} onClick={() => {
            const reviewedDraft = normalizeRentalOwnerDraft(draft)
            if (canMessage && reviewedDraft) onPrepareMessage(reviewedDraft)
          }}>Mở tin nhắn với bản nháp</button>
          <button type="button" className="btn btn-ghost" onClick={() => setDraft(null)}>Đóng bản nháp</button>
        </div>
        {!canMessage ? <p className="rental-detail-assistant__source">Tài khoản hiện tại chưa thể nhắn tin cho người đăng này.</p> : null}
      </div>}
  </section>
}
