import { useCallback, useEffect, useState } from 'react'
import { getNotificationUnreadCounts, NotificationType, type Notification } from '../api'
import { useNotificationHub } from '../hooks/useNotificationHub'
import { CONVERSATION_READ } from '../lib/conversationRealtime'
import type { NotificationReadChange } from '../pages/NotificationsPage'

function isMessage(notification: Pick<Notification, 'type'>) {
  return notification.type === NotificationType.NewMessage || notification.type === NotificationType.DirectMessage
}

/**
 * Unread message and notification counters for a header. Live updates come from the
 * notification hub; the list is re-read whenever `routeKey` changes.
 */
export function useUnreadCounts(enabled: boolean, routeKey: string) {
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)
  const [conversationReadVersion, setConversationReadVersion] = useState(0)

  // Opening a conversation marks it read elsewhere; re-read the counters when that happens.
  useEffect(() => {
    if (!enabled) return
    const refreshCounts = () => setConversationReadVersion(version => version + 1)
    window.addEventListener(CONVERSATION_READ, refreshCounts)
    return () => window.removeEventListener(CONVERSATION_READ, refreshCounts)
  }, [enabled])

  useNotificationHub({
    enabled,
    onNotification: (notification: Notification) => {
      setRefreshKey((key) => key + 1)
      if (notification.isRead) return
      if (isMessage(notification)) setUnreadMessages((count) => count + 1)
      else setUnreadNotifications((count) => count + 1)
    },
  })

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    void getNotificationUnreadCounts(controller.signal)
      .then(({ messages, other }) => {
        if (controller.signal.aborted) return
        setUnreadMessages(messages)
        setUnreadNotifications(other)
      })
      .catch(() => { /* Keep the live counters if the network is unavailable. */ })
    return () => controller.abort()
  }, [enabled, refreshKey, routeKey, conversationReadVersion])

  const applyReadChange = useCallback((change: NotificationReadChange) => {
    if (change.kind === 'all') {
      setUnreadMessages(0)
      setUnreadNotifications(0)
      return
    }
    if (isMessage(change.notification)) setUnreadMessages((count) => Math.max(0, count - 1))
    else setUnreadNotifications((count) => Math.max(0, count - 1))
  }, [])

  return { unreadMessages, unreadNotifications, refreshKey, applyReadChange }
}
