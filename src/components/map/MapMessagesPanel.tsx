import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  deleteConversationAttachment,
  downloadConversationAttachment,
  getConversationMessages,
  getConversations,
  MessageAttachmentContext,
  MessageAttachmentStatus,
  sendConversationMessage,
  sendConversationImages,
  type PostConversation,
  type PostMessage,
  type PostMessageAttachment,
} from '../../api'
import { getStoredSession } from '../../api/client'
import {
  chatLocationKindLabel,
  encodeChatLocation,
  parseChatLocation,
  type ChatLocationPayload,
} from '../../lib/chatLocation'
import { getDeviceLocation } from '../../lib/geolocation'
import { formatDate } from '../../lib/labels'
import { getErrorMessage } from '../../lib/errors'
import { AddressAutocomplete, type PlaceResult } from './AddressAutocomplete'
import { staticMapUrl } from '../../lib/mapStaticMedia'
import './MapMessagesPanel.css'

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
): string {
  if (!body?.trim()) return 'Chưa có tin nhắn'
  const loc = parseChatLocation(body)
  const text = loc ? loc.title?.trim() || 'Đã chia sẻ vị trí' : body.trim()
  if (myId && senderId && senderId === myId) return `Bạn: ${text}`
  return text
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
      {hasCoords && onOpen ? (
        <button
          type="button"
          className="map-messages__loc-btn map-motion-press"
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
  )
}

export function MapMessagesPanel({
  embedded = false,
  layout = 'panel',
  initialConversationId = null,
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

  const [conversations, setConversations] = useState<PostConversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(
    isFloatingThread ? initialConversationId : initialConversationId,
  )
  const [messages, setMessages] = useState<PostMessage[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [threadVisible, setThreadVisible] = useState(isFloatingThread)
  const [attachMode, setAttachMode] = useState<AttachMode>(null)
  const [addressDraft, setAddressDraft] = useState('')
  const [addressPlace, setAddressPlace] = useState<PlaceResult | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [matchIndex, setMatchIndex] = useState(0)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imageContext, setImageContext] = useState<MessageAttachmentContext>(
    MessageAttachmentContext.CurrentRoom,
  )
  const me = getStoredSession()?.userId
  const bottomRef = useRef<HTMLDivElement>(null)
  const attachRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const matchRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  const loadConversations = useCallback(async (opts?: { soft?: boolean }) => {
    if (!opts?.soft) setLoading(true)
    setError(null)
    try {
      const list = await getConversations()
      setConversations(list)
      if (initialConversationId && list.some((c) => c.id === initialConversationId)) {
        setActiveId(initialConversationId)
        setThreadVisible(true)
      }
    } catch (e) {
      setError(getErrorMessage(e, 'Không tải được tin nhắn'))
    } finally {
      if (!opts?.soft) setLoading(false)
    }
  }, [initialConversationId])

  useEffect(() => {
    void loadConversations()
  }, [loadConversations])

  useEffect(() => {
    if (!refreshKey) return
    void loadConversations({ soft: true })
  }, [refreshKey, loadConversations])

  useEffect(() => {
    if (!activeId) {
      setMessages([])
      return
    }
    let cancelled = false
    setConversations((prev) =>
      prev.map((c) => (c.id === activeId ? { ...c, unreadCount: 0 } : c)),
    )
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

  const matchedIds = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return [] as string[]
    return messages
      .filter((m) => messageSearchText(m.body).toLowerCase().includes(q))
      .map((m) => m.id)
  }, [messages, searchQuery])

  useEffect(() => {
    setMatchIndex(0)
  }, [searchQuery, activeId])

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
  }

  const closeThread = () => {
    if (isFloatingThread && onCloseWindow) {
      onCloseWindow()
      return
    }
    setThreadVisible(false)
    setAttachMode(null)
    resetAddressDraft()
    setSearchOpen(false)
    setSearchQuery('')
    setImageFiles([])
  }

  const appendSentMessage = (msg: PostMessage) => {
    setMessages((prev) => [...prev, msg])
    setConversations((prev) => {
      const next = prev.map((c) =>
        c.id === activeId
          ? {
              ...c,
              lastMessage: msg.body,
              lastMessageSenderId: msg.senderId,
              updatedAt: msg.sentAt,
              unreadCount: 0,
            }
          : c,
      )
      next.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      return next
    })
  }

  const sendBody = async (body: string) => {
    if (!activeId || !body.trim() || sending) return
    setSending(true)
    setError(null)
    try {
      const msg = await sendConversationMessage(activeId, body.trim())
      appendSentMessage(msg)
      setDraft('')
      setAttachMode(null)
      resetAddressDraft()
    } catch (e) {
      setError(getErrorMessage(e, 'Gửi thất bại'))
    } finally {
      setSending(false)
    }
  }

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

  const handleSendImages = async () => {
    if (!activeId || imageFiles.length === 0 || sending) return
    setSending(true)
    setError(null)
    try {
      const msg = await sendConversationImages(activeId, imageFiles, imageContext, draft)
      appendSentMessage(msg)
      setDraft('')
      setImageFiles([])
      if (imageInputRef.current) imageInputRef.current.value = ''
    } catch (e) {
      setError(getErrorMessage(e, 'Gửi ảnh thất bại'))
    } finally {
      setSending(false)
    }
  }

  const sendLocation = async (payload: ChatLocationPayload) => {
    await sendBody(encodeChatLocation(payload))
  }

  const handleSendGps = async () => {
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
    await sendLocation({
      kind: 'gps',
      title: 'Vị trí của tôi',
      lat: loc.lat,
      lng: loc.lng,
    })
  }

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

  return (
    <div
      className={`map-messages${embedded ? ' is-embedded' : ''}${
        isFloating ? ' is-floating' : ''
      }${isFloatingInbox ? ' is-floating-inbox' : ''}${
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

      {!threadVisible && !isFloatingInbox && !isFloatingThread ? (
        <header className="map-messages__panel-head">
          <h2 className="map-messages__panel-title">Tin nhắn</h2>
        </header>
      ) : null}

      {error ? <p className="map-messages__error map-motion-fade">{error}</p> : null}

      {!isFloatingThread ? (
      <div
        className={`map-messages__inbox${
          threadVisible && !isFloatingInbox ? '' : ' is-visible'
        }`}
      >
        {loading ? <p className="map-messages__empty">Đang tải hộp thư…</p> : null}
        {!loading && conversations.length === 0 ? (
          <p className="map-messages__empty">
            Chưa có cuộc trò chuyện. Mở tin đăng và chọn “Nhắn tin”.
          </p>
        ) : null}
        <ul className="map-messages__conv-list">
          {conversations.map((c, i) => (
            <li key={c.id} style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
              <button
                type="button"
                className={`map-messages__row map-motion-press${activeId === c.id ? ' is-active' : ''}${
                  (c.unreadCount ?? 0) > 0 ? ' is-unread' : ''
                }`}
                onClick={() => openThread(c.id)}
              >
                <span className="map-messages__avatar" aria-hidden>
                  {(c.otherParticipantName || '?').slice(0, 1).toUpperCase()}
                </span>
                <span className="map-messages__meta">
                  <span className="map-messages__meta-top">
                    <strong>{c.otherParticipantName || 'Người dùng'}</strong>
                    <time className="map-messages__time" dateTime={c.updatedAt}>
                      {formatDate(c.updatedAt)}
                    </time>
                  </span>
                  <span className="map-messages__meta-bottom">
                    <small className="map-messages__preview">
                      {conversationPreview(c.lastMessage, c.lastMessageSenderId, me)}
                    </small>
                    {(c.unreadCount ?? 0) > 0 ? (
                      <span className="map-messages__unread-badge" aria-label={`${c.unreadCount} tin chưa đọc`}>
                        {c.unreadCount > 99 ? '99+' : c.unreadCount}
                      </span>
                    ) : null}
                  </span>
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
          isFloatingThread || threadVisible ? ' is-visible' : ''
        }`}
        aria-hidden={!(isFloatingThread || threadVisible)}
      >
        <header className="map-messages__thread-head">
          {isFloatingThread ? null : (
            <button type="button" className="map-messages__back map-motion-press" onClick={closeThread}>
              ←
            </button>
          )}
          <div className="map-messages__thread-titles">
            <strong className="map-messages__peer-name" title={peerName}>
              {peerName}
            </strong>
          </div>

          <div className="map-messages__thread-actions">
            <button
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
          <div className="map-messages__search-bar">
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
          {messages.map((m) => {
            const mine = me != null && m.senderId === me
            const location = parseChatLocation(m.body)
            const isHit = matchedIds.includes(m.id)
            const isCurrent =
              isHit && matchedIds[Math.min(matchIndex, matchedIds.length - 1)] === m.id
            return (
              <div
                key={m.id}
                ref={(el) => {
                  if (el) matchRefs.current.set(m.id, el)
                  else matchRefs.current.delete(m.id)
                }}
                className={`map-messages__bubble${mine ? ' is-mine' : ''}${
                  location ? ' is-location' : ''
                }${isHit ? ' is-hit' : ''}${isCurrent ? ' is-hit-current' : ''}`}
              >
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
                ) : (
                  <p>{highlightText(m.body, searchQuery)}</p>
                )}
                <time>{formatDate(m.sentAt)}</time>
              </div>
            )
          })}
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
                Gửi ảnh phòng…
              </button>
              <button type="button" role="menuitem" disabled={sending} onClick={() => void handleSendGps()}>
                Gửi vị trí hiện tại
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
                Gửi địa chỉ…
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
                Gửi địa điểm{selectedPlace ? `: ${selectedPlace.name}` : ''}
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
                Gửi tin đăng{selectedListing ? `: ${selectedListing.name}` : ''}
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={sending || !mapArea}
                onClick={() =>
                  mapArea && void handleSendTarget('area', mapArea, 'Khu vực')
                }
              >
                Gửi khu vực{mapArea ? `: ${mapArea.name}` : ''}
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
                <select
                  value={imageContext}
                  disabled={sending}
                  onChange={(event) => setImageContext(Number(event.target.value) as MessageAttachmentContext)}
                >
                  {Object.entries(attachmentContextLabel).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
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
              +
            </button>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Nhập tin nhắn…"
              aria-label="Nội dung tin nhắn"
              disabled={!activeId}
            />
            <button
              type="submit"
              className="map-motion-press"
              disabled={(imageFiles.length === 0 && !draft.trim()) || sending}
            >
              Gửi
            </button>
          </form>
        </div>
      </div>
      ) : null}
    </div>
  )
}
