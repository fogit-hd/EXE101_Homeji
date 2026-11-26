import './pages.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getNotificationPage,
  markAllNotificationsRead,
  markNotificationRead,
  type Notification,
} from '../api'
import {
  usePageFrameChromeActive,
  usePageFrameChromePortals,
} from '../components/chrome'
import { HomejiLoader } from "../components/HomejiLoader"
import { usePersistentLoad } from "../components/HomejiLoader.logic"
import { RevealText } from '../components/motion/RevealText'
import { NotificationsSkeleton } from '../components/skeletons/PageSkeletons'
import { PageNotice } from '../components/toast/PageNotice'
import { LiquidTabList } from '../components/ui/LiquidTabList'
import { getErrorMessage } from '../lib/errors'
import { formatDate, notificationTypeLabel } from '../lib/labels'
import { getNotificationPresentation } from '../lib/notificationPresentation'
import { notificationTargetHref } from '../lib/notificationTarget'
import { NotificationPopupList } from './NotificationPopupList'

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
  const [unreadCount, setUnreadCount] = useState(0)
  const [cursor, setCursor] = useState<Awaited<ReturnType<typeof getNotificationPage>>['nextCursor']>(null)
  const [isLoadingOlder, setIsLoadingOlder] = useState(false)
  const firstRequest = useRef<AbortController | null>(null)
  const olderRequest = useRef<AbortController | null>(null)
  const [readBusy, setReadBusy] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')
  const readLock = useRef(false)
  // Read state is monotonic: an older list response cannot resurrect a read item.
  const readIds = useRef(new Set<string>())

  const reconcileRead = useCallback((item: Notification) =>
    readIds.current.has(item.id) ? { ...item, isRead: true } : item, [])

  const cancelOlder = useCallback(() => {
    olderRequest.current?.abort()
    olderRequest.current = null
    setIsLoadingOlder(false)
  }, [])

  useEffect(() => () => {
    firstRequest.current?.abort()
    olderRequest.current?.abort()
  }, [])

  const loadFn = useCallback(async () => {
    firstRequest.current?.abort()
    cancelOlder()
    const controller = new AbortController()
    firstRequest.current = controller
    try {
      const loaded = await getNotificationPage(unreadOnly, undefined, controller.signal)
      if (controller.signal.aborted) return
      setNotifications(loaded.items.map(reconcileRead))
      setUnreadCount(loaded.unreadCounts.messages + loaded.unreadCounts.other)
      setCursor(loaded.nextCursor)
    } catch (error) {
      if (!controller.signal.aborted) throw error
    }
  }, [cancelOlder, reconcileRead, unreadOnly])

  const changeFilter = (nextUnreadOnly: boolean) => {
    if (nextUnreadOnly === unreadOnly) return
    firstRequest.current?.abort()
    cancelOlder()
    setCursor(null)
    setActionError('')
    setUnreadOnly(nextUnreadOnly)
  }

  const loadOlder = async () => {
    if (!cursor || olderRequest.current) return
    const controller = new AbortController()
    olderRequest.current = controller
    setIsLoadingOlder(true)
    setActionError('')
    try {
      const loaded = await getNotificationPage(unreadOnly, cursor, controller.signal)
      if (controller.signal.aborted) return
      setNotifications(current => {
        const loadedIds = new Set(current.map(item => item.id))
        return current.concat(loaded.items.filter(item => !loadedIds.has(item.id)).map(reconcileRead))
      })
      setCursor(loaded.nextCursor)
    } catch (reason) {
      if (!controller.signal.aborted) {
        setActionError(getErrorMessage(reason, 'Không tải được thông báo cũ hơn. Vui lòng thử lại.'))
      }
    } finally {
      if (olderRequest.current === controller) {
        olderRequest.current = null
        setIsLoadingOlder(false)
      }
    }
  }

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
      setUnreadCount(count => Math.max(0, count - 1))
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
      firstRequest.current?.abort()
      cancelOlder()
      setUnreadCount(0)
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
      aria-label="Đánh dấu tất cả đã đọc"
      disabled={readBusy !== null}
      onClick={() => void handleMarkAll()}
    >
      {readBusy === 'all' ? 'Đang đánh dấu…' : popup ? 'Đọc tất cả' : 'Đánh dấu tất cả đã đọc'}
    </button>
  )

  const filterTabs = (
    <LiquidTabList
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
        onClick={() => changeFilter(false)}
      >
        Tất cả
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={unreadOnly}
        className={popup ? (unreadOnly ? 'is-active' : '') : `tab ${unreadOnly ? 'active' : ''}`}
        onClick={() => changeFilter(true)}
      >
        Chưa đọc
        {popup && unreadCount > 0 ? <span className="hj-notify__tab-count">{unreadCount > 99 ? '99+' : unreadCount}</span> : null}
      </button>
    </LiquidTabList>
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
          : <NotificationsSkeleton tabs={false} />
      ) : popup ? (
        <NotificationPopupList
          items={visibleNotifications}
          unreadOnly={unreadOnly}
          readBusy={readBusy}
          onOpen={onOpenRelated}
          onMarkRead={(id) => void handleMarkRead(id)}
        />
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
      {!showLoader && cursor ? (
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => void loadOlder()}
          disabled={isLoadingOlder || readBusy === 'all'}>
          {isLoadingOlder ? 'Đang tải…' : 'Xem thông báo cũ hơn'}
        </button>
      ) : null}
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
            <RevealText as="h1" className="page-title" text="Thông báo" />
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
