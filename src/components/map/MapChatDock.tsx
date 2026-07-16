import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ChatShareTarget } from './MapMessagesPanel'
import { MapMessagesPanel } from './MapMessagesPanel'
import './MapChatDock.css'

const SHEET_MEDIA = '(max-width: 900px)'

function useMobileSheetMode(): boolean {
  const [sheet, setSheet] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(SHEET_MEDIA).matches,
  )
  useEffect(() => {
    const mq = window.matchMedia(SHEET_MEDIA)
    const sync = () => setSheet(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return sheet
}

const MAX_OPEN_CHATS = 3

type Props = {
  inboxOpen: boolean
  openChatIds: string[]
  onCloseInbox: () => void
  onCloseChat: (conversationId: string) => void
  onOpenChat: (conversationId: string) => void
  userLocation?: { lat: number; lng: number } | null
  selectedPlace?: ChatShareTarget | null
  selectedListing?: ChatShareTarget | null
  mapArea?: ChatShareTarget | null
  onFocusMap?: (loc: {
    lat: number
    lng: number
    title?: string
    address?: string
    kind?: import('../../lib/chatLocation').ChatLocationKind
    conversationId?: string
  }) => void
  refreshKey?: number
}

/**
 * Messenger-style floating chat dock (bottom-right).
 * Manual close only — no click-outside dismiss.
 */
export function MapChatDock({
  inboxOpen,
  openChatIds,
  onCloseInbox,
  onCloseChat,
  onOpenChat,
  userLocation = null,
  selectedPlace = null,
  selectedListing = null,
  mapArea = null,
  onFocusMap,
  refreshKey = 0,
}: Props) {
  const mobileSheet = useMobileSheetMode()
  const chats = openChatIds.slice(-MAX_OPEN_CHATS)

  if (!inboxOpen && chats.length === 0) return null

  const dock = (
    <div className="map-chat-dock" aria-label="Cửa sổ chat Homeji">
      {inboxOpen ? (
        <div className="map-chat-dock__window is-inbox">
          <MapMessagesPanel
            layout="floating-inbox"
            onCloseWindow={onCloseInbox}
            refreshKey={refreshKey}
            onPickConversation={(id) => {
              onOpenChat(id)
            }}
          />
        </div>
      ) : null}

      {chats.map((id) => (
        <div key={id} className="map-chat-dock__window">
          <MapMessagesPanel
            layout="floating-thread"
            initialConversationId={id}
            onCloseWindow={() => onCloseChat(id)}
            userLocation={userLocation}
            selectedPlace={selectedPlace}
            selectedListing={selectedListing}
            mapArea={mapArea}
            onFocusMap={onFocusMap}
          />
        </div>
      ))}
    </div>
  )

  if (mobileSheet && typeof document !== 'undefined') {
    return createPortal(dock, document.body)
  }

  return dock
}
