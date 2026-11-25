import { useCallback, useLayoutEffect, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import {
  ApiRequestError, getConversationAttachmentDeletions, getConversationMessagePage, markConversationRead,
  MessageAttachmentStatus, NotificationType, type ConversationAttachmentDeletion, type MessagePageCursor,
  type Notification, type PostMessage,
} from '../api'
import { getStoredSession } from '../api/client'
import { CONVERSATION_ATTACHMENT_DELETED, CONVERSATION_READ, hasNotificationConnection } from '../lib/conversationRealtime'
import { NOTIFICATION_CONNECTED, NOTIFICATION_RECEIVED } from '../lib/sellerOrderAlerts'
import { getErrorMessage } from '../lib/errors'
import { readChatSnapshot, removeChatSnapshot, writeChatSnapshot } from '../lib/chatCache'

const pageSize = 40
const fallbackPollMs = 20_000
const emptyState = { key: '', error: '', olderError: '', headId: '', hasOlder: false, loadingOlder: false, cached: false }
type Commands = {
  retry: () => void
  loadOlder: () => void
  acknowledge: (messageId: string) => void
  persist: (messages: PostMessage[]) => void
}
type AttachmentDeletionEvent = ConversationAttachmentDeletion & { ownerId: string; conversationId: string }

const fraction = (date: string) => (date.match(/\.(\d+)/)?.[1] ?? '').padEnd(7, '0')
export function mergeConversationMessages(previous: PostMessage[], incoming: PostMessage[]) {
  if (!incoming.length) return previous
  const merged = new Map(previous.map(message => [message.id, message]))
  let changed = false
  for (const message of incoming) {
    const known = merged.get(message.id)
    if (known && known.body === message.body &&
        (known.attachments?.length ?? 0) === (message.attachments?.length ?? 0) &&
        !message.attachments?.some(item => !known.attachments?.some(existing => existing.id === item.id &&
          (existing.status === item.status || existing.status === MessageAttachmentStatus.Deleted)))) continue
    changed = true
    const deleted = known?.attachments?.filter(item => item.status === MessageAttachmentStatus.Deleted)
    const attachments = deleted?.length ? message.attachments?.map(item =>
      deleted.find(tombstone => tombstone.id === item.id) ?? item) : message.attachments
    merged.set(message.id, attachments === message.attachments ? message : { ...message, attachments })
  }
  if (!changed) return previous
  return [...merged.values()].sort((a, b) =>
    Date.parse(a.sentAt) - Date.parse(b.sentAt) || fraction(a.sentAt).localeCompare(fraction(b.sentAt)) || a.id.localeCompare(b.id))
}

export function useIncomingConversationMessages({
  conversationId, ownerId, cacheOwnerId, messages, setMessages, refreshInbox, onRead,
}: {
  conversationId: string | null
  ownerId: string | null
  cacheOwnerId: string | null
  messages: PostMessage[]
  setMessages: Dispatch<SetStateAction<PostMessage[]>>
  refreshInbox: () => void
  onRead: (conversationId: string, unreadCount: number) => void
}) {
  const key = ownerId && conversationId ? ownerId + ':' + conversationId : ''
  const [state, setState] = useState(emptyState)
  const [deleted, setDeleted] = useState<{ key: string; ids: ReadonlySet<string> }>()
  const loadedMessages = useRef(messages)
  const commands = useRef<Commands | null>(null)
  const activeKey = useRef(key)
  useLayoutEffect(() => {
    activeKey.current = key
    loadedMessages.current = messages
  }, [key, messages])

  useEffect(() => {
    if (!ownerId) return
    const controller = new AbortController()
    const signal = controller.signal
    const current = () => !signal.aborted && activeKey.current === key && getStoredSession()?.userId === ownerId
    const visible = () => current() && document.visibilityState !== 'hidden' && navigator.onLine !== false
    const slot = cacheOwnerId === ownerId && conversationId ? (`thread:${conversationId}` as const) : null
    let cachedIds: Set<string> | undefined
    let denied = false
    let initialized = false
    let headId = ''
    let acknowledged = ''
    let acknowledging = false
    let pendingRead = ''
    let readRetry: ReturnType<typeof setTimeout> | undefined
    let before: MessagePageCursor | null = null
    let loadingOlder = false
    let refreshing = false
    let rerun = false
    let verifyAttachments = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const update = (patch: Partial<typeof emptyState>) => {
      if (current()) setState(previous => {
        if (previous.key === key && (Object.keys(patch) as Array<keyof typeof emptyState>).every(field => previous[field] === patch[field])) return previous
        return { ...(previous.key === key ? previous : emptyState), ...patch, key }
      })
    }

    const merge = (rows: PostMessage[]) => {
      if (current() && rows.length) setMessages(previous => current()
        ? mergeConversationMessages(previous, rows.filter(message => message.conversationId === conversationId))
        : previous)
    }

    const applyDeletions = (rows: ConversationAttachmentDeletion[]) => {
      if (!current() || !rows.length) return
      const ids = new Set(rows.map(row => row.attachmentId))
      setDeleted(previous => ({ key, ids: new Set([...(previous?.key === key ? previous.ids : []), ...ids]) }))
      setMessages(previous => current() ? previous.map(message => {
        const attachments = message.attachments
        if (!attachments?.some(item => ids.has(item.id) && item.status !== MessageAttachmentStatus.Deleted)) return message
        return { ...message, attachments: attachments.map(item =>
          ids.has(item.id) ? { ...item, status: MessageAttachmentStatus.Deleted, bytes: 0 } : item) }
      }) : previous)
    }

    const syncAttachments = async () => {
      if (!conversationId) return
      const ids = loadedMessages.current.filter(message => message.conversationId === conversationId &&
        message.attachments?.some(item => item.status === MessageAttachmentStatus.Ready)).map(message => message.id)
      for (let index = 0; index < ids.length && visible(); index += pageSize) {
        const tombstones = await getConversationAttachmentDeletions(conversationId, ids.slice(index, index + pageSize), signal)
        applyDeletions(tombstones)
      }
    }

    const acknowledge = async (messageId: string, retry = true) => {
      if (!visible() || !conversationId || !messageId || messageId !== headId || messageId === acknowledged) return
      if (acknowledging) { pendingRead = messageId; return }
      acknowledging = true
      try {
        const read = await markConversationRead(conversationId, messageId, signal)
        if (!current()) return
        acknowledged = messageId
        onRead(conversationId, read.unreadCount)
        if (read.notificationsChanged) window.dispatchEvent(new CustomEvent(CONVERSATION_READ, { detail: { ownerId, conversationId } }))
      } catch {
        if (retry && current()) {
          clearTimeout(readRetry)
          readRetry = setTimeout(() => { void acknowledge(messageId, false) }, 2_000)
        }
      } finally {
        acknowledging = false
        if (pendingRead) {
          const next = pendingRead
          pendingRead = ''
          if (next !== messageId) void acknowledge(next)
        }
      }
    }

    const loadOlder = async () => {
      if (!visible() || !conversationId || !before || loadingOlder) return
      loadingOlder = true
      update({ loadingOlder: true, olderError: '' })
      try {
        const page = await getConversationMessagePage(conversationId, before, signal)
        if (!current()) return
        before = page.nextCursor
        merge(page.items)
        update({ hasOlder: Boolean(before) })
      } catch (error) {
        update({ olderError: getErrorMessage(error, 'Chưa tải được tin nhắn cũ.') })
      } finally {
        loadingOlder = false
        update({ loadingOlder: false })
      }
    }

    const refresh = async () => {
      if (!visible() || !conversationId) return
      if (refreshing) { rerun = true; return }
      refreshing = true
      const checkAttachments = verifyAttachments
      verifyAttachments = false
      try {
        const latest = await getConversationMessagePage(conversationId, null, signal)
        if (!current()) return
        const pages = [...latest.items]
        let cursor = latest.nextCursor
        let connected = !headId || pages.some(message => message.id === headId)
        while (current() && !connected && cursor) {
          const older = await getConversationMessagePage(conversationId, cursor, signal)
          pages.push(...older.items)
          connected = older.items.some(message => message.id === headId)
          cursor = older.nextCursor
        }
        if (!current()) return
        const unverified = cachedIds
        if (unverified?.size) {
          setMessages(previous => current() ? previous.filter(message => !unverified.has(message.id)) : previous)
        }
        cachedIds = undefined
        denied = false
        if (!initialized || !headId) before = latest.nextCursor
        const nextHeadId = latest.items.at(-1)?.id ?? ''
        if (initialized && nextHeadId !== headId) refreshInbox()
        initialized = true
        headId = nextHeadId
        merge(pages)
        update({ error: '', headId, hasOlder: Boolean(before), cached: false })
        if (checkAttachments) await syncAttachments().catch(() => { verifyAttachments = true })
      } catch (error) {
        if (current() && error instanceof ApiRequestError && [401, 403, 404].includes(error.status)) {
          denied = true
          initialized = false
          before = null
          headId = ''
          cachedIds = undefined
          setMessages([])
          update({ cached: false, headId: '', hasOlder: false })
          if (slot) void removeChatSnapshot(ownerId, slot)
        }
        update({ error: getErrorMessage(error, 'Chưa tải được lịch sử tin nhắn. Vui lòng thử lại.') })
      } finally {
        refreshing = false
        if (rerun && current()) { rerun = false; schedule() }
      }
    }

    const schedule = (checkAttachments = false) => {
      if (!visible()) return
      verifyAttachments ||= checkAttachments
      if (timer) return
      timer = setTimeout(() => {
        timer = undefined
        if (conversationId) void refresh()
        else refreshInbox()
      }, 100)
    }
    const recover = () => schedule(true)
    const receive = (event: Event) => {
      const detail = (event as CustomEvent<{ ownerId: string; notification: Notification }>).detail
      if (!visible() || detail?.ownerId !== ownerId) return
      const notification = detail.notification
      if (notification?.type !== NotificationType.DirectMessage && notification?.type !== NotificationType.NewMessage) return
      if (conversationId && (notification.type === NotificationType.NewMessage || !notification.relatedEntityId || notification.relatedEntityId === conversationId)) schedule()
      else refreshInbox()
    }
    const receiveDeletion = (event: Event) => {
      const detail = (event as CustomEvent<AttachmentDeletionEvent>).detail
      if (detail?.ownerId === ownerId && detail.conversationId === conversationId) applyDeletions([detail])
    }
    commands.current = {
      retry: () => schedule(true),
      loadOlder: () => { void loadOlder() },
      acknowledge: messageId => { void acknowledge(messageId) },
      persist: rows => {
        if (current() && initialized && slot && !denied) {
          void writeChatSnapshot(ownerId, slot, rows.filter(message => message.conversationId === conversationId).slice(-pageSize))
        }
      },
    }
    if (slot) {
      void Promise.resolve().then(() => readChatSnapshot<PostMessage[]>(ownerId, slot)).then(snapshot => {
        if (!current() || initialized || denied) return
        if (snapshot?.length) {
          const rows = snapshot.filter(message => message.conversationId === conversationId)
          cachedIds = new Set(rows.map(message => message.id))
          merge(rows)
          update({ cached: rows.length > 0 })
        } else if (navigator.onLine === false) {
          update({ error: 'Chưa có tin nhắn đã lưu. Hãy kết nối mạng để tải hội thoại.' })
        }
      })
    }
    void refresh()
    window.addEventListener(NOTIFICATION_RECEIVED, receive)
    window.addEventListener(NOTIFICATION_CONNECTED, recover)
    window.addEventListener(CONVERSATION_ATTACHMENT_DELETED, receiveDeletion)
    window.addEventListener('online', recover)
    window.addEventListener('focus', recover)
    document.addEventListener('visibilitychange', recover)
    const poll = setInterval(() => { if (!hasNotificationConnection(ownerId)) recover() }, fallbackPollMs)
    return () => {
      controller.abort()
      commands.current = null
      clearTimeout(timer)
      clearTimeout(readRetry)
      clearInterval(poll)
      window.removeEventListener(NOTIFICATION_RECEIVED, receive)
      window.removeEventListener(NOTIFICATION_CONNECTED, recover)
      window.removeEventListener(CONVERSATION_ATTACHMENT_DELETED, receiveDeletion)
      window.removeEventListener('online', recover)
      window.removeEventListener('focus', recover)
      document.removeEventListener('visibilitychange', recover)
    }
  }, [conversationId, ownerId, cacheOwnerId, setMessages, refreshInbox, onRead, key])

  useEffect(() => {
    commands.current?.persist(messages)
  }, [messages, state.key, state.cached, state.headId])

  const acknowledge = useCallback((messageId: string) => commands.current?.acknowledge(messageId), [])
  return {
    loading: Boolean(key && state.key !== key),
    error: state.key === key ? state.error : '',
    olderError: state.key === key ? state.olderError : '',
    cached: state.key === key && state.cached,
    headId: state.key === key ? state.headId : '',
    hasOlder: state.key === key && state.hasOlder,
    loadingOlder: state.key === key && state.loadingOlder,
    deletedAttachments: deleted?.key === key ? deleted.ids : undefined,
    retry: () => commands.current?.retry(),
    loadOlder: () => commands.current?.loadOlder(),
    acknowledge,
  }
}
