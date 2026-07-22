import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import { useNavigate } from 'react-router-dom'
import {
  ChatMessageSender,
  ChatbotNavigationActionKind,
  getChatbotPopupConfig,
  sendChatbotMessage,
  type AiHighlightResponse,
  type ChatbotMessage,
  type ChatbotNavigationAction,
  type ChatbotPopupConfig,
} from '../../api'
import { useAuth } from '../../contexts/AuthContext'
import { getErrorMessage } from '../../lib/errors'
import { ChatbotMessageContent } from './ChatbotMessageContent'
import type { MapAppSection } from './MapAppPanel'
import './MapChatbot.css'

const HOMIE_TITLE = 'Homie'
const HOMIE_GREETING =
  'Chào bạn nha! Mình là Homie. Bạn có thể hỏi mình cách dùng bất kỳ tính năng nào trong Homeji.'
/** Synced from video-src/AI Chat loading.lottie */
const AI_CHAT_LOADING_SRC = '/lottie/ai-chat-loading.lottie'

const FAB_SIZE = 58
const FAB_GAP = 12
const VIEW_MARGIN = 12
const DRAG_THRESHOLD = 6
const FAB_POS_KEY = 'homeji.homie.fabPos'
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
  /** Tăng giá trị để đóng Homie từ bên ngoài (mobile overlay exclusivity). */
  dismissSignal?: number
  onOpenChange?: (open: boolean) => void
  /** Ẩn nút Homie khi overlay mobile đang mở (chat, tab, v.v.). */
  hideFab?: boolean
  /** Tự né sang mép trái khi một panel rộng đang chiếm phần nội dung bên phải. */
  avoidRightContent?: boolean
  /** Mở panel thật của ứng dụng khi assistant trả về action đã whitelist. */
  onOpenSection?: (section: MapAppSection) => void
}

type DisplayMessage = ChatbotMessage & {
  pending?: boolean
  actions?: ChatbotNavigationAction[]
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
}: Props) {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const reactId = useId()
  const [open, setOpen] = useState(false)
  const [welcomeDismissed, setWelcomeDismissed] = useState(false)
  const [config, setConfig] = useState<ChatbotPopupConfig | null>(null)
  const [conversationId, setConversationId] = useState<string | undefined>()
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
            title: HOMIE_TITLE,
            greeting: HOMIE_GREETING,
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

  if (config && !config.enabled) return null

  const displayName = profile?.displayName?.trim() || 'bạn'
  const showGreeting = messages.length === 0
  const showTyping = busy && messages.some((m) => m.pending)

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

    setWelcomeDismissed(true)
    setOpen((v) => !v)
  }

  const send = async (text: string, fromSuggestion = false) => {
    const message = text.trim()
    if (!message || busy) return

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
      const reply = await sendChatbotMessage({ conversationId, message })
      setConversationId(reply.conversationId)
      setMessages((prev) => {
        const withoutPending = prev.filter((m) => m.id !== pendingId)
        return [
          ...withoutPending,
          reply.userMessage,
          { ...reply.assistantMessage, actions: reply.actions },
        ]
      })
      if (reply.searchUpdate) onSearchUpdate?.(reply.searchUpdate)
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== pendingId))
      setError(getErrorMessage(e, 'Homie tạm thời không phản hồi'))
      setSuggestionsLeaving(false)
    } finally {
      setBusy(false)
      setActivePrompt(null)
    }
  }

  const handleNavigationAction = (action: ChatbotNavigationAction) => {
    if (action.kind === ChatbotNavigationActionKind.OpenSection) {
      if (!ACTION_SECTIONS.has(action.target as MapAppSection)) return
      setOpen(false)
      onOpenSection?.(action.target as MapAppSection)
      return
    }

    if (action.kind === ChatbotNavigationActionKind.Navigate && action.target.startsWith('/')) {
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
              <span className="map-chatbot__avatar" aria-hidden>
                H
              </span>
              <p>{HOMIE_GREETING}</p>
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
                <span className="map-chatbot__avatar map-chatbot__avatar--inline" aria-hidden>
                  H
                </span>
              ) : null}
              <div className="map-chatbot__bubble">
                {isUser ? (
                  <span className="map-chatbot__bubble-text">{m.content}</span>
                ) : (
                  <>
                    <ChatbotMessageContent content={m.content} />
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
            <span className="map-chatbot__avatar map-chatbot__avatar--inline" aria-hidden>
              H
            </span>
            <div className="map-chatbot__bubble map-chatbot__bubble--typing">
              <span className="map-chatbot__typing" aria-label="Homie đang trả lời">
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
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Đặt câu hỏi cho homie ngay"
          disabled={busy}
          aria-label="Nhập tin nhắn cho Homie"
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
        className={`map-chatbot__panel is-${panel.side}${open ? ' is-visible' : ''}${
          sheetMode ? ' is-sheet' : ''
        }`}
        style={{
          pointerEvents: open ? 'auto' : 'none',
          left: panel.left,
          top: panel.top,
          width: panel.width,
          maxHeight: panel.maxHeight,
        }}
        aria-hidden={!open}
        inert={!open}
        role="dialog"
        aria-label={HOMIE_TITLE}
      >
        <header className="map-chatbot__head">
          <div className="map-chatbot__brand">
            <span className="map-chatbot__avatar" aria-hidden>
              H
            </span>
            <div>
              <strong>{HOMIE_TITLE}</strong>
              <p>Đồng bộ tìm kiếm trên bản đồ</p>
            </div>
          </div>
          <button
            type="button"
            className="map-chatbot__close"
            onClick={() => setOpen(false)}
            aria-label="Đóng Homie"
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
        aria-label={open ? 'Đóng Homie' : 'Mở Homie — kéo để di chuyển'}
        title={open ? 'Đóng Homie' : 'Homie — kéo để di chuyển'}
        onPointerDown={onFabPointerDown}
        onPointerMove={onFabPointerMove}
        onPointerUp={endFabPointer}
        onPointerCancel={endFabPointer}
      >
        <img src="/brand/homeji-logo.png" alt="" width="44" height="44" draggable={false} />
      </button>
      ) : null}
    </div>
  )
}
