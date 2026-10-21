import { useChangedInputs } from '../../hooks/useChangedInputs'
import { AnimatePresence, motion } from 'motion/react'
import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  ConversationSubjectType,
  deleteConversationAttachment,
  downloadConversationAttachment,
  getConversationMessages,
  getConversations,
  getMarketplacePost,
  getRentalPost,
  MessageAttachmentContext,
  MessageAttachmentStatus,
  sendConversationImages,
  sendConversationMessage,
  type PostConversation,
  type PostMessage,
  type PostMessageAttachment,
} from '../../api'
import { getStoredSession } from '../../api/client'
import { createAsyncActionGate } from '../../lib/asyncActionGate'
import {
  chatLocationKindLabel,
  encodeChatLocation,
  parseChatLocation,
  type ChatLocationPayload,
} from '../../lib/chatLocation'
import { getErrorMessage } from '../../lib/errors'
import { getDeviceLocation } from '../../lib/geolocation'
import { formatPrice } from '../../lib/labels'
import { mapPostUrl } from '../../lib/mapDeepLinks'
import { staticMapUrl } from '../../lib/mapStaticMedia'
import { marketplaceItemUrl } from '../../lib/marketplaceSellers'
import { useDismissOnOutside } from '../../lib/useDismissOnOutside'
import { ConversationListSkeleton } from '../skeletons/PageSkeletons'
import { ChoicePicker } from '../ui/ChoicePicker'
import { LiquidTabList } from '../ui/LiquidTabList'
import { AddressAutocomplete, type PlaceResult } from './AddressAutocomplete'
import './MapMessagesPanel.css'

type InboxFilter = 'all' | 'unread' | 'rental'

export type ChatShareTarget = {
  name: string
  address?: string
  lat?: number
  lng?: number
}

type Props = {
  embedded?: boolean
  /** panel = right sidebar (legacy); floating-* = Messenger dock windows */
  layout?: 'panel' | 'floating-inbox' | 'floating-thread'
  initialConversationId?: string | null
  /** Workspace thread selection — parent persists this on the messages URL. */
  onActiveConversationChange?: (conversationId: string | null) => void
  userLocation?: { lat: number; lng: number } | null
  selectedPlace?: ChatShareTarget | null
  selectedListing?: ChatShareTarget | null
  mapArea?: ChatShareTarget | null
  onFocusMap?: (loc: {
    lat: number
    lng: number
    title?: string
    address?: string
    kind?: import('../../lib/chatLocation').ChatLocationKind
    conversationId?: string
  }) => void
  /** Close this floating window (manual X only). */
  onCloseWindow?: () => void
  /** Inbox row → open a conversation window (dock). */
  onPickConversation?: (conversationId: string) => void
  /** Bump to refresh inbox (e.g. new DirectMessage notification). */
  refreshKey?: number
}

type AttachMode = 'menu' | 'address' | null

const attachmentContextLabel: Record<number, string> = {
  [MessageAttachmentContext.Other]: 'Ảnh khác',
  [MessageAttachmentContext.CurrentRoom]: 'Phòng hiện tại',
  [MessageAttachmentContext.Bathroom]: 'WC / phòng tắm',
  [MessageAttachmentContext.Kitchen]: 'Bếp',
  [MessageAttachmentContext.Entrance]: 'Lối vào',
  [MessageAttachmentContext.UtilityMeter]: 'Đồng hồ điện nước',
  [MessageAttachmentContext.ExistingDamage]: 'Hư hỏng hiện hữu',
}

function SecureMessageImage({
  attachment,
  conversationId,
  messageId,
  mine,
  onDeleted,
  onError,
}: {
  attachment: PostMessageAttachment
  conversationId: string
  messageId: string
  mine: boolean
  onDeleted: () => void
  onError: (message: string) => void
}) {
  const [src, setSrc] = useState<string | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (attachment.status !== MessageAttachmentStatus.Ready) return
    let cancelled = false
    let objectUrl: string | null = null
    void downloadConversationAttachment(attachment.contentPath)
      .then((blob) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setSrc(objectUrl)
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true)
      })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [attachment.contentPath, attachment.status])

  if (attachment.status === MessageAttachmentStatus.Deleted) {
    return <span className="map-messages__image-deleted">Ảnh đã được người gửi xóa</span>
  }

  return (
    <figure className="map-messages__image">
      {src ? (
        <button type="button" onClick={() => window.open(src, '_blank', 'noopener,noreferrer')}>
          <img src={src} alt={attachmentContextLabel[attachment.context] ?? 'Ảnh trong tin nhắn'} />
        </button>
      ) : (
        <span className="map-messages__image-loading">
          {loadFailed ? 'Không tải được ảnh' : 'Đang tải ảnh…'}
        </span>
      )}
      <figcaption>
        {attachmentContextLabel[attachment.context] ?? 'Ảnh khác'}
        {mine ? (
          <button
            type="button"
            disabled={deleting}
            onClick={async () => {
              setDeleting(true)
              try {
                await deleteConversationAttachment(
                  conversationId,
                  messageId,
                  attachment.id,
                )
                onDeleted()
              } catch (error) {
                onError(getErrorMessage(error, 'Không xóa được ảnh'))
              } finally {
                setDeleting(false)
              }
            }}
          >
            {deleting ? 'Đang xóa…' : 'Xóa'}
          </button>
        ) : null}
      </figcaption>
    </figure>
  )
}

