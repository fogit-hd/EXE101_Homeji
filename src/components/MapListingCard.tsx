import { memo } from 'react'
import type { RentalPostSummary } from '../api/types'
import { formatPrice, rentalPostTypeLabel } from '../lib/labels'
import './MapListingCard.css'

type Props = {
  post: RentalPostSummary
  active?: boolean
  highlighted?: boolean
  staggerIndex?: number
  onHover?: () => void
  onLeave?: () => void
  onSelect?: () => void
}

/** Keep the lead phrase before marketing fluff (dash / pipe). */
export function shortListingTitle(title: string, max = 36) {
  const lead = title.split(/\s*[-–—|·]\s*/)[0]?.trim() || title.trim()
  if (lead.length <= max) return lead
  return `${lead.slice(0, max - 1).trimEnd()}…`
}

/** Street + ward only — drop city / province tails. */
export function shortListingAddress(address: string) {
  const parts = address
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length <= 2) return address
  return parts.slice(0, 2).join(', ')
}

export const MapListingCard = memo(function MapListingCard({
  post,
  active,
  highlighted,
  staggerIndex = 0,
  onHover,
  onLeave,
  onSelect,
}: Props) {
  const title = shortListingTitle(post.title || 'Tin đăng')
  const address = shortListingAddress(post.address || 'Chưa có địa chỉ')

  return (
    <article
      className={[
        'map-listing-card',
        active ? 'is-active' : '',
        highlighted ? 'is-highlighted' : '',
      ]
        .filter(Boolean)
        .join(' ')}
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
      aria-label={`${title}, ${formatPrice(post.price)}/tháng`}
    >
      <div className="map-listing-card-image">
        {post.thumbnailPath ? (
          <img src={post.thumbnailPath} alt="" loading="lazy" decoding="async" />
        ) : (
          <div className="map-listing-card-placeholder">Chưa có ảnh</div>
        )}
        {post.isOwnerPremium ? (
          <span className="map-listing-card-corner-tag is-premium">Premium</span>
        ) : post.ownerBadge ? (
          <span className="map-listing-card-corner-tag is-badge">{post.ownerBadge}</span>
        ) : null}
        <span className="map-listing-card-price">{formatPrice(post.price)}/th</span>
      </div>
      <div className="map-listing-card-body">
        <div className="map-listing-card-tags">
          <span className="map-listing-tag">{rentalPostTypeLabel[post.type]}</span>
          <span>{post.area} m²</span>
          {post.highlightTag ? (
            <span className="map-listing-tag is-highlight">{post.highlightTag}</span>
          ) : null}
        </div>
        <h3>{title}</h3>
        <p className="map-listing-address">{address}</p>
      </div>
    </article>
  )
})
