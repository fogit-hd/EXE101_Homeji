import { siteLocationSnapshot, subscribeSiteLocation, setSiteLocation as setSharedLocation } from '../../lib/siteLocation'
import { confirmDialog } from '../ui/confirmDialog'
import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChatMessageSender,
  ChatbotNavigationActionKind,
  deleteChatbotConversation,
  getChatbotPopupConfig,
  sendChatbotMessage,
  type AiHighlightResponse,
  type AiParsedSearchCriteria,
  type ChatbotNavigationAction,
  type ChatbotPopupConfig,
  type ChatbotRentalContext,
  type ChatbotFoodContext,
  type ChatbotFoodCriteria,
} from '../../api'
import { useAuth } from '../../contexts/AuthContext'
import { ThinkingCapsule } from './chatbot/ThinkingCapsule'
import { useAuthModal } from "../../contexts/AuthModalContext.logic"
import { useChangedInputs } from '../../hooks/useChangedInputs'

import { getErrorMessage } from '../../lib/errors'
import { requestMarketplaceCart, requestMarketplaceTab } from '../../lib/marketplaceNavigation'
import { nearbyChatIntent } from '../../lib/nearbyChatIntent'
import { isFoodChat, isFoodDiscoveryChat, isFoodRefinement, foodCriteriaSnapshot } from '../../lib/foodChatIntent'
import type { NearbyPlaceCategory } from '../../lib/placeAutocomplete'
import type { MapAppSection } from "./MapAppPanel.logic"

import {
  HOMEJI_AI_TRIGGER_ATTR,
  HOMEJI_AI_PANEL_ID,
  onHomejiAiToggle,
  publishHomejiAiOpen,
} from '../../lib/homejiAiLauncher'
import type { RentalAssistantSelection, RentalAssistantComparison } from '../../contexts/rental-assistant-context'
import { decisionMatchesChoices, rentalScenarioSnapshot } from '../../lib/rentalJourney'
import { isVisibleFocusTarget } from '../../lib/isVisibleFocusTarget'
import type { ChatbotDraftAttachment } from '../../lib/chatbotMedia'
import { GameLauncher } from '../games/GameLauncher'
import { AgentDraftWorkspace } from './AgentDraftWorkspace'
import { recoverPostingImages } from '../../lib/chatbotPostingContext'
import { useChatbotAgentWorkflow } from './useChatbotAgentWorkflow'
import { ChatbotLocationControl } from '../ai/ChatbotLocationControl'
import { rentalPriceBasis } from '../ai/rentalPriceBasis'
import { freshChatbotLocation, type ChatbotLocation } from '../../lib/chatbotLocation'
import { AgentModeSwitch } from '../ai/AgentModeSwitch'
import { ChatbotTranscript } from './chatbot/ChatbotTranscript'
import { ChatbotComposer } from './ChatbotComposer'
import { AssistantIcon, HomejiAvatar, type AssistantIconName } from './ChatbotVisuals'
import { rentalTargetKey } from './chatbot/chatbotModels'
import type { ChatRequest, DisplayMessage } from './chatbot/ChatbotMessageTypes'
import './MapChatbot.css'

const HOMEJI_TITLE = 'Homeji'
const HOMEJI_GREETING =
  'Mình là trợ lý Homeji. Mình có thể tìm phòng, mở đúng mục bạn cần và gợi ý đồ ăn.'
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

type PanelLayout = {
  left: number
  top: number
  width: number
  maxHeight: number
}

/** Compact docks at the right; expanded centers within the available keyboard-safe viewport. */
function assistantViewport() {
  const viewport = window.visualViewport
  return { width: viewport?.width ?? window.innerWidth, height: viewport?.height ?? window.innerHeight, offsetTop: viewport?.offsetTop ?? 0 }
}

