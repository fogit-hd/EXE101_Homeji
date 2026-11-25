import { ProfileSetupNotice } from '../auth/ProfileSetupNotice'
import { confirmDialog } from '../ui/confirmDialog'
import { useChangedInputs } from '../../hooks/useChangedInputs'
import { mergeConversationMessages, useIncomingConversationMessages } from '../../hooks/useIncomingConversationMessages'
import { useConversationInbox } from '../../hooks/useConversationInbox'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  ConversationSubjectType,
  searchConversationMessages,
  MessageAttachmentStatus,
  type MessagePageCursor,
  getMarketplacePost,
  getRentalPost,
  MessageAttachmentContext,
  sendConversationImages,
  sendConversationMessage,
  setConversationUserBlocked,
  type PostMessage,
} from '../../api'
import { getStoredSession } from '../../api/client'
import { createAsyncActionGate } from '../../lib/asyncActionGate'
import { sortConversationsByActivity } from '../../lib/conversationOrder'
import {
  encodeChatLocation,
  parseChatLocation,
  type ChatLocationPayload,
} from '../../lib/chatLocation'
import { getErrorMessage } from '../../lib/errors'
import { NOTIFICATION_CONNECTED } from '../../lib/sellerOrderAlerts'
import { getDeviceLocation } from '../../lib/geolocation'
import { formatPrice } from '../../lib/labels'
import { mapPostUrl } from '../../lib/mapDeepLinks'
import { staticMapUrl } from '../../lib/mapStaticMedia'
import { marketplaceItemUrl } from '../../lib/marketplaceSellers'
import { useDismissOnOutside } from '../../lib/useDismissOnOutside'
import { useAuth } from '../../contexts/AuthContext'
import { PublicProfile } from './ChatExtras'
import { useVoiceCalls } from '../../contexts/voice-call'
import type { PlaceResult } from './AddressAutocomplete'
import './MapMessagesPanel.css'
import './ChatExtras.css'
import { MessagesInbox } from './messages/MessagesInbox'
import { MessagesTimeline } from './messages/MessagesTimeline'
import { MessagesThreadHeader } from './messages/MessagesThreadHeader'
import { MessageComposer } from './messages/MessageComposer'
import {
  directionsUrl,
  subjectTag,
  type ChatShareTarget,
  type ContextItem,
  type AttachMode,
  type InboxFilter,
  type SubjectInfo,
} from './messages/MessageFormatting'

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


export function MapMessagesPanel(props: Props) {
  const { isAuthenticated, needsProfileSetup, profile } = useAuth()
  if (isAuthenticated && needsProfileSetup) return <section className={`map-messages${props.embedded ? ' map-messages--embedded' : ''}${props.layout?.startsWith('floating-') ? ' is-floating' : ''}${props.layout === 'floating-inbox' ? ' is-floating-inbox' : ''}`}>
    {props.onCloseWindow ? <button type="button" className="map-messages__icon-btn" aria-label="Đóng tin nhắn" onClick={props.onCloseWindow}>×</button> : null}
    <ProfileSetupNotice action="xem và gửi tin nhắn" onNavigate={props.onCloseWindow} />
  </section>
  return <MapMessagesPanelContent key={profile?.id ?? getStoredSession()?.userId ?? "guest"} {...props} />
}