function PendingImagePreview({ file }: { file: File }) {
  const src = useMemo(() => URL.createObjectURL(file), [file])
  useEffect(() => {
    return () => URL.revokeObjectURL(src)
  }, [src])
  return <img src={src} alt={`Ảnh chờ gửi: ${file.name}`} />
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function highlightText(text: string, query: string): ReactNode {
  const q = query.trim()
  if (!q) return text
  try {
    const re = new RegExp(`(${escapeRegExp(q)})`, 'gi')
    const parts = text.split(re)
    return parts.map((part, i) =>
      i % 2 === 1 ? (
        <mark key={i} className="map-messages__mark">
          {part}
        </mark>
      ) : (
        part
      ),
    )
  } catch {
    return text
  }
}

function messageSearchText(body: string): string {
  const loc = parseChatLocation(body)
  if (!loc) return body
  return [loc.title, loc.address, loc.kind].filter(Boolean).join(' ')
}

function conversationPreview(
  body: string | null | undefined,
  senderId: string | null | undefined,
  myId: string | null | undefined,
): { text: string; muted: boolean } {
  if (!body?.trim()) return { text: 'Bắt đầu trò chuyện', muted: true }
  const loc = parseChatLocation(body)
  const text = loc ? '📍 Đã gửi một vị trí' : body.trim()
  if (myId && senderId && senderId === myId) return { text: `Bạn: ${text}`, muted: false }
  return { text, muted: false }
}

const AVATAR_COLORS = ['#2f855a', '#c05621', '#6b46c1', '#2b6cb0', '#b83280', '#0f766e', '#a16207', '#4c51bf']

function avatarColor(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  return (name.slice(0, 2) || '?').toUpperCase()
}

function Avatar({ name, seed, small = false, subdued = false }: { name: string; seed: string; small?: boolean; subdued?: boolean }) {
  return (
    <span className={`map-messages__avatar${small ? ' is-small' : ''}`} style={{ background: subdued ? undefined : avatarColor(seed) }} aria-hidden>
      {initialsOf(name)}
    </span>
  )
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
const DAY_MS = 86_400_000

/** Inbox stamp: "Vừa xong", "5 phút", "3 giờ", "Hôm qua", "3 thg 10" (year only when not this year). */
function relativeTime(iso: string, now = new Date()): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const diff = now.getTime() - d.getTime()
  if (diff < 60_000) return 'Vừa xong'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} phút`
  const days = Math.round((startOfDay(now) - startOfDay(d)) / DAY_MS)
  if (days === 0) return `${Math.floor(diff / 3_600_000)} giờ`
  if (days === 1) return 'Hôm qua'
  return d.getFullYear() === now.getFullYear()
    ? `${d.getDate()} thg ${d.getMonth() + 1}`
    : `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
}

function dayLabel(iso: string, now = new Date()): string {
  const d = new Date(iso)
  const days = Math.round((startOfDay(now) - startOfDay(d)) / DAY_MS)
  if (days === 0) return 'Hôm nay'
  if (days === 1) return 'Hôm qua'
  return d.getFullYear() === now.getFullYear()
    ? `${d.getDate()} thg ${d.getMonth() + 1}`
    : `${d.getDate()} thg ${d.getMonth() + 1}, ${d.getFullYear()}`
}

const clock = (iso: string) => new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })

const GROUP_GAP_MS = 5 * 60_000

const subjectTag: Record<number, { label: string; tone: string }> = {
  [ConversationSubjectType.RentalPost]: { label: 'Phòng thuê', tone: 'room' },
  [ConversationSubjectType.MarketplacePost]: { label: 'Chợ đồ', tone: 'market' },
  [ConversationSubjectType.WantedPost]: { label: 'Tin cần tìm', tone: 'wanted' },
}

type ContextItem = {
  key: string
  kind: string
  title: string
  detail?: string
  thumb?: string | null
  href?: string
  at: number
  onOpen?: () => void
}

type SubjectInfo = { conversationId: string; title: string; price?: number; thumb: string | null; href: string }

function directionsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}

function LocationBubble({
  payload,
  onOpen,
  query,
  conversationId = null,
}: {
  payload: ChatLocationPayload
  onOpen?: (loc: {
    lat: number
    lng: number
    title?: string
    address?: string
    kind?: ChatLocationPayload['kind']
    conversationId?: string
  }) => void
  query: string
  conversationId?: string | null
}) {
  const hasCoords = payload.lat != null && payload.lng != null
  const thumb =
    hasCoords
      ? staticMapUrl(
          { lat: payload.lat!, lng: payload.lng! },
          { width: 360, height: 140, zoom: 15 },
        )
      : null
  return (
    <div className="map-messages__loc">
      {thumb ? (
        <img
          className="map-messages__loc-map"
          src={thumb}
          alt=""
          loading="lazy"
        />
      ) : hasCoords ? (
        <span className="map-messages__loc-map is-fallback" aria-hidden><i /></span>
      ) : null}
      <span className="map-messages__loc-kind">{chatLocationKindLabel(payload.kind)}</span>
      <strong className="map-messages__loc-title">{highlightText(payload.title, query)}</strong>
      {payload.address ? (
        <p className="map-messages__loc-address">{highlightText(payload.address, query)}</p>
      ) : null}
      {hasCoords ? (
        <p className="map-messages__loc-coords">
          {payload.lat!.toFixed(5)}, {payload.lng!.toFixed(5)}
        </p>
      ) : null}
      {hasCoords ? (
        <div className="map-messages__loc-actions">
          <a className="map-messages__loc-btn liquid-action" href={directionsUrl(payload.lat!, payload.lng!)} target="_blank" rel="noopener noreferrer">
            Chỉ đường
          </a>
      {onOpen ? (
        <button
          type="button"
          className="map-messages__loc-btn is-ghost map-motion-press"
          onClick={() =>
            onOpen({
              lat: payload.lat!,
              lng: payload.lng!,
              title: payload.title,
              address: payload.address,
              kind: payload.kind,
              conversationId: conversationId || undefined,
            })
          }
        >
          Mở trên bản đồ
        </button>
      ) : null}
        </div>
      ) : null}
    </div>
  )
}

