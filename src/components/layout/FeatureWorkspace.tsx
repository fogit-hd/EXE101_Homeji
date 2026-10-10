import { PageFrame } from '../chrome'
import { Suspense, useCallback } from 'react'
import { ScreenPending } from '../ScreenPending'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { NotificationType, type Notification } from '../../api'
import {
  ActivitiesPage, MarketplacePage, MyPostsPage, NotificationsPage, PaymentPage,
  ProfilePage, RoommateWorkspace, SavedPostsPage, WantedPostsPage,
  MapAppointmentsPanel, MapMessagesPanel,
} from '../../pages/deferredPages'
import { mapMessagesUrl, mapPostUrl, mapSectionUrl } from '../../lib/mapDeepLinks'
import type { MapAppSection } from '../map/MapAppPanel'
import './FeatureWorkspace.css'

const TITLES: Partial<Record<MapAppSection, string>> = {
  saved: 'Những nơi đáng để quay lại',
  invitations: 'Ở chung, nhưng vẫn được là mình',
  notifications: 'Thông báo',
  messages: 'Tin nhắn',
  appointments: 'Lịch xem phòng',
  payments: 'Gói Đăng ký',
  profile: 'Hồ sơ',
  marketplace: 'Chợ đồ',
  wanted: 'Tin tìm phòng',
  activities: 'Nhật ký hoạt động',
  myPosts: 'Tin của tôi',
}

const EYEBROWS: Partial<Record<MapAppSection, string>> = {
  saved: 'Đã lưu',
  invitations: 'Tìm người cùng nhịp',
}

const LEADS: Partial<Record<MapAppSection, string>> = {
  saved: 'Những phòng bạn đã lưu. Mở lại tin, so sánh giá và diện tích khi bạn sẵn sàng.',
  invitations: 'Kết nối dựa trên ngân sách, khu vực và những thói quen thật sự quan trọng.',
}

type Props = {
  section: Exclude<MapAppSection, 'listings'>
}

export function FeatureWorkspace({ section }: Props) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const title = TITLES[section] ?? 'Homeji'
  const isMessages = section === 'messages'
  const conversationId = isMessages ? searchParams.get('conversation') : null

  const openConversation = useCallback(
    (nextConversationId: string) => {
      navigate(mapMessagesUrl(nextConversationId))
    },
    [navigate],
  )

  const handleActiveConversation = useCallback(
    (nextConversationId: string | null) => {
      setSearchParams((prev) => {
        const current = prev.get('conversation')
        if ((current ?? null) === nextConversationId) return prev
        const next = new URLSearchParams(prev)
        if (nextConversationId) next.set('conversation', nextConversationId)
        else next.delete('conversation')
        return next
      }, { replace: true })
    },
    [setSearchParams],
  )

  const handleNotificationOpen = useCallback(
    (n: Notification) => {
      if (
        n.type === NotificationType.NewMessage ||
        n.type === NotificationType.DirectMessage
      ) {
        if (n.relatedEntityId) openConversation(n.relatedEntityId)
        else navigate(mapSectionUrl('messages'))
        return
      }
      if (
        n.type === NotificationType.ViewingAppointmentRequested ||
        n.type === NotificationType.ViewingAppointmentUpdated
      ) {
        navigate(mapSectionUrl('appointments'))
        return
      }
      if (
        n.type === NotificationType.RoommateInvitationReceived ||
        n.type === NotificationType.RoommateInvitationAccepted
      ) {
        navigate(mapSectionUrl('invitations'))
        return
      }
      if (n.type === NotificationType.MarketplaceOrderUpdated) {
        navigate(mapSectionUrl('marketplace'))
        return
      }
      if (n.type === NotificationType.LandlordVerificationUpdated) {
        navigate(mapSectionUrl('profile'))
        return
      }
      if (
        n.relatedEntityId &&
        (n.type === NotificationType.PostApproved ||
          n.type === NotificationType.PostRejected ||
          n.type === NotificationType.NewMatchingRentalPost ||
          n.type === NotificationType.SavedPostChanged)
      ) {
        navigate(mapPostUrl(n.relatedEntityId))
        return
      }
      navigate(mapSectionUrl('listings'))
    },
    [navigate, openConversation],
  )

  const figmaOwnHeader =
    section === 'messages'
    || section === 'appointments'
    || section === 'payments'
    || section === 'profile'
    || section === 'marketplace'
  const isMarketplace = section === 'marketplace'

  return (
    <div
      className={`feature-workspace${isMessages ? ' is-messages' : ''}${
        isMarketplace ? ' is-marketplace' : ''
      }${section === 'saved' ? ' is-saved' : ''}${figmaOwnHeader ? ' has-own-header' : ''}`}
    >
      <PageFrame
        title={title}
        eyebrow={EYEBROWS[section]}
        lead={LEADS[section]}
        bleed={isMessages || figmaOwnHeader}
        chromeSlots={!figmaOwnHeader}
        className="feature-workspace__frame"
      >
        <Suspense key={section} fallback={<ScreenPending />}>
        {section === 'saved' ? <SavedPostsPage embedded /> : null}
        {section === 'invitations' ? (
          <RoommateWorkspace onOpenConversation={openConversation} />
        ) : null}
        {section === 'notifications' ? (
          <NotificationsPage embedded onOpenRelated={handleNotificationOpen} />
        ) : null}
        {section === 'messages' ? (
          <div className="feature-workspace__messages">
            <MapMessagesPanel
              embedded
              layout="panel"
              initialConversationId={conversationId}
              onActiveConversationChange={handleActiveConversation}
            />
          </div>
        ) : null}
        {section === 'appointments' ? <MapAppointmentsPanel embedded /> : null}
        {section === 'payments' ? <PaymentPage embedded /> : null}
        {section === 'profile' ? <ProfilePage embedded /> : null}
        {section === 'marketplace' ? <MarketplacePage embedded /> : null}
        {section === 'wanted' ? <WantedPostsPage embedded /> : null}
        {section === 'activities' ? <ActivitiesPage embedded /> : null}
        {section === 'myPosts' ? <MyPostsPage embedded /> : null}
        </Suspense>
      </PageFrame>
    </div>
  )
}
