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
  type ChatbotFoodContext,
  type ChatbotFoodResponse,
  type ChatbotFoodCriteria,
} from '../../api'
import { useAuth } from '../../contexts/AuthContext'
import { useAuthModal } from "../../contexts/AuthModalContext.logic"
import { useChangedInputs } from '../../hooks/useChangedInputs'

import { getErrorMessage } from '../../lib/errors'
import { requestMarketplaceCart, requestMarketplaceTab } from '../../lib/marketplaceNavigation'
import { nearbyChatIntent } from '../../lib/nearbyChatIntent'
import { isFoodChat, isFoodDiscoveryChat, isFoodRefinement, foodCriteriaSnapshot } from '../../lib/foodChatIntent'
import { FoodDiscoveryCard } from '../ai/FoodDiscoveryCard'
import type { NearbyPlaceCategory } from '../../lib/placeAutocomplete'
import { AiSearchReview } from '../ai/AiSearchReview'
import { ChatbotMessageContent } from './ChatbotMessageContent'
import type { MapAppSection } from "./MapAppPanel.logic"

import {
  HOMEJI_AI_TRIGGER_ATTR,
  HOMEJI_AI_PANEL_ID,
  onHomejiAiToggle,
  publishHomejiAiOpen,
} from '../../lib/homejiAiLauncher'
import { RentalContextCard } from '../ai/RentalContextCard'
import type { DecisionResponse } from '../../api/rentalAssistant'
import type { RentalAssistantSelection, RentalAssistantComparison } from '../../contexts/rental-assistant-context'
import { decisionMatchesChoices, rentalScenarioSnapshot } from '../../lib/rentalJourney'
import { isVisibleFocusTarget } from '../../lib/isVisibleFocusTarget'
import './MapChatbot.css'

const HOMEJI_TITLE = 'Homeji'
const HOMEJI_GREETING =
  'Chào bạn! Mình là trợ lý Homeji. Mình có thể tìm phòng, mở đúng tính năng và hỗ trợ bạn chọn đồ ăn an toàn.'
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
  rentalSelection?: RentalAssistantComparison | null
  onDismissRentalContext?: () => void
  openRequestToken?: number
}

type ChatRequest = {
  message: string
  context?: RentalAssistantSelection & { task?: ChatbotRentalContext['task'] }
  selection?: RentalAssistantComparison & { task?: 'compare' | 'cost' | 'questions' | 'details' }
  conversationId?: string
  previousCriteria?: AiParsedSearchCriteria
  saveHistory: boolean
  foodContext?: ChatbotFoodContext
  previousFoodCriteria?: ChatbotFoodCriteria
}

type DisplayMessage = ChatbotMessage & {
  pending?: boolean
  retry?: ChatRequest
  failure?: string
  rentalContext?: RentalAssistantSelection
  rentalSelection?: RentalAssistantComparison
  rentalDecision?: DecisionResponse | null
  actions?: ChatbotNavigationAction[]
  searchUpdate?: AiHighlightResponse | null
  foodDiscovery?: ChatbotFoodResponse | null
  foodQuery?: string
}

type PanelLayout = {
  left: number
  top: number
  width: number
  maxHeight: number
}

