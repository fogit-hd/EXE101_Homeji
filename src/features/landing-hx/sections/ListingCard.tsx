import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BorderBeam } from 'border-beam'
import { BadgeCheck, DoorOpen, Heart, MapPin, Ruler, Sparkles, Users } from 'lucide-react'
import type { Listing, ListingTag } from '../../../lib/mock/homeji'
import { listingThumbSrcSet } from '../../../lib/cloudinaryImage'
import { Badge, Card, IconButton, type BadgeTone } from '../ui/primitives'
import { formatPrice, initials, listingCardId } from './format'
import { PremiumBadge } from '../../../components/PremiumBadge'

const TAG: Record<ListingTag, { label: string; tone: BadgeTone; icon: ReactNode }> = {
  verified: { label: 'Đã xác minh', tone: 'verified', icon: <BadgeCheck aria-hidden="true" /> },
  available: { label: 'Còn phòng', tone: 'available', icon: <DoorOpen aria-hidden="true" /> },
  roommate: { label: 'Cần người ở ghép', tone: 'roommate', icon: <Users aria-hidden="true" /> },
  new: { label: 'Mới đăng', tone: 'new', icon: <Sparkles aria-hidden="true" /> },
}

const FALLBACK_CARD_IMAGE = '/landing/listings/balcony-640.webp'

export function ListingCard({ listing, highlighted = false }: { listing: Listing; highlighted?: boolean }) {
  const [saved, setSaved] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const { image } = listing
  const srcSet = image.srcSmall !== image.src
    ? `${image.srcSmall} ${image.width / 2}w, ${image.src} ${image.width}w`
    : listingThumbSrcSet(image.src)

  const card = (
    <Card
      as="article"
      interactive
      id={listingCardId(listing.id)}
      // Focus target when the hero sends the reader here; not in the Tab order.
      tabIndex={-1}
      className={`hx-listing${highlighted ? ' is-highlighted' : ''}`}
      aria-labelledby={`hx-listing-${listing.id}`}
    >
      <div className={`hx-listing__media${loaded ? ' is-loaded' : ''}`}>
        <img
          // A cached image can finish before React attaches onLoad; the ref catches that case
          // so the photo never stays stuck at opacity 0.
          ref={node => { if (node?.complete && node.naturalWidth > 0) setLoaded(true) }}
          src={image.srcSmall}
          srcSet={srcSet}
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          alt={image.alt}
          width={image.width}
          height={image.height}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={event => {
            if (!event.currentTarget.src.endsWith(FALLBACK_CARD_IMAGE)) {
              event.currentTarget.removeAttribute('srcset')
              event.currentTarget.src = FALLBACK_CARD_IMAGE
            }
            setLoaded(true)
          }}
        />
        <div className="hx-listing__tags">
          {highlighted ? (
            <PremiumBadge variant="glass" showStars={false} />
          ) : null}
          {listing.tags.map(tag => (
            <Badge key={tag} tone={TAG[tag].tone} icon={TAG[tag].icon}>{TAG[tag].label}</Badge>
          ))}
        </div>
        <IconButton
          className={`hx-listing__save${saved ? ' is-saved' : ''}`}
          variant="solid"
          size="sm"
          label={saved ? `Bỏ lưu: ${listing.title}` : `Lưu tin: ${listing.title}`}
          aria-pressed={saved}
          icon={<Heart aria-hidden="true" />}
          onClick={() => setSaved(value => !value)}
        />
      </div>
      <div className="hx-listing__body">
        <p className="hx-listing__price">
          {listing.price > 0 ? (
            <>
              <strong>{formatPrice(listing.price)}</strong>
              <span>/tháng</span>
            </>
          ) : (
            <strong>Thỏa thuận</strong>
          )}
        </p>
        <h3 id={`hx-listing-${listing.id}`} className="hx-listing__title">
          <Link to={listing.href ?? '/login'} className="hx-listing__link">
            {listing.title}
          </Link>
        </h3>
        <ul className="hx-listing__facts">
          {listing.area > 0 ? <li><Ruler aria-hidden="true" /> {listing.area} m²</li> : null}
          <li><MapPin aria-hidden="true" /> <span className="hx-listing__address">{listing.address}, {listing.district}</span></li>
        </ul>
        <div className="hx-listing__owner">
          <span className="hx-listing__avatar" aria-hidden="true">{initials(listing.owner.name)}</span>
          <span className="hx-listing__owner-name">{listing.owner.name}</span>
          <span className="hx-listing__owner-role">{listing.owner.role}</span>
        </div>
      </div>
    </Card>
  )

  if (highlighted) {
    return (
      <BorderBeam colorVariant="gold" size="md" active={highlighted} theme="auto" borderRadius={24}>
        {card}
      </BorderBeam>
    )
  }

  return card
}
