import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { GuestJourney } from '../../src/components/landing/GuestJourney'
import { RentalPostCard } from '../../src/components/RentalPostCard'
import { NotificationPopupList } from '../../src/pages/NotificationPopupList'
import { ReceiptsPage } from '../../src/pages/ReceiptsPage'
import { MapListingsWorkspace } from '../../src/components/map/listings/MapListingsWorkspace'
import { LiquidGlassEffects } from '../../src/components/ui/LiquidGlassEffects'
import '../../src/index.css'
import '../../src/liquid-glass.css'
import '../../src/components/theme/dark-theme.css'
import '../../src/product-ui.css'
import '../../src/glass-controls.css'
import '../../src/content-surfaces.css'
import '../../src/components/shell/shell.css'
import '../../src/components/landing/GuestMapSection.css'
import '../../src/components/landing/GuestChrome.css'
import '../../src/components/hub/AuthenticatedHub.css'
import '../../src/components/map/MapChatbot.css'
import '../../src/components/marketplace/SellerOrderAlerts.css'

const post = { id: 'room-1', type: 1, title: 'Căn hộ Flora Fuji Kikyo 2PN đầy đủ nội thất', price: 7500000, area: 67, address: 'Flora Fuji Kikyo, Quận 9, TP. Thủ Đức', thumbnailPath: '/landing/bloom-hero-bg2.jpg', viewCount: 14, saveCount: 0 }
const initial = Array.from({ length: 5 }, (_, i) => ({ id: 'notification-' + i, type: 7, title: 'Tin nhắn mới', message: 'Bạn có tin nhắn mới liên quan đến một bài đăng.', createdAt: new Date(Date.now() - i * 86400000).toISOString(), isRead: i !== 0, relatedId: 'room-1' }))
export function Scene() {
  const view = new URLSearchParams(location.search).get('view')
  const [items, setItems] = useState(initial)
  return <MemoryRouter><LiquidGlassEffects />{view === 'journey' ? <GuestJourney /> : view === 'receipts' ? <ReceiptsPage /> : view === 'map' ? <div style={{ height: '100dvh' }}>
    <MapListingsWorkspace posts={[post]} selectedListingId="room-1" hoveredListingId={null} savedIds={new Set()} loading={false} error="" mapNode={<div style={{ height: '100%', background: '#bddbd7' }} />} onHoverListing={() => {}} onLeaveListing={() => {}} onSelectListing={() => {}} onOpenRoomDetail={() => { document.body.dataset.detail = 'yes' }} onToggleSave={() => { document.body.dataset.saved = 'yes' }} onResetFilters={() => {}} />
  </div> : <main style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,360px),1fr))', gap: 24, padding: 24, alignItems: 'start' }}>
    <div className="guest-map__card-wrap" data-glass-exclude><RentalPostCard post={post} showSave onSave={() => { document.body.dataset.saved = 'yes' }} /></div>
    <section className="hj-notify__pop" data-glass-exclude style={{ position: 'static', width: '100%', maxWidth: '100%' }}><header className="hj-notify__head"><h2>Thông báo</h2></header>
      <NotificationPopupList items={items} unreadOnly={false} readBusy={null} onOpen={() => { document.body.dataset.opened = 'yes' }} onMarkRead={id => { setItems(items.map(n => n.id === id ? { ...n, isRead: true } : n)) }} />
    </section>
    <div className="hub-home" style={{ display: 'block', padding: 0, width: '100%' }}><section className="hub-card hub-market"><header><h2>Chợ đồ khu phố</h2><a href="#market">Dạo chợ đồ →</a></header>
      <ul><li><a href="#market"><span className="hub-market__thumb"><img src="/landing/bloom-hero-bg2.jpg" alt="" /></span><b>Bún trộn nhà làm</b><strong>35.000 đ</strong></a></li><li><a href="#market"><span className="hub-market__thumb" /><b>Đèn bàn LED</b><strong>120.000 đ</strong></a></li></ul></section></div>
    <details className="map-chatbot__privacy" data-glass-exclude open><summary>Hội thoại và tiêu chí của bạn</summary><p>Tin nhắn và tiêu chí chỉ dùng trong phiên hiện tại. Lưu lịch sử hiện đang tắt.</p><button onClick={() => { document.body.dataset.cleared = 'yes' }}>Xóa nội dung phiên và tiêu chí</button></details>
    <dialog className="seller-watch__dialog" open style={{ position: 'static', margin: 0, width: '100%' }}><header data-glass-exclude><div><h2>Đơn bán cần xử lý</h2><p>Thông báo trực tiếp cho đồ ăn và pass đồ</p></div><button aria-label="Đóng đơn bán">×</button></header></dialog>
    <div className="guest-fixed-cta" style={{ position: 'static', opacity: 1, pointerEvents: 'auto', justifySelf: 'start' }} data-glass-exclude><span>Miễn phí đăng ký</span><a className="guest-fixed-cta__go" href="/register">Bắt đầu ngay</a></div>
  </main>}</MemoryRouter>
}
createRoot(document.getElementById('root')!).render(<Scene />)
