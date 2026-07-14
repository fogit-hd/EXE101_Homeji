import { useEffect, useRef, useState, type ReactNode } from 'react'
import { SavedPostsPage } from '../../pages/SavedPostsPage'
import { RoommateInvitationsPage } from '../../pages/RoommateInvitationsPage'
import { NotificationsPage } from '../../pages/NotificationsPage'
import { PaymentPage } from '../../pages/PaymentPage'
import { ProfilePage } from '../../pages/ProfilePage'
import { MarketplacePage } from '../../pages/MarketplacePage'
import { WantedPostsPage } from '../../pages/WantedPostsPage'
import { ActivitiesPage } from '../../pages/ActivitiesPage'
import { MyPostsPage } from '../../pages/MyPostsPage'
import { MapAppointmentsPanel } from './MapAppointmentsPanel'
import { MapChatbot } from './MapChatbot'
import type { AiHighlightResponse } from '../../api'
import './MapMotion.css'
import './MapAppPanel.css'

export type MapAppSection =
  | 'listings'
  | 'assistant'
  | 'saved'
  | 'invitations'
  | 'notifications'
  | 'messages'
  | 'appointments'
  | 'payments'
  | 'profile'
  | 'marketplace'
  | 'wanted'
  | 'activities'
  | 'myPosts'

const SECTION_META: Record<MapAppSection, { title: string; subtitle: string }> = {
  listings: {
    title: 'Khu vực Thủ Đức & Q.9',
    subtitle: '',
  },
  assistant: {
    title: 'Trợ lý AI',
    subtitle: '',
  },
  saved: {
    title: 'Tin đã lưu',
    subtitle: '',
  },
  invitations: {
    title: 'Ở ghép',
    subtitle: '',
  },
  notifications: {
    title: 'Thông báo',
    subtitle: '',
  },
  messages: {
    title: 'Tin nhắn',
    subtitle: '',
  },
  appointments: {
    title: 'Lịch xem phòng',
    subtitle: '',
  },
  payments: {
    title: 'Gói Premium',
    subtitle: '',
  },
  profile: {
    title: 'Hồ sơ',
    subtitle: '',
  },
  marketplace: {
    title: 'Chợ đồ',
    subtitle: '',
  },
  wanted: {
    title: 'Tin tìm phòng',
    subtitle: '',
  },
  activities: {
    title: 'Nhật ký hoạt động',
    subtitle: '',
  },
  myPosts: {
    title: 'Tin của tôi',
    subtitle: '',
  },
}

const SECTION_EXIT_MS = 280

/** Right panel ~2.5× default width (same as Chợ đồ). */
export const WIDE_MAP_SECTIONS = new Set<MapAppSection>([
  'marketplace',
  'saved',
  'notifications',
  'appointments',
  'wanted',
  'invitations',
  'myPosts',
  'activities',
  'profile',
  'payments',
])

export function isWideMapSection(section: MapAppSection | null | undefined): boolean {
  return Boolean(section && WIDE_MAP_SECTIONS.has(section))
}

type Props = {
  section: MapAppSection
  open: boolean
  onClose: () => void
  listingsSubtitle?: string
  listingsContent: ReactNode
  notificationRefreshKey?: number
  onNotificationOpen?: (notification: import('../../api').Notification) => void
  onAiSearchUpdate?: (update: AiHighlightResponse) => void
  onMarketplacePostsForMap?: (pins: import('./RentalMap').MarketplaceMapPin[]) => void
  onMarketplaceFocusMap?: (loc: { lat: number; lng: number; zoom?: number }) => void
  selectedMarketplaceId?: string | null
  onSelectMarketplaceId?: (id: string | null) => void
}

const OUTSIDE_CLOSE_IGNORE =
  '.home-list-panel, .gmaps-nav-rail, .gmaps-nav-drawer, .gmaps-nav-backdrop, .gmaps-account, .gmaps-account__popover, .mobile-tabbar, .map-chat-dock'

