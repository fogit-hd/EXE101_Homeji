import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import type { NotificationReadChange } from '../../pages/NotificationsPage'
import {
  ActivitiesPage,
  MapAppointmentsPanel,
  MarketplacePage,
  MyPostsPage,
  NotificationsPage, PaymentPage, ProfilePage,
  RoommateWorkspace,
  SavedPostsPage,
  WantedPostsPage,
} from '../../pages/deferredPages'
import { SectionSkeleton } from '../skeletons/RouteSkeleton'
import './MapAppPanel.css'
import { WIDE_MAP_SECTIONS, type MapAppSection } from "./MapAppPanel.logic"
import './MapMotion.css'

const SECTION_META: Record<MapAppSection, { title: string; subtitle: string }> = {
  listings: {
    title: 'Khu vực Thủ Đức & Q.9',
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
    title: 'Gói Đăng ký',
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

type Props = {
  section: MapAppSection
  open: boolean
  onClose: () => void
  listingsSubtitle?: string
  listingsContent: ReactNode
  notificationRefreshKey?: number
  onNotificationOpen?: (notification: import('../../api').Notification) => void
  onNotificationReadStateChange?: (change: NotificationReadChange) => void
  onOpenConversation?: (conversationId: string) => void
  onMarketplacePostsForMap?: (pins: import('./RentalMap').MarketplaceMapPin[]) => void
  onMarketplaceFocusMap?: (loc: { lat: number; lng: number; zoom?: number }) => void
  selectedMarketplaceId?: string | null
  onSelectMarketplaceId?: (id: string | null) => void
  userLocation?: { lat: number; lng: number } | null
  onRequestLocation?: () => void
  locating?: boolean
  onMarketplaceCartOpenChange?: (open: boolean) => void
}

const OUTSIDE_CLOSE_IGNORE =
  '.home-list-panel, .food-cart-backdrop, .gmaps-nav-rail, .gmaps-nav-drawer, .gmaps-nav-backdrop, .gmaps-account, .gmaps-account__popover, .gmaps-omnibox__top-actions, .gmaps-omnibox__notify, .mobile-tabbar, .map-chatbot'

export function MapAppPanel({
  section,
  open,
  onClose,
  listingsSubtitle,
  listingsContent,
  notificationRefreshKey = 0,
  onNotificationOpen,
  onNotificationReadStateChange,
  onOpenConversation,
  onMarketplacePostsForMap,
  onMarketplaceFocusMap,
  selectedMarketplaceId = null,
  onSelectMarketplaceId,
  userLocation = null,
  onRequestLocation,
  locating = false,
  onMarketplaceCartOpenChange,
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

    const sheetQuery = window.matchMedia('(max-width: 900px)')
    const onPointerDown = (e: PointerEvent) => {
      if (sheetQuery.matches) return
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
  const isListings = displayed === 'listings'
  const isWanted = displayed === 'wanted'
  const slideFromRight = isListings || isWanted

  return (
    <aside
      id="home-list-panel"
      className={`home-list-panel map-app-panel${open ? ' is-visible' : ''}${
        isMessages ? ' is-messages' : ''
      }${isListings ? ' is-listings' : ''}${isWanted ? ' is-wanted' : ''}${
        slideFromRight ? ' is-slide-right' : ''
      }${isWide ? ' is-wide' : ''}${
        displayed === 'marketplace' ? ' is-marketplace' : ''
      }`}
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
            <button
              type="button"
              className="map-app-panel__close map-motion-press"
              aria-label="Đóng"
              onClick={onClose}
            >
              ✕
            </button>
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
          <Suspense key={displayed} fallback={<SectionSkeleton section={displayed} />}>
          {displayed === 'listings' ? listingsContent : null}
          {displayed === 'saved' ? <SavedPostsPage embedded /> : null}
          {displayed === 'invitations' ? (
            <RoommateWorkspace onOpenConversation={onOpenConversation} />
          ) : null}
          {displayed === 'notifications' ? (
            <NotificationsPage
              embedded
              refreshKey={notificationRefreshKey}
              onOpenRelated={onNotificationOpen}
              onReadStateChange={onNotificationReadStateChange}
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
              userLocation={userLocation}
              onRequestLocation={onRequestLocation}
              locating={locating}
              onCartOpenChange={onMarketplaceCartOpenChange}
            />
          ) : null}
          {displayed === 'wanted' ? <WantedPostsPage embedded /> : null}
          {displayed === 'activities' ? <ActivitiesPage embedded /> : null}
          {displayed === 'myPosts' ? <MyPostsPage embedded /> : null}
          </Suspense>
        </div>
      </div>
    </aside>
  )
}
