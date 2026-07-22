import { useCallback, useState } from 'react'
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type Notification,
} from '../api'
import { HomejiLoader, usePersistentLoad } from '../components/HomejiLoader'
import { ContentSkeleton } from '../components/ContentSkeleton'
import { formatDate, notificationTypeLabel } from '../lib/labels'
import { getNotificationPresentation } from '../lib/notificationPresentation'
import { NotificationType } from '../api/types'
import './MarketplacePage.css'

export type NotificationReadChange =
  | { kind: 'one'; notification: Notification }
  | { kind: 'all' }

function sectionForNotification(n: Notification): 'messages' | 'appointments' | 'invitations' | 'listings' | 'marketplace' | 'profile' | null {
  switch (n.type) {
    case NotificationType.NewMessage:
    case NotificationType.DirectMessage:
      return 'messages'
    case NotificationType.ViewingAppointmentRequested:
    case NotificationType.ViewingAppointmentUpdated:
      return 'appointments'
    case NotificationType.RoommateInvitationReceived:
    case NotificationType.RoommateInvitationAccepted:
      return 'invitations'
    case NotificationType.PostApproved:
    case NotificationType.PostRejected:
    case NotificationType.NewMatchingRentalPost:
    case NotificationType.SavedPostChanged:
      return 'listings'
    case NotificationType.MarketplaceOrderUpdated:
    case NotificationType.MarketplaceTip:
      return 'marketplace'
    case NotificationType.SafetyTip:
      return 'listings'
    case NotificationType.LandlordVerificationUpdated:
      return 'profile'
    default:
      return null
  }
}

export function NotificationsPage({
  embedded = false,
  refreshKey = 0,
  onOpenRelated,
  onReadStateChange,
}: {
  embedded?: boolean
  refreshKey?: number
  onOpenRelated?: (notification: Notification) => void
  onReadStateChange?: (change: NotificationReadChange) => void
}) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadOnly, setUnreadOnly] = useState(false)

  const loadFn = useCallback(async () => {
    setNotifications(await getNotifications(unreadOnly))
  }, [unreadOnly])

  const { showLoader, onIntroComplete, error, disrupted, reload } = usePersistentLoad(
    loadFn,
    [unreadOnly, refreshKey],
  )

  const handleMarkRead = async (id: string) => {
    const before = notifications.find((n) => n.id === id)
    const updated = await markNotificationRead(id)
    setNotifications((prev) => prev.map((n) => (n.id === id ? updated : n)))
    if (before && !before.isRead) {
      onReadStateChange?.({ kind: 'one', notification: before })
    }
  }

  const handleMarkAll = async () => {
    await markAllNotificationsRead()
    onReadStateChange?.({ kind: 'all' })
    void reload()
  }

  return (
    <div className={embedded ? 'map-embed' : 'container page'}>
      <div className="page-header-row">
        {!embedded ? (
          <div>
            <h1 className="page-title">Thông báo</h1>
            <p className="page-subtitle">Cập nhật mới nhất từ Homeji</p>
          </div>
        ) : (
          <div />
        )}
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => void handleMarkAll()}>
          Đánh dấu tất cả đã đọc
        </button>
      </div>
      <div
        className="tabs map-section-tabs"
        style={{ ['--map-tab-cols' as string]: 2 }}
        role="tablist"
        aria-label="Lọc thông báo"
      >
        <button
          type="button"
          role="tab"
          aria-selected={!unreadOnly}
          className={`tab ${!unreadOnly ? 'active' : ''}`}
          onClick={() => setUnreadOnly(false)}
        >
          Tất cả
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={unreadOnly}
          className={`tab ${unreadOnly ? 'active' : ''}`}
          onClick={() => setUnreadOnly(true)}
        >
          Chưa đọc
        </button>
      </div>

      {error && !disrupted && <div className="alert alert-error">{error}</div>}

      {showLoader ? (
        disrupted
          ? <HomejiLoader onIntroComplete={onIntroComplete} message={error} />
          : <ContentSkeleton variant="list" label="Đang tải thông báo…" />
      ) : notifications.length === 0 ? (
        <div className="empty-state card">Không có thông báo.</div>
      ) : (
        <div className="notification-list">
          {notifications.map((n) => {
            const presentation = getNotificationPresentation(n)
            return (
            <article
              key={n.id}
              className={`notification-item notification-item--${presentation.importance} card ${n.isRead ? '' : 'unread'} map-motion-fade-up`}
            >
              <div className="notification-item__content">
                <div className="notification-item__meta">
                  <span className="notification-item__importance">
                    <span className="notification-item__importance-icon" aria-hidden="true">{presentation.icon}</span>
                    {presentation.importanceLabel}
                  </span>
                  <span className="badge notification-item__type">{notificationTypeLabel[n.type] ?? 'Thông báo'}</span>
                  {!n.isRead ? <span className="notification-item__unread-label">Chưa đọc</span> : null}
                </div>
                <h3>{n.title}</h3>
                <p>{n.message}</p>
                <small>{formatDate(n.createdAt)}</small>
              </div>
              <div className="notification-item__actions">
                {onOpenRelated && sectionForNotification(n) ? (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => onOpenRelated(n)}
                  >
                    Mở
                  </button>
                ) : null}
                {!n.isRead && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => void handleMarkRead(n.id)}>
                    Đánh dấu đã đọc
                  </button>
                )}
              </div>
            </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
