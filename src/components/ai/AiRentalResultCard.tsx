import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { RentalPostType, type AiHighlightedRentalPost } from '../../api/types'
import { amenityLabel, formatListingArea, formatListingRent, rentalPostTypeLabel } from '../../lib/labels'
import { RentalConsiderationToggle } from './RentalConsiderationToggle'
import { rentalPriceBasis, rentalPriceLabel } from './rentalPriceBasis'
import './AiRentalResultCard.css'
import { PremiumBadge } from '../PremiumBadge'

export function AiRentalResultCard({ item, index, onOpen, onRefine, requiredAmenities = [], children }: {
  item: AiHighlightedRentalPost; index: number; onOpen?: () => void
  onRefine?: (message: string) => void; requiredAmenities?: string[]; children?: ReactNode
}) {
  const { post } = item
  const target = `/?section=listings&post=${encodeURIComponent(post.id)}`
  const evidence = item.reasonEvidence?.filter(reason => reason.postId === post.id && reason.sourceType === 'listing') ?? []
  const amenities = [...new Set(evidence.filter(reason => reason.field === 'amenities').map(reason => reason.value))]
  const updated = item.updatedAt && Number.isFinite(Date.parse(item.updatedAt)) ? new Date(item.updatedAt) : null
  return <article className={`ai-rental-result${post.isOwnerPremium === true ? ' premium-listing' : ''}`} aria-label={`Lựa chọn ${index + 1}: ${post.title}`} data-glass-exclude>
    {post.isOwnerPremium === true && <PremiumBadge />}
    <header className="ai-rental-result__heading">
      <span className="ai-rental-result__number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
      <div><span className="ai-rental-result__type">{rentalPostTypeLabel[post.type] || 'Tin phòng'}</span>
        <h3><Link to={target} onClick={onOpen}>{post.title || 'Tin phòng chưa có tiêu đề'}</Link></h3>
      </div>
      {post.thumbnailPath ? <Link className="ai-rental-result__image" to={target} onClick={onOpen} tabIndex={-1} aria-hidden="true"><img src={post.thumbnailPath} alt="" loading="lazy" /></Link> : null}
    </header>
    <dl className="ai-rental-result__facts">
      <div><dt>{rentalPriceLabel(rentalPriceBasis(post))}</dt><dd>{formatListingRent(post.price)}</dd></div>
      <div><dt>Diện tích</dt><dd>{formatListingArea(post.area)}</dd></div>
    </dl>
    <p className="ai-rental-result__location"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2.5" /></svg><span>{post.address || 'Chưa có địa chỉ'}</span></p>
    {amenities.length ? <ul className="ai-rental-result__amenities" aria-label="Tiện ích theo tin đăng">{amenities.slice(0, 3).map(value => <li key={value}>{amenityLabel(value)}</li>)}{amenities.length > 3 ? <li>+{amenities.length - 3} tiện ích</li> : null}</ul> : null}
    {post.type === RentalPostType.RoomTransfer ? <p className="ai-rental-result__notice">Vị trí gần đúng của tin pass phòng. Cần hỏi lại đường đi từ cửa phòng.</p> : null}
    {post.isOwnerPremium ? <p className="ai-rental-result__notice">Người đăng dùng gói Premium. Kết quả AI vẫn được xếp theo tiêu chí tìm phòng của bạn; nhãn này không đánh giá mức phù hợp.</p> : null}
    <div className="ai-rental-result__actions">
      <Link className="ai-rental-result__open" to={target} onClick={onOpen}>Xem phòng <span aria-hidden="true">↗</span></Link>
      <RentalConsiderationToggle post={post} compact />
    </div>
    <p className="ai-rental-result__source">Theo tin chủ đăng · chưa xác nhận phòng trống và phí phát sinh.</p>
    <details className="ai-rental-result__evidence">
      <summary>Xem nguồn & lưu ý</summary>
      <div>
        {updated ? <p>Tin cập nhật: <time dateTime={updated.toISOString()}>{updated.toLocaleDateString('vi-VN')}</time></p> : <p>Tin chưa có ngày cập nhật hợp lệ.</p>}
        {evidence.length ? <ul>{evidence.map((reason, reasonIndex) => <li key={`${reason.field}-${reason.value}-${reasonIndex}`}>
          {reason.field === 'amenities' ? `Có ${amenityLabel(reason.value)} theo tin chủ đăng.` : reason.text}
          {reason.field === 'amenities' && onRefine && requiredAmenities.includes(reason.value) ? <button type="button" onClick={() => onRefine(`Ưu tiên ${amenityLabel(reason.value)}`)}>Đổi thành mong muốn</button> : null}
        </li>)}</ul> : !item.reasonEvidence?.length && item.reasons.length ? <ul>{item.reasons.map((reason, reasonIndex) => <li key={reasonIndex}>{reason}</li>)}</ul> : <p>Chưa có tiêu chí đối chiếu riêng cho tin này.</p>}
        <p>Giá, diện tích và tiện ích lấy từ tin đăng; cần hỏi người đăng để xác nhận.</p>
      </div>
    </details>
    {children ? <div className="ai-rental-result__cost">{children}</div> : null}
  </article>
}
