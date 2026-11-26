import { memo } from 'react'
import type { RentalPostSummary } from '../../../api/types'
import { shortListingAddress } from '../../MapListingCard.logic'
import { formatCompactRent, formatListingArea } from '../../../lib/labels'
import { HeartIcon } from '../../icons/SvgIcons'
import './MapExploreListingCard.css'
import { PremiumBadge } from '../../PremiumBadge'

type Props = {
  post: RentalPostSummary
  active?: boolean
  highlighted?: boolean
  saved?: boolean
  onHover?: () => void
  onLeave?: () => void
  onSelect?: () => void
  onToggleSave?: () => void
  saveBusy?: boolean
}

export const MapExploreListingCard = memo(function MapExploreListingCard({
  post,
  active,
  highlighted,
  saved,
  onHover,
  onLeave,
  onSelect,
  onToggleSave,
  saveBusy,
}: Props) {
  const title = post.title || 'Tin đăng'
  const meta = [Number.isFinite(post.area) && post.area > 0 ? formatListingArea(post.area) : '', shortListingAddress((post.address || '').trim())].filter(Boolean).join(' · ')

  return (
    <article
      className={[
        'map-explore-card',
        post.isOwnerPremium === true ? 'premium-listing' : '',
        active ? 'is-active' : '',
        highlighted ? 'is-highlighted' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-post-id={post.id}
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
      <div className="map-explore-card__row">
        <div className="map-explore-card__thumb">
          {post.thumbnailPath ? (
            <img width={128} height={128} src={post.thumbnailPath} alt="" loading="lazy" decoding="async" />
          ) : (
            <div className="map-explore-card__thumb-empty" aria-hidden />
          )}
          {post.isOwnerPremium === true && <PremiumBadge variant="glass" />}
          {onToggleSave ? (
            <button
              type="button"
              className="map-explore-card__save"
              aria-label={saved ? 'Bỏ lưu' : 'Lưu phòng'} title={saved ? 'Bỏ lưu' : 'Lưu phòng'}
              aria-pressed={Boolean(saved)}
              onKeyDown={(event) => event.stopPropagation()}
              disabled={saveBusy}
              onClick={(e) => {
                e.stopPropagation()
                onToggleSave()
              }}
            >
              <HeartIcon size={20} filled={saved} />
            </button>
          ) : null}
        </div>
        <div className="map-explore-card__info">
          <p className="map-explore-card__price">{formatCompactRent(post.price)}{Number.isFinite(post.price) && post.price > 0 ? '/tháng' : ''}</p>
          <p className="map-explore-card__title">{title}</p>
          {meta ? <p className="map-explore-card__meta">{meta}</p> : null}
        </div>
      </div>
    </article>
  )
})
