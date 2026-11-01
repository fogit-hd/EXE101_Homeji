import { useEffect, type Dispatch, type SetStateAction } from 'react'
import { getConversationMessages, NotificationType, type Notification, type PostMessage } from '../api'
import { getStoredSession } from '../api/client'
import { NOTIFICATION_CONNECTED, NOTIFICATION_RECEIVED } from '../lib/sellerOrderAlerts'

/** Reuse the shared notification connection; recover missed events after sleep or disconnect. */
export function useIncomingConversationMessages({ conversationId, ownerId, setMessages, refreshInbox }: {
  conversationId: string | null
  ownerId: string | null | undefined
  setMessages: Dispatch<SetStateAction<PostMessage[]>>
  refreshInbox: () => void
}) {
  useEffect(() => {
    if (!ownerId) return
    let active = true, inFlight = false, rerun = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const current = () => active && getStoredSession()?.userId === ownerId
    const refresh = async () => {
      if (!current() || !conversationId || document.visibilityState === 'hidden') return
      if (inFlight) { rerun = true; return }
      inFlight = true
      try {
        const incoming = await getConversationMessages(conversationId)
        if (!current()) return
        // A GET started before a local send must not erase its successful response.
        setMessages(previous => {
          if (!current()) return previous
          const merged = new Map(previous.map(message => [message.id, message]))
          for (const message of incoming) if (message.conversationId === conversationId) merged.set(message.id, message)
          const next = [...merged.values()].sort((a, b) => Date.parse(a.sentAt) - Date.parse(b.sentAt))
          return JSON.stringify(next) === JSON.stringify(previous) ? previous : next
        })
      } catch { /* Keep the displayed messages and draft; reconnect/focus/poll will retry. */ }
      finally {
        inFlight = false
        if (current()) refreshInbox()
        if (rerun && current()) { rerun = false; schedule() }
      }
    }
    const schedule = () => {
      if (!current() || timer) return
      timer = setTimeout(() => { timer = undefined; void refresh() }, 100)
    }
    const recover = () => {
      if (!current() || document.visibilityState === 'hidden') return
      if (conversationId) schedule()
      else refreshInbox()
    }
    const receive = (event: Event) => {
      const detail = (event as CustomEvent<{ ownerId: string; notification: Notification }>).detail
      if (!current() || detail?.ownerId !== ownerId) return
      const notification = detail.notification
      if (notification?.type !== NotificationType.DirectMessage && notification?.type !== NotificationType.NewMessage) return
      if (conversationId && (notification.type === NotificationType.NewMessage || !notification.relatedEntityId || notification.relatedEntityId === conversationId)) schedule()
      else refreshInbox()
    }
    void refresh()
    window.addEventListener(NOTIFICATION_RECEIVED, receive)
    window.addEventListener(NOTIFICATION_CONNECTED, recover)
    window.addEventListener('focus', recover)
    window.addEventListener('online', recover)
    document.addEventListener('visibilitychange', recover)
    const poll = setInterval(recover, 20_000)
    return () => {
      active = false
      if (timer) clearTimeout(timer)
      clearInterval(poll)
      window.removeEventListener(NOTIFICATION_RECEIVED, receive)
      window.removeEventListener(NOTIFICATION_CONNECTED, recover)
      window.removeEventListener('focus', recover)
      window.removeEventListener('online', recover)
      document.removeEventListener('visibilitychange', recover)
    }
  }, [conversationId, ownerId, setMessages, refreshInbox])
}
