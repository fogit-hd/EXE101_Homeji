import { formatListingArea, formatListingRent } from '../../../lib/labels'
import { listingThumbSrcSet } from '../../../lib/cloudinaryImage'
import { ExploreSaveButton } from './ExploreSaveButton'
import { formatDistanceVi, type NearbyListingItem } from './nearbyListings'

type Props = {
  item: NearbyListingItem
  number: number
  selected: boolean
  hot: boolean
  saved: boolean
  onSavedChange: (postId: string, saved: boolean) => void
  onHover: (id: string | null) => void
  onSelect: (item: NearbyListingItem) => void
}

/** One numbered note in the room-hunting notebook. The number matches its map pin. */
export function ExploreListingCard({
  item,
  number,
  selected,
  hot,
  saved,
  onSavedChange,
  onHover,
  onSelect,
}: Props) {
  const thumb = item.thumbnailUrl

  return (
    <article
      className={`explore-card${selected ? ' is-selected' : ''}${hot ? ' is-hot' : ''}`}
      data-listing-id={item.id}
      onMouseEnter={() => onHover(item.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(item.id)}
      onBlur={() => onHover(null)}
    >
      <button
        type="button"
        className="explore-card__open"
        onClick={() => onSelect(item)}
        aria-label={`Phòng số ${number}: ${item.title}`}
      >
        <span className="explore-card__num" aria-hidden="true">{number}</span>
        <span className="explore-card__photo">
          {thumb ? (
            <img
              src={thumb}
              srcSet={listingThumbSrcSet(thumb)}
              sizes="(max-width: 1023px) 42vw, 128px"
              alt=""
              loading="lazy"
              decoding="async"
              onError={event => { event.currentTarget.hidden = true }}
            />
          ) : (
            <span className="explore-card__photo-empty">Chưa có ảnh</span>
          )}
        </span>
        <span className="explore-card__body">
          <span className="explore-card__price">
            {formatListingRent(item.price)}
            <small> / tháng</small>
          </span>
          <span className="explore-card__title">{item.title}</span>
          <span className="explore-card__meta">
            {formatListingArea(item.area)}
            <span aria-hidden="true"> · </span>
            {formatDistanceVi(item.distanceKm)}
          </span>
          {item.isOwnerVerified ? (
            <span className="explore-card__verified">
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                <path d="M3 8.5 6.5 12 13 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Chủ nhà đã xác minh
            </span>
          ) : null}
        </span>
      </button>
      {item.kind === 'homeji' ? (
        <ExploreSaveButton
          postId={item.id}
          title={item.title}
          saved={saved}
          onSavedChange={onSavedChange}
        />
      ) : null}
    </article>
  )
}
