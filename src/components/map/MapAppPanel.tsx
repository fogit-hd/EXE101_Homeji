import { useEffect, useState, type ReactNode } from 'react'
import { SavedPostsPage } from '../../pages/SavedPostsPage'
import { RoommateInvitationsPage } from '../../pages/RoommateInvitationsPage'
import { NotificationsPage } from '../../pages/NotificationsPage'
import { PaymentPage } from '../../pages/PaymentPage'
import { ProfilePage } from '../../pages/ProfilePage'
import { useMountTransition } from './useMountTransition'
import './MapMotion.css'
import './MapAppPanel.css'

export type MapAppSection =
  | 'listings'
  | 'saved'
  | 'invitations'
  | 'notifications'
  | 'payments'
  | 'profile'

const SECTION_META: Record<MapAppSection, { title: string; subtitle: string }> = {
  listings: {
    title: 'Khu vực Thủ Đức & Q.9',
    subtitle: 'Danh sách phòng phù hợp',
  },
  saved: {
    title: 'Tin đã lưu',
    subtitle: 'Phòng bạn quan tâm',
  },
  invitations: {
    title: 'Ở ghép',
    subtitle: 'Lời mời gửi và nhận',
  },
  notifications: {
    title: 'Thông báo',
    subtitle: 'Cập nhật mới từ Homeji',
  },
  payments: {
    title: 'Thanh toán',
    subtitle: 'MoMo / PayOS',
  },
  profile: {
    title: 'Hồ sơ',
    subtitle: 'Thông tin tài khoản',
  },
}

type Props = {
  section: MapAppSection
  open: boolean
  onClose: () => void
  listingsSubtitle?: string
  listingsContent: ReactNode
}

export function MapAppPanel({
  section,
  open,
  onClose,
  listingsSubtitle,
  listingsContent,
}: Props) {
  const backdrop = useMountTransition(open, 320)

  // Retrigger section enter animation whenever the active tab/section changes.
  const [sectionKey, setSectionKey] = useState(section)
  const [sectionActive, setSectionActive] = useState(true)
  useEffect(() => {
    setSectionActive(false)
    const t = window.setTimeout(() => {
      setSectionKey(section)
      requestAnimationFrame(() => setSectionActive(true))
    }, 90)
    return () => window.clearTimeout(t)
  }, [section])

  return (
    <>
      {backdrop.mounted ? (
        <button
          type="button"
          className={`home-list-backdrop${backdrop.active ? ' is-visible' : ''}`}
          aria-label="Đóng panel"
          onClick={onClose}
        />
      ) : null}

      <aside
        id="home-list-panel"
        className={`home-list-panel map-app-panel${open ? '' : ' is-collapsed'}`}
        aria-hidden={!open}
      >
        <div className="home-list-header">
          <div className="home-list-header__top">
            <h1
              key={`title-${sectionKey}`}
              className={`map-motion-enter${sectionActive ? ' is-active' : ''}`}
            >
              {SECTION_META[sectionKey].title}
            </h1>
          </div>
          <p
            key={`sub-${sectionKey}`}
            className={`map-motion-enter${sectionActive ? ' is-active' : ''}`}
          >
            {sectionKey === 'listings' && listingsSubtitle
              ? listingsSubtitle
              : SECTION_META[sectionKey].subtitle}
          </p>
        </div>

        <div className="home-list-body map-app-panel__body">
          <div
            key={sectionKey}
            className={`map-app-panel__section map-motion-enter${sectionActive ? ' is-active' : ''}`}
          >
            {sectionKey === 'listings' ? listingsContent : null}
            {sectionKey === 'saved' ? <SavedPostsPage embedded /> : null}
            {sectionKey === 'invitations' ? <RoommateInvitationsPage embedded /> : null}
            {sectionKey === 'notifications' ? <NotificationsPage embedded /> : null}
            {sectionKey === 'payments' ? <PaymentPage embedded /> : null}
            {sectionKey === 'profile' ? <ProfilePage embedded /> : null}
          </div>
        </div>
      </aside>
    </>
  )
}
