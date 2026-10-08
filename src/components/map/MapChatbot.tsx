import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import { useNavigate } from 'react-router-dom'
import {
  ChatMessageSender,
  ChatbotNavigationActionKind,
  getChatbotPopupConfig,
  sendChatbotMessage,
  deleteChatbotConversation,
  type AiHighlightResponse,
  type AiParsedSearchCriteria,
  type ChatbotMessage,
  type ChatbotNavigationAction,
  type ChatbotPopupConfig,
} from '../../api'
import { useAuth } from '../../contexts/AuthContext'
import { useAuthModal } from '../../contexts/AuthModalContext'
import { getErrorMessage } from '../../lib/errors'
import { requestMarketplaceCart, requestMarketplaceTab } from '../../lib/marketplaceNavigation'
import { ChatbotMessageContent } from './ChatbotMessageContent'
import { AiSearchReview } from '../ai/AiSearchReview'
import { nearbyChatIntent } from '../../lib/nearbyChatIntent'
import type { NearbyPlaceCategory } from '../../lib/placeAutocomplete'
import type { MapAppSection } from './MapAppPanel'
import './MapChatbot.css'

const HOMEJI_TITLE = 'Homeji'
const HOMEJI_GREETING =
  'Chào bạn! Mình là trợ lý Homeji. Mình có thể tìm phòng, mở đúng tính năng và hỗ trợ bạn chọn đồ ăn an toàn.'
/** Synced from video-src/AI Chat loading.lottie */
const AI_CHAT_LOADING_SRC = '/lottie/ai-chat-loading.lottie'

const FAB_SIZE = 58
const FAB_GAP = 12
const VIEW_MARGIN = 12
const DRAG_THRESHOLD = 6
const FAB_POS_KEY = 'homeji.chatbot.fabPos'
const SHEET_MEDIA = '(max-width: 900px)'
const ACTION_SECTIONS = new Set<MapAppSection>([
  'listings',
  'saved',
  'invitations',
  'notifications',
  'messages',
  'appointments',
  'payments',
  'profile',
  'marketplace',
  'wanted',
  'activities',
  'myPosts',
])

function isSheetViewport(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(SHEET_MEDIA).matches
}

type Props = {
  onSearchUpdate?: (update: AiHighlightResponse) => void
  /** Tăng giá trị để đóng Homeji từ bên ngoài (mobile overlay exclusivity). */
  dismissSignal?: number
  onOpenChange?: (open: boolean) => void
  /** Ẩn nút Homeji khi overlay mobile đang mở (chat, tab, v.v.). */
  hideFab?: boolean
  /** Tự né sang mép trái khi một panel rộng đang chiếm phần nội dung bên phải. */
  avoidRightContent?: boolean
  /** Mở panel thật của ứng dụng khi assistant trả về action đã whitelist. */
  onOpenSection?: (section: MapAppSection) => void
  onNearbyRequest?: (category: NearbyPlaceCategory) => boolean
}

type DisplayMessage = ChatbotMessage & {
  pending?: boolean
  actions?: ChatbotNavigationAction[]
  searchUpdate?: AiHighlightResponse | null
}

type FabPos = { x: number; y: number }

type PanelSide = 'left' | 'right' | 'above' | 'below'

type PanelLayout = {
  left: number
  top: number
  width: number
  maxHeight: number
  side: PanelSide
}

function HomejiAvatar({ inline = false }: { inline?: boolean }) {
  return (
    <span
      className={`map-chatbot__avatar${inline ? ' map-chatbot__avatar--inline' : ''}`}
      aria-hidden
    >
      <img src="/brand/homeji-logo.png" alt="" draggable={false} />
    </span>
  )
}

function defaultFabPos(): FabPos {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  return {
    x: Math.max(VIEW_MARGIN, vw - FAB_SIZE - 68),
    y: Math.max(VIEW_MARGIN, vh - FAB_SIZE - 24),
  }
}

function clampFabPos(pos: FabPos): FabPos {
  const vw = window.innerWidth
  const vh = window.innerHeight
  return {
    x: Math.max(VIEW_MARGIN, Math.min(pos.x, vw - FAB_SIZE - VIEW_MARGIN)),
    y: Math.max(VIEW_MARGIN, Math.min(pos.y, vh - FAB_SIZE - VIEW_MARGIN)),
  }
}

