import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { listingThumbSrcSet } from '../../lib/cloudinaryImage'
import './mobile-room-card.css'

type Props = {
  id: string
  photo?: string | null
  price: ReactNode
  title: string
  meta?: string
  /** Small label over the photo (Premium, Nổi bật…). */
  badge?: ReactNode
  /** Corner control on the price row, e.g. the save heart. */
  corner?: ReactNode
  /** Secondary actions under the facts (Cân nhắc, Xem trên bản đồ). */
  actions?: ReactNode
  selected?: boolean
  /** Set when tapping selects the room on the map rather than opening it. */
  pressed?: boolean
  /** Opens the room: a route, or a handler for in-page detail. */
  to?: string
  onOpen?: () => void
  referrerPolicy?: 'no-referrer'
  cloudinary?: boolean
}

/**
 * Phone room card: a 104px square photo beside price, title and one meta line. About a third of
 * the desktop card's height, so a phone shows four to five rooms per screen instead of one.
 * The title is the one link/button; a stretched hit area makes the whole card open the room.
 */
export function MobileRoomCard({ id, photo, price, title, meta, badge, corner, actions, selected = false, pressed, to, onOpen, referrerPolicy, cloudinary = true }: Props) {
  const label = <span className="m-room__title-text">{title}</span>
  return (
    <article data-listing-id={id} className={`m-room${selected ? ' is-selected' : ''}`}>
      <div className="m-room__media" aria-hidden="true">
        <span className="m-room__noimg">Chưa có ảnh</span>
        {photo ? (
          <img
            src={photo}
            srcSet={cloudinary ? listingThumbSrcSet(photo) : undefined}
            sizes="104px"
            width={104}
            height={104}
            loading="lazy"
            decoding="async"
            alt=""
            referrerPolicy={referrerPolicy}
            onError={(event) => { event.currentTarget.hidden = true }}
          />
        ) : null}
      </div>
      {/* Outside the hidden photo box so screen readers still hear it. */}
      {badge ? <span className="m-room__badge">{badge}</span> : null}
      <div className="m-room__body">
        <div className="m-room__top">
          <span className="m-room__price">{price}</span>
          {corner}
        </div>
        <h3 className="m-room__title">
          {to ? (
            <Link to={to} className="m-room__hit">{label}</Link>
          ) : (
            <button type="button" className="m-room__hit" aria-pressed={pressed} onClick={onOpen}>{label}</button>
          )}
        </h3>
        {meta ? <p className="m-room__meta">{meta}</p> : null}
        {actions ? <div className="m-room__actions">{actions}</div> : null}
      </div>
    </article>
  )
}
