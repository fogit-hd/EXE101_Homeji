import { createContext, useContext, useEffect, useMemo, type ComponentProps, type Dispatch, type SetStateAction } from 'react'
import type { MapChatbot } from '../components/map/MapChatbot'

export type ChatbotSurface = ComponentProps<typeof MapChatbot>
export const ChatbotSurfaceContext = createContext<Dispatch<SetStateAction<ChatbotSurface | null>> | null>(null)

export function useChatbotSurface(surface: ChatbotSurface) {
  const register = useContext(ChatbotSurfaceContext)
  if (!register) throw new Error('ChatbotProvider is required')
  const { onSearchUpdate, onOpenSection, onNearbyRequest, dismissSignal, onOpenChange, hideFab, avoidRightContent } = surface
  const value = useMemo(() => ({ onSearchUpdate, onOpenSection, onNearbyRequest, dismissSignal, onOpenChange, hideFab, avoidRightContent }),
    [onSearchUpdate, onOpenSection, onNearbyRequest, dismissSignal, onOpenChange, hideFab, avoidRightContent])
  useEffect(() => { register(value); return () => register(null) }, [register, value])
}
