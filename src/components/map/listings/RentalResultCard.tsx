import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, House, MapPin } from 'lucide-react'
import { ListingAmenities } from './ListingAmenities'
import './RentalResultCard.css'

type Props = {
  id: string; title: string; price: ReactNode; area?: string; propertyType: string; address: string
  photo?: string | null; photoSrcSet?: string; photoCount?: number; imported?: boolean
  amenities: string[]; selectedAmenities: string[]; deposit?: string; updated?: string | null; publisher?: string | null
  badge?: ReactNode; save?: ReactNode; secondaryAction?: ReactNode; featured?: boolean; selected?: boolean; hovered?: boolean
  href?: string; onSelect?: () => void; onDetail?: () => void; onHover?: () => void; onLeave?: () => void
}

/** Identical reading order and geometry for native and publicly sourced rental listings. */
export function RentalResultCard(props: Props) {
  const { id, title, price, area, propertyType, address, photo, photoSrcSet, photoCount, imported,
    amenities, selectedAmenities, deposit, updated, publisher, badge, save, secondaryAction,
    featured = false, selected, hovered, href, onSelect, onDetail, onHover, onLeave } = props
  const cardRef = useRef<HTMLElement>(null)
  const [revealed, setRevealed] = useState(false)
  useEffect(() => {
    const card = cardRef.current
    if (!featured || revealed || !card || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setRevealed(true)
        observer.disconnect()
      }
    }, { threshold: .15 })
    observer.observe(card)
    return () => observer.disconnect()
  }, [featured, revealed])
  const picture = <>
    <span className="rental-result-card__placeholder"><House size={28} aria-hidden="true" /><span>Chưa có ảnh</span></span>
    {photo ? <img src={photo} srcSet={photoSrcSet} sizes="(max-width: 767px) 100vw, 380px" width={640} height={360}
      alt="" loading="lazy" decoding="async" referrerPolicy={imported ? 'no-referrer' : undefined}
      onError={event => { event.currentTarget.hidden = true }} /> : null}
  </>
  return <article ref={cardRef} data-listing-id={id} className={`map-listings__card rental-result-card${imported ? ' source-results__card' : ''}${featured ? ' is-featured' : ''}${featured && revealed ? ' is-featured-revealed' : ''}${selected ? ' is-selected' : ''}${hovered ? ' is-hot' : ''}`}
    onMouseEnter={onHover} onMouseLeave={onLeave} onFocus={onHover} onBlur={onLeave}>
    <div className="rental-result-card__cover">
      {href && !onSelect ? <Link to={href} className="rental-result-card__media map-listings__card-photo" aria-label={`Xem phòng: ${title}`}>{picture}</Link>
        : <button type="button" className="rental-result-card__media map-listings__card-photo map-listings__card-hit" data-glass-exclude aria-label={`Xem phòng: ${title}`} aria-pressed={selected} onClick={onSelect}>{picture}</button>}
      {badge ? <div className="rental-result-card__badge">{badge}</div> : null}
      {save ? <div className="rental-result-card__save">{save}</div> : null}
      {photoCount && photoCount > 1 ? <span className="rental-result-card__photo-count">{photoCount} ảnh</span> : null}
    </div>
    <div className="rental-result-card__body">
      <div className="rental-result-card__price-row"><strong className="rental-result-card__price">{price}</strong></div>
      <h3 className="rental-result-card__title" title={title}>{href && !onSelect ? <Link to={href}>{title}</Link> : <button type="button" data-glass-exclude onClick={onSelect}>{title}</button>}</h3>
      <p className="rental-result-card__address" title={address}><MapPin size={14} aria-hidden="true" /><span>{address || 'Chưa có địa chỉ'}</span></p>
      <ListingAmenities values={amenities} selected={selectedAmenities} title={title} area={area} propertyType={propertyType} />
      <div className="rental-result-card__notes"><p title={deposit}>{deposit || 'Chưa rõ tiền cọc'}</p><p title={publisher || undefined}>{publisher ? `Liên hệ: ${publisher}` : 'Chưa có tên người liên hệ'}</p>{updated ? <span className="rental-result-card__updated">{updated}</span> : null}</div>
    </div>
    <footer className="rental-result-card__actions">
      <div className="rental-result-card__secondary">{secondaryAction}</div>
      {href ? <Link to={href} className="rental-result-card__detail" data-glass-exclude>Xem phòng<ArrowUpRight size={15} aria-hidden="true" /></Link>
        : <button type="button" className="rental-result-card__detail" data-glass-exclude onClick={onDetail ?? onSelect}>Xem phòng<ArrowUpRight size={15} aria-hidden="true" /></button>}
    </footer>
  </article>
}
