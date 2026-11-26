import { Link } from 'react-router-dom'
import type { RentalPostSummary } from '../api/types'
import { formatCompactRent, formatListingArea } from '../lib/labels'
import { mapPostUrl } from '../lib/mapDeepLinks'
import './RentalPostCard.css'
import { RentalConsiderationToggle } from './ai/RentalConsiderationToggle'
import { shortListingAddress } from './MapListingCard.logic'
import { HeartIcon } from './icons/SvgIcons'
import { PremiumBadge } from './PremiumBadge'
import { useIsMobile } from '../mobile/useIsMobile'
import { MobileRoomCard } from '../mobile/listings/MobileRoomCard'

type Props = {
  post: RentalPostSummary
  showSave?: boolean
  onSave?: () => void
  onUnsave?: () => void
  isSaved?: boolean
  saveBusy?: boolean
}

export function RentalPostCard({ post, showSave, onSave, onUnsave, isSaved, saveBusy = false }: Props) {
  const isPremium = post.isOwnerPremium === true
  const mobile = useIsMobile()
  if (mobile) return <MobileRoomCard id={post.id} photo={post.thumbnailPath} to={mapPostUrl(post.id)}
    price={<>{formatCompactRent(post.price)}{Number.isFinite(post.price) && post.price > 0 ? <small>/tháng</small> : null}</>}
    title={post.title || 'Tin đăng mới'}
    meta={[Number.isFinite(post.area) && post.area > 0 ? formatListingArea(post.area) : '', shortListingAddress((post.address || '').trim())].filter(Boolean).join(' · ')}
    badge={isPremium ? <PremiumBadge variant="glass" /> : undefined}
    corner={showSave ? <button type="button" className={`m-room__save${isSaved ? ' is-on' : ''}`} disabled={saveBusy}
      aria-pressed={Boolean(isSaved)} aria-label={isSaved ? 'Bỏ lưu' : 'Lưu phòng'} onClick={() => (isSaved ? onUnsave : onSave)?.()}>
      <HeartIcon size={20} filled={isSaved} /></button> : undefined}
    actions={<RentalConsiderationToggle compact post={post} />} />
  const card = (
    <article className={`post-card card${isPremium ? ' premium-listing' : ''}`}>
      <Link to={mapPostUrl(post.id)} className="post-card-link">
        <div className="post-card-image">
          {post.thumbnailPath ? (
            <img decoding="async" width={640} height={400} src={post.thumbnailPath} alt={post.title} loading="lazy" />
          ) : (
            <div className="post-card-placeholder">Chưa có ảnh</div>
          )}
          {isPremium && <PremiumBadge variant="glass" />}
        </div>
        <div className="post-card-body">
          <p className="post-card-price">{formatCompactRent(post.price)}{Number.isFinite(post.price) && post.price > 0 ? '/tháng' : ''}</p>
          <h3>{post.title || 'Tin đăng mới'}</h3>
          <p className="post-card-meta">
            {[Number.isFinite(post.area) && post.area > 0 ? formatListingArea(post.area) : '', shortListingAddress((post.address || '').trim())].filter(Boolean).join(' · ')}
          </p>
        </div>
      </Link>
      <div className="post-card-footer"><RentalConsiderationToggle compact post={post} /></div>
      {showSave && (
        <button type="button" className="post-card-save" disabled={saveBusy}
          aria-label={isSaved ? 'Bỏ lưu' : 'Lưu phòng'} title={isSaved ? 'Bỏ lưu' : 'Lưu phòng'} aria-pressed={Boolean(isSaved)}
          onClick={(event) => { event.stopPropagation(); (isSaved ? onUnsave : onSave)?.() }}>
          <HeartIcon size={20} filled={isSaved} />
        </button>
      )}
    </article>
  )


  return card
}