function ContextCard({ item, onPicked }: { item: ContextItem; onPicked?: () => void }) {
  const inner = (
    <>
      <span className="map-messages__ctx-thumb">
        {item.thumb ? <img src={item.thumb} alt="" loading="lazy" /> : <svg viewBox="0 0 24 24" aria-hidden><path d="M3 10.5 12 4l9 6.5V20H3z" /></svg>}
      </span>
      <span className="map-messages__ctx-copy">
        <strong>{item.title}</strong>
        <small>
          {item.detail ? <b>{item.detail}</b> : null}
          <span>{item.kind}</span>
        </small>
      </span>
      <span className="map-messages__ctx-go" aria-hidden>›</span>
    </>
  )
  if (item.onOpen) {
    return <button type="button" className="map-messages__ctx-card" onClick={() => { item.onOpen?.(); onPicked?.() }}>{inner}</button>
  }
  const external = item.href?.startsWith('http')
  return (
    <a className="map-messages__ctx-card" href={item.href} onClick={onPicked}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{inner}</a>
  )
}

export function MapMessagesPanel({
  embedded = false,
  layout = 'panel',
  initialConversationId = null,
  onActiveConversationChange,
  userLocation = null,
  selectedPlace = null,
  selectedListing = null,
  mapArea = null,
  onFocusMap,
  onCloseWindow,
  onPickConversation,
  refreshKey = 0,
}: Props) {
  const isFloatingInbox = layout === 'floating-inbox'
  const isFloatingThread = layout === 'floating-thread'
  const isFloating = isFloatingInbox || isFloatingThread
  /** FeatureWorkspace page (not map dock): split inbox | thread. */
  const isWorkspace = embedded && !isFloating

  const [conversations, setConversations] = useState<PostConversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(initialConversationId)
  const [appliedInitialId, setAppliedInitialId] = useState(initialConversationId)
  const currentThread = useRef({ id: activeId, version: 0 })
  useLayoutEffect(() => {
    currentThread.current = { id: activeId, version: currentThread.current.version + 1 }
    return () => { currentThread.current = { id: null, version: currentThread.current.version + 1 } }
  }, [activeId])
  const [messages, setMessages] = useState<PostMessage[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const sendGate = useRef(createAsyncActionGate())
  const gpsGate = useRef(createAsyncActionGate())
  const [error, setError] = useState<string | null>(null)
  const [threadVisible, setThreadVisible] = useState(
    isFloatingThread || Boolean(initialConversationId),
  )
  const [attachMode, setAttachMode] = useState<AttachMode>(null)
  const [addressDraft, setAddressDraft] = useState('')
  const [addressPlace, setAddressPlace] = useState<PlaceResult | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [inboxQuery, setInboxQuery] = useState('')
  const [inboxFilter, setInboxFilter] = useState<InboxFilter>('all')
  const [matchIndex, setMatchIndex] = useState(0)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imageContext, setImageContext] = useState<MessageAttachmentContext>(
    MessageAttachmentContext.CurrentRoom,
  )
  const me = getStoredSession()?.userId
  const bottomRef = useRef<HTMLDivElement>(null)
  const attachRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchBarRef = useRef<HTMLDivElement>(null)
  const searchToggleRef = useRef<HTMLButtonElement>(null)
  const inboxSearchRef = useRef<HTMLLabelElement>(null)
  const [inboxFocused, setInboxFocused] = useState(false)
  useDismissOnOutside(inboxFocused, [inboxSearchRef], () => {
    setInboxFocused(false)
    inboxSearchRef.current?.querySelector('input')?.blur()
  })
  useDismissOnOutside(searchOpen, [searchBarRef, searchToggleRef], () => {
    setSearchOpen(false)
    searchInputRef.current?.blur()
  })
  const imageInputRef = useRef<HTMLInputElement>(null)
  const matchRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  if (initialConversationId !== appliedInitialId) {
    setAppliedInitialId(initialConversationId)
    if (initialConversationId) {
      setActiveId(initialConversationId)
      setThreadVisible(true)
    } else {
      setActiveId(null)
      setThreadVisible(isFloatingThread)
    }
  }

  const loadConversations = useCallback(async (opts?: { soft?: boolean }) => {
    if (!opts?.soft) setLoading(true)
    setError(null)
    try {
      const list = await getConversations()
      setConversations(list)
    } catch (e) {
      setError(getErrorMessage(e, 'Không tải được tin nhắn'))
    } finally {
      if (!opts?.soft) setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => { if (!cancelled) void loadConversations() })
    return () => { cancelled = true }
  }, [loadConversations])

  useEffect(() => {
    if (!refreshKey) return
    void Promise.resolve().then(() => loadConversations({ soft: true }))
  }, [refreshKey, loadConversations])

  if (useChangedInputs([activeId], true)) {
    setMessages([])
    setConversations(prev => prev.map(c => c.id === activeId ? { ...c, unreadCount: 0 } : c))
  }
  useEffect(() => {
    if (!activeId) return
    let cancelled = false
    void getConversationMessages(activeId)
      .then((msgs) => {
        if (!cancelled) setMessages(msgs)
      })
      .catch(() => {
        if (!cancelled) setMessages([])
      })
    return () => {
      cancelled = true
    }
  }, [activeId])

  useEffect(() => {
    if (searchQuery.trim()) return
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, threadVisible, searchQuery])

  useEffect(() => {
    if (!attachMode) return
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node | null
      if (t && attachRef.current?.contains(t)) return
      setAttachMode(null)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [attachMode])

  useEffect(() => {
    if (!searchOpen) return
    searchInputRef.current?.focus()
  }, [searchOpen])

  const active = conversations.find((c) => c.id === activeId) ?? null
  const peerName = active?.otherParticipantName?.trim() || 'Người dùng'

  // Conversation subject (room / item) for the header context card.
  const [subject, setSubject] = useState<SubjectInfo | null>(null)
  const [ctxOpen, setCtxOpen] = useState(false)
  const ctxRef = useRef<HTMLDivElement>(null)
  useDismissOnOutside(ctxOpen, [ctxRef], () => setCtxOpen(false))
  const subjectKey = active ? `${active.id}|${active.subjectType}|${active.subjectId}` : ''
  useEffect(() => {
    if (!subjectKey) return
    const [conversationId, typeRaw, subjectId] = subjectKey.split('|')
    const type = Number(typeRaw)
    let cancelled = false
    const done = (info: Omit<SubjectInfo, 'conversationId'>) => {
      if (!cancelled) setSubject({ conversationId, ...info })
    }
    if (type === ConversationSubjectType.RentalPost) {
      void getRentalPost(subjectId).then((post) => done({
        title: post.title,
        price: post.price,
        thumb: post.thumbnailPath,
        href: mapPostUrl(post.id),
      })).catch(() => undefined)
    } else if (type === ConversationSubjectType.MarketplacePost) {
      void getMarketplacePost(subjectId).then((post) => done({
        title: post.title,
        price: post.price,
        thumb: post.mediaUrls?.find((url) => url.trim()) ?? null,
        href: marketplaceItemUrl(post),
      })).catch(() => undefined)
    }
    return () => { cancelled = true }
  }, [subjectKey])

  const contextItems = useMemo<ContextItem[]>(() => {
    const items: ContextItem[] = []
    if (active && subject?.conversationId === active.id) {
      items.push({
        key: 'subject',
        kind: subjectTag[active.subjectType]?.label ?? 'Tin đăng',
        title: subject.title,
        detail: subject.price != null ? formatPrice(subject.price) : undefined,
        thumb: subject.thumb,
        href: subject.href,
        at: new Date(active.createdAt).getTime(),
      })
    }
    for (const m of messages) {
      const loc = parseChatLocation(m.body)
      if (!loc || loc.kind !== 'place') continue
      const hasCoords = loc.lat != null && loc.lng != null
      items.push({
        key: m.id,
        kind: 'Đã chia sẻ',
        title: loc.title,
        detail: loc.address,
        thumb: hasCoords ? staticMapUrl({ lat: loc.lat!, lng: loc.lng! }, { width: 96, height: 96, zoom: 15 }) : null,
        href: hasCoords && !onFocusMap ? directionsUrl(loc.lat!, loc.lng!) : undefined,
        onOpen: hasCoords && onFocusMap
          ? () => onFocusMap({ lat: loc.lat!, lng: loc.lng!, title: loc.title, address: loc.address, kind: loc.kind, conversationId: m.conversationId })
          : undefined,
        at: new Date(m.sentAt).getTime(),
      })
    }
    return items.sort((a, b) => b.at - a.at)
  }, [active, subject, messages, onFocusMap])
  const primaryContext = contextItems[0] ?? null

  const matchedIds = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return [] as string[]
    return messages
      .filter((m) => messageSearchText(m.body).toLowerCase().includes(q))
      .map((m) => m.id)
  }, [messages, searchQuery])

  if (useChangedInputs([searchQuery, activeId])) {
    setMatchIndex(0)

  }

  useEffect(() => {
    if (!matchedIds.length) return
    const id = matchedIds[Math.min(matchIndex, matchedIds.length - 1)]
    const el = matchRefs.current.get(id)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [matchedIds, matchIndex])

  const resetAddressDraft = () => {
    setAddressDraft('')
    setAddressPlace(null)
  }

  const openThread = (id: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c)),
    )
    if (onPickConversation) {
      onPickConversation(id)
      // Opening a floating thread marks read via getConversationMessages.
      void getConversationMessages(id).catch(() => undefined)
      return
    }
    setActiveId(id)
    setThreadVisible(true)
    setAttachMode(null)
    resetAddressDraft()
    setSearchOpen(false)
    setSearchQuery('')
    setImageFiles([])
    onActiveConversationChange?.(id)
  }

  const closeThread = () => {
    if (isFloatingThread && onCloseWindow) {
      onCloseWindow()
      return
    }
    setThreadVisible(false)
    if (isWorkspace) {
      setActiveId(null)
      onActiveConversationChange?.(null)
    }
    setAttachMode(null)
    resetAddressDraft()
    setSearchOpen(false)
    setSearchQuery('')
    setImageFiles([])
  }

  const appendSentMessage = (msg: PostMessage) => {
    setConversations((prev) => {
      const next = prev.map(c => c.id === msg.conversationId ? { ...c, lastMessage: msg.body, lastMessageSenderId: msg.senderId, updatedAt: msg.sentAt, unreadCount: 0 } : c)
      return next.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    })
  }

  const appendToCurrentThread = (msg: PostMessage, thread: { id: string | null; version: number }) => {
    if (msg.conversationId !== thread.id || currentThread.current.id !== thread.id || currentThread.current.version !== thread.version) return false
    setMessages((prev) => prev.some(item => item.id === msg.id) ? prev : [...prev, msg])
    return true
  }

  const sendBody = async (body: string) => sendGate.current(async () => {
    if (!activeId || currentThread.current.id !== activeId || !body.trim() || sending) return
    const thread = { ...currentThread.current }
    setSending(true)
    setError(null)
    try {
      const msg = await sendConversationMessage(activeId, body.trim())
      appendSentMessage(msg)
      if (!appendToCurrentThread(msg, thread)) return
      setDraft('')
      setAttachMode(null)
      resetAddressDraft()
    } catch (e) {
      if (currentThread.current.version === thread.version) setError(getErrorMessage(e, 'Gửi thất bại'))
    } finally {
      setSending(false)
    }
  })

  const handleSend = async () => {
    await sendBody(draft)
  }

  const handleImageSelection = (files: FileList | null) => {
    if (!files) return
    const selected = Array.from(files)
    if (selected.length > 5) {
      setError('Mỗi lần chỉ gửi tối đa 5 ảnh.')
      return
    }
    const invalid = selected.find(
      (file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024,
    )
    if (invalid) {
      setError('Chỉ nhận JPEG, PNG hoặc WebP; tối đa 8 MB mỗi ảnh.')
      return
    }
    setError(null)
    setImageFiles(selected)
    setAttachMode(null)
  }

  const handleSendImages = async () => sendGate.current(async () => {
    if (!activeId || currentThread.current.id !== activeId || imageFiles.length === 0 || sending) return
    const thread = { ...currentThread.current }
    setSending(true)
    setError(null)
    try {
      const msg = await sendConversationImages(activeId, imageFiles, imageContext, draft)
      appendSentMessage(msg)
      if (!appendToCurrentThread(msg, thread)) return
      setDraft('')
      setImageFiles([])
      if (imageInputRef.current) imageInputRef.current.value = ''
    } catch (e) {
      if (currentThread.current.version === thread.version) setError(getErrorMessage(e, 'Gửi ảnh thất bại'))
    } finally {
      setSending(false)
    }
  })

  const sendLocation = async (payload: ChatLocationPayload) => {
    await sendBody(encodeChatLocation(payload))
  }

  const handleSendGps = async () => gpsGate.current(async () => {
    const thread = { ...currentThread.current }
    let loc = userLocation
    if (!loc) {
      try {
        const device = await getDeviceLocation()
        loc = { lat: device.lat, lng: device.lng }
      } catch (e) {
        setError(getErrorMessage(e, 'Không lấy được vị trí thiết bị'))
        setAttachMode(null)
        return
      }
    }
    if (currentThread.current.id !== thread.id || currentThread.current.version !== thread.version) return
    await sendLocation({
      kind: 'gps',
      title: 'Vị trí của tôi',
      lat: loc.lat,
      lng: loc.lng,
    })
  })

  const handleSendAddress = async () => {
    if (!addressPlace) {
      setError('Chọn địa chỉ từ gợi ý Google Maps — không gửi được chữ nhập tay.')
      return
    }
    await sendLocation({
      kind: 'address',
      title: addressPlace.address,
      address: addressPlace.address,
      lat: addressPlace.lat,
      lng: addressPlace.lng,
    })
    resetAddressDraft()
  }

  const handleSendTarget = async (
    kind: 'place' | 'area' | 'address',
    target: ChatShareTarget,
    fallbackTitle: string,
  ) => {
    await sendLocation({
      kind,
      title: target.name || fallbackTitle,
      address: target.address,
      lat: target.lat,
      lng: target.lng,
    })
  }

  const unreadTotal = conversations.reduce((n, c) => n + (c.unreadCount ?? 0), 0)
  const filteredConversations = useMemo(() => {
    const q = inboxQuery.trim().toLowerCase()
    return conversations.filter((c) => {
      if (inboxFilter === 'unread' && !(c.unreadCount > 0)) return false
      if (inboxFilter === 'rental' && c.subjectType !== 1) return false
      if (!q) return true
      const hay = `${c.otherParticipantName ?? ''} ${c.lastMessage ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [conversations, inboxFilter, inboxQuery])


  return (
    <div data-glass-exclude
      className={`map-messages${embedded ? ' is-embedded' : ''}${
        isWorkspace ? ' is-workspace' : ''
      }${isFloating ? ' is-floating' : ''}${isFloatingInbox ? ' is-floating-inbox' : ''}${
        isFloatingThread || threadVisible ? ' is-thread' : ' is-inbox'
      }`}
    >

      {isFloatingInbox ? (
        <header className="map-messages__float-head">
          <strong>Tin nhắn</strong>
          <button
            type="button"
            className="map-messages__float-close map-motion-press"
            aria-label="Đóng hộp thư"
            onClick={() => onCloseWindow?.()}
          >
            ✕
          </button>
        </header>
      ) : null}

      {!isWorkspace && !threadVisible && !isFloatingInbox && !isFloatingThread ? (
        <header className="map-messages__panel-head">
          <h2 className="map-messages__panel-title">Tin nhắn</h2>
        </header>
      ) : null}

      {error ? <p className="map-messages__error map-motion-fade">{error}</p> : null}

      <div className={isWorkspace ? 'map-messages__split' : undefined}>
      {!isFloatingThread ? (
      <div
        className={`map-messages__inbox${
          isWorkspace || isFloatingInbox || !threadVisible ? ' is-visible' : ''
        }`}
      >
        {isWorkspace ? (
          <>
            <header className="map-messages__inbox-head">
              <h1 className="map-messages__inbox-title">Tin nhắn</h1>
              <a href="/?section=listings" className="map-messages__new-icon liquid-action" aria-label="Tin nhắn mới" title="Tin nhắn mới">
                <svg viewBox="0 0 24 24" aria-hidden><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
              </a>
            </header>
            <label className="map-messages__inbox-search" ref={inboxSearchRef}>
              <input
                type="search"
                placeholder="Tìm cuộc trò chuyện"
                aria-label="Tìm cuộc trò chuyện"
                value={inboxQuery}
                onChange={(e) => setInboxQuery(e.target.value)}
                onFocus={() => setInboxFocused(true)}
              />
            </label>
            <LiquidTabList className="map-messages__inbox-filters" role="tablist" aria-label="Lọc hộp thư">
              <button
                type="button"
                role="tab"
                aria-selected={inboxFilter === 'all'}
                className={inboxFilter === 'all' ? 'is-active' : ''}
                onClick={() => setInboxFilter('all')}
              >
                Tất cả
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={inboxFilter === 'unread'}
                className={inboxFilter === 'unread' ? 'is-active' : ''}
                onClick={() => setInboxFilter('unread')}
              >
                Chưa đọc{unreadTotal > 0 ? <span className="map-messages__filter-count" aria-label={`${unreadTotal} tin chưa đọc`}>{unreadTotal > 99 ? '99+' : unreadTotal}</span> : null}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={inboxFilter === 'rental'}
                className={inboxFilter === 'rental' ? 'is-active' : ''}
                onClick={() => setInboxFilter('rental')}
              >
                Phòng thuê
              </button>
            </LiquidTabList>
          </>
        ) : null}
        {loading ? <ConversationListSkeleton /> : null}
        {!loading && filteredConversations.length === 0 ? (
          <p className="map-messages__empty">
            {conversations.length === 0
              ? 'Chưa có cuộc trò chuyện. Mở tin đăng và chọn “Nhắn tin”.'
              : 'Không có cuộc trò chuyện khớp bộ lọc.'}
          </p>
        ) : null}
        <ul className="map-messages__conv-list">
          {filteredConversations.map((c, i) => (
            <li key={c.id} style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
              <button
                type="button"
                data-glass-exclude=""
                aria-current={activeId === c.id ? 'true' : undefined}
                className={`map-messages__row${activeId === c.id ? ' is-active' : ''}${
                  (c.unreadCount ?? 0) > 0 ? ' is-unread' : ''
                }`}
                onClick={() => openThread(c.id)}
              >
                <Avatar name={c.otherParticipantName || '?'} seed={c.otherParticipantId || c.id} subdued />
                <span className="map-messages__meta">
                  <span className="map-messages__meta-top">
                    <strong title={c.otherParticipantName || 'Người dùng'}>{c.otherParticipantName || 'Người dùng'}</strong>
                    <time className="map-messages__time" dateTime={c.updatedAt}>
                      {relativeTime(c.updatedAt)}
                    </time>
                  </span>
                  <span className="map-messages__meta-bottom">
                    {(() => {
                      const pv = conversationPreview(c.lastMessage, c.lastMessageSenderId, me)
                      return <small className={`map-messages__preview${pv.muted ? ' is-muted' : ''}`}>{pv.text}</small>
                    })()}
                    {(c.unreadCount ?? 0) > 0 ? (
                      <span className="map-messages__unread-badge" aria-label={`${c.unreadCount} tin chưa đọc`}>
                        {c.unreadCount > 99 ? '99+' : c.unreadCount}
                      </span>
                    ) : null}
                  </span>
                  {subjectTag[c.subjectType] ? (
                    <span className={`map-messages__tag is-${subjectTag[c.subjectType].tone}`}>{subjectTag[c.subjectType].label}</span>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      ) : null}

      {!isFloatingInbox ? (
      <div
        className={`map-messages__thread${
          isWorkspace || isFloatingThread || threadVisible ? ' is-visible' : ''
        }`}
        aria-hidden={!(isWorkspace || isFloatingThread || threadVisible)}
      >
        {isWorkspace && !activeId ? (
          <div className="map-messages__thread-empty">
            <p className="map-messages__empty">Chọn một cuộc trò chuyện để bắt đầu nhắn tin.</p>
          </div>
        ) : (
          <>
        <header className="map-messages__thread-head">
          {isFloatingThread ? null : (
            <button type="button" className="map-messages__back map-motion-press" onClick={closeThread} aria-label="Quay lại hộp thư">
              <svg viewBox="0 0 24 24" aria-hidden><path d="m15 6-6 6 6 6" /></svg>
            </button>
          )}
          <Avatar name={peerName} seed={active?.otherParticipantId || activeId || peerName} small />
          <div className="map-messages__thread-titles">
            <strong className="map-messages__peer-name" title={peerName}>
              {peerName}
            </strong>
            {active && subjectTag[active.subjectType] ? (
              <small className="map-messages__peer-sub">{subjectTag[active.subjectType].label}</small>
            ) : null}
          </div>

          {primaryContext ? (
            <div className="map-messages__ctx" ref={ctxRef}>
              <ContextCard item={primaryContext} />
              {contextItems.length > 1 ? (
                <button
                  type="button"
                  className={`map-messages__ctx-more${ctxOpen ? ' is-open' : ''}`}
                  aria-expanded={ctxOpen}
                  aria-haspopup="dialog"
                  aria-label={`Xem ${contextItems.length} mục đã nhắc trong cuộc trò chuyện`}
                  onClick={() => setCtxOpen((v) => !v)}
                >
                  +{contextItems.length - 1}
                </button>
              ) : null}
              <AnimatePresence>
                {ctxOpen ? (
                  <motion.div
                    className="map-messages__ctx-pop"
                    role="dialog"
                    aria-label="Các mục trong cuộc trò chuyện"
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 520, damping: 34 }}
                    onKeyDown={(e) => { if (e.key === 'Escape') setCtxOpen(false) }}
                  >
                    <strong className="map-messages__ctx-pop-title">Đã nhắc trong cuộc trò chuyện</strong>
                    <ul>
                      {contextItems.map((item) => (
                        <li key={item.key}><ContextCard item={item} onPicked={() => setCtxOpen(false)} /></li>
                      ))}
                    </ul>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          ) : null}

          <div className="map-messages__thread-actions">
            <button
              ref={searchToggleRef}
              type="button"
              className={`map-messages__icon-btn map-motion-press${searchOpen ? ' is-active' : ''}`}
              aria-label="Tìm kiếm tin nhắn"
              aria-pressed={searchOpen}
              onClick={() => setSearchOpen((v) => !v)}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                <path
                  fill="currentColor"
                  d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
                />
              </svg>
            </button>
            {isFloatingThread && onCloseWindow ? (
              <button
                type="button"
                className="map-messages__icon-btn map-messages__float-close map-motion-press"
                aria-label="Đóng cửa sổ chat"
                onClick={onCloseWindow}
              >
                ✕
              </button>
            ) : null}
          </div>
        </header>

        {searchOpen ? (
          <div className="map-messages__search-bar" ref={searchBarRef}>
            <input
              ref={searchInputRef}
              className="map-messages__search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo từ khóa…"
              aria-label="Tìm kiếm theo từ khóa trong hội thoại"
            />
            <span className="map-messages__search-count" aria-live="polite">
              {searchQuery.trim()
                ? matchedIds.length
                  ? `${Math.min(matchIndex + 1, matchedIds.length)}/${matchedIds.length}`
                  : '0'
                : ''}
            </span>
            <button
              type="button"
              className="map-messages__icon-btn"
              aria-label="Kết quả trước"
              disabled={!matchedIds.length}
              onClick={() =>
                setMatchIndex((i) => (i - 1 + matchedIds.length) % matchedIds.length)
              }
            >
              ↑
            </button>
            <button
              type="button"
              className="map-messages__icon-btn"
              aria-label="Kết quả sau"
              disabled={!matchedIds.length}
              onClick={() => setMatchIndex((i) => (i + 1) % matchedIds.length)}
            >
              ↓
            </button>
            <button
              type="button"
              className="map-messages__icon-btn"
              aria-label="Đóng tìm kiếm"
              onClick={() => {
                setSearchOpen(false)
                setSearchQuery('')
              }}
            >
              ✕
            </button>
          </div>
        ) : null}

        <div className="map-messages__bubbles">
          <AnimatePresence initial={false}>
          {messages.map((m, idx) => {
            const mine = me != null && m.senderId === me
            const location = parseChatLocation(m.body)
            const isHit = matchedIds.includes(m.id)
            const isCurrent =
              isHit && matchedIds[Math.min(matchIndex, matchedIds.length - 1)] === m.id
            const prev = messages[idx - 1]
            const next = messages[idx + 1]
            const t = new Date(m.sentAt).getTime()
            const newDay = !prev || startOfDay(new Date(prev.sentAt)) !== startOfDay(new Date(m.sentAt))
            const joinsPrev = !newDay && prev?.senderId === m.senderId && t - new Date(prev.sentAt).getTime() < GROUP_GAP_MS
            const nextNewDay = !next || startOfDay(new Date(next.sentAt)) !== startOfDay(new Date(m.sentAt))
            const joinsNext = !nextNewDay && next?.senderId === m.senderId && new Date(next.sentAt).getTime() - t < GROUP_GAP_MS
            const hasText = !location && m.body.trim().length > 0
            return (
              <Fragment key={m.id}>
              {newDay ? <div className="map-messages__day" role="separator">{dayLabel(m.sentAt)}</div> : null}
              <motion.div
                ref={(el: HTMLDivElement | null) => {
                  if (el) matchRefs.current.set(m.id, el)
                  else matchRefs.current.delete(m.id)
                }}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 460, damping: 32 }}
                className={`map-messages__bubble${mine ? ' is-mine' : ''}${
                  location ? ' is-location' : ''
                }${joinsPrev ? ' joins-prev' : ''}${joinsNext ? ' joins-next' : ''}${!hasText && !location ? ' is-media' : ''}${isHit ? ' is-hit' : ''}${isCurrent ? ' is-hit-current' : ''}`}
              >
                {!mine && !joinsNext ? (
                  <span className="map-messages__bubble-avatar"><Avatar name={peerName} seed={m.senderId} small /></span>
                ) : null}
                <div className="map-messages__bubble-body">
                {m.attachments?.length ? (
                  <div className="map-messages__images">
                    {m.attachments.map((attachment) => (
                      <SecureMessageImage
                        key={attachment.id}
                        attachment={attachment}
                        conversationId={m.conversationId}
                        messageId={m.id}
                        mine={mine}
                        onError={setError}
                        onDeleted={() => {
                          setMessages((previous) => previous.map((message) =>
                            message.id === m.id
                              ? {
                                  ...message,
                                  attachments: message.attachments?.map((item) =>
                                    item.id === attachment.id
                                      ? { ...item, status: MessageAttachmentStatus.Deleted }
                                      : item,
                                  ),
                                }
                              : message,
                          ))
                        }}
                      />
                    ))}
                  </div>
                ) : null}
                {location ? (
                  <LocationBubble
                    payload={location}
                    onOpen={onFocusMap}
                    query={searchQuery}
                    conversationId={activeId}
                  />
                ) : hasText ? (
                  <p>{highlightText(m.body, searchQuery)}</p>
                ) : null}
                </div>
                {!joinsNext ? <time dateTime={m.sentAt}>{clock(m.sentAt)}</time> : null}
              </motion.div>
              </Fragment>
            )
          })}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>

        <div className="map-messages__composer-wrap" ref={attachRef}>
          {attachMode === 'menu' ? (
            <div className="map-messages__attach-menu" role="menu">
              <button
                type="button"
                role="menuitem"
                disabled={sending}
                onClick={() => imageInputRef.current?.click()}
              >
                <svg viewBox="0 0 24 24" aria-hidden><rect x="3" y="5" width="18" height="14" rx="3" /><circle cx="9" cy="11" r="2" /><path d="m21 16-5-5-8 8" /></svg>Gửi ảnh phòng…
              </button>
              <button type="button" role="menuitem" disabled={sending} onClick={() => void handleSendGps()}>
                <svg viewBox="0 0 24 24" aria-hidden><path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>Gửi vị trí hiện tại
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={sending}
                onClick={() => {
                  resetAddressDraft()
                  setAttachMode('address')
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden><path d="M3 21h18M5 21V8l7-5 7 5v13" /><path d="M9 21v-6h6v6" /></svg>Gửi địa chỉ…
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={sending || !selectedPlace}
                title={selectedPlace ? undefined : 'Chọn địa điểm trên bản đồ trước'}
                onClick={() =>
                  selectedPlace &&
                  void handleSendTarget('place', selectedPlace, 'Địa điểm trên bản đồ')
                }
              >
                <svg viewBox="0 0 24 24" aria-hidden><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5Z" /></svg>Gửi địa điểm{selectedPlace ? `: ${selectedPlace.name}` : ''}
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={sending || !selectedListing}
                title={selectedListing ? undefined : 'Mở tin đăng trên bản đồ trước'}
                onClick={() =>
                  selectedListing &&
                  void handleSendTarget('place', selectedListing, 'Tin đăng')
                }
              >
                <svg viewBox="0 0 24 24" aria-hidden><path d="M4 5h16v14H4z" /><path d="M8 9h8M8 13h5" /></svg>Gửi tin đăng{selectedListing ? `: ${selectedListing.name}` : ''}
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={sending || !mapArea}
                onClick={() =>
                  mapArea && void handleSendTarget('area', mapArea, 'Khu vực')
                }
              >
                <svg viewBox="0 0 24 24" aria-hidden><path d="M4 4h16v16H4z" strokeDasharray="3 3" /></svg>Gửi khu vực{mapArea ? `: ${mapArea.name}` : ''}
              </button>
            </div>
          ) : null}

          <input
            ref={imageInputRef}
            className="map-messages__image-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(event) => handleImageSelection(event.target.files)}
          />

          {imageFiles.length > 0 ? (
            <section className="map-messages__image-review" aria-label="Xem lại ảnh trước khi gửi">
              <div className="map-messages__image-review-head">
                <strong>{imageFiles.length} ảnh chờ gửi</strong>
                <button
                  type="button"
                  disabled={sending}
                  onClick={() => {
                    setImageFiles([])
                    if (imageInputRef.current) imageInputRef.current.value = ''
                  }}
                >
                  Bỏ ảnh
                </button>
              </div>
              <div className="map-messages__image-previews">
                {imageFiles.map((file) => (
                  <PendingImagePreview key={`${file.name}-${file.lastModified}`} file={file} />
                ))}
              </div>
              <label>
                Nội dung ảnh
                <ChoicePicker
                  value={imageContext}
                  disabled={sending}
                  onChange={(event) => setImageContext(Number(event.target.value) as MessageAttachmentContext)}
                >
                  {Object.entries(attachmentContextLabel).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </ChoicePicker>
              </label>
              <small>Ảnh được kiểm tra, xóa EXIF/GPS và chỉ thành viên cuộc trò chuyện xem được.</small>
            </section>
          ) : null}

          {attachMode === 'address' ? (
            <form
              className="map-messages__address-form"
              onSubmit={(e) => {
                e.preventDefault()
                void handleSendAddress()
              }}
            >
              <div className="map-messages__address-field">
                <AddressAutocomplete
                  value={addressDraft}
                  onChange={(value) => {
                    setAddressDraft(value)
                    if (addressPlace && value.trim() !== addressPlace.address.trim()) {
                      setAddressPlace(null)
                    }
                  }}
                  onPlaceSelect={(place) => {
                    setAddressDraft(place.address)
                    setAddressPlace(place)
                    setError(null)
                  }}
                  placeholder="Gõ và chọn địa chỉ trên Google Maps…"
                  className="map-messages__address-input"
                />
                {addressPlace ? (
                  <p className="map-messages__address-hint is-ok">
                    Đã khớp bản đồ ({addressPlace.lat.toFixed(5)}, {addressPlace.lng.toFixed(5)})
                  </p>
                ) : (
                  <p className="map-messages__address-hint">
                    Phải chọn một gợi ý — đối phương mới mở đúng vị trí trên bản đồ.
                  </p>
                )}
              </div>
              <button type="submit" disabled={!addressPlace || sending}>
                Gửi địa chỉ
              </button>
              <button
                type="button"
                className="is-ghost"
                onClick={() => {
                  resetAddressDraft()
                  setAttachMode('menu')
                }}
              >
                Huỷ
              </button>
            </form>
          ) : null}

          <form
            className="map-messages__composer"
            onSubmit={(e) => {
              e.preventDefault()
              void (imageFiles.length > 0 ? handleSendImages() : handleSend())
            }}
          >
            <button
              type="button"
              className={`map-messages__attach-btn map-motion-press${attachMode ? ' is-open' : ''}`}
              aria-label="Đính kèm vị trí hoặc địa chỉ"
              aria-expanded={attachMode != null}
              disabled={!activeId || sending}
              onClick={() => setAttachMode((m) => (m ? null : 'menu'))}
            >
              <svg viewBox="0 0 24 24" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
            </button>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={activeId ? `Nhắn cho ${peerName}…` : 'Nhập tin nhắn…'}
              aria-label="Nội dung tin nhắn"
              disabled={!activeId}
            />
            <button
              type="submit"
              className="map-messages__send map-motion-press"
              aria-label="Gửi"
              title="Gửi"
              disabled={(imageFiles.length === 0 && !draft.trim()) || sending}
            >
              <svg viewBox="0 0 24 24" aria-hidden><path d="M5 12h13M13 6l6 6-6 6" /></svg>
            </button>
          </form>
        </div>
          </>
        )}
      </div>
      ) : null}
      </div>
    </div>
  )
}