function readStoredFabPos(): FabPos {
  try {
    const raw = localStorage.getItem(FAB_POS_KEY)
    if (!raw) return defaultFabPos()
    const parsed = JSON.parse(raw) as Partial<FabPos>
    if (typeof parsed.x !== 'number' || typeof parsed.y !== 'number') return defaultFabPos()
    return clampFabPos({ x: parsed.x, y: parsed.y })
  } catch {
    return defaultFabPos()
  }
}

function panelMetrics() {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const width = Math.min(360, vw - VIEW_MARGIN * 2)
  const maxHeight = Math.min(vh * 0.56, 520, vh - VIEW_MARGIN * 2)
  return { width, maxHeight, vw, vh }
}

function computePanelLayout(fab: FabPos): PanelLayout {
  const { width, maxHeight, vw, vh } = panelMetrics()
  const fabRight = fab.x + FAB_SIZE
  const fabBottom = fab.y + FAB_SIZE
  const fabCx = fab.x + FAB_SIZE / 2
  const fabCy = fab.y + FAB_SIZE / 2

  const spaceRight = vw - fabRight - VIEW_MARGIN
  const spaceLeft = fab.x - VIEW_MARGIN
  const spaceBelow = vh - fabBottom - VIEW_MARGIN
  const spaceAbove = fab.y - VIEW_MARGIN

  const preferHorizontal = fabCx < vw / 2 ? 'right' : 'left'
  const preferVertical = fabCy < vh / 2 ? 'below' : 'above'

  const scored: Array<{ side: PanelSide; score: number }> = [
    {
      side: 'right',
      score:
        spaceRight +
        (preferHorizontal === 'right' ? 1200 : 0) +
        (spaceRight >= width ? 500 : spaceRight),
    },
    {
      side: 'left',
      score:
        spaceLeft +
        (preferHorizontal === 'left' ? 1200 : 0) +
        (spaceLeft >= width ? 500 : spaceLeft),
    },
    {
      side: 'below',
      score:
        spaceBelow +
        (preferVertical === 'below' ? 900 : 0) +
        (spaceBelow >= maxHeight * 0.7 ? 400 : spaceBelow),
    },
    {
      side: 'above',
      score:
        spaceAbove +
        (preferVertical === 'above' ? 900 : 0) +
        (spaceAbove >= maxHeight * 0.7 ? 400 : spaceAbove),
    },
  ]

  scored.sort((a, b) => b.score - a.score)
  const side = scored[0]?.side ?? 'above'

  let left = 0
  let top = 0

  if (side === 'right') {
    left = fabRight + FAB_GAP
    top = fabCy - maxHeight / 2
  } else if (side === 'left') {
    left = fab.x - FAB_GAP - width
    top = fabCy - maxHeight / 2
  } else if (side === 'below') {
    left = fabCx - width / 2
    top = fabBottom + FAB_GAP
  } else {
    left = fabCx - width / 2
    top = fab.y - FAB_GAP - maxHeight
  }

  left = Math.max(VIEW_MARGIN, Math.min(left, vw - VIEW_MARGIN - width))
  top = Math.max(VIEW_MARGIN, Math.min(top, vh - VIEW_MARGIN - maxHeight))

  return { left, top, width, maxHeight, side }
}

function welcomeLayout(fab: FabPos, side: PanelSide) {
  const welcomeW = Math.min(238, window.innerWidth - 32)
  const welcomeH = 54
  const fabCx = fab.x + FAB_SIZE / 2
  const fabCy = fab.y + FAB_SIZE / 2

  let left = 0
  let top = 0
  let tip: PanelSide = 'right'

  if (side === 'right' || (side !== 'left' && fabCx < window.innerWidth / 2)) {
    left = fab.x + FAB_SIZE + 10
    top = fabCy - welcomeH / 2
    tip = 'left'
  } else if (side === 'left') {
    left = fab.x - 10 - welcomeW
    top = fabCy - welcomeH / 2
    tip = 'right'
  } else if (side === 'below') {
    left = fabCx - welcomeW / 2
    top = fab.y + FAB_SIZE + 10
    tip = 'above'
  } else {
    left = fabCx - welcomeW / 2
    top = fab.y - 10 - welcomeH
    tip = 'below'
  }

  left = Math.max(
    VIEW_MARGIN,
    Math.min(left, window.innerWidth - VIEW_MARGIN - welcomeW),
  )
  top = Math.max(
    VIEW_MARGIN,
    Math.min(top, window.innerHeight - VIEW_MARGIN - welcomeH),
  )

  return { left, top, width: welcomeW, tip }
}

