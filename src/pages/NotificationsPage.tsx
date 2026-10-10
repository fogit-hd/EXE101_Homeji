import { useCallback, useRef, useState } from 'react'
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type Notification,
} from '../api'
import {
  usePageFrameChromeActive,
  usePageFrameChromePortals,
} from '../components/chrome'
import { HomejiLoader, usePersistentLoad } from '../components/HomejiLoader'
import { PageNotice } from '../components/toast/PageNotice'
import { ContentSkeleton } from '../components/ContentSkeleton'
import { formatDate, notificationTypeLabel } from '../lib/labels'
import { getNotificationPresentation } from '../lib/notificationPresentation'
import { notificationTargetHref } from '../lib/notificationTarget'
import { getErrorMessage } from '../lib/errors'

export type NotificationReadChange =
  | { kind: 'one'; notification: Notification }
  | { kind: 'all' }

export function NotificationsPage({
  embedded = false,
  refreshKey = 0,
  onOpenRelated,
  onReadStateChange,
  surface = 'page',
  headingId,
}: {
  embedded?: boolean
  refreshKey?: number
  onOpenRelated?: (notification: Notification) => void
  onReadStateChange?: (change: NotificationReadChange) => void
  surface?: 'page' | 'popup'
  headingId?: string
}) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [readBusy, setReadBusy] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')
  const readLock = useRef(false)
  // Read state is monotonic: an older list response cannot resurrect a read item.
  const readIds = useRef(new Set<string>())

  const loadFn = useCallback(async () => {
    const loaded = await getNotifications(unreadOnly)
    setNotifications(loaded.map(notification => readIds.current.has(notification.id)
      ? { ...notification, isRead: true } : notification))
  }, [unreadOnly])

  const { showLoader, onIntroComplete, error, disrupted, reload } = usePersistentLoad(
    loadFn,
    [unreadOnly, refreshKey],
  )

  const handleMarkRead = async (id: string) => {
    if (readLock.current) return
    const before = notifications.find((n) => n.id === id)
    if (!before || before.isRead || readIds.current.has(id)) return
    readLock.current = true
    setReadBusy(id)
    setActionError('')
    try {
      const updated = await markNotificationRead(id)
      readIds.current.add(id)
      setNotifications((prev) => prev.map((n) => (n.id === id ? updated : n)))
      onReadStateChange?.({ kind: 'one', notification: before })
    } catch (reason) {
      setActionError(getErrorMessage(reason, 'Không đánh dấu được thông báo. Vui lòng thử lại.'))
    } finally {
      readLock.current = false
      setReadBusy(null)
    }
  }

  const handleMarkAll = async () => {
    if (readLock.current) return
    readLock.current = true
    setReadBusy('all')
    setActionError('')
    try {
      await markAllNotificationsRead()
      notifications.forEach(notification => readIds.current.add(notification.id))
      setNotifications(prev => prev.map(notification => readIds.current.has(notification.id)
        ? { ...notification, isRead: true } : notification))
      onReadStateChange?.({ kind: 'all' })
      void reload()
    } catch (reason) {
      setActionError(getErrorMessage(reason, 'Không đánh dấu được tất cả thông báo. Vui lòng thử lại.'))
    } finally {
      readLock.current = false
      setReadBusy(null)
    }
  }

  const popup = surface === 'popup'
  const visibleNotifications = unreadOnly ? notifications.filter(notification => !notification.isRead) : notifications

  const markAllAction = (
    <button
      type="button"
      className={popup ? 'hj-notify__mark-all' : 'btn btn-secondary btn-sm'}
      disabled={readBusy !== null}
      onClick={() => void handleMarkAll()}
    >
      {readBusy === 'all' ? 'Đang đánh dấu…' : 'Đánh dấu tất cả đã đọc'}
    </button>
  )

  const filterTabs = (
    <div
      className={popup ? 'hj-notify__tabs' : 'tabs map-section-tabs'}
      style={popup ? undefined : { ['--map-tab-cols' as string]: 2 }}
      role="tablist"
      aria-label="Lọc thông báo"
    >
      <button
        type="button"
        role="tab"
        aria-selected={!unreadOnly}
        className={popup ? (!unreadOnly ? 'is-active' : '') : `tab ${!unreadOnly ? 'active' : ''}`}
        onClick={() => setUnreadOnly(false)}
      >
        Tất cả
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={unreadOnly}
        className={popup ? (unreadOnly ? 'is-active' : '') : `tab ${unreadOnly ? 'active' : ''}`}
        onClick={() => setUnreadOnly(true)}
      >
        Chưa đọc
      </button>
    </div>
  )

  const liftChrome = usePageFrameChromeActive()
  const chromePortals = usePageFrameChromePortals({
    actions: markAllAction,
    filters: filterTabs,
  })

  const list = (
    <>
      <PageNotice message={error && !disrupted ? error : ''} tone="error" />
      <PageNotice message={actionError} tone="error" />

      {showLoader ? (
        disrupted
          ? <HomejiLoader onIntroComplete={onIntroComplete} message={error} />
          : <ContentSkeleton variant="list" label="Đang tải thông báo…" />
      ) : visibleNotifications.length === 0 ? (
        <div className={popup ? 'hj-notify__empty' : 'empty-state card'}>Không có thông báo.</div>
      ) : (
        <div className="notification-list">
          {visibleNotifications.map((n) => {
            const presentation = getNotificationPresentation(n)
            const target = notificationTargetHref(n)
            return (
            <article
              key={n.id}
              className={`notification-item notification-item--${presentation.importance} ${popup ? '' : 'card'} ${n.isRead ? '' : 'unread'} ${popup ? '' : 'map-motion-fade-up'}`}
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
                {onOpenRelated && target ? (
                  <button
                    type="button"
                    className={popup ? 'hj-notify__open' : 'btn btn-secondary btn-sm'}
                    onClick={() => onOpenRelated(n)}
                  >
                    Mở
                  </button>
                ) : null}
                {!n.isRead && (
                  <button
                    type="button"
                    className={popup ? 'hj-notify__read' : 'btn btn-ghost btn-sm'}
                    disabled={readBusy !== null}
                    onClick={() => void handleMarkRead(n.id)}
                  >
                    {readBusy === n.id ? 'Đang đánh dấu…' : 'Đánh dấu đã đọc'}
                  </button>
                )}
              </div>
            </article>
            )
          })}
        </div>
      )}
    </>
  )

  if (popup) {
    return (
      <div className="hj-notify__body">
        <div className="hj-notify__head">
          <h2 id={headingId} className="hj-notify__title">Thông báo</h2>
          {markAllAction}
        </div>
        {filterTabs}
        <div className="hj-notify__scroll">{list}</div>
      </div>
    )
  }

  return (
    <div className={embedded ? 'map-embed profile-embed account-surface' : 'container page account-surface'}>
      {chromePortals}
      {!embedded ? (
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Thông báo</h1>
            <p className="page-subtitle">Cập nhật mới nhất từ Homeji</p>
          </div>
          {markAllAction}
        </div>
      ) : !liftChrome ? (
        <div className="account-surface__toolbar">{markAllAction}</div>
      ) : null}
      {!liftChrome ? filterTabs : null}
      {list}
    </div>
  )
}
