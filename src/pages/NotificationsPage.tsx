import { useCallback, useState } from 'react'
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type Notification,
} from '../api'
import { HomejiLoader, usePersistentLoad } from '../components/HomejiLoader'
import { formatDate, notificationTypeLabel } from '../lib/labels'

export function NotificationsPage({ embedded = false }: { embedded?: boolean }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadOnly, setUnreadOnly] = useState(false)

  const loadFn = useCallback(async () => {
    setNotifications(await getNotifications(unreadOnly))
  }, [unreadOnly])

  const { showLoader, onIntroComplete, error, disrupted, reload } = usePersistentLoad(
    loadFn,
    [unreadOnly],
  )

  const handleMarkRead = async (id: string) => {
    const updated = await markNotificationRead(id)
    setNotifications((prev) => prev.map((n) => (n.id === id ? updated : n)))
  }

  const handleMarkAll = async () => {
    await markAllNotificationsRead()
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
      <div className="tabs">
        <button type="button" className={`tab ${!unreadOnly ? 'active' : ''}`} onClick={() => setUnreadOnly(false)}>
          Tất cả
        </button>
        <button type="button" className={`tab ${unreadOnly ? 'active' : ''}`} onClick={() => setUnreadOnly(true)}>
          Chưa đọc
        </button>
      </div>

      {error && !disrupted && <div className="alert alert-error">{error}</div>}

      {showLoader ? (
        <HomejiLoader
          onIntroComplete={onIntroComplete}
          message={disrupted ? error : undefined}
        />
      ) : notifications.length === 0 ? (
        <div className="empty-state card">Không có thông báo.</div>
      ) : (
        <div className="notification-list">
          {notifications.map((n) => (
            <article key={n.id} className={`notification-item card ${n.isRead ? '' : 'unread'}`}>
              <div>
                <span className="badge badge-gray">{notificationTypeLabel[n.type]}</span>
                <h3>{n.title}</h3>
                <p>{n.message}</p>
                <small>{formatDate(n.createdAt)}</small>
              </div>
              {!n.isRead && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => void handleMarkRead(n.id)}>
                  Đánh dấu đã đọc
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