function navPanelLayout(expanded: boolean, sheet: boolean, viewport: ReturnType<typeof assistantViewport>): PanelLayout {
  const { width: vw, height: vh, offsetTop } = viewport
  const margin = sheet ? expanded ? 0 : 8 : expanded ? 12 : VIEW_MARGIN
  const width = sheet ? vw - margin * 2 : Math.min(expanded ? 1480 : 480, vw - margin * 2)
  const height = Math.max(0, Math.min(sheet ? expanded ? vh : vh * 0.92 : expanded ? vh : 780, vh - margin * 2))
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
  const { isAuthenticated, needsProfileSetup } = useAuth()
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
  const sharedLocation = useSyncExternalStore(subscribeSiteLocation, siteLocationSnapshot, () => null)
  const awaitingLocation = useRef<string | null>(null)
  const [draft, setDraft] = useState('')
  const [attachments, setAttachments] = useState<ChatbotDraftAttachment[]>([])
  const [mediaBusy, setMediaBusy] = useState(false)
  const [recordingActive, setRecordingActive] = useState(false)
  const [mediaSession, setMediaSession] = useState(0)
  const draftRevision = useRef(0)
  const activeRequest = useRef<{ controller: AbortController; pendingId: string; request: ChatRequest; draftRevision: number; restoreDraft: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sheetMode, setSheetMode] = useState(isSheetViewport)
  const agentFlow = useChatbotAgentWorkflow({ messages, expanded, setExpanded, sheetMode })
  const { agentMode, setAgentMode, agentDraftId, workspaceDraft, draftWorkspaceId, draftOverlay, workspaceCloseRef, closeDraftWorkspace } = agentFlow
  const bottomRef = useRef<HTMLDivElement>(null)
  const latestMessageRef = useRef<HTMLElement | null>(null)
  const lastScrolledMessage = useRef<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const pendingIdRef = useRef(0)
  const activeTargetKey = rentalTargetKey(rentalContext, rentalSelection)

  if (useChangedInputs([openRequestToken]) && openRequestToken) {
    setOpen(true)
  }

  useLayoutEffect(() => {
    const input = inputRef.current
    if (input) { input.style.height = 'auto'; input.style.height = `${Math.min(100, Math.max(28, input.scrollHeight))}px` }
  }, [draft, expanded])

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
      ? { ...message, pending: false, failure: 'Đã dừng vì bạn vừa chọn phòng khác.', retry: pending.request }
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
        if (!(sibling instanceof HTMLElement) || sibling === child || sibling.matches('.auth-modal-overlay,.homeji-memory')) continue
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
    const focusFrame = window.requestAnimationFrame(() => {
      if (panelRef.current?.querySelector('.homeji-assistant__conversation[inert]')) workspaceCloseRef.current?.focus()
      else inputRef.current?.focus()
    })
    const closeOnEscape = (event: KeyboardEvent) => {
      const panel = panelRef.current
      if (event.target instanceof Element && event.target.closest('[role="dialog"]') && !panel?.contains(event.target)) return
      if (event.key === 'Escape') {
        if (panel?.querySelector('.homeji-assistant__conversation[inert]')) { event.preventDefault(); closeDraftWorkspace(); requestAnimationFrame(() => inputRef.current?.focus()) }
        else closeChat()
      }
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
  }, [panelVisible, closeDraftWorkspace, workspaceCloseRef])

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

  const send = async (text: string, fromSuggestion = false, task?: ChatbotRentalContext['task'] | 'compare', retryMessage?: DisplayMessage, foodContext?: ChatbotFoodContext, foodCriteria?: ChatbotFoodCriteria, locationOverride?: ChatbotLocation) => {
    const selectedMedia = retryMessage?.retry?.attachments ?? (retryMessage ? [] : attachments.length ? attachments : recoverPostingImages(text, messages, Boolean(agentDraftId)))
    const hasMedia = selectedMedia.length > 0
    const message = text.trim() || (hasMedia ? 'Hãy xem hoặc nghe nội dung đính kèm và hỗ trợ mình.' : '')
    if (!message || busy || mediaBusy || recordingActive || activeRequest.current) return
    if (isAuthenticated && needsProfileSetup) return
    if (!locationOverride) awaitingLocation.current = null
    const selectedLocation = freshChatbotLocation(locationOverride ?? sharedLocation)
    const previousFood = retryMessage?.retry?.previousFoodCriteria ?? foodCriteria ?? (isFoodRefinement(message) ? sessionFood.current : undefined)
    const foodQuery = !agentMode && !hasMedia && (isFoodChat(message) || Boolean(previousFood && isFoodRefinement(message)))
    const nearby = agentMode || foodQuery || hasMedia ? null : nearbyChatIntent(message)
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
    const selection = !agentMode && !hasMedia && !foodQuery && rentalSelection && !startsSearch && (task || refersToChoices)
      ? { ...rentalSelection, postIds: [...rentalSelection.postIds], scenario: rentalScenarioSnapshot(rentalSelection.scenario), task } : undefined
    const context = !agentMode && !hasMedia && !foodQuery && !selection && rentalContext && task !== 'compare' && !startsSearch && (task || refersToRoom) ? { ...rentalContext, task } : undefined
    const request: ChatRequest = retryMessage?.retry ?? {
      message, context, selection,
      attachments: selectedMedia,
      agentDraftId: agentMode ? agentDraftId : undefined,
      postingAgent: agentMode,
      location: selectedLocation,
      sessionMessages: messages.filter(row => !row.pending && !row.failure).slice(-6).map(({ id, conversationId, sender, content, createdAt }) => ({ id, conversationId, sender, content: content.slice(0, 1000), createdAt })),
      conversationId: saveHistory ? conversationId : undefined,
      previousCriteria: saveHistory || context || selection || foodQuery ? undefined : sessionCriteria.current,
      foodContext: foodContext ? { ...foodContext } : foodQuery && selectedLocation ? { latitude: selectedLocation.latitude, longitude: selectedLocation.longitude, radiusKm: 3 } : undefined,
      previousFoodCriteria: previousFood ? foodCriteriaSnapshot(previousFood) : undefined,
      saveHistory,
    }
    const pendingId = retryMessage?.id ?? `${reactId}-pending-${++pendingIdRef.current}`
    const pending = { controller: new AbortController(), pendingId, request, draftRevision: draftRevision.current,
      restoreDraft: !retryMessage && (draft.trim() === text.trim()) }
    activeRequest.current = pending
    setBusy(true); setError(null)
    if (pending.restoreDraft) { setDraft(''); setAttachments([]) }
    if (fromSuggestion) setToolsOpen(false)
    setCopyStatus('')
    const optimisticUser: DisplayMessage = {
      id: pendingId,
      conversationId: request.conversationId ?? '',
      sender: ChatMessageSender.User,
      content: request.message,
      createdAt: new Date().toISOString(),
      pending: true,
      attachments: request.attachments,
      rentalContext: request.context,
      rentalSelection: request.selection,
    }

    setMessages(prev => retryMessage ? prev.map(item => item.id === pendingId ? optimisticUser : item) : [...prev, optimisticUser])

    try {
      const reply = await sendChatbotMessage({ conversationId: request.conversationId, message: request.message, saveHistory: request.saveHistory,
        attachments: request.attachments, agentDraftId: request.agentDraftId, postingAgent: request.postingAgent, location: request.location, sessionMessages: request.sessionMessages,
        previousCriteria: request.previousCriteria, foodContext: request.foodContext, previousFoodCriteria: request.previousFoodCriteria, rentalContext: request.context ? { postId: request.context.postId, task: request.context.task } : undefined,
        rentalSelection: request.selection ? { postIds: request.selection.postIds, task: request.selection.task, scenario: request.selection.scenario } : undefined }, pending.controller.signal)
      if (activeRequest.current !== pending || pending.controller.signal.aborted) return
      setConversationId(request.saveHistory ? reply.conversationId : undefined)
      agentFlow.acceptReply(reply, request.postingAgent === true)
      if (reply.nearbyRooms?.status === "locationRequired" || reply.foodDiscovery?.status === "locationRequired") awaitingLocation.current = request.message
      const contextualUnavailable = reply.agentDraft || reply.agentRequested || reply.nearbyRooms ? false : request.selection ? !decisionMatchesChoices(reply.rentalDecision, request.selection.postIds)
        : Boolean(request.context) && !decisionMatchesChoices(reply.rentalDecision, [request.context!.postId])
      const foodExpected = !reply.agentRequested && !reply.agentDraft && !reply.upgradeRequired && !reply.nearbyRooms && !hasMedia && (isFoodDiscoveryChat(request.message) || Boolean(request.previousFoodCriteria && isFoodRefinement(request.message)))
      const foodUnavailable = foodExpected && !reply.foodDiscovery
      sessionFood.current = reply.foodDiscovery && !request.context && !request.selection ? foodCriteriaSnapshot(reply.foodDiscovery) : undefined
      if (reply.searchUpdate && !request.context && !request.selection && !foodExpected) {
        sessionCriteria.current = reply.searchUpdate.criteria
        if (!reply.searchUpdate.criteria.unknown?.length && !reply.searchUpdate.posts.some(item => rentalPriceBasis(item.post) === 'unknown')) onSearchUpdate?.(reply.searchUpdate)
      }
      setMessages((prev) => {
        const userMessage = { ...reply.userMessage, attachments: request.attachments, rentalContext: request.context, rentalSelection: request.selection }
        const assistantMessage = { ...reply.assistantMessage,
          content: foodUnavailable ? 'Chưa nhận được dữ liệu món ăn từ Chợ Homeji. Bạn có thể thử lại hoặc mở mục Đồ ăn để xem thực đơn.' : contextualUnavailable ? 'Trợ lý chưa nhận được dữ liệu đúng các lựa chọn đang chọn. Mở chi tiết hoặc màn so sánh để dùng công cụ chi phí, hoặc thử lại sau. Câu trả lời chung không được dùng làm giá hay phí của các phòng này.' : reply.assistantMessage.content,
          roommateCandidates: reply.roommateCandidates, nearbyRooms: reply.nearbyRooms, agentDraft: reply.agentDraft, upgradeRequired: reply.upgradeRequired,
          actions: foodUnavailable ? [{ id: 'food-menu', kind: ChatbotNavigationActionKind.OpenSection, label: 'Mở mục Đồ ăn', description: 'Xem món đang bán', target: 'marketplace:food' }] : contextualUnavailable ? [{ id: 'open-context-room', kind: ChatbotNavigationActionKind.Navigate,
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
    if (!conversationId || busy) return
    if (!await confirmDialog({ title: 'Xóa hội thoại này?', message: 'Tiêu chí đã lưu cũng bị xóa và không khôi phục được.', confirmLabel: 'Xóa hội thoại', danger: true })) return
    setBusy(true); setError(null)
    try {
      await deleteChatbotConversation(conversationId)
      setConversationId(undefined); agentFlow.reset(); setMessages([]); setDraft(''); setAttachments([]); setMediaSession(value => value + 1); sessionCriteria.current = undefined; sessionFood.current = undefined
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
    agentFlow.reset()
    awaitingLocation.current = null
    setSharedLocation(null)
    setMessages([])
    setDraft('')
    setAttachments([])
    setMediaSession(value => value + 1)
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
              onClick={() => { agentFlow.closeDraftWorkspace(); setToolsOpen(value => !value) }}
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
            <button type="button" className="homeji-assistant__icon-button" disabled={busy} onClick={() => { agentFlow.closeDraftWorkspace(); setResetRequested(true) }}
              aria-label="Cuộc trò chuyện mới" title="Cuộc trò chuyện mới"><AssistantIcon name="plus" /></button>
            <button type="button" className="homeji-assistant__icon-button" onClick={() => setExpanded(value => !value)}
              aria-pressed={expanded} aria-label={expanded ? 'Thu gọn cuộc trò chuyện' : 'Mở rộng cuộc trò chuyện'}
              title={expanded ? 'Thu gọn cuộc trò chuyện' : 'Mở rộng cuộc trò chuyện'}><AssistantIcon name={expanded ? 'shrink' : 'expand'} /></button>
            <button type="button" className="map-chatbot__close homeji-assistant__icon-button" onClick={closeChat} aria-label="Đóng Homeji" title="Đóng Homeji"><AssistantIcon name="close" /></button>
          </div>
        </header>
        <div className={`homeji-assistant__workspace${showTools ? ' has-tools' : ''}${workspaceDraft && agentFlow.workspaceOpen ? ' has-draft-workspace' : ''}`}>
          {showTools ? <aside className="homeji-assistant__tools" aria-label="Công cụ Homeji" id={`${reactId}-tools`}>
            <div className="homeji-assistant__tools-heading"><span>LỐI TẮT CỦA BẠN</span><button type="button" className="homeji-assistant__icon-button" onClick={() => { setToolsOpen(false); toolsButtonRef.current?.focus() }} aria-label="Đóng công cụ"><AssistantIcon name="close" /></button></div>
            <p>Đi thẳng đến việc bạn cần.</p>
            <nav aria-label="Đi tới Homeji">{shortcuts.map(item => <button type="button" key={item.section}
              onClick={() => handleNavigationAction({ id: `shortcut-${item.section}`, kind: ChatbotNavigationActionKind.OpenSection, label: item.label, target: item.section, description: '' })}>
              <AssistantIcon name={item.icon} /><span>{item.label}</span><AssistantIcon name="arrow" />
            </button>)}</nav>
          </aside> : null}
          <div className="homeji-assistant__conversation" inert={draftOverlay} aria-hidden={draftOverlay || undefined}>
            <AgentModeSwitch active={agentMode} busy={busy || mediaBusy || recordingActive} enabled={panelVisible} authenticated={isAuthenticated} onChange={setAgentMode} onUpgrade={() => { setOpen(false); if (!isAuthenticated) openAuthModal({ intent: 'premium', onSuccess: () => navigate('/?section=payments') }); else navigate('/?section=payments') }} />
            {resetRequested ? <div className="homeji-assistant__reset" role="alert">
              <strong>Bắt đầu một cuộc trò chuyện mới?</strong><p>Nội dung và bản nháp trong cửa sổ này sẽ được bỏ. Lịch sử đã lưu trên máy chủ vẫn được giữ.</p>
              <div><button type="button" disabled={busy} onClick={startNewConversation}>Bắt đầu cuộc trò chuyện mới</button><button type="button" onClick={() => setResetRequested(false)}>Giữ cuộc trò chuyện</button></div>
            </div> : null}
            <div className={`homeji-assistant__transcript-viewport${showTyping ? ' is-pending' : ''}`}>
            <div className="map-chatbot__body" role="log" aria-label="Nội dung trò chuyện" aria-live="polite" aria-relevant="additions">
            <ChatbotTranscript
              state={{ messages, showGreeting, busy, mediaBusy, recordingActive, draftWorkspaceId }}
              context={{ rentalContext, rentalSelection, sharedLocation }}
              refs={{ latestMessageRef, bottomRef }}
              actions={{
                onDismissRentalContext,
                send,
                prepareDraft,
                openDraftWorkspace: agentFlow.openDraftWorkspace,
                closeChat,
                handleNavigationAction,
                onSearchUpdate,
                openPayments: () => { navigate('/?section=payments'); setOpen(false) },
                openMarketplace: () => { navigate('/?section=marketplace'); setOpen(false) },
                copyReply,
              }}
            />
            </div>
            <ThinkingCapsule visible={showTyping} />
            </div>
            {isAuthenticated ? <ChatbotLocationControl value={sharedLocation} disabled={busy || mediaBusy || recordingActive} onChange={location => { setSharedLocation(location); if (location && awaitingLocation.current && !busy) { const text = awaitingLocation.current; awaitingLocation.current = null; void send(text, false, undefined, undefined, undefined, undefined, location) } }} /> : null}
            {error ? <p className="map-chatbot__error" role="alert">{error}</p> : null}
            {copyStatus ? <p className="homeji-assistant__feedback" role="status">{copyStatus}</p> : null}
            <div className="homeji-assistant__wait-tools" hidden={!showTyping}>
              <GameLauncher waiting={showTyping} />
            </div>
            {showTyping ? <div className="map-chatbot__request-status"><span>Bạn vẫn có thể soạn tin</span><button type="button" onClick={stopRequest}>Dừng chờ</button></div> : null}
            <ChatbotComposer
              open={open}
              mediaSession={mediaSession}
              attachments={attachments}
              setAttachments={setAttachments}
              busy={busy}
              mediaBusy={mediaBusy}
              setMediaBusy={setMediaBusy}
              recordingActive={recordingActive}
              setRecordingActive={setRecordingActive}
              draft={draft}
              setDraft={setDraft}
              draftRevisionRef={draftRevision}
              inputRef={inputRef}
              setError={setError}
              send={send}
              saveHistory={saveHistory}
              setSaveHistory={setSaveHistory}
              config={config}
              startNewConversation={startNewConversation}
              setResetRequested={setResetRequested}
              deleteConversation={deleteConversation}
              conversationId={conversationId}
              rentalContext={Boolean(rentalContext)}
              closeChat={closeChat}
            />
          </div>
          {workspaceDraft ? <AgentDraftWorkspace
            draft={workspaceDraft}
            sharedLocation={sharedLocation}
            active={agentDraftId === workspaceDraft.id}
            open={agentFlow.workspaceOpen}
            closeRef={agentFlow.workspaceCloseRef}
            onReturnToChat={() => { agentFlow.closeDraftWorkspace(); requestAnimationFrame(() => inputRef.current?.focus()) }}
            onFinished={() => agentFlow.finishDraft(workspaceDraft.id)}
          /> : null}
        </div>
      </div>
    </div>
  )
}
