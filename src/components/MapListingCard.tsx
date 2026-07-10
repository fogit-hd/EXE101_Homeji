import { Link } from 'react-router-dom'
import type { RentalPostSummary } from '../api/types'
import { formatPrice, rentalPostTypeLabel } from '../lib/labels'
import './MapListingCard.css'

type Props = {
  post: RentalPostSummary
  active?: boolean
  staggerIndex?: number
  onHover?: () => void
  onLeave?: () => void
  onSelect?: () => void
}

export function MapListingCard({
  post,
  active,
  staggerIndex = 0,
  onHover,
  onLeave,
  onSelect,
}: Props) {
  return (
    <article
      className={`map-listing-card ${active ? 'active' : ''}`}
      style={{ ['--stagger' as string]: staggerIndex }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={() => onSelect?.()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect?.()
        }
      }}
      role="button"
      tabIndex={0}
      aria-pressed={active}
    >
      <div className="map-listing-card-image">
        {post.thumbnailPath ? (
          <img src={post.thumbnailPath} alt={post.title} />
        ) : (
          <div className="map-listing-card-placeholder">Chưa có ảnh</div>
        )}
        <span className="map-listing-card-price">{formatPrice(post.price)}/th</span>
      </div>
      <div className="map-listing-card-body">
        <div className="map-listing-card-tags">
          <span className="map-listing-tag">{rentalPostTypeLabel[post.type]}</span>
          <span>{post.area} m²</span>
        </div>
        <h3>{post.title || 'Tin đăng mới'}</h3>
        <p className="map-listing-address">{post.address || 'Chưa có địa chỉ'}</p>
        <Link
          to={`/posts/${post.id}`}
          className="map-listing-link"
          onClick={(e) => e.stopPropagation()}
        >
          Xem chi tiết →
        </Link>
      </div>
    </article>
  )
}
