import { useState, type ReactNode } from 'react'
import houseUrl from '../../../assets/room-detail/house.svg'
import { ContactFlashlightIcon } from '../../profile/ContactFlashlightIcon'
import './RoomDetailModal.css'

export function RoomDetailHeader({ titleId, title, onClose, actions, autoFocusClose = false }: { titleId: string; title: string; onClose: () => void; actions?: ReactNode; autoFocusClose?: boolean }) {
  return <header className="room-detail__header">
    <div className="room-detail__heading"><img src={houseUrl} alt="" width={20} height={20} /><h2 id={titleId}>{title}</h2></div>
    <div className="room-detail__header-actions">{actions}<button type="button" className="room-detail__close" data-room-detail-close aria-label="Đóng" autoFocus={autoFocusClose} onClick={onClose}>×</button></div>
  </header>
}

export function RoomEssentials({ rentLabel, rent, area, deposit }: { rentLabel: string; rent?: string; area: string; deposit: string }) {
  return <div className="room-detail__essentials" aria-label="Thông tin thuê chính">
    {rent ? <div><span>{rentLabel}</span><strong>{rent}</strong></div> : null}
    <div><span>Diện tích</span><strong>{area}</strong></div>
    <div><span>Tiền cọc</span><strong>{deposit}</strong></div>
  </div>
}

export function RoomOwnerProfile({ heading, name, avatarUrl, verified = false, children }: {
  heading: string; name: string; avatarUrl?: string | null; verified?: boolean; children: ReactNode
}) {
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null)
  return <section className="room-detail__owner-profile" aria-label={heading}>
    <h4>{heading}</h4>
    <div className="room-detail__person">
      <span className="room-detail__avatar" aria-hidden="true">{avatarUrl && failedAvatar !== avatarUrl ? <img src={avatarUrl} alt="" onError={() => setFailedAvatar(avatarUrl)} /> : name.slice(0, 1).toUpperCase()}</span>
      <div><span className="room-detail__owner-label">Họ và tên</span><strong>{name}</strong>
        {verified ? <span className="room-detail__owner-verified">✓ Hồ sơ chủ nhà đã được duyệt</span> : null}
      </div>
    </div>
    {children}
  </section>
}

export function RoomOwnerPhone({ id, value, revealed, revealLabel, onReveal, disabled = false, hint }: {
  id: string; value: ReactNode; revealed: boolean; revealLabel: string; onReveal?: () => void; disabled?: boolean; hint?: string
}) {
  return <>
    <div className={`room-detail__owner-phone${revealed ? ' is-revealed' : ''}`}>
      <div><span className="room-detail__owner-label">Số điện thoại</span>
        <span id={id} className="room-detail__phone-value" aria-live="polite" aria-atomic="true">{value}</span>
      </div>
      {onReveal ? <button type="button" className={`room-detail__flashlight${revealed ? ' is-lit' : ''}`} aria-label={revealLabel} aria-pressed={revealed} aria-controls={id} disabled={disabled} onClick={onReveal}><ContactFlashlightIcon /></button> : null}
    </div>
    {hint ? <p className="room-detail__phone-hint">{hint}</p> : null}
  </>
}
