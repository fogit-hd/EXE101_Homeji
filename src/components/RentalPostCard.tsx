import { Link } from 'react-router-dom'
import { BorderBeam } from 'border-beam'
import type { RentalPostSummary } from '../api/types'
import { formatCompactRent, formatListingArea, rentalPostTypeLabel } from '../lib/labels'
import { mapPostUrl } from '../lib/mapDeepLinks'
import './RentalPostCard.css'
import { RentalConsiderationToggle } from './ai/RentalConsiderationToggle'
import { PremiumBadge } from './PremiumBadge'

type Props = {
  post: RentalPostSummary
  showSave?: boolean
  onSave?: () => void
  onUnsave?: () => void
  isSaved?: boolean
  saveBusy?: boolean
}

export function RentalPostCard({ post, showSave, onSave, onUnsave, isSaved, saveBusy = false }: Props) {
  const isPremium = post.isOwnerPremium === true
  const card = (
    <article className={`post-card card${isPremium ? ' premium-listing' : ''}`}>
      <Link to={mapPostUrl(post.id)} className="post-card-link">
        <div className="post-card-image">
          {post.thumbnailPath ? (
            <img src={post.thumbnailPath} alt={post.title} loading="lazy" />
          ) : (
            <div className="post-card-placeholder">Chưa có ảnh</div>
          )}
          <span className="badge badge-green post-card-type">
            {rentalPostTypeLabel[post.type]}
          </span>
          {isPremium && <PremiumBadge variant="glass" />}
        </div>
        <div className="post-card-body">
          <h3>{post.title || 'Tin đăng mới'}</h3>
          <p className="post-card-price">{formatCompactRent(post.price)}{Number.isFinite(post.price) && post.price > 0 ? '/tháng' : ''}</p>
          <p className="post-card-meta">
            {formatListingArea(post.area)} · {post.address || 'Chưa có địa chỉ'}
          </p>
          <p className="post-card-stats">
            {post.viewCount} lượt xem · {post.saveCount} lượt lưu
          </p>
        </div>
      </Link>
      <a className="post-card-public-link" href={`/rentals/${encodeURIComponent(post.id)}`}>Thông tin công khai</a>
      <RentalConsiderationToggle post={post} />
      {showSave && (
        <div className="post-card-actions">
          {isSaved ? (
            <button type="button" className="btn btn-secondary btn-sm" disabled={saveBusy} onClick={onUnsave}>
              Bỏ lưu
            </button>
          ) : (
            <button type="button" className="btn btn-primary btn-sm" disabled={saveBusy} onClick={onSave}>
              Lưu tin
            </button>
          )}
        </div>
      )}
    </article>
  )

  if (isPremium) {
    return (
      <BorderBeam colorVariant="gold" size="md" active theme="auto" borderRadius={12}>
        {card}
      </BorderBeam>
    )
  }

  return card
}