function MapMessagesPanelContent({
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
  const { profile } = useAuth()
  const voice = useVoiceCalls()
  const [profileId, setProfileId] = useState<string | null>(null)
  const composerRef = useRef<HTMLTextAreaElement>(null)

  const me = getStoredSession()?.userId ?? profile?.id ?? null
  const { conversations, update: setConversations, cancel: cancelInbox, loading, error: inboxError, refresh: refreshInbox, reconcileRead } = useConversationInbox(me, profile?.id ?? null)
  const [activeId, setActiveId] = useState<string | null>(initialConversationId)
  const [appliedInitialId, setAppliedInitialId] = useState(initialConversationId)
  const [contactedAt, setContactedAt] = useState<Record<string, number>>(() => initialConversationId ? { [initialConversationId]: Date.now() } : {})
  const currentThread = useRef({ id: activeId, version: 0 })
  useLayoutEffect(() => {
    currentThread.current = { id: activeId, version: currentThread.current.version + 1 }
    return () => { currentThread.current = { id: null, version: currentThread.current.version + 1 } }
  }, [activeId])
  const [messages, setMessages] = useState<PostMessage[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [blocking, setBlocking] = useState(false)
  const blockGate = useRef(createAsyncActionGate())
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
  const scrollRef = useRef<HTMLDivElement>(null)
  const followsLatest = useRef(true)
  const beforePrepend = useRef<{ first: HTMLElement | null; offset: number; height: number; top: number } | null>(null)
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
      setContactedAt(previous => ({ ...previous, [initialConversationId]: Date.now() }))
      setActiveId(initialConversationId)
      setThreadVisible(true)
    } else {
      setActiveId(null)
      setThreadVisible(isFloatingThread)
    }
  }

  useEffect(() => {
    if (refreshKey) refreshInbox()
  }, [refreshKey, refreshInbox])

  if (useChangedInputs([activeId], true)) {
    setMessages([])
    setSearchOpen(false)
    setSearchQuery('')
  }
  const visibleConversationId = threadVisible ? activeId : null
  const history = useIncomingConversationMessages({
    conversationId: visibleConversationId, ownerId: me, cacheOwnerId: profile?.id ?? null, messages, setMessages, refreshInbox, onRead: reconcileRead,
  })
  const { acknowledge, headId } = history
  const term = searchOpen ? searchQuery.trim() : ''
  const searching = Boolean(term)
  const [debouncedTerm, setDebouncedTerm] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTerm(term), 250)
    return () => clearTimeout(timer)
  }, [term])
  const search = useInfiniteQuery({
    queryKey: ['conversation-search', me, visibleConversationId, debouncedTerm],
    enabled: Boolean(me && visibleConversationId && term && term === debouncedTerm),
    initialPageParam: null as MessagePageCursor | null,
    queryFn: ({ pageParam, signal }) => searchConversationMessages(visibleConversationId!, debouncedTerm, pageParam, signal),
    getNextPageParam: page => page.nextCursor ?? undefined,
  })
  const searchMessages = useMemo(() => term && term === debouncedTerm
    ? search.data?.pages.slice().reverse().flatMap(page => page.items) ?? [] : [], [search.data, term, debouncedTerm])
  const timelineMessages = useMemo(() => {
    const rows = term ? searchMessages : messages
    if (!history.deletedAttachments?.size) return rows
    const deleted = history.deletedAttachments
    return rows.map(message => message.attachments?.some(item => deleted.has(item.id) && item.status !== MessageAttachmentStatus.Deleted)
      ? { ...message, attachments: message.attachments.map(item => deleted.has(item.id)
        ? { ...item, status: MessageAttachmentStatus.Deleted, bytes: 0 } : item) }
      : message)
  }, [term, searchMessages, messages, history.deletedAttachments])

  const loadOlder = () => {
    const viewport = scrollRef.current
    if (term) {
      if (search.hasNextPage && !search.isFetchingNextPage) void search.fetchNextPage()
      return
    }
    if (!viewport || !history.hasOlder || history.loadingOlder || beforePrepend.current) return
    const first = viewport.querySelector<HTMLElement>('.map-messages__bubble')
    beforePrepend.current = {
      first, offset: first?.offsetTop ?? 0, height: viewport.scrollHeight, top: viewport.scrollTop,
    }
    history.loadOlder()
  }
  const acknowledgeVisible = () => {
    const viewport = scrollRef.current
    if (!visibleConversationId || term || !viewport?.clientHeight) return
    const atBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <= 20
    if (atBottom) acknowledge(headId)
  }
  useLayoutEffect(() => {
    followsLatest.current = true
    beforePrepend.current = null
  }, [visibleConversationId, searching])
  useLayoutEffect(() => {
    const viewport = scrollRef.current
    if (term || !viewport || !visibleConversationId) return
    const anchor = beforePrepend.current
    if (anchor) {
      if (!history.loadingOlder) {
        if (anchor.first?.isConnected) viewport.scrollTop += anchor.first.offsetTop - anchor.offset
        else viewport.scrollTop = anchor.top + viewport.scrollHeight - anchor.height
        beforePrepend.current = null
      }
      return
    }
    if (followsLatest.current) viewport.scrollTop = viewport.scrollHeight
  }, [messages, visibleConversationId, term, history.loadingOlder])
  useEffect(() => {
    const verify = () => {
      const viewport = scrollRef.current
      if (visibleConversationId && !term && viewport?.clientHeight &&
        viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <= 20) acknowledge(headId)
    }
    const frame = requestAnimationFrame(verify)
    document.addEventListener('visibilitychange', verify)
    window.addEventListener('online', verify)
    window.addEventListener(NOTIFICATION_CONNECTED, verify)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('visibilitychange', verify)
      window.removeEventListener('online', verify)
      window.removeEventListener(NOTIFICATION_CONNECTED, verify)
    }
  }, [visibleConversationId, term, headId, acknowledge])

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
  const blocked = Boolean(active?.isBlockedByMe || active?.isBlockedByOther)
  const cannotSend = !active || blocked || blocking

  const changeUserBlock = () => blockGate.current(async () => {
    if (!active || sending) return
    const conversation = active
    const nextBlocked = !conversation.isBlockedByMe
    if (nextBlocked && !await confirmDialog({ title: `Chặn ${peerName}?`, message: 'Hai người sẽ không thể nhắn tin hoặc gọi cho nhau. Lịch sử trò chuyện vẫn được giữ lại.', confirmLabel: 'Chặn', danger: true })) return
    const ownerId = me
    setBlocking(true)
    setError(null)
    try {
      const state = await setConversationUserBlocked(conversation.id, nextBlocked)
      if (getStoredSession()?.userId !== ownerId) return
      await cancelInbox()
      if (getStoredSession()?.userId !== ownerId) return
      setConversations(previous => previous.map(item => item.otherParticipantId === state.otherParticipantId
        ? { ...item, isBlockedByMe: state.isBlockedByMe, isBlockedByOther: state.isBlockedByOther } : item))
      if (currentThread.current.id === conversation.id) {
        setAttachMode(null)
        setImageFiles([])
      }
    } catch (error) {
      if (getStoredSession()?.userId === ownerId && currentThread.current.id === conversation.id) setError(getErrorMessage(error, 'Chưa cập nhật được trạng thái chặn. Vui lòng thử lại.'))
    } finally { setBlocking(false) }
  })

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

  const matchedIds = useMemo(() => searchMessages.map(message => message.id), [searchMessages])

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
    if (onPickConversation) {
      onPickConversation(id)
      // The opened thread confirms the messages it displays.
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
    void cancelInbox().then(() => {
      if (getStoredSession()?.userId !== me) return
      setConversations((prev) => {
        const next = prev.map(c => c.id === msg.conversationId ? { ...c, lastMessage: msg.body, lastMessageSenderId: msg.senderId, updatedAt: msg.sentAt, unreadCount: 0 } : c)
        return sortConversationsByActivity(next)
      })
    })
  }

  const appendToCurrentThread = (msg: PostMessage, thread: { id: string | null; version: number }) => {
    if (msg.conversationId !== thread.id || currentThread.current.id !== thread.id || currentThread.current.version !== thread.version) return false
    setMessages((prev) => prev.some(item => item.id === msg.id) ? prev : [...prev, msg])
    return true
  }

  const sendBody = async (body: string) => sendGate.current(async () => {
    if (!activeId || cannotSend || currentThread.current.id !== activeId || !body.trim() || sending) return
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
      if (currentThread.current.version === thread.version) setError(getErrorMessage(e, 'Chưa gửi được tin nhắn. Vui lòng thử lại.'))
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
    if (!activeId || cannotSend || currentThread.current.id !== activeId || imageFiles.length === 0 || sending) return
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
      if (currentThread.current.version === thread.version) setError(getErrorMessage(e, 'Chưa gửi được ảnh. Vui lòng thử lại.'))
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
      setError('Chọn một địa chỉ trong danh sách gợi ý để người nhận mở đúng vị trí trên bản đồ.')
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
    return sortConversationsByActivity(conversations, contactedAt).filter((c) => {
      if (inboxFilter === 'unread' && !(c.unreadCount > 0)) return false
      if (inboxFilter === 'rental' && c.subjectType !== 1) return false
      if (!q) return true
      const hay = `${c.otherParticipantName ?? ''} ${c.lastMessage ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [conversations, contactedAt, inboxFilter, inboxQuery])


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

      {error || inboxError ? <p className="map-messages__error map-motion-fade">{error ?? getErrorMessage(inboxError, 'Không tải được tin nhắn')}{inboxError ? <button type="button" onClick={refreshInbox}>Thử lại</button> : null}</p> : null}

      <div className={isWorkspace ? 'map-messages__split' : undefined}>
<MessagesInbox
        isFloatingThread={isFloatingThread}
        isWorkspace={isWorkspace}
        isFloatingInbox={isFloatingInbox}
        threadVisible={threadVisible}
        inboxSearchRef={inboxSearchRef}
        inboxQuery={inboxQuery}
        onInboxQueryChange={setInboxQuery}
        onInboxFocus={() => setInboxFocused(true)}
        inboxFilter={inboxFilter}
        onFilterChange={setInboxFilter}
        unreadTotal={unreadTotal}
        loading={loading}
        filteredConversations={filteredConversations}
        conversations={conversations}
        activeId={activeId}
        currentUserId={me}
        onOpenThread={openThread}
      />
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
<MessagesThreadHeader
          state={{
            isFloatingThread,
            active,
            activeId,
            peerName,
            primaryContext,
            contextItems,
            contextOpen: ctxOpen,
            searchOpen,
            searchQuery,
            matchedIds,
            matchIndex,
            blocking,
            sending,
            cannotSend,
            voiceBusy: voice.busy,
            voiceReady: voice.ready,
          }}
          refs={{ contextRef: ctxRef, searchToggleRef, searchBarRef, searchInputRef }}
          actions={{
            setContextOpen: setCtxOpen,
            setSearchOpen,
            setSearchQuery,
            setMatchIndex,
            onBack: closeThread,
            onOpenProfile: () => { if (active) setProfileId(active.otherParticipantId) },
            onToggleBlock: () => { void changeUserBlock() },
            onStartCall: () => { if (active) voice.startCall(active.id, peerName) },
            onCloseWindow,
          }}
        />
<MessagesTimeline
          history={term ? {
            loading: term !== debouncedTerm || search.isPending,
            error: search.isError && !search.isFetchNextPageError ? getErrorMessage(search.error, 'Chưa tìm được tin nhắn.') : '',
            olderError: search.isFetchNextPageError ? getErrorMessage(search.error, 'Chưa tải thêm được kết quả.') : '',
            loadingOlder: search.isFetchingNextPage,
            hasOlder: Boolean(search.hasNextPage),
            retry: () => { void search.refetch() },
          } : history}
          messages={timelineMessages}
          scrollRef={scrollRef}
          onLoadOlder={loadOlder}
          onScroll={() => {
            const viewport = scrollRef.current
            if (!viewport || term) return
            followsLatest.current = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <= 72
            acknowledgeVisible()
            if (viewport.scrollTop <= 80 && !history.olderError) loadOlder()
          }}
          currentUserId={me}
          activeId={activeId}
          peerName={peerName}
          matchedIds={matchedIds}
          matchIndex={matchIndex}
          searchQuery={term}
          matchRefs={matchRefs}
          setMessages={setMessages}
          onError={setError}
          onFocusMap={onFocusMap}
        />
<MessageComposer
          active={active}
          activeId={activeId}
          peerName={peerName}
          currentUserId={me}
          currentProfileId={profile?.id}
          draft={draft}
          setDraft={setDraft}
          sending={sending}
          cannotSend={cannotSend}
          blocked={blocked}
          attachMode={attachMode}
          setAttachMode={setAttachMode}
          attachRef={attachRef}
          imageInputRef={imageInputRef}
          composerRef={composerRef}
          imageFiles={imageFiles}
          setImageFiles={setImageFiles}
          imageContext={imageContext}
          setImageContext={setImageContext}
          addressDraft={addressDraft}
          setAddressDraft={setAddressDraft}
          addressPlace={addressPlace}
          setAddressPlace={setAddressPlace}
          selectedPlace={selectedPlace}
          selectedListing={selectedListing}
          mapArea={mapArea}
          onError={setError}
          onImageSelection={handleImageSelection}
          onSendGps={handleSendGps}
          onSendAddress={handleSendAddress}
          onSendTarget={handleSendTarget}
          onResetAddressDraft={resetAddressDraft}
          onSend={handleSend}
          onSendImages={handleSendImages}
          onSentMessage={(message) => {
            if (currentThread.current.id === message.conversationId && getStoredSession()?.userId === me) {
              setMessages(previous => mergeConversationMessages(previous, [message]))
              appendSentMessage(message)
            }
          }}
          voiceBusy={voice.busy}
        />          </>
        )}
      </div>
      ) : null}
      </div>
      {profileId && <PublicProfile key={profileId} userId={profileId} onClose={() => setProfileId(null)} />}
    </div>
  )
}
