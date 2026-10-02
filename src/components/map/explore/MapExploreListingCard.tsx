import { memo } from 'react'
import type { RentalPostSummary } from '../../../api/types'
import { shortListingTitle } from '../../MapListingCard'
import bookmarkCheckUrl from '../../../assets/figma-map/icons/bookmark-check.svg'
import bookmarkOutlineUrl from '../../../assets/figma-map/icons/bookmark-outline.svg'
import {
  districtFromAddress,
  formatMillionPriceLabel,
  listingMetaLine,
} from './mapExploreFormat'
import './MapExploreListingCard.css'

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
  const title = shortListingTitle(post.title || 'Tin đăng', 64)
  const district = districtFromAddress(post.address || '')
  const meta = listingMetaLine({
    area: post.area,
    highlightTag: post.highlightTag,
  })

  return (
    <article
      className={[
        'map-explore-card',
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
      aria-label={`${title}, ${formatMillionPriceLabel(post.price)}/tháng`}
    >
      <div className="map-explore-card__row">
        <div className="map-explore-card__thumb">
          {post.thumbnailPath ? (
            <img src={post.thumbnailPath} alt="" loading="lazy" decoding="async" />
          ) : (
            <div className="map-explore-card__thumb-empty" aria-hidden />
          )}
        </div>
        <div className="map-explore-card__info">
          <div className="map-explore-card__price-row">
            <p className="map-explore-card__price">{formatMillionPriceLabel(post.price)}</p>
            {onToggleSave ? (
              <button
                type="button"
                className="map-explore-card__save"
                aria-label={saved ? 'Bỏ lưu' : 'Lưu tin'}
                aria-pressed={saved}
                disabled={saveBusy}
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleSave()
                }}
              >
                <img
                  src={saved ? bookmarkCheckUrl : bookmarkOutlineUrl}
                  alt=""
                  width={15}
                  height={15}
                />
              </button>
            ) : null}
          </div>
          <p className="map-explore-card__title">{title}</p>
          {district ? <p className="map-explore-card__district">{district}</p> : null}
        </div>
      </div>
      {meta ? <p className="map-explore-card__meta">{meta}</p> : null}
    </article>
  )
})
