import { useState, type Dispatch, type SetStateAction } from 'react'
import type { PostConversation } from '../../api'
import { PremiumBadge } from '../../components/map/ChatExtras'
import { Avatar, ContextCard } from '../../components/map/messages/MessagePrimitives'
import { subjectTag, type ContextItem } from '../../components/map/messages/MessageFormatting'
import { MobileSheet } from '../MobileSheet'

type Props = {
  active: PostConversation | null
  activeId: string | null
  peerName: string
  primaryContext: ContextItem | null
  contextItems: ContextItem[]
  blocking: boolean
  sending: boolean
  cannotSend: boolean
  voiceBusy: boolean
  voiceReady: boolean
  setSearchOpen: Dispatch<SetStateAction<boolean>>
  onBack: () => void
  onOpenProfile: () => void
  onToggleBlock: () => void
  onStartCall: () => void
}

/**
 * Phone thread header, one row: back · avatar and name (opens the profile) · call · more. The
 * rarer actions (profile, search, block) live in the more sheet; the room or item the chat is
 * about shows as a slim strip underneath.
 */
export function MobileChatHeader({
  active, activeId, peerName, primaryContext, contextItems, blocking, sending, cannotSend, voiceBusy,
  voiceReady, setSearchOpen, onBack, onOpenProfile, onToggleBlock, onStartCall,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [contextOpen, setContextOpen] = useState(false)
  const subject = active ? subjectTag[active.subjectType] : undefined
  const blocked = Boolean(active?.isBlockedByMe)

  return (
    <>
      <header className={`m-chat-head${active?.otherParticipantIsPremium ? ' is-premium' : ''}`}>
        <button type="button" className="m-chat-head__icon" onClick={onBack} aria-label="Quay lại hộp thư">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg>
        </button>
        <button type="button" className="m-chat-head__peer" disabled={!active} onClick={onOpenProfile}
          aria-label={`Xem hồ sơ ${peerName}`}>
          <Avatar name={peerName} seed={active?.otherParticipantId || activeId || peerName} src={active?.otherParticipantAvatarPath} small />
          <span className="m-chat-head__titles">
            <strong>{peerName}</strong>
            {subject || active?.otherParticipantIsPremium ? (
              <small>{active?.otherParticipantIsPremium ? <PremiumBadge /> : null}{subject?.label}</small>
            ) : null}
          </span>
        </button>
        <button type="button" className="m-chat-head__icon" aria-label={`Gọi thoại cho ${peerName}`}
          disabled={cannotSend || voiceBusy || !voiceReady} onClick={() => active && onStartCall()}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3.5h3.5l2 5-2.6 1.7a13 13 0 0 0 5.9 5.9l1.7-2.6 5 2v3.5c0 1-.9 1.8-1.9 1.7C10.4 19.9 4.1 13.6 3.3 5.4 3.2 4.4 4 3.5 5 3.5Z" /></svg>
        </button>
        <button type="button" className="m-chat-head__icon" aria-label="Thêm tùy chọn" aria-haspopup="dialog"
          aria-expanded={menuOpen} disabled={!active} onClick={() => setMenuOpen(true)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5.5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="18.5" cy="12" r="1.6" /></svg>
        </button>
      </header>

      {primaryContext ? (
        <div className="m-chat-ctx">
          <ContextCard item={primaryContext} />
          {contextItems.length > 1 ? (
            <button type="button" className="m-chat-ctx__more" aria-haspopup="dialog" aria-expanded={contextOpen}
              aria-label={`Xem ${contextItems.length} mục đã nhắc trong cuộc trò chuyện`} onClick={() => setContextOpen(true)}>
              +{contextItems.length - 1}
            </button>
          ) : null}
        </div>
      ) : null}

      <MobileSheet open={menuOpen} onClose={() => setMenuOpen(false)} title={peerName}>
        <ul className="m-chat-menu">
          <li>
            <button type="button" onClick={() => { setMenuOpen(false); onOpenProfile() }}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a8 8 0 0 1 16 0v1" /></svg>
              Xem hồ sơ
            </button>
          </li>
          <li>
            <button type="button" onClick={() => { setMenuOpen(false); setSearchOpen(true) }}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></svg>
              Tìm trong cuộc trò chuyện
            </button>
          </li>
          <li>
            <button type="button" className="is-danger" disabled={blocking || sending}
              onClick={() => { setMenuOpen(false); onToggleBlock() }}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="m6 6 12 12" /></svg>
              {blocked ? `Bỏ chặn ${peerName}` : `Chặn ${peerName}`}
            </button>
          </li>
        </ul>
      </MobileSheet>

      <MobileSheet open={contextOpen} onClose={() => setContextOpen(false)} title="Đã nhắc trong cuộc trò chuyện">
        <ul className="m-chat-ctx-list">
          {contextItems.map((item) => (
            <li key={item.key}><ContextCard item={item} onPicked={() => setContextOpen(false)} /></li>
          ))}
        </ul>
      </MobileSheet>
    </>
  )
}
