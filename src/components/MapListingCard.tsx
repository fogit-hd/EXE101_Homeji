import { memo } from 'react'
import { type RentalPostSummary } from '../api/types'
import { formatCompactRent, formatListingArea, formatPrice, rentalPostTypeLabel } from '../lib/labels'
import './MapListingCard.css'
import { shortListingAddress, shortListingTitle } from "./MapListingCard.logic"
import { PremiumBadge } from './PremiumBadge'
import { HeartIcon } from './icons/SvgIcons'

type Props = {
  post: RentalPostSummary
  active?: boolean
  highlighted?: boolean
  staggerIndex?: number
  isSaved?: boolean
  onToggleSave?: (id: string) => void
  onHover?: () => void
  onLeave?: () => void
  onSelect?: () => void
}

export const MapListingCard = memo(function MapListingCard({
  post,
  active,
  highlighted,
  staggerIndex = 0,
  isSaved,
  onToggleSave,
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
        post.isOwnerPremium === true ? 'premium-listing' : '',
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
        {onToggleSave ? (
          <button
            type="button"
            className={`map-listing-card-save${isSaved ? ' is-saved' : ''}`}
            aria-label={isSaved ? 'Bỏ lưu tin' : 'Lưu tin phòng'}
            onClick={(e) => {
              e.stopPropagation()
              onToggleSave(post.id)
            }}
          >
            <HeartIcon size={16} filled={isSaved} />
          </button>
        ) : null}
        {post.isOwnerPremium === true ? <PremiumBadge /> : null}
        <span className="map-listing-card-price">{formatCompactRent(post.price)}/tháng</span>
      </div>
      <div className="map-listing-card-body">
        <div className="map-listing-card-meta">
          <span className="map-listing-card-type">{rentalPostTypeLabel[post.type]}</span>
          {post.area > 0 && <span className="map-listing-card-area"> · {formatListingArea(post.area)}</span>}
        </div>
        <h3>{title}</h3>
        <p className="map-listing-address">{address}</p>
      </div>
    </article>
  )
})