type AssistantIconName = 'expand' | 'shrink' | 'plus' | 'tools' | 'close' | 'send' | 'copy' | 'search' | 'home' | 'bag' | 'bookmark' | 'chat' | 'calendar' | 'arrow'
function AssistantIcon({ name }: { name: AssistantIconName }) {
  const paths: Record<AssistantIconName, string> = {
    expand: 'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M3 3l6 6m12-6-6 6M3 21l6-6m12 6-6-6',
    shrink: 'M3 8h5V3m8 0v5h5M8 21v-5H3m18 0h-5v5M8 8 3 3m13 5 5-5M8 16l-5 5m13-5 5 5',
    plus: 'M12 5v14M5 12h14', tools: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
    close: 'm6 6 12 12M6 18 18 6', send: 'M12 19V5m-6 6 6-6 6 6',
    copy: 'M9 9h12v12H9zM15 9V3H3v12h6', search: 'M16 16l5 5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
    home: 'm3 10 9-7 9 7v11H3zm6 11v-7h6v7', bag: 'M4 7h16l1 14H3zm4 0V5a4 4 0 0 1 8 0v2',
    bookmark: 'M6 3h12v18l-6-4-6 4z', chat: 'M21 11a9 9 0 0 1-9 9H3l1-5a9 9 0 1 1 17-4',
    calendar: 'M3 5h18v16H3zM7 3v4m10-4v4M3 10h18M7 14h3m4 0h3', arrow: 'M5 12h14m-5-5 5 5-5 5',
  }
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
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

function rentalTargetKey(room?: RentalAssistantSelection | null, selection?: RentalAssistantComparison | null) {
  return selection ? `choices:${JSON.stringify([selection.postIds, rentalScenarioSnapshot(selection.scenario)])}` : room ? `room:${room.postId}` : ''
}

/** Compact docks at the right; expanded centers within the available keyboard-safe viewport. */
function assistantViewport() {
  const viewport = window.visualViewport
  return { width: viewport?.width ?? window.innerWidth, height: viewport?.height ?? window.innerHeight, offsetTop: viewport?.offsetTop ?? 0 }
}

function navPanelLayout(expanded: boolean, sheet: boolean, viewport: ReturnType<typeof assistantViewport>): PanelLayout {
  const { width: vw, height: vh, offsetTop } = viewport
  const margin = sheet ? expanded ? 0 : 8 : expanded ? 24 : VIEW_MARGIN
  const width = sheet ? vw - margin * 2 : Math.min(expanded ? 1160 : 460, vw - margin * 2)
  const height = Math.max(0, Math.min(sheet ? expanded ? vh : vh * 0.92 : expanded ? 840 : 740, vh - margin * 2))
  const top = offsetTop + (sheet ? vh - height - margin : expanded ? (vh - height) / 2 : Math.min(80, Math.max(margin, vh - height - margin)))
  const left = sheet || expanded ? (vw - width) / 2 : vw - width - margin
  const maxHeight = height
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
  rentalSelection = null,
  onDismissRentalContext,
  openRequestToken = 0,
}: Props) {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { openAuthModal } = useAuthModal()
  const reactId = useId()
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)
  const [resetRequested, setResetRequested] = useState(false)
  const [copyStatus, setCopyStatus] = useState('')
  const [viewport, setViewport] = useState(assistantViewport)
  const panelRef = useRef<HTMLDivElement>(null)
  const toolsButtonRef = useRef<HTMLButtonElement>(null)
  const [config, setConfig] = useState<ChatbotPopupConfig | null>(null)
  const [conversationId, setConversationId] = useState<string | undefined>()
  const [saveHistory, setSaveHistory] = useState(false)
  const sessionCriteria = useRef<AiParsedSearchCriteria | undefined>(undefined)
  const sessionFood = useRef<ChatbotFoodCriteria | undefined>(undefined)
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [draft, setDraft] = useState('')
  const draftRevision = useRef(0)
  const activeRequest = useRef<{ controller: AbortController; pendingId: string; request: ChatRequest; draftRevision: number; restoreDraft: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sheetMode, setSheetMode] = useState(isSheetViewport)
  const bottomRef = useRef<HTMLDivElement>(null)
  const latestMessageRef = useRef<HTMLElement | null>(null)
  const lastScrolledMessage = useRef<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const pendingIdRef = useRef(0)
  const activeTargetKey = rentalTargetKey(rentalContext, rentalSelection)

  if (useChangedInputs([openRequestToken]) && openRequestToken) {
    setOpen(true)
  }

  useEffect(() => () => {
    activeRequest.current?.controller.abort()
    activeRequest.current = null
  }, [])

  useLayoutEffect(() => {
    const pending = activeRequest.current
    if (!pending || !pending.request.context && !pending.request.selection
      || rentalTargetKey(pending.request.context, pending.request.selection) === activeTargetKey) return
    activeRequest.current = null
    pending.controller.abort()
    setBusy(false)
    setMessages(current => current.map(message => message.id === pending.pendingId
      ? { ...message, pending: false, failure: 'Đã dừng vì phòng đang hỗ trợ thay đổi.', retry: pending.request }
      : message))
    setDraft(current => pending.restoreDraft && !current && draftRevision.current === pending.draftRevision ? pending.request.message : current)
  }, [activeTargetKey])

  const panel = navPanelLayout(expanded, sheetMode, viewport)
  const modal = expanded || sheetMode
  const panelVisible = open && config?.enabled !== false

  const closeChat = () => {
    setOpen(false)
    setToolsOpen(false)
  }

  useEffect(() => onHomejiAiToggle(({ open: want }) => {
    setOpen((value) => {
      const next = want ?? !value
      if (!next) setToolsOpen(false)
      return next
    })
  }), [])

  useEffect(() => {
    publishHomejiAiOpen(panelVisible)
  }, [panelVisible])

  useEffect(() => {
    if (!panelVisible) return
    const onDown = (event: PointerEvent) => {
      const target = event.target as Element | null
      if (!target || panelRef.current?.contains(target)) return
      if (target.closest(`[${HOMEJI_AI_TRIGGER_ATTR}]`)) return
      // Portaled UI launched from the chat (auth modal, review sheets) must not close it.
      if (target.closest('[role="dialog"]')) return
      if (!modal) closeChat()
    }
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('pointerdown', onDown)
    }
  }, [panelVisible, modal])

  useEffect(() => {
    const update = () => setViewport(assistantViewport())
    window.addEventListener('resize', update)
    window.visualViewport?.addEventListener('resize', update)
    window.visualViewport?.addEventListener('scroll', update)
    return () => {
      window.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('scroll', update)
    }
  }, [])

  useLayoutEffect(() => {
    const input = inputRef.current
    if (!input) return
    input.style.height = 'auto'
    input.style.height = `${Math.min(110, Math.max(28, input.scrollHeight))}px`
  }, [draft, expanded])

  useEffect(() => {
    if (!panelVisible || !modal) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [panelVisible, modal])

  useEffect(() => {
    if (!panelVisible || !modal) return
    // Isolate the workspace while leaving portaled auth/review dialogs available.
    const restore: Array<() => void> = []
    let child: HTMLElement | null = panelRef.current?.parentElement ?? null
    while (child && child !== document.body) {
      for (const sibling of child.parentElement?.children ?? []) {
        if (!(sibling instanceof HTMLElement) || sibling === child || sibling.matches('.auth-modal-overlay')) continue
        const wasInert = sibling.hasAttribute('inert')
        sibling.setAttribute('inert', '')
        restore.push(() => { if (!wasInert) sibling.removeAttribute('inert') })
      }
      child = child.parentElement
    }
    return () => { restore.reverse().forEach(reset => reset()) }
  }, [panelVisible, modal])

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
    if (!panelVisible) return
    const body = panelRef.current?.querySelector<HTMLElement>('.map-chatbot__body')
    const latest = messages.at(-1)
    if (!latest) {
      lastScrolledMessage.current = null
      body?.scrollTo?.({ top: 0 })
      return
    }
    if (lastScrolledMessage.current === latest.id) return
    lastScrolledMessage.current = latest.id
    if (latest.sender === ChatMessageSender.Assistant && body && latestMessageRef.current) {
      const top = body.scrollTop + latestMessageRef.current.getBoundingClientRect().top - body.getBoundingClientRect().top - 12
      body.scrollTo?.({ top: Math.max(0, top), behavior: 'auto' })
    } else bottomRef.current?.scrollIntoView?.({ block: 'end', behavior: 'auto' })
  }, [messages, panelVisible])

  useEffect(() => {
    const mq = window.matchMedia(SHEET_MEDIA)
    const onChange = () => setSheetMode(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (!panelVisible) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const focusFrame = window.requestAnimationFrame(() => inputRef.current?.focus())
    const closeOnEscape = (event: KeyboardEvent) => {
      const panel = panelRef.current
      if (event.target instanceof Element && event.target.closest('[role="dialog"]') && !panel?.contains(event.target)) return
      if (event.key === 'Escape') closeChat()
      if (event.key !== 'Tab' || !(panel?.getAttribute('aria-modal') === 'true' || document.querySelector('.room-detail[aria-modal="true"]'))) return
      if (!panel?.contains(document.activeElement)) return
      const nodes = [...panel.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])')]
        .filter(isVisibleFocusTarget)
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
  }, [panelVisible])

  useEffect(() => {
    onOpenChange?.(panelVisible)
  }, [panelVisible, onOpenChange])

  if (useChangedInputs([dismissSignal])) {
    if (dismissSignal > 0) closeChat()
  }

  if (useChangedInputs([hideFab]) && hideFab) {
    closeChat()
  }

  if (config && !config.enabled) return null

  const showGreeting = messages.length === 0
  const showTyping = busy && messages.some((m) => m.pending)


  const stopRequest = () => {
    const pending = activeRequest.current
    if (!pending) return
    activeRequest.current = null
    pending.controller.abort()
    setBusy(false)
    setMessages(current => current.map(message => message.id === pending.pendingId
      ? { ...message, pending: false, failure: 'Đã dừng chờ phản hồi. Bạn có thể sửa hoặc thử lại.', retry: pending.request }
      : message))
    setDraft(current => pending.restoreDraft && !current && draftRevision.current === pending.draftRevision ? pending.request.message : current)
    inputRef.current?.focus()
  }

  const send = async (text: string, fromSuggestion = false, task?: ChatbotRentalContext['task'] | 'compare', retryMessage?: DisplayMessage, foodContext?: ChatbotFoodContext, foodCriteria?: ChatbotFoodCriteria) => {
    const message = text.trim()
    if (!message || busy || activeRequest.current) return
    const previousFood = retryMessage?.retry?.previousFoodCriteria ?? foodCriteria ?? (isFoodRefinement(message) ? sessionFood.current : undefined)
    const foodQuery = isFoodChat(message) || Boolean(previousFood && isFoodRefinement(message))
    const nearby = foodQuery ? null : nearbyChatIntent(message)
    if (nearby) {
      if (onNearbyRequest?.(nearby)) { closeChat(); setDraft(''); setError(null) }
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
    const startsSearch = /\b(?:tim|kiem|loc|goi y|de xuat)\b.*\b(?:phong|tro|o ghep|nha)\b|\b(?:phong|tro) khac\b|\b(?:tim lai|bat dau lai)\b/.test(normalized)
    const refersToChoices = /\b(?:(?:hai|ba|2|3|cac|nhung) (?:lua chon|phong|tin)|so sanh|danh sach (?:nay|can nhac))\b/.test(normalized)
    const selection = !foodQuery && rentalSelection && !startsSearch && (task || refersToChoices)
      ? { ...rentalSelection, postIds: [...rentalSelection.postIds], scenario: rentalScenarioSnapshot(rentalSelection.scenario), task } : undefined
    const context = !foodQuery && !selection && rentalContext && task !== 'compare' && !startsSearch && (task || refersToRoom) ? { ...rentalContext, task } : undefined
    const request: ChatRequest = retryMessage?.retry ?? {
      message, context, selection,
      conversationId: saveHistory ? conversationId : undefined,
      previousCriteria: saveHistory || context || selection || foodQuery ? undefined : sessionCriteria.current,
      foodContext: foodContext ? { ...foodContext } : undefined,
      previousFoodCriteria: previousFood ? foodCriteriaSnapshot(previousFood) : undefined,
      saveHistory,
    }
    const pendingId = retryMessage?.id ?? `${reactId}-pending-${++pendingIdRef.current}`
    const pending = { controller: new AbortController(), pendingId, request, draftRevision: draftRevision.current,
      restoreDraft: draft.trim() === message }
    activeRequest.current = pending
    setBusy(true); setError(null)
    if (pending.restoreDraft) setDraft('')
    if (fromSuggestion) setToolsOpen(false)
    setCopyStatus('')
    const optimisticUser: DisplayMessage = {
      id: pendingId,
      conversationId: request.conversationId ?? '',
      sender: ChatMessageSender.User,
      content: request.message,
      createdAt: new Date().toISOString(),
      pending: true,
      rentalContext: request.context,
      rentalSelection: request.selection,
    }

    setMessages(prev => retryMessage ? prev.map(item => item.id === pendingId ? optimisticUser : item) : [...prev, optimisticUser])

    try {
      const reply = await sendChatbotMessage({ conversationId: request.conversationId, message: request.message, saveHistory: request.saveHistory,
        previousCriteria: request.previousCriteria, foodContext: request.foodContext, previousFoodCriteria: request.previousFoodCriteria, rentalContext: request.context ? { postId: request.context.postId, task: request.context.task } : undefined,
        rentalSelection: request.selection ? { postIds: request.selection.postIds, task: request.selection.task, scenario: request.selection.scenario } : undefined }, pending.controller.signal)
      if (activeRequest.current !== pending || pending.controller.signal.aborted) return
      setConversationId(request.saveHistory ? reply.conversationId : undefined)
      const contextualUnavailable = request.selection ? !decisionMatchesChoices(reply.rentalDecision, request.selection.postIds)
        : Boolean(request.context) && !decisionMatchesChoices(reply.rentalDecision, [request.context!.postId])
      const foodExpected = isFoodDiscoveryChat(request.message) || Boolean(request.previousFoodCriteria && isFoodRefinement(request.message))
      const foodUnavailable = foodExpected && !reply.foodDiscovery
      sessionFood.current = reply.foodDiscovery && !request.context && !request.selection ? foodCriteriaSnapshot(reply.foodDiscovery) : undefined
      if (reply.searchUpdate && !request.context && !request.selection && !foodExpected) sessionCriteria.current = reply.searchUpdate.criteria
      setMessages((prev) => {
        const userMessage = { ...reply.userMessage, rentalContext: request.context, rentalSelection: request.selection }
        const assistantMessage = { ...reply.assistantMessage,
          content: foodUnavailable ? 'Chưa nhận được dữ liệu món ăn từ Chợ Homeji. Bạn có thể thử lại hoặc mở Chợ đồ ăn để xem thực đơn.' : contextualUnavailable ? 'Trợ lý chưa nhận được dữ liệu đúng các lựa chọn đang chọn. Mở chi tiết hoặc màn so sánh để dùng công cụ chi phí, hoặc thử lại sau. Câu trả lời chung không được dùng làm giá hay phí của các phòng này.' : reply.assistantMessage.content,
          actions: foodUnavailable ? [{ id: 'food-menu', kind: ChatbotNavigationActionKind.OpenSection, label: 'Mở Chợ đồ ăn', description: 'Xem món đang bán', target: 'marketplace:food' }] : contextualUnavailable ? [{ id: 'open-context-room', kind: ChatbotNavigationActionKind.Navigate,
            label: request.selection ? 'Mở danh sách cân nhắc' : 'Mở chi tiết phòng', description: 'Xem thông tin và công cụ chi phí của các lựa chọn',
            target: request.selection ? '/?section=saved&view=considering' : `/?section=listings&post=${encodeURIComponent(request.context!.postId)}` }] : reply.actions,
          searchUpdate: request.context || request.selection || foodExpected ? null : reply.searchUpdate,
          rentalContext: request.context, rentalSelection: request.selection, rentalDecision: contextualUnavailable || foodExpected ? null : reply.rentalDecision,
          foodDiscovery: request.context || request.selection ? null : reply.foodDiscovery, foodQuery: request.message }
        return prev.flatMap(item => item.id === pendingId ? [userMessage, assistantMessage] : [item])
      })
    } catch (e) {
      if (activeRequest.current !== pending || pending.controller.signal.aborted) return
      const failure = getErrorMessage(e, 'Homeji tạm thời không phản hồi')
      setMessages(prev => prev.map(item => item.id === pendingId ? { ...item, pending: false, retry: request, failure } : item))
      setDraft(current => pending.restoreDraft && !current && draftRevision.current === pending.draftRevision ? request.message : current)
    } finally {
      if (activeRequest.current === pending) { activeRequest.current = null; setBusy(false) }
    }
  }

  const deleteConversation = async () => {
    if (!conversationId || busy || !window.confirm('Xóa hội thoại hiện tại và tiêu chí đã lưu? Thao tác không thể hoàn tác.')) return
    setBusy(true); setError(null)
    try {
      await deleteChatbotConversation(conversationId)
      setConversationId(undefined); setMessages([]); setDraft(''); sessionCriteria.current = undefined; sessionFood.current = undefined
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
      setToolsOpen(false)
      onOpenSection?.(section as MapAppSection)
      return
    }

    if (action.kind === ChatbotNavigationActionKind.Navigate && /^\/(?!\/)[^\\]*$/.test(action.target)) {
      setOpen(false)
      setToolsOpen(false)
      navigate(action.target)
    }
  }

  const prepareDraft = (text: string) => {
    draftRevision.current += 1
    setDraft(text)
    setToolsOpen(false)
    setError(null)
    inputRef.current?.focus()
  }

  const startNewConversation = () => {
    if (busy) return
    setConversationId(undefined)
    sessionCriteria.current = undefined
    sessionFood.current = undefined
    setMessages([])
    setDraft('')
    draftRevision.current += 1
    setError(null)
    setCopyStatus('')
    setResetRequested(false)
    inputRef.current?.focus()
  }

  const copyReply = async (content: string) => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(content)
      setCopyStatus('Đã sao chép câu trả lời.')
    } catch {
      setCopyStatus('Chưa sao chép được. Bạn có thể chọn nội dung để sao chép thủ công.')
    }
  }

  const shortcuts: Array<{ section: MapAppSection; label: string; icon: AssistantIconName }> = [
    { section: 'listings', label: 'Tìm phòng', icon: 'search' },
    { section: 'saved', label: 'Phòng đã lưu', icon: 'bookmark' },
    { section: 'messages', label: 'Tin nhắn', icon: 'chat' },
    { section: 'marketplace', label: 'Chợ Homeji', icon: 'bag' },
    { section: 'appointments', label: 'Lịch xem phòng', icon: 'calendar' },
  ]
  const showTools = toolsOpen
  const scrollToEnd = () => bottomRef.current?.scrollIntoView?.({ block: 'end', behavior: 'smooth' })

  return (
    <div className="map-chatbot homeji-assistant is-nav" data-expanded={expanded} data-glass-exclude>
      {panelVisible && modal ? <button type="button" className="homeji-assistant__backdrop" tabIndex={-1}
        aria-label="Đóng không gian trợ lý" onClick={closeChat} /> : null}
      <div ref={panelRef} id={HOMEJI_AI_PANEL_ID}
        className={`map-chatbot__panel homeji-assistant__window${panelVisible ? ' is-visible' : ''}${sheetMode ? ' is-sheet' : ''}${expanded ? ' is-expanded' : ''}${busy ? ' is-thinking' : ''}`}
        style={{ left: panel.left, top: panel.top, width: panel.width, height: panel.maxHeight, maxHeight: panel.maxHeight }}
        aria-hidden={!panelVisible} aria-modal={modal ? true : undefined}
        data-homeji-ai-panel={panelVisible ? 'open' : 'closed'} inert={!panelVisible}
        role="dialog" aria-label={HOMEJI_TITLE}>
        <header className="map-chatbot__head">
          <div className="map-chatbot__head-left">
            <div className="map-chatbot__brand">
              <HomejiAvatar />
              <div className="map-chatbot__brand-titles">
                <span className="homeji-assistant__eyebrow">HOMEJI / AI</span>
                <strong>Homeji</strong>
              </div>
            </div>
            <button
              ref={toolsButtonRef}
              type="button"
              className="homeji-assistant__tools-trigger"
              onClick={() => setToolsOpen(value => !value)}
              aria-expanded={showTools}
              aria-controls={showTools ? `${reactId}-tools` : undefined}
            >
              <AssistantIcon name="tools" />
              <span>Công cụ</span>
            </button>
          </div>
          <div className="homeji-assistant__window-actions">
            {messages.length > 0 ? (
              <button
                type="button"
                className="homeji-assistant__icon-button"
                onClick={scrollToEnd}
                aria-label="Tới cuối hội thoại"
                title="Tới cuối hội thoại"
              >
                <span className="homeji-assistant__scroll-arrow" aria-hidden="true">↓</span>
              </button>
            ) : null}
            <button type="button" className="homeji-assistant__icon-button" disabled={busy} onClick={() => setResetRequested(true)}
              aria-label="Cuộc trò chuyện mới" title="Cuộc trò chuyện mới"><AssistantIcon name="plus" /></button>
            <button type="button" className="homeji-assistant__icon-button" onClick={() => setExpanded(value => !value)}
              aria-pressed={expanded} aria-label={expanded ? 'Thu gọn cuộc trò chuyện' : 'Mở rộng cuộc trò chuyện'}
              title={expanded ? 'Thu gọn cuộc trò chuyện' : 'Mở rộng cuộc trò chuyện'}><AssistantIcon name={expanded ? 'shrink' : 'expand'} /></button>
            <button type="button" className="map-chatbot__close homeji-assistant__icon-button" onClick={closeChat} aria-label="Đóng Homeji" title="Đóng Homeji"><AssistantIcon name="close" /></button>
          </div>
        </header>
        <div className={`homeji-assistant__workspace${showTools ? ' has-tools' : ''}`}>
          {showTools ? <aside className="homeji-assistant__tools" aria-label="Công cụ Homeji" id={`${reactId}-tools`}>
            <div className="homeji-assistant__tools-heading"><span>LỐI TẮT CỦA BẠN</span><button type="button" className="homeji-assistant__icon-button" onClick={() => { setToolsOpen(false); toolsButtonRef.current?.focus() }} aria-label="Đóng công cụ"><AssistantIcon name="close" /></button></div>
            <p>Đi thẳng đến việc bạn cần.</p>
            <nav aria-label="Đi tới Homeji">{shortcuts.map(item => <button type="button" key={item.section}
              onClick={() => handleNavigationAction({ id: `shortcut-${item.section}`, kind: ChatbotNavigationActionKind.OpenSection, label: item.label, target: item.section, description: '' })}>
              <AssistantIcon name={item.icon} /><span>{item.label}</span><AssistantIcon name="arrow" />
            </button>)}</nav>
          </aside> : null}
          <div className="homeji-assistant__conversation">
            {resetRequested ? <div className="homeji-assistant__reset" role="alert">
              <strong>Bắt đầu một cuộc trò chuyện mới?</strong><p>Nội dung và bản nháp trong cửa sổ này sẽ được bỏ. Lịch sử đã lưu trên máy chủ vẫn được giữ.</p>
              <div><button type="button" disabled={busy} onClick={startNewConversation}>Bắt đầu cuộc trò chuyện mới</button><button type="button" onClick={() => setResetRequested(false)}>Giữ cuộc trò chuyện</button></div>
            </div> : null}
            <div className="map-chatbot__body" role="log" aria-label="Nội dung trò chuyện" aria-live="polite" aria-relevant="additions">
              {rentalSelection ? <section className="map-chatbot__context" aria-label="Các phòng đang hỗ trợ">
                <div className="homeji-assistant__room-heading"><span className="homeji-assistant__room-icon"><AssistantIcon name="home" /></span><div><span>CÁC LỰA CHỌN ĐANG HỖ TRỢ</span><strong>{rentalSelection.title}</strong></div><button type="button" className="homeji-assistant__icon-button" onClick={onDismissRentalContext} aria-label="Bỏ ngữ cảnh so sánh"><AssistantIcon name="close" /></button></div>
                <div className="map-chatbot__context-prompts"><button type="button" disabled={busy} onClick={() => void send('So sánh các lựa chọn này', false, 'compare')}>So sánh các lựa chọn</button><button type="button" disabled={busy} onClick={() => void send('Những điều cần hỏi về các lựa chọn này', false, 'questions')}>Những điều cần hỏi</button></div>
                <small>Cùng mức sử dụng cho {rentalSelection.scenario.occupants} người. Đổi phí hoặc danh sách tại màn so sánh; các khoản chưa xác nhận vẫn được giữ là chưa biết.</small>
              </section> : null}
              {rentalContext ? <section className="map-chatbot__context" aria-label="Phòng đang hỗ trợ">
                <div className="homeji-assistant__room-heading"><span className="homeji-assistant__room-icon"><AssistantIcon name="home" /></span><div><span>PHÒNG ĐANG HỖ TRỢ</span><strong>{rentalContext.title || 'Tin phòng đang xem'}</strong></div><button type="button" className="homeji-assistant__icon-button" onClick={onDismissRentalContext} aria-label="Bỏ ngữ cảnh phòng đang xem"><AssistantIcon name="close" /></button></div>
                <div className="map-chatbot__context-prompts"><button type="button" disabled={busy} onClick={() => void send('Tính tiền tháng của phòng này', false, 'cost')}>Tính tiền tháng <span aria-hidden>↗</span></button><button type="button" disabled={busy} onClick={() => void send('Những điều cần hỏi về phòng này', false, 'questions')}>Những điều cần hỏi <span aria-hidden>↗</span></button></div>
                <small>Giá và phí lấy từ tin này. Khi tìm phòng mới, hãy nhập nhu cầu mới của bạn.</small>
              </section> : null}
              {showGreeting ? <div className="map-chatbot__greeting">
                <div className="homeji-assistant__welcome-mark" aria-hidden="true"><img src="/brand/homeji-logo2.png" alt="" draggable={false} /></div>
                <span className="homeji-assistant__eyebrow">BẮT ĐẦU TỪ ĐIỀU BẠN CẦN</span>
                <h2>Bạn đang tìm<br />một nơi như thế nào?</h2>
                <p>{config?.greeting ?? HOMEJI_GREETING}</p>
                <div className="homeji-assistant__starters">
                  <button type="button" onClick={() => prepareDraft('Mình muốn tìm phòng ở ')}><AssistantIcon name="search" /><strong>Tìm nơi phù hợp</strong><span>Khu vực, ngân sách, số người</span><b aria-hidden>↗</b></button>
                  <button type="button" onClick={() => prepareDraft('Hướng dẫn mình các khoản chi phí cần hỏi trước khi thuê phòng.')}><AssistantIcon name="home" /><strong>Hiểu trước khi thuê</strong><span>Chi phí, tiền cọc, điều cần hỏi</span><b aria-hidden>↗</b></button>
                  <button type="button" onClick={() => prepareDraft('Hướng dẫn mình mua đồ ăn và đồ dùng trên Homeji.')}><AssistantIcon name="bag" /><strong>Khám phá chợ Homeji</strong><span>Hiểu cách mua và theo dõi đơn</span><b aria-hidden>↗</b></button>
                  <button type="button" onClick={() => prepareDraft('Homeji có thể giúp mình làm những gì?')}><AssistantIcon name="chat" /><strong>Hỏi điều bạn muốn</strong><span>Cùng gỡ từng câu hỏi nhỏ</span><b aria-hidden>↗</b></button>
                </div>
                {(config?.suggestedPrompts ?? []).length ? <div className="map-chatbot__suggestions"><span>Hoặc thử hỏi</span>{config!.suggestedPrompts.slice(0, 3).map(prompt => <button type="button" key={prompt} className="map-chatbot__chip" onClick={() => prepareDraft(prompt)}>{prompt}<span aria-hidden>↗</span></button>)}</div> : null}
              </div> : null}
              {messages.map((m, index) => {
                const isUser = m.sender === ChatMessageSender.User
                const needsRoomReselection = Boolean(m.rentalContext && m.rentalContext.postId !== rentalContext?.postId)
                const needsChoiceReselection = Boolean(m.rentalSelection && rentalTargetKey(null, m.rentalSelection) !== rentalTargetKey(null, rentalSelection))
                return <article key={m.id} ref={index === messages.length - 1 ? latestMessageRef : undefined} className={`map-chatbot__msg ${isUser ? 'is-user' : 'is-assistant'}${m.pending ? ' is-pending' : ''}${m.rentalDecision ? ' is-grounded' : ''}`}>
                  <div className="homeji-assistant__message-author">{isUser ? <span className="homeji-assistant__you" aria-hidden>B</span> : <HomejiAvatar inline />}<strong>{isUser ? 'Bạn' : 'Homeji'}</strong>{!isUser ? <span>AI</span> : null}</div>
                  <div className="map-chatbot__bubble">
                    {m.rentalContext ? <small className="map-chatbot__message-context">Về phòng: {m.rentalContext.title || 'Tin phòng đã chọn'}</small> : null}
                    {m.rentalSelection ? <small className="map-chatbot__message-context">Về lựa chọn: {m.rentalSelection.title}</small> : null}
                    {isUser ? <><span className="map-chatbot__bubble-text">{m.content}</span>{m.failure ? <div className="map-chatbot__recovery"><p role="status">{m.failure}</p><button type="button" disabled={busy} onClick={() => void send(m.content, false, undefined, m)}>Thử lại câu hỏi này</button></div> : null}</>
                      : <><ChatbotMessageContent content={m.content} />
                        {m.rentalDecision ? <section className="map-chatbot__decision" aria-label="Thông tin và chi phí theo tin phòng"><RentalContextCard data={m.rentalDecision} onOpenDetail={() => setOpen(false)} /></section> : null}
                        {m.searchUpdate ? <AiSearchReview result={m.searchUpdate} onApply={update => { onSearchUpdate?.(update); setOpen(false) }} onRefine={prepareDraft} onOpenListing={() => setOpen(false)} /> : null}
                        {m.foodDiscovery ? <FoodDiscoveryCard data={m.foodDiscovery} busy={busy} onSearch={origin => void send(m.foodQuery || '', false, undefined, undefined, origin, foodCriteriaSnapshot(m.foodDiscovery!))} onOpen={() => setOpen(false)} /> : null}
                        {m.actions?.length ? <div className="map-chatbot__actions" aria-label="Đi tới tính năng Homeji">{m.actions.map(action => <button key={action.id} type="button" className="map-chatbot__action" title={action.description} onClick={() => handleNavigationAction(action)}>{action.label}<AssistantIcon name="arrow" /></button>)}</div> : null}
                        <div className="homeji-assistant__reply-actions"><button type="button" onClick={() => void copyReply(m.content)} aria-label="Sao chép câu trả lời"><AssistantIcon name="copy" />Sao chép</button><button type="button" onClick={() => {
                          if (needsChoiceReselection) handleNavigationAction({ id: `reselect-${m.id}`, kind: ChatbotNavigationActionKind.Navigate, label: 'Chọn lại danh sách', description: '', target: '/?section=saved&view=considering' })
                          else if (needsRoomReselection && m.rentalContext) handleNavigationAction({ id: `reselect-${m.id}`, kind: ChatbotNavigationActionKind.Navigate, label: 'Mở lại phòng', description: '', target: `/?post=${encodeURIComponent(m.rentalContext.postId)}` })
                          else prepareDraft(m.foodDiscovery ? 'Gợi ý đồ ăn ' : m.rentalSelection ? 'Về các lựa chọn này, mình muốn hỏi thêm: ' : m.rentalContext ? 'Về phòng này, mình muốn hỏi thêm: ' : 'Mình muốn hỏi thêm: ')
                        }}><AssistantIcon name="chat" />{needsChoiceReselection ? 'Mở danh sách để chọn lại' : needsRoomReselection ? 'Mở lại phòng để hỏi tiếp' : 'Hỏi tiếp'}</button></div>
                      </>}
                  </div>
                </article>
              })}
              {showTyping ? <div className="homeji-assistant__thinking" role="status"><span aria-hidden><i /><i /><i /></span>Homeji đang tìm câu trả lời…</div> : null}
              <div ref={bottomRef} />
            </div>
            {error ? <p className="map-chatbot__error" role="alert">{error}</p> : null}
            {copyStatus ? <p className="homeji-assistant__feedback" role="status">{copyStatus}</p> : null}
            {showTyping ? <div className="map-chatbot__request-status" role="status"><span>Đang xử lý · bạn vẫn có thể soạn tin</span><button type="button" onClick={stopRequest}>Dừng chờ</button></div> : null}
            <div className="homeji-assistant__composer-area">
              <form className="map-chatbot__form" onSubmit={event => { event.preventDefault(); void send(draft) }}>
                <textarea
                  ref={inputRef}
                  value={draft}
                  maxLength={1000}
                  rows={2}
                  onChange={event => {
                    draftRevision.current += 1
                    setDraft(event.target.value)
                  }}
                  onKeyDown={event => {
                    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229) {
                      event.preventDefault()
                      if (!busy && draft.trim()) event.currentTarget.form?.requestSubmit()
                    }
                  }}
                  placeholder={rentalContext ? 'Hỏi về phòng này, hoặc điều bạn cần…' : 'Kể Homeji nghe điều bạn đang cần…'}
                  aria-label="Nhập tin nhắn cho Homeji"
                  aria-describedby={`${reactId}-composer-help`}
                />
                <button type="submit" className="map-chatbot__send" disabled={busy || !draft.trim()} aria-label="Gửi">
                  <span className="sr-only">Gửi</span>
                  <AssistantIcon name="send" />
                </button>
              </form>
              <div className="homeji-assistant__composer-meta">
                <div className="homeji-assistant__composer-hint" id={`${reactId}-composer-help`}>
                  <span>Enter để gửi · Shift + Enter xuống dòng</span>
                  {draft.length ? <span className="homeji-assistant__char-count">{draft.length}/1.000</span> : null}
                </div>
                <details className="map-chatbot__privacy" data-glass-exclude>
                  <summary>Quyền riêng tư & lịch sử</summary>
                  <p>{saveHistory ? 'Bạn đã đồng ý lưu hội thoại thuộc tài khoản của mình.' : 'Homeji không lưu hội thoại này vào lịch sử chatbot của bạn.'} Homeji dùng tiêu chí bạn nhập để tìm phòng; không tự lấy vị trí thiết bị. Nội dung bạn nhập, kể cả yêu cầu tìm phòng, có thể được gửi tới Gemini để xử lý. Tránh nhập thông tin nhạy cảm.</p>
                  {config?.historyStorageEnabled ? (
                    <label>
                      <input
                        type="checkbox"
                        checked={saveHistory}
                        disabled={busy}
                        onChange={event => {
                          setSaveHistory(event.target.checked)
                          startNewConversation()
                        }}
                      />
                      Đồng ý lưu hội thoại và tiêu chí theo chính sách lưu lịch sử
                    </label>
                  ) : (
                    <p>Lưu lịch sử hiện đang tắt.</p>
                  )}
                  {!saveHistory ? (
                    <button type="button" disabled={busy} onClick={() => setResetRequested(true)}>
                      Xóa nội dung phiên và tiêu chí
                    </button>
                  ) : null}
                  {conversationId ? (
                    <button type="button" disabled={busy} onClick={() => void deleteConversation()}>
                      Xóa hội thoại và tiêu chí hiện tại
                    </button>
                  ) : null}
                </details>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
