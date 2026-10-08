import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapChatbot } from '../components/map/MapChatbot'
import { useAuth } from './AuthContext'
import { useAuthModal } from './AuthModalContext'

import { ChatbotSurfaceContext, type ChatbotSurface } from './chatbot-surface'

/** One conversation follows the user across routes; map controls register their callbacks. */
export function ChatbotProvider({ children }: { children: ReactNode }) {
  const [surface, setSurface] = useState<ChatbotSurface | null>(null)
  const { profile } = useAuth()
  const { isOpen } = useAuthModal()
  const navigate = useNavigate()
  return <ChatbotSurfaceContext.Provider value={setSurface}>
    {children}
    <MapChatbot key={profile?.id ?? 'guest'} {...surface}
      onSearchUpdate={surface?.onSearchUpdate ?? (update => navigate('/?section=listings', { state: { aiSearchUpdate: update } }))}
      hideFab={isOpen || surface?.hideFab}
      onOpenSection={surface?.onOpenSection ?? (section => navigate(`/?section=${encodeURIComponent(section)}`))} />
  </ChatbotSurfaceContext.Provider>
}
