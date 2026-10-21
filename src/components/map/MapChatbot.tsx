import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import { motion } from 'motion/react'
import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChatMessageSender,
  ChatbotNavigationActionKind,
  deleteChatbotConversation,
  getChatbotPopupConfig,
  sendChatbotMessage,
  type AiHighlightResponse,
  type AiParsedSearchCriteria,
  type ChatbotMessage,
  type ChatbotNavigationAction,
  type ChatbotPopupConfig,
} from '../../api'
import { useAuth } from '../../contexts/AuthContext'
import { useAuthModal } from "../../contexts/AuthModalContext.logic"
import { useChangedInputs } from '../../hooks/useChangedInputs'

import { getErrorMessage } from '../../lib/errors'
import { requestMarketplaceCart, requestMarketplaceTab } from '../../lib/marketplaceNavigation'
import { nearbyChatIntent } from '../../lib/nearbyChatIntent'
import type { NearbyPlaceCategory } from '../../lib/placeAutocomplete'
import { AiSearchReview } from '../ai/AiSearchReview'
import { ChatbotMessageContent } from './ChatbotMessageContent'
import type { MapAppSection } from "./MapAppPanel.logic"

import {
  HOMEJI_AI_TRIGGER_ATTR,
  onHomejiAiToggle,
  publishHomejiAiOpen,
} from '../../lib/homejiAiLauncher'
import './MapChatbot.css'

const HOMEJI_TITLE = 'Homeji'
const HOMEJI_GREETING =
  'Chào bạn! Mình là trợ lý Homeji. Mình có thể tìm phòng, mở đúng tính năng và hỗ trợ bạn chọn đồ ăn an toàn.'
/** Synced from video-src/AI Chat loading.lottie */
const AI_CHAT_LOADING_SRC = '/lottie/ai-chat-loading.lottie'

const VIEW_MARGIN = 12
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
  /** Legacy: callers asked to hide the floating button; now only closes an open chat when it turns on. */
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

type PanelLayout = {
  left: number
  top: number
  width: number
  maxHeight: number
}

function HomejiAvatar({ inline = false }: { inline?: boolean }) {
  return (
    <span
      className={`map-chatbot__avatar${inline ? ' map-chatbot__avatar--inline' : ''}`}
      aria-hidden
    >
      <img src="/brand/homeji-logo2.png" alt="" draggable={false} />
    </span>
  )
}

/** Desktop: hang under the navbar trigger, right edges aligned. */
function navPanelLayout(anchor: DOMRect | null): PanelLayout {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const width = Math.min(400, vw - VIEW_MARGIN * 2)
  const top = Math.round((anchor?.bottom ?? 64) + 10)
  const right = anchor ? anchor.right : vw - VIEW_MARGIN
  const left = Math.max(VIEW_MARGIN, Math.min(right - width, vw - VIEW_MARGIN - width))
  const maxHeight = Math.max(320, Math.min(600, vh - top - VIEW_MARGIN))
  return { left, top, width, maxHeight }
}

export function MapChatbot({
  onSearchUpdate,
  dismissSignal = 0,
  onOpenChange,
  hideFab = false,
  onOpenSection,
  onNearbyRequest,
}: Props) {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { openAuthModal } = useAuthModal()
  const reactId = useId()
  const [open, setOpen] = useState(false)
  const [anchor, setAnchor] = useState<DOMRect | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
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
  const [sheetMode, setSheetMode] = useState(isSheetViewport)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const pendingIdRef = useRef(0)

  const panel = navPanelLayout(anchor)

  useEffect(() => onHomejiAiToggle(({ anchor: rect, open: want }) => {
    setAnchor(rect)
    setOpen((value) => want ?? !value)
  }), [])

  useEffect(() => {
    publishHomejiAiOpen(open)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDown = (event: PointerEvent) => {
      const target = event.target as Element | null
      if (!target || panelRef.current?.contains(target)) return
      if (target.closest(`[${HOMEJI_AI_TRIGGER_ATTR}]`)) return
      // Portaled UI launched from the chat (auth modal, review sheets) must not close it.
      if (target.closest('[role="dialog"]')) return
      setOpen(false)
    }
    const onResize = () => setAnchor(document.querySelector(`[${HOMEJI_AI_TRIGGER_ATTR}]`)?.getBoundingClientRect() ?? null)
    document.addEventListener('pointerdown', onDown)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      window.removeEventListener('resize', onResize)
    }
  }, [open])

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

  if (useChangedInputs([dismissSignal])) {
    if (dismissSignal > 0) setOpen(false)
  }

  if (useChangedInputs([hideFab]) && hideFab) {
    setOpen(false)
  }

  if (config && !config.enabled) return null

  const showGreeting = messages.length === 0
  const showTyping = busy && messages.some((m) => m.pending)
  const panelVisible = open


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
      <details className="map-chatbot__privacy" data-glass-exclude><summary>Hội thoại và tiêu chí của bạn</summary>
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
    <div className="map-chatbot is-nav" style={{ pointerEvents: 'none' }}>
      <motion.div
        ref={panelRef}
        className={`map-chatbot__panel is-nav${panelVisible ? ' is-visible' : ''}${
          sheetMode ? ' is-sheet' : ''
        }${busy ? ' is-thinking' : ''}`}
        initial={false}
        animate={panelVisible
          ? { opacity: 1, y: 0, scale: 1 }
          : { opacity: 0, y: sheetMode ? '100%' : -10, scale: sheetMode ? 1 : 0.97 }}
        transition={panelVisible
          ? { type: 'spring', stiffness: 420, damping: 34, mass: 0.9 }
          : { duration: 0.18, ease: [0.4, 0, 1, 1] }}
        style={{
          pointerEvents: panelVisible ? 'auto' : 'none',
          visibility: panelVisible ? 'visible' : undefined,
          left: panel.left,
          top: panel.top,
          width: panel.width,
          maxHeight: panel.maxHeight,
          transformOrigin: sheetMode ? 'center bottom' : 'top right',
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
      </motion.div>
    </div>
  )
}
