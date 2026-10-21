import { memo } from 'react'
import { type RentalPostSummary } from '../api/types'
import { formatPrice, rentalPostTypeLabel } from '../lib/labels'
import './MapListingCard.css'
import { shortListingAddress, shortListingTitle } from "./MapListingCard.logic"

type Props = {
  post: RentalPostSummary
  active?: boolean
  highlighted?: boolean
  staggerIndex?: number
  onHover?: () => void
  onLeave?: () => void
  onSelect?: () => void
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
          <div className="map-listing-card-placeholder" aria-hidden>
            —
          </div>
        )}
        {post.isOwnerPremium ? <span className="map-listing-card-corner-tag is-premium">Nổi bật</span> : null}
        <span className="map-listing-card-price">{formatPrice(post.price)}/tháng</span>
      </div>
      <div className="map-listing-card-body">
        <div className="map-listing-card-meta">
          <span className="map-listing-card-type">{rentalPostTypeLabel[post.type]}</span>
        </div>
        <h3>{title}</h3>
        <p className="map-listing-address">{address}</p>
      </div>
    </article>
  )
})
