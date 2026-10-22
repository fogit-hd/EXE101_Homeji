import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapChatbot } from '../components/map/MapChatbot'
import { useAuth } from './AuthContext'
import { useAuthModal } from "./AuthModalContext.logic"


import { ChatbotSurfaceContext, type ChatbotSurface } from './chatbot-surface'
import { RentalAssistantOpenerContext, RentalAssistantSelectionContext, type RentalAssistantSelection } from './rental-assistant-context'
import { rentalMessageDraftStore } from '../lib/rentalMessageDraft'

/** One conversation follows the user across routes; map controls register their callbacks. */
export function ChatbotProvider({ children }: { children: ReactNode }) {
  const [surface, setSurface] = useState<ChatbotSurface | null>(null)
  const { profile, isAuthenticated } = useAuth()
  const identity = isAuthenticated ? profile?.id ?? 'guest' : 'guest'
  const [selections, setSelections] = useState<{ owner: string; rooms: Array<{ token: symbol; room: RentalAssistantSelection }> } | null>(null)
  const [openRequest, setOpenRequest] = useState<{ owner: string; token: number } | null>(null)
  const awaitingOpen = useRef(false)
  const registerSelection = useCallback((room: RentalAssistantSelection) => {
    const token = Symbol('rental-assistant-selection')
    setSelections(current => ({ owner: identity, rooms: [...(current?.owner === identity ? current.rooms : []), { token, room }] }))
    return () => setSelections(current => current?.owner === identity
      ? { ...current, rooms: current.rooms.filter(entry => entry.token !== token) }
      : current)
  }, [identity])
  useEffect(() => () => rentalMessageDraftStore.clearUser(identity), [identity])
  const { isOpen } = useAuthModal()
  const navigate = useNavigate()
  const openAssistant = useCallback(() => {
    awaitingOpen.current = true
    setOpenRequest(current => ({ owner: identity, token: (current?.token ?? 0) + 1 }))
  }, [identity])
  const onSurfaceOpenChange = surface?.onOpenChange
  const handleOpenChange = useCallback((open: boolean) => {
    if (open) awaitingOpen.current = false
    else if (!awaitingOpen.current) setOpenRequest(null)
    onSurfaceOpenChange?.(open)
  }, [onSurfaceOpenChange])
  const selection = selections?.owner === identity ? selections.rooms.at(-1)?.room : null
  const requested = openRequest?.owner === identity && Boolean(selection)
  return <ChatbotSurfaceContext.Provider value={setSurface}><RentalAssistantSelectionContext.Provider value={registerSelection}><RentalAssistantOpenerContext.Provider value={openAssistant}>
    {children}
    <MapChatbot key={identity} {...surface}
      rentalContext={selection ?? null}
      onDismissRentalContext={() => setSelections(null)}
      openRequestToken={requested && !isOpen ? openRequest.token : 0}
      onOpenChange={handleOpenChange}
      onSearchUpdate={surface?.onSearchUpdate ?? (update => navigate('/?section=listings', { state: { aiSearchUpdate: update } }))}
      hideFab={isOpen || !requested && surface?.hideFab}
      onOpenSection={surface?.onOpenSection ?? (section => navigate(`/?section=${encodeURIComponent(section)}`))} />
  </RentalAssistantOpenerContext.Provider></RentalAssistantSelectionContext.Provider></ChatbotSurfaceContext.Provider>
}
