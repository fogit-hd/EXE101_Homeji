import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import { motion } from 'motion/react'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
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
  type ChatbotRentalContext,
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
import { RentalContextCard } from '../ai/RentalContextCard'
import type { DecisionResponse } from '../../api/rentalAssistant'
import type { RentalAssistantSelection } from '../../contexts/rental-assistant-context'
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
  rentalContext?: RentalAssistantSelection | null
  onDismissRentalContext?: () => void
  openRequestToken?: number
}

type ChatRequest = {
  message: string
  context?: RentalAssistantSelection & { task?: ChatbotRentalContext['task'] }
  conversationId?: string
  previousCriteria?: AiParsedSearchCriteria
  saveHistory: boolean
}

type DisplayMessage = ChatbotMessage & {
  pending?: boolean
  retry?: ChatRequest
  failure?: string
  rentalContext?: RentalAssistantSelection
  rentalDecision?: DecisionResponse | null
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
  rentalContext = null,
  onDismissRentalContext,
  openRequestToken = 0,
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
  const draftRevision = useRef(0)
  const activeRequest = useRef<{ controller: AbortController; pendingId: string; request: ChatRequest; draftRevision: number; restoreDraft: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activePrompt, setActivePrompt] = useState<string | null>(null)
  const [suggestionsLeaving, setSuggestionsLeaving] = useState(false)
  const [sheetMode, setSheetMode] = useState(isSheetViewport)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const pendingIdRef = useRef(0)

  if (useChangedInputs([openRequestToken]) && openRequestToken) {
    setOpen(true)
  }

  useEffect(() => () => {
    activeRequest.current?.controller.abort()
    activeRequest.current = null
  }, [])

  useLayoutEffect(() => {
    const pending = activeRequest.current
    if (!pending?.request.context || pending.request.context.postId === rentalContext?.postId) return
    activeRequest.current = null
    pending.controller.abort()
    setBusy(false)
    setActivePrompt(null)
    setMessages(current => current.map(message => message.id === pending.pendingId
      ? { ...message, pending: false, failure: 'Đã dừng vì phòng đang hỗ trợ thay đổi.', retry: pending.request }
      : message))
    setDraft(current => pending.restoreDraft && !current && draftRevision.current === pending.draftRevision ? pending.request.message : current)
  }, [rentalContext?.postId])

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
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const focusFrame = window.requestAnimationFrame(() => inputRef.current?.focus())
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
      if (event.key !== 'Tab' || !document.querySelector('.room-detail[aria-modal="true"]')) return
      const panel = panelRef.current
      if (!panel?.contains(document.activeElement)) return
      const nodes = [...panel.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])')]
        .filter(node => node.getClientRects().length > 0)
      const first = nodes[0]
      const last = nodes.at(-1)
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      window.cancelAnimationFrame(focusFrame)
      document.removeEventListener('keydown', closeOnEscape)
      if (opener?.isConnected) opener.focus()
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


  const stopRequest = () => {
    const pending = activeRequest.current
    if (!pending) return
    activeRequest.current = null
    pending.controller.abort()
    setBusy(false); setActivePrompt(null); setSuggestionsLeaving(false)
    setMessages(current => current.map(message => message.id === pending.pendingId
      ? { ...message, pending: false, failure: 'Đã dừng chờ phản hồi. Bạn có thể sửa hoặc thử lại.', retry: pending.request }
      : message))
    setDraft(current => pending.restoreDraft && !current && draftRevision.current === pending.draftRevision ? pending.request.message : current)
    inputRef.current?.focus()
  }

  const send = async (text: string, fromSuggestion = false, task?: ChatbotRentalContext['task'], retryMessage?: DisplayMessage) => {
    const message = text.trim()
    if (!message || busy || activeRequest.current) return
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

    const normalized = message.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase()
    const refersToRoom = /\b(?:phong|tin|cho) (?:nay|dang xem)\b/.test(normalized)
    const startsSearch = /\b(?:tim|kiem|goi y|de xuat)\b.*\b(?:phong|o ghep|nha)\b/.test(normalized)
    const context = rentalContext && (task || refersToRoom && !startsSearch) ? { ...rentalContext, task } : undefined
    const request: ChatRequest = retryMessage?.retry ?? {
      message, context,
      conversationId: saveHistory ? conversationId : undefined,
      previousCriteria: saveHistory || context ? undefined : sessionCriteria.current,
      saveHistory,
    }
    const pendingId = retryMessage?.id ?? `${reactId}-pending-${++pendingIdRef.current}`
    const pending = { controller: new AbortController(), pendingId, request, draftRevision: draftRevision.current,
      restoreDraft: draft.trim() === message }
    activeRequest.current = pending
    setBusy(true); setError(null)
    if (pending.restoreDraft) setDraft('')
    if (fromSuggestion) { setActivePrompt(message); setSuggestionsLeaving(true) }
    const optimisticUser: DisplayMessage = {
      id: pendingId,
      conversationId: request.conversationId ?? '',
      sender: ChatMessageSender.User,
      content: request.message,
      createdAt: new Date().toISOString(),
      pending: true,
      rentalContext: request.context,
    }

    setMessages(prev => retryMessage ? prev.map(item => item.id === pendingId ? optimisticUser : item) : [...prev, optimisticUser])

    try {
      const reply = await sendChatbotMessage({ conversationId: request.conversationId, message: request.message, saveHistory: request.saveHistory,
        previousCriteria: request.previousCriteria, rentalContext: request.context ? { postId: request.context.postId, task: request.context.task } : undefined }, pending.controller.signal)
      if (activeRequest.current !== pending || pending.controller.signal.aborted) return
      setConversationId(request.saveHistory ? reply.conversationId : undefined)
      const contextualUnavailable = Boolean(request.context) && (!reply.rentalDecision
        || reply.rentalDecision.posts.some(item => item.post.id !== request.context!.postId))
      if (reply.searchUpdate && !request.context) sessionCriteria.current = reply.searchUpdate.criteria
      setMessages((prev) => {
        const userMessage = { ...reply.userMessage, rentalContext: request.context }
        const assistantMessage = { ...reply.assistantMessage,
          content: contextualUnavailable ? 'Trợ lý chưa nhận được dữ liệu của phòng đang chọn. Mở chi tiết phòng để dùng công cụ chi phí và xem những khoản cần hỏi chủ tin, hoặc thử lại sau. Câu trả lời chung không được dùng làm giá hay phí của phòng này.' : reply.assistantMessage.content,
          actions: contextualUnavailable ? [{ id: 'open-context-room', kind: ChatbotNavigationActionKind.Navigate,
            label: 'Mở chi tiết phòng', description: 'Xem thông tin và công cụ chi phí của phòng đã chọn',
            target: `/?section=listings&post=${encodeURIComponent(request.context!.postId)}` }] : reply.actions,
          searchUpdate: request.context ? null : reply.searchUpdate,
          rentalContext: request.context, rentalDecision: contextualUnavailable ? null : reply.rentalDecision }
        return prev.flatMap(item => item.id === pendingId ? [userMessage, assistantMessage] : [item])
      })
    } catch (e) {
      if (activeRequest.current !== pending || pending.controller.signal.aborted) return
      const failure = getErrorMessage(e, 'Homeji tạm thời không phản hồi')
      setMessages(prev => prev.map(item => item.id === pendingId ? { ...item, pending: false, retry: request, failure } : item))
      setDraft(current => pending.restoreDraft && !current && draftRevision.current === pending.draftRevision ? request.message : current)
      setSuggestionsLeaving(false)
    } finally {
      if (activeRequest.current === pending) { activeRequest.current = null; setBusy(false); setActivePrompt(null) }
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
      {rentalContext ? <section className="map-chatbot__context" aria-label="Phòng đang hỗ trợ">
        <div><span>Đang hỗ trợ phòng</span><strong>{rentalContext.title || 'Tin phòng đang xem'}</strong></div>
        <button type="button" onClick={onDismissRentalContext} aria-label="Bỏ ngữ cảnh phòng đang xem">×</button>
        <div className="map-chatbot__context-prompts">
          <button type="button" disabled={busy} onClick={() => void send('Tính tiền tháng của phòng này', false, 'cost')}>Tính tiền tháng</button>
          <button type="button" disabled={busy} onClick={() => void send('Những điều cần hỏi về phòng này', false, 'questions')}>Những điều cần hỏi</button>
        </div>
        <small>Chỉ dùng tin này khi bạn hỏi về phòng đang xem. Tìm phòng mới vẫn dùng nhu cầu bạn nhập.</small>
      </section> : null}
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
                m.rentalDecision ? 'is-grounded' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {!isUser ? (
                <HomejiAvatar inline />
              ) : null}
              <div className="map-chatbot__bubble">
                {m.rentalContext ? <small className="map-chatbot__message-context">Về phòng: {m.rentalContext.title || 'Tin phòng đã chọn'}</small> : null}
                {isUser ? (
                  <><span className="map-chatbot__bubble-text">{m.content}</span>
                    {m.failure ? <div className="map-chatbot__recovery"><p role="status">{m.failure}</p><button type="button" disabled={busy}
                      onClick={() => void send(m.content, false, undefined, m)}>Thử lại câu hỏi này</button></div> : null}</>
                ) : (
                  <>
                    <ChatbotMessageContent content={m.content} />
                    {m.rentalDecision ? <section className="map-chatbot__decision" aria-label="Thông tin và chi phí theo tin phòng">
                      <RentalContextCard data={m.rentalDecision} onOpenDetail={() => setOpen(false)} />
                    </section> : null}
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

      {error ? <p className="map-chatbot__error" role="alert">{error}</p> : null}
      {showTyping ? <div className="map-chatbot__request-status" role="status"><span>Đang lấy thông tin… Bạn có thể tiếp tục soạn.</span><button type="button" onClick={stopRequest}>Dừng chờ</button></div> : null}
      <details className="map-chatbot__privacy" data-glass-exclude><summary>Hội thoại và tiêu chí của bạn</summary>
        <p>{saveHistory ? 'Bạn đã đồng ý lưu hội thoại thuộc tài khoản của mình.' : 'Tin nhắn và tiêu chí chỉ dùng trong phiên hiện tại; không ghi vào lịch sử chatbot trên máy chủ.'} Homeji dùng tiêu chí bạn nhập để tìm phòng; không tự lấy vị trí thiết bị. Tin nhắn hỗ trợ chung có thể được gửi tới Gemini để trả lời.</p>
        {config?.historyStorageEnabled ? <label><input type="checkbox" checked={saveHistory} disabled={busy} onChange={event => {
          setSaveHistory(event.target.checked); setConversationId(undefined); sessionCriteria.current = undefined; setMessages([]); setDraft(''); draftRevision.current += 1
        }} /> Đồng ý lưu hội thoại và tiêu chí theo chính sách lưu lịch sử</label> : <p>Lưu lịch sử hiện đang tắt.</p>}
        {!saveHistory ? <button type="button" disabled={busy} onClick={() => { setMessages([]); setDraft(''); draftRevision.current += 1; sessionCriteria.current = undefined }}>Xóa nội dung phiên và tiêu chí</button> : null}
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
          onChange={(e) => { draftRevision.current += 1; setDraft(e.target.value) }}
          placeholder="Hỏi Homeji ngay"
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
        data-homeji-ai-panel={panelVisible ? 'open' : 'closed'}
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
