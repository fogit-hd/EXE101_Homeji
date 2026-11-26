import { useCallback, useEffect, useState } from 'react'
import { getNotifications, NotificationType, type Notification } from '../api'
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
    let cancelled = false
    void getNotifications(true)
      .then((list) => {
        if (cancelled) return
        let messages = 0
        let other = 0
        for (const item of list) {
          if (item.isRead) continue
          if (isMessage(item)) messages += 1
          else other += 1
        }
        setUnreadMessages(messages)
        setUnreadNotifications(other)
      })
      .catch(() => { /* keep the live counters */ })
    return () => { cancelled = true }
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