export function MapChatbot({
  onSearchUpdate,
  dismissSignal = 0,
  onOpenChange,
  hideFab = false,
  avoidRightContent = false,
  onOpenSection,
  onNearbyRequest,
}: Props) {
  const navigate = useNavigate()
  const { profile, isAuthenticated } = useAuth()
  const { openAuthModal } = useAuthModal()
  const reactId = useId()
  const [open, setOpen] = useState(false)
  const [welcomeDismissed, setWelcomeDismissed] = useState(false)
  const [config, setConfig] = useState<ChatbotPopupConfig | null>(null)
  const [conversationId, setConversationId] = useState<string | undefined>()
  const [saveHistory, setSaveHistory] = useState(false)
  const sessionCriteria = useRef<AiParsedSearchCriteria | undefined>(undefined)
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activePrompt, setActivePrompt] = useState<string | null>(null)
  const [suggestionsLeaving, setSuggestionsLeaving] = useState(false)
  const [fabPos, setFabPos] = useState<FabPos>(() =>
    typeof window === 'undefined' ? { x: 0, y: 0 } : readStoredFabPos(),
  )
  const [dragging, setDragging] = useState(false)
  const [sheetMode, setSheetMode] = useState(isSheetViewport)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const pendingIdRef = useRef(0)
  const suppressFabClick = useRef(false)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    originX: number
    originY: number
    moved: boolean
  } | null>(null)
  const autoAvoidOriginRef = useRef<FabPos | null>(null)

  const panel = computePanelLayout(fabPos)
  const welcome = welcomeLayout(fabPos, panel.side)

  useEffect(() => {
    let cancelled = false
    void getChatbotPopupConfig()
      .then((cfg) => {
        if (!cancelled) setConfig(cfg)
      })
      .catch(() => {
        if (!cancelled) {
          setConfig({
            enabled: true,
            title: HOMEJI_TITLE,
            greeting: HOMEJI_GREETING,
            suggestedPrompts: [
              'Phòng dưới 4 triệu gần FPT',
              'Mua đồ ăn trên Homeji như thế nào?',
              'Ở ghép Thủ Đức',
            ],
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const mq = window.matchMedia(SHEET_MEDIA)
    const onChange = () => setSheetMode(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    const onResize = () => setFabPos((prev) => clampFabPos(prev))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (sheetMode) return
    if (avoidRightContent) {
      setWelcomeDismissed(true)
      setFabPos((current) => {
        autoAvoidOriginRef.current ??= current
        return clampFabPos({
          x: 84,
          y: current.y,
        })
      })
      return
    }

    const previous = autoAvoidOriginRef.current
    if (!previous) return
    autoAvoidOriginRef.current = null
    setFabPos(clampFabPos(previous))
  }, [avoidRightContent, sheetMode])

  useEffect(() => {
    if (!open) return
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, busy, open])

  useEffect(() => {
    if (!open) return
    const focusFrame = window.requestAnimationFrame(() => inputRef.current?.focus())
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      window.cancelAnimationFrame(focusFrame)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  useEffect(() => {
    onOpenChange?.(open)
  }, [open, onOpenChange])

  useEffect(() => {
    if (dismissSignal > 0) setOpen(false)
  }, [dismissSignal])

  useEffect(() => {
    // Keep UI consistent: when parent requests hiding Homeji controls,
    // close any currently open chat panel as well.
    if (!hideFab) return
    setOpen(false)
  }, [hideFab])

  if (config && !config.enabled) return null

  const displayName = profile?.displayName?.trim() || 'bạn'
  const showGreeting = messages.length === 0
  const showTyping = busy && messages.some((m) => m.pending)
  const panelVisible = open && !hideFab

  const openChatbot = () => {
    setWelcomeDismissed(true)
    setOpen(true)
  }

  const persistFabPos = (pos: FabPos) => {
    try {
      localStorage.setItem(FAB_POS_KEY, JSON.stringify(pos))
    } catch {
      /* ignore */
    }
  }

  const onFabPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return
    suppressFabClick.current = false
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: fabPos.x,
      originY: fabPos.y,
      moved: false,
    }
  }

  const onFabPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY
    if (!drag.moved && dx * dx + dy * dy < DRAG_THRESHOLD * DRAG_THRESHOLD) return

    if (!drag.moved) {
      drag.moved = true
      autoAvoidOriginRef.current = null
      setDragging(true)
      setWelcomeDismissed(true)
    }

    setFabPos(
      clampFabPos({
        x: drag.originX + dx,
        y: drag.originY + dy,
      }),
    )
  }

  const endFabPointer = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    const wasDrag = drag.moved
    suppressFabClick.current = wasDrag || event.type === 'pointercancel'
    dragRef.current = null
    setDragging(false)

    if (wasDrag) {
      setFabPos((prev) => {
        const next = clampFabPos(prev)
        persistFabPos(next)
        return next
      })
      return
    }

  }

  const send = async (text: string, fromSuggestion = false) => {
    const message = text.trim()
    if (!message || busy) return
    const nearby = nearbyChatIntent(message)
    if (nearby) {
      if (onNearbyRequest?.(nearby)) { setOpen(false); setDraft(''); setError(null) }
      else setError('Hãy chọn ghim phòng trên bản đồ trước để tìm tiện ích quanh đúng phòng đó.')
      return
    }
    if (!isAuthenticated) {
      openAuthModal({ intent: 'chatbot', onSuccess: () => inputRef.current?.focus() })
      return
    }
    if (message.length > 1000) {
      setError('Tin nhắn không được vượt quá 1.000 ký tự.')
      return
    }

    setBusy(true)
    setError(null)
    setDraft('')

    if (fromSuggestion) {
      setActivePrompt(message)
      setSuggestionsLeaving(true)
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 220)
      })
    }

    const pendingId = `${reactId}-pending-${++pendingIdRef.current}`
    const optimisticUser: DisplayMessage = {
      id: pendingId,
      conversationId: conversationId ?? '',
      sender: ChatMessageSender.User,
      content: message,
      createdAt: new Date().toISOString(),
      pending: true,
    }

    setMessages((prev) => [...prev, optimisticUser])

    try {
      const reply = await sendChatbotMessage({ conversationId: saveHistory ? conversationId : undefined, message, saveHistory,
        previousCriteria: saveHistory ? undefined : sessionCriteria.current })
      setConversationId(saveHistory ? reply.conversationId : undefined)
      if (reply.searchUpdate) sessionCriteria.current = reply.searchUpdate.criteria
      setMessages((prev) => {
        const withoutPending = prev.filter((m) => m.id !== pendingId)
        return [
          ...withoutPending,
          reply.userMessage,
          { ...reply.assistantMessage, actions: reply.actions, searchUpdate: reply.searchUpdate },
        ]
      })
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== pendingId))
      setError(getErrorMessage(e, 'Homeji tạm thời không phản hồi'))
      setSuggestionsLeaving(false)
    } finally {
      setBusy(false)
      setActivePrompt(null)
    }
  }

  const deleteConversation = async () => {
    if (!conversationId || busy || !window.confirm('Xóa hội thoại hiện tại và tiêu chí đã lưu? Thao tác không thể hoàn tác.')) return
    setBusy(true); setError(null)
    try {
      await deleteChatbotConversation(conversationId)
      setConversationId(undefined); setMessages([]); setDraft(''); sessionCriteria.current = undefined
    } catch (reason) { setError(getErrorMessage(reason, 'Chưa xóa được hội thoại.')) }
    finally { setBusy(false) }
  }

  const handleNavigationAction = (action: ChatbotNavigationAction) => {
    if (action.kind === ChatbotNavigationActionKind.OpenSection) {
      const [section, view] = action.target.split(':', 2)
      if (!ACTION_SECTIONS.has(section as MapAppSection)) return

      if (section === 'marketplace') {
        if (view === 'food' || view === 'cart') requestMarketplaceTab('food')
        if (view === 'cart') requestMarketplaceCart()
      }

      setOpen(false)
      onOpenSection?.(section as MapAppSection)
      return
    }

    if (action.kind === ChatbotNavigationActionKind.Navigate && /^\/(?!\/)[^\\]*$/.test(action.target)) {
      setOpen(false)
      navigate(action.target)
    }
  }

  const chatBody = (
    <>
      <div className="map-chatbot__body">
        {showGreeting ? (
          <div className="map-chatbot__greeting map-motion-fade-up">
            <div className="map-chatbot__greeting-bubble" role="status">
              <HomejiAvatar />
              <p>{config?.greeting ?? HOMEJI_GREETING}</p>
            </div>
            <div
              className={`map-chatbot__suggestions${suggestionsLeaving ? ' is-leaving' : ''}`}
            >
              {(config?.suggestedPrompts ?? []).slice(0, 4).map((prompt, index) => (
                <button
                  key={prompt}
                  type="button"
                  className={`map-chatbot__chip${activePrompt === prompt ? ' is-active' : ''}`}
                  style={{ animationDelay: `${80 + index * 60}ms` }}
                  disabled={busy}
                  onClick={() => void send(prompt, true)}
                >
                  <span className="map-chatbot__chip-label">{prompt}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((m) => {
          const isUser = m.sender === ChatMessageSender.User
          return (
            <div
              key={m.id}
              className={[
                'map-chatbot__msg',
                isUser ? 'is-user' : 'is-assistant',
                m.pending ? 'is-pending' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {!isUser ? (
                <HomejiAvatar inline />
              ) : null}
              <div className="map-chatbot__bubble">
                {isUser ? (
                  <span className="map-chatbot__bubble-text">{m.content}</span>
                ) : (
                  <>
                    <ChatbotMessageContent content={m.content} />
                    {m.searchUpdate ? <AiSearchReview result={m.searchUpdate}
                      onApply={update => { onSearchUpdate?.(update); setOpen(false) }}
                      onRefine={text => { setDraft(text); inputRef.current?.focus() }} /> : null}
                    {m.actions && m.actions.length > 0 ? (
                      <div className="map-chatbot__actions" aria-label="Đi tới tính năng Homeji">
                        {m.actions.map((action) => (
                          <button
                            key={action.id}
                            type="button"
                            className="map-chatbot__action"
                            title={action.description}
                            onClick={() => handleNavigationAction(action)}
                          >
                            <span>{action.label}</span>
                            <span aria-hidden>→</span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          )
        })}

        {showTyping ? (
          <div className="map-chatbot__msg is-assistant is-typing" aria-live="polite">
            <HomejiAvatar inline />
            <div className="map-chatbot__bubble map-chatbot__bubble--typing">
              <span className="map-chatbot__typing" aria-label="Homeji đang trả lời">
                <DotLottieReact
                  src={AI_CHAT_LOADING_SRC}
                  loop
                  autoplay
                  style={{ width: '100%', height: '100%' }}
                />
              </span>
            </div>
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>

      {error ? <p className="map-chatbot__error">{error}</p> : null}
      <details className="map-chatbot__privacy"><summary>Hội thoại và tiêu chí của bạn</summary>
        <p>{saveHistory ? 'Bạn đã đồng ý lưu hội thoại thuộc tài khoản của mình.' : 'Tin nhắn và tiêu chí chỉ dùng trong phiên hiện tại; không ghi vào lịch sử chatbot trên máy chủ.'} Homeji dùng tiêu chí bạn nhập để tìm phòng; không tự lấy vị trí thiết bị. Tin nhắn hỗ trợ chung có thể được gửi tới Gemini để trả lời.</p>
        {config?.historyStorageEnabled ? <label><input type="checkbox" checked={saveHistory} disabled={busy} onChange={event => {
          setSaveHistory(event.target.checked); setConversationId(undefined); sessionCriteria.current = undefined; setMessages([]); setDraft('')
        }} /> Đồng ý lưu hội thoại và tiêu chí theo chính sách lưu lịch sử</label> : <p>Lưu lịch sử hiện đang tắt.</p>}
        {!saveHistory ? <button type="button" disabled={busy} onClick={() => { setMessages([]); setDraft(''); sessionCriteria.current = undefined }}>Xóa nội dung phiên và tiêu chí</button> : null}
        {conversationId ? <button type="button" disabled={busy} onClick={() => void deleteConversation()}>Xóa hội thoại và tiêu chí hiện tại</button> : null}
      </details>

      <form
        className="map-chatbot__form"
        onSubmit={(e) => {
          e.preventDefault()
          void send(draft)
        }}
      >
        <input
          ref={inputRef}
          value={draft}
          maxLength={1000}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Hỏi Homeji ngay"
          disabled={busy}
          aria-label="Nhập tin nhắn cho Homeji"
        />
        <button
          type="submit"
          className="map-chatbot__send map-motion-press"
          disabled={busy || !draft.trim()}
          aria-label="Gửi"
        >
          Gửi
        </button>
      </form>
    </>
  )

  return (
    <div
      className={`map-chatbot${dragging ? ' is-dragging' : ''}`}
      style={{ pointerEvents: 'none' }}
    >
      <div
        className={`map-chatbot__panel is-${panel.side}${panelVisible ? ' is-visible' : ''}${
          sheetMode ? ' is-sheet' : ''
        }${busy ? ' is-thinking' : ''}`}
        style={{
          pointerEvents: panelVisible ? 'auto' : 'none',
          left: panel.left,
          top: panel.top,
          width: panel.width,
          maxHeight: panel.maxHeight,
        }}
        aria-hidden={!panelVisible}
        inert={!panelVisible}
        role="dialog"
        aria-label={HOMEJI_TITLE}
      >
        <header className="map-chatbot__head">
          <div className="map-chatbot__brand">
            <HomejiAvatar />
            <div>
              <strong>{HOMEJI_TITLE}</strong>
              <p>Trợ lý thông minh trong ứng dụng</p>
            </div>
          </div>
          <button
            type="button"
            className="map-chatbot__close"
            onClick={() => setOpen(false)}
            aria-label="Đóng Homeji"
          >
            ×
          </button>
        </header>
        {chatBody}
      </div>

      {!hideFab && !open && !welcomeDismissed ? (
        <div
          className={`map-chatbot__welcome is-tip-${welcome.tip}`}
          role="status"
          aria-live="polite"
          style={{
            left: welcome.left,
            top: welcome.top,
            width: welcome.width,
            pointerEvents: 'auto',
          }}
        >
          <button
            type="button"
            className="map-chatbot__welcome-text"
            onClick={openChatbot}
          >
            <strong>Xin chào, {displayName} 👋</strong>
            <span>Hôm nay bạn cần tìm gì?</span>
          </button>
          <button
            type="button"
            className="map-chatbot__welcome-close"
            aria-label="Ẩn lời chào"
            title="Ẩn lời chào"
            onClick={() => setWelcomeDismissed(true)}
          >
            ×
          </button>
        </div>
      ) : null}

      {!hideFab ? (
      <button
        type="button"
        className={`map-chatbot__fab map-motion-press${open ? ' is-open' : ''}${
          dragging ? ' is-dragging' : ''
        }`}
        style={{
          pointerEvents: 'auto',
          left: fabPos.x,
          top: fabPos.y,
        }}
        aria-expanded={open}
        aria-label={open ? 'Đóng Homeji' : 'Mở Homeji — kéo để di chuyển'}
        title={open ? 'Đóng Homeji' : 'Homeji — kéo để di chuyển'}
        onPointerDown={onFabPointerDown}
        onPointerMove={onFabPointerMove}
        onPointerUp={endFabPointer}
        onPointerCancel={endFabPointer}
        onClick={event => {
          if (event.detail > 0 && suppressFabClick.current) { suppressFabClick.current = false; return }
          suppressFabClick.current = false
          setWelcomeDismissed(true)
          setOpen(value => !value)
        }}
      >
        <img src="/brand/homeji-logo.png" alt="" width="44" height="44" draggable={false} />
      </button>
      ) : null}
    </div>
  )
}
