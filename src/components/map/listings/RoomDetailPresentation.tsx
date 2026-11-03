import type { ReactNode } from 'react'
import houseUrl from '../../../assets/room-detail/house.svg'
import './RoomDetailModal.css'

export function RoomDetailHeader({ titleId, title, onClose, actions }: { titleId: string; title: string; onClose: () => void; actions?: ReactNode }) {
  return <header className="room-detail__header">
    <div className="room-detail__heading"><img src={houseUrl} alt="" width={20} height={20} /><h2 id={titleId}>{title}</h2></div>
    <div className="room-detail__header-actions">{actions}<button type="button" className="room-detail__close" data-room-detail-close aria-label="Đóng" onClick={onClose}>×</button></div>
  </header>
}

export function RoomEssentials({ rentLabel, rent, area, deposit }: { rentLabel: string; rent: string; area: string; deposit: string }) {
  return <div className="room-detail__essentials" aria-label="Thông tin thuê chính">
    <div><span>{rentLabel}</span><strong>{rent}</strong></div>
    <div><span>Diện tích</span><strong>{area}</strong></div>
    <div><span>Tiền cọc</span><strong>{deposit}</strong></div>
  </div>
}
