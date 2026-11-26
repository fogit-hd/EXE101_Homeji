import { X } from 'lucide-react'
import { HeartIcon } from '../../icons/SvgIcons'
import { formatCompactRent, formatMonthlyRent } from '../../../lib/labels'
import { ListingTrustBadges } from '../../ListingTrustBadges'
import { RentalConsiderationToggle } from '../../ai/RentalConsiderationToggle'
import { shortListingAddress } from '../../MapListingCard.logic'
import type { mapBackendListingToListingViewModel } from './listingAdapters'
import './MapListingsWorkspace.css'

export function BookmarkIcon({ saved = false }: { saved?: boolean }) { return <svg width="20" height="20" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4Z" /></svg> }

export function RentalMapPreview({
  onClose,
  onOpenNearby,
  view,
  monthly,
  saved,
  saveBusy,
  onToggleSave,
  onOpen,
  considerationPost,
  notice,
  compact = false,
}: {
  onClose?: () => void
  onOpenNearby?: () => void
  view: ReturnType<typeof mapBackendListingToListingViewModel>
  monthly: boolean
  saved?: boolean
  saveBusy?: boolean
  onToggleSave?: () => void
  onOpen: () => void
  considerationPost?: { id: string; title: string }
  compact?: boolean
  notice?: string
}) {
  if (compact) return <article className="map-listings__preview map-listings__preview--compact" aria-label="Phòng đang chọn">
    <button type="button" className="map-listings__compact-hit" onClick={onOpen}>
      {view.thumbnailUrl ? <img loading="lazy" decoding="async" width={640} height={400} src={view.thumbnailUrl} alt="" /> : null}
      <span><strong>{typeof view.price === 'number' && view.price > 0 ? `${formatCompactRent(view.price)}/tháng` : view.priceLabel}</strong><span>{view.title}</span></span>
    </button>
    <div className="map-listings__compact-tools">
      {onClose ? <button type="button" aria-label="Đóng phòng đang chọn" title="Đóng phòng đang chọn" onClick={onClose}><X aria-hidden="true" size={20} style={{ verticalAlign: 'middle' }} /></button> : null}
      {onToggleSave ? <button type="button" aria-label={saved ? 'Bỏ lưu' : 'Lưu phòng'} title={saved ? 'Bỏ lưu' : 'Lưu phòng'} aria-pressed={Boolean(saved)} disabled={saveBusy} onClick={onToggleSave}><HeartIcon size={20} filled={saved} /></button> : null}
    </div>
    {onOpenNearby ? <button type="button" className="map-listings__compact-nearby" onClick={onOpenNearby}>Tiện ích quanh đây</button> : null}
    {notice ? <p role="alert">{notice}</p> : null}
  </article>
  return (
    <article className={`map-listings__preview${view.isPremium ? ' premium-listing' : ''}`} aria-label="Phòng đang chọn">
      {onClose || view.isPremium || view.isOwnerVerified ? <div className="map-listings__preview-toolbar">
        <ListingTrustBadges premium={view.isPremium} verified={view.isOwnerVerified} />
        {onClose ? <button type="button" className="map-listings__preview-close" data-glass-exclude aria-label="Đóng phòng đang chọn" title="Đóng phòng đang chọn" onClick={onClose}><X aria-hidden="true" size={20} style={{ verticalAlign: 'middle' }} /></button> : null}
      </div> : null}
      <div className="map-listings__preview-top">
        <div className="map-listings__preview-photo">
          {view.thumbnailUrl ? <img loading="lazy" decoding="async" width={640} height={400} src={view.thumbnailUrl} alt="" /> : null}
        </div>
        <div>
          <div className="map-listings__preview-price">
            <strong>{monthly && typeof view.price === 'number' ? formatMonthlyRent(view.price) : view.priceLabel}</strong>
            {onToggleSave ? (
              <button
                type="button"
                data-glass-exclude aria-pressed={Boolean(saved)}
                aria-label={saved ? 'Bỏ lưu' : 'Lưu phòng'} title={saved ? 'Bỏ lưu' : 'Lưu phòng'}
                disabled={saveBusy}
                onClick={(event) => {
                  event.stopPropagation()
                  onToggleSave()
                }}
              >
                <BookmarkIcon saved={saved} />
              </button>
            ) : null}
          </div>
          <p>{view.title}</p>
          <p className="map-listings__preview-sub">
            {shortListingAddress(view.address)}
          </p>
        </div>
      </div>
      <div className="map-listings__preview-tags">
        {view.areaLabel ? <span>{view.areaLabel}</span> : null}
        {view.typeLabel ? <span>{view.typeLabel}</span> : null}
        {view.highlightTag ? <span>{view.highlightTag}</span> : null}
        {!view.isPremium && view.ownerBadge ? <span>{view.ownerBadge}</span> : null}
      </div>
      {considerationPost ? <RentalConsiderationToggle post={considerationPost} /> : null}
      {notice ? <p role="alert" className="map-listings__preview-notice">{notice}</p> : null}
      <button type="button" className="map-listings__preview-open" onClick={onOpen}>
        {monthly ? 'Xem phòng & liên hệ' : 'Xem chi tiết'}
        <img loading="lazy" decoding="async" src="/figma/map/arrow-right.svg" alt="" width={13} height={13} />
      </button>
      {onOpenNearby ? <button type="button" className="map-listings__nearby-open" data-glass-exclude onClick={onOpenNearby}>Tiện ích quanh phòng</button> : null}
    </article>
  )
}