export function MapAppPanel({
  section,
  open,
  onClose,
  listingsSubtitle,
  listingsContent,
  notificationRefreshKey = 0,
  onNotificationOpen,
  onAiSearchUpdate,
  onMarketplacePostsForMap,
  onMarketplaceFocusMap,
  selectedMarketplaceId = null,
  onSelectMarketplaceId,
}: Props) {
  const displayedRef = useRef(section)
  const wasOpenRef = useRef(open)
  const [displayed, setDisplayed] = useState(section)
  const [phase, setPhase] = useState<'enter' | 'exit'>('enter')
  const [enterNonce, setEnterNonce] = useState(0)

  useEffect(() => {
    const justOpened = open && !wasOpenRef.current
    wasOpenRef.current = open
    if (!open) return

    if (section !== displayedRef.current) {
      if (justOpened) {
        displayedRef.current = section
        setDisplayed(section)
        setPhase('enter')
        setEnterNonce((n) => n + 1)
        return
      }

      setPhase('exit')
      const t = window.setTimeout(() => {
        displayedRef.current = section
        setDisplayed(section)
        setPhase('enter')
        setEnterNonce((n) => n + 1)
      }, SECTION_EXIT_MS)
      return () => window.clearTimeout(t)
    }

    if (justOpened) {
      setPhase('enter')
      setEnterNonce((n) => n + 1)
    }
  }, [section, open])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      const el = e.target
      if (!(el instanceof Element)) return
      if (el.closest(OUTSIDE_CLOSE_IGNORE)) return
      onClose()
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [open, onClose])

  const meta = SECTION_META[displayed]
  const subtitle =
    displayed === 'listings' && listingsSubtitle ? listingsSubtitle : meta.subtitle
  const isMessages = displayed === 'messages'
  const isWide = WIDE_MAP_SECTIONS.has(displayed)

  return (
    <>
      <button
        type="button"
        className={`home-list-backdrop${open ? ' is-visible' : ''}`}
        aria-label="Đóng panel"
        aria-hidden={!open}
        tabIndex={open ? 0 : -1}
        onClick={onClose}
      />

      <aside
        id="home-list-panel"
        className={`home-list-panel map-app-panel${open ? ' is-visible' : ''}${
          isMessages ? ' is-messages' : ''
        }${isWide ? ' is-wide' : ''}${displayed === 'marketplace' ? ' is-marketplace' : ''}`}
        aria-hidden={!open}
      >
        {!isMessages ? (
          <div className="home-list-header">
            <div className="home-list-header__top">
              <h1
                key={`title-${displayed}-${enterNonce}`}
                className={`map-app-panel__heading map-app-panel__heading--${phase}`}
              >
                {meta.title}
              </h1>
            </div>
            {subtitle ? (
              <p
                key={`sub-${displayed}-${enterNonce}`}
                className={`map-app-panel__sub map-app-panel__sub--${phase}`}
              >
                {subtitle}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="home-list-body map-app-panel__body">
          <div
            key={`${displayed}-${enterNonce}-${notificationRefreshKey}`}
            className={`map-app-panel__section map-app-panel__section--${phase}${
              isMessages ? ' is-fill' : ''
            }`}
          >
            {displayed === 'listings' ? listingsContent : null}
            {displayed === 'assistant' ? (
              <MapChatbot embedded onSearchUpdate={onAiSearchUpdate} />
            ) : null}
            {displayed === 'saved' ? <SavedPostsPage embedded /> : null}
            {displayed === 'invitations' ? <RoommateInvitationsPage embedded /> : null}
            {displayed === 'notifications' ? (
              <NotificationsPage
                embedded
                refreshKey={notificationRefreshKey}
                onOpenRelated={onNotificationOpen}
              />
            ) : null}
            {displayed === 'appointments' ? <MapAppointmentsPanel embedded /> : null}
            {displayed === 'payments' ? <PaymentPage embedded /> : null}
            {displayed === 'profile' ? <ProfilePage embedded /> : null}
            {displayed === 'marketplace' ? (
              <MarketplacePage
                embedded
                onPostsForMap={onMarketplacePostsForMap}
                onFocusMap={onMarketplaceFocusMap}
                selectedMarketplaceId={selectedMarketplaceId}
                onSelectMarketplaceId={onSelectMarketplaceId}
              />
            ) : null}
            {displayed === 'wanted' ? <WantedPostsPage embedded /> : null}
            {displayed === 'activities' ? <ActivitiesPage embedded /> : null}
            {displayed === 'myPosts' ? <MyPostsPage embedded /> : null}
          </div>
        </div>
      </aside>
    </>
  )
}
