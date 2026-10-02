import { memo } from 'react'
import type { RentalPostSummary } from '../../../api/types'
import { shortListingAddress, shortListingTitle } from '../../MapListingCard'
import {
  formatMillionPriceLabel,
  listingMetaLine,
} from './mapExploreFormat'
import './MapExplorePinPreview.css'

type Props = {
  post: RentalPostSummary
  onOpen?: () => void
  onClose?: () => void
}

export const MapExplorePinPreview = memo(function MapExplorePinPreview({
  post,
  onOpen,
  onClose,
}: Props) {
  const title = shortListingTitle(post.title || 'Tin đăng', 42)
  const address = shortListingAddress(post.address || '')
  const meta = listingMetaLine({ area: post.area })
  const addressLine = [address, meta].filter(Boolean).join(' · ')

  return (
    <div className="map-explore-preview" role="dialog" aria-label="Chi tiết ghim">
      <button
        type="button"
        className="map-explore-preview__hit"
        onClick={onOpen}
        aria-label={`Xem ${title}`}
      >
        <div className="map-explore-preview__thumb">
          {post.thumbnailPath ? (
            <img src={post.thumbnailPath} alt="" loading="lazy" decoding="async" />
          ) : (
            <div className="map-explore-preview__thumb-empty" aria-hidden />
          )}
        </div>
        <div className="map-explore-preview__info">
          {post.highlightTag ? (
            <span className="map-explore-preview__tag">{post.highlightTag}</span>
          ) : null}
          <p className="map-explore-preview__price">
            {formatMillionPriceLabel(post.price)}/tháng
          </p>
          <p className="map-explore-preview__title">{title}</p>
          {addressLine ? (
            <p className="map-explore-preview__addr">{addressLine}</p>
          ) : null}
        </div>
      </button>
      {onClose ? (
        <button
          type="button"
          className="map-explore-preview__close"
          onClick={onClose}
          aria-label="Đóng xem trước"
        >
          ×
        </button>
      ) : null}
    </div>
  )
})
