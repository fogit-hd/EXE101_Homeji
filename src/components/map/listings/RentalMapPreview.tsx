import { ArrowUpRight, Eye, X } from 'lucide-react'
import { formatCompactRent } from '../../../lib/labels'
import type { mapBackendListingToListingViewModel } from './listingAdapters'
import './MapListingsWorkspace.css'
import './RentalViewing.css'

export function BookmarkIcon({ saved = false }: { saved?: boolean }) { return <svg width="20" height="20" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4Z" /></svg> }

export function RentalMapPreview({onClose, onOpenNearby, view, monthly, saved, saveBusy, onToggleSave, onOpen, notice}: {
  onClose?: () => void; onOpenNearby?: () => void
  view: ReturnType<typeof mapBackendListingToListingViewModel>; monthly: boolean
  saved?: boolean; saveBusy?: boolean; onToggleSave?: () => void; onOpen: () => void
  considerationPost?: {id: string; title: string}; compact?: boolean; notice?: string
}) {
  const price = monthly && typeof view.price === 'number' && view.price > 0 ? `${formatCompactRent(view.price)}/tháng` : view.priceLabel
  return <article className="map-listings__preview rental-viewing" aria-label={monthly ? 'Phòng đang xem' : 'Tin đang xem'}>
    <header className="rental-viewing__head">
      <span className="rental-viewing__status"><Eye size={15} aria-hidden="true" />Đang xem</span>
      <div className="rental-viewing__tools">
        {onToggleSave ? <button type="button" aria-label={saved ? 'Bỏ lưu' : 'Lưu phòng'} aria-pressed={Boolean(saved)} disabled={saveBusy} onClick={onToggleSave}><BookmarkIcon saved={saved} /></button> : null}
        {onClose ? <button type="button" aria-label="Đóng phòng đang xem" onClick={onClose}><X size={18} aria-hidden="true" /></button> : null}
      </div>
    </header>
    <div className="rental-viewing__row">
      {view.thumbnailUrl ? <img className="rental-viewing__photo" src={view.thumbnailUrl} width={48} height={48} alt="" decoding="async" /> : null}
      <button type="button" className="rental-viewing__summary" onClick={onOpen} title={view.title}><strong>{price}</strong><span>{view.title}</span></button>
      <button type="button" className="rental-viewing__open" onClick={onOpen}>Chi tiết<ArrowUpRight size={14} aria-hidden="true" /></button>
    </div>
    {onOpenNearby ? <button type="button" className="rental-viewing__nearby" onClick={onOpenNearby}>Tiện ích quanh đây</button> : null}
    {notice ? <p className="rental-viewing__notice" role="alert">{notice}</p> : null}
  </article>
}
