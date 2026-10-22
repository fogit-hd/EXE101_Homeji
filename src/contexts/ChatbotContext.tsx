import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapChatbot } from '../components/map/MapChatbot'
import { useAuth } from './AuthContext'
import { useAuthModal } from "./AuthModalContext.logic"


import { ChatbotSurfaceContext, type ChatbotSurface } from './chatbot-surface'
import { RentalAssistantOpenerContext, RentalAssistantSelectionContext, RentalAssistantComparisonContext, type RentalAssistantSelection, type RentalAssistantComparison } from './rental-assistant-context'
import { rentalMessageDraftStore } from '../lib/rentalMessageDraft'
import { RentalJourneyProvider } from './RentalJourneyProvider'
import { RentalJourneyTray } from '../components/ai/RentalJourney'

/** One conversation follows the user across routes; map controls register their callbacks. */
export function ChatbotProvider({ children }: { children: ReactNode }) {
  return <RentalJourneyProvider><ContextualChatbotProvider>{children}</ContextualChatbotProvider></RentalJourneyProvider>
}

function ContextualChatbotProvider({ children }: { children: ReactNode }) {
  const [surface, setSurface] = useState<ChatbotSurface | null>(null)
  const { profile, isAuthenticated } = useAuth()
  const identity = isAuthenticated ? profile?.id ?? 'guest' : 'guest'
  const [selections, setSelections] = useState<{ owner: string; rooms: Array<{ token: symbol; room?: RentalAssistantSelection; comparison?: RentalAssistantComparison }> } | null>(null)
  const [dismissedSelection, setDismissedSelection] = useState<symbol | null>(null)
  const [openRequest, setOpenRequest] = useState<{ owner: string; token: number } | null>(null)
  const awaitingOpen = useRef(false)
  const registerSelection = useCallback((room: RentalAssistantSelection) => {
    const token = Symbol('rental-assistant-selection')
    setSelections(current => ({ owner: identity, rooms: [...(current?.owner === identity ? current.rooms : []), { token, room }] }))
    return () => setSelections(current => current?.owner === identity
      ? { ...current, rooms: current.rooms.filter(entry => entry.token !== token) }
      : current)
  }, [identity])
  const registerComparison = useCallback((comparison: RentalAssistantComparison) => {
    const token = Symbol('rental-assistant-comparison')
    setSelections(current => ({ owner: identity, rooms: [...(current?.owner === identity ? current.rooms : []), { token, comparison }] }))
    return () => setSelections(current => current?.owner === identity
      ? { ...current, rooms: current.rooms.filter(entry => entry.token !== token) } : current)
  }, [identity])
  useEffect(() => () => rentalMessageDraftStore.clearUser(identity), [identity])
  const { isOpen } = useAuthModal()
  const navigate = useNavigate()
  const openAssistant = useCallback(() => {
    setDismissedSelection(null)
    awaitingOpen.current = true
    setOpenRequest(current => ({ owner: identity, token: (current?.token ?? 0) + 1 }))
  }, [identity])
  const onSurfaceOpenChange = surface?.onOpenChange
  const handleOpenChange = useCallback((open: boolean) => {
    if (open) awaitingOpen.current = false
    else if (!awaitingOpen.current) setOpenRequest(null)
    onSurfaceOpenChange?.(open)
  }, [onSurfaceOpenChange])
  const registeredSelection = selections?.owner === identity ? selections.rooms.at(-1) : null
  const selection = registeredSelection?.token === dismissedSelection ? null : registeredSelection
  const requested = openRequest?.owner === identity && Boolean(selection)
  return <ChatbotSurfaceContext.Provider value={setSurface}><RentalAssistantSelectionContext.Provider value={registerSelection}><RentalAssistantComparisonContext.Provider value={registerComparison}><RentalAssistantOpenerContext.Provider value={openAssistant}>
    {children}
    <RentalJourneyTray />
    <MapChatbot key={identity} {...surface}
      rentalContext={selection?.room ?? null}
      rentalSelection={selection?.comparison ?? null}
      onDismissRentalContext={() => setDismissedSelection(selection?.token ?? null)}
      openRequestToken={requested && !isOpen ? openRequest.token : 0}
      onOpenChange={handleOpenChange}
      onSearchUpdate={surface?.onSearchUpdate ?? (update => navigate('/?section=listings', { state: { aiSearchUpdate: update } }))}
      hideFab={isOpen || !requested && surface?.hideFab}
      onOpenSection={surface?.onOpenSection ?? (section => navigate(`/?section=${encodeURIComponent(section)}`))} />
  </RentalAssistantOpenerContext.Provider></RentalAssistantComparisonContext.Provider></RentalAssistantSelectionContext.Provider></ChatbotSurfaceContext.Provider>
}
