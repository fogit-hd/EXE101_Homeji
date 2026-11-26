import { memo } from 'react'
import { type RentalPostSummary } from '../api/types'
import { formatCompactRent, formatListingArea } from '../lib/labels'
import './MapListingCard.css'
import { shortListingAddress } from "./MapListingCard.logic"
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
  const title = post.title || 'Tin đăng'
  const address = shortListingAddress((post.address || '').trim())
  const isPremium = post.isOwnerPremium === true

  const card = (
    <article
      className={[
        'map-listing-card',
        isPremium ? 'premium-listing' : '',
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
      aria-label={`${title}, ${formatCompactRent(post.price)}${Number.isFinite(post.price) && post.price > 0 ? '/tháng' : ''}`}
    >
      <div className="map-listing-card-image">
        {post.thumbnailPath ? (
          <img width={128} height={128} src={post.thumbnailPath} alt="" loading="lazy" decoding="async" />
        ) : (
          <div className="map-listing-card-placeholder" aria-hidden>
            —
          </div>
        )}
        {onToggleSave ? (
          <button
            type="button"
            className={`map-listing-card-save${isSaved ? ' is-saved' : ''}`}
            aria-label={isSaved ? 'Bỏ lưu' : 'Lưu phòng'} title={isSaved ? 'Bỏ lưu' : 'Lưu phòng'}
            aria-pressed={Boolean(isSaved)}
            onKeyDown={(event) => event.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              onToggleSave(post.id)
            }}
          >
            <HeartIcon size={20} filled={isSaved} />
          </button>
        ) : null}
        {post.isOwnerPremium === true ? <PremiumBadge variant="glass" /> : null}
      </div>
      <div className="map-listing-card-body">
        <p className="map-listing-card-price">{formatCompactRent(post.price)}{post.price > 0 && Number.isFinite(post.price) ? '/tháng' : ''}</p>
        <h3>{title}</h3>
        <p className="map-listing-address">{[Number.isFinite(post.area) && post.area > 0 ? formatListingArea(post.area) : '', address].filter(Boolean).join(' · ')}</p>
      </div>
    </article>
  )


  return card
})
