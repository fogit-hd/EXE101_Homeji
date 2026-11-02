import type { Dispatch, RefObject, SetStateAction } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { PostConversation } from '../../../api'
import { PremiumBadge } from '../ChatExtras'
import { Avatar, ContextCard } from './MessagePrimitives'
import { subjectTag, type ContextItem } from './MessageFormatting'

type State = {
  isFloatingThread: boolean
  active: PostConversation | null
  activeId: string | null
  peerName: string
  primaryContext: ContextItem | null
  contextItems: ContextItem[]
  contextOpen: boolean
  searchOpen: boolean
  searchQuery: string
  matchedIds: string[]
  matchIndex: number
  blocking: boolean
  sending: boolean
  cannotSend: boolean
  voiceBusy: boolean
  voiceReady: boolean
}
type Refs = {
  contextRef: RefObject<HTMLDivElement | null>
  searchToggleRef: RefObject<HTMLButtonElement | null>
  searchBarRef: RefObject<HTMLDivElement | null>
  searchInputRef: RefObject<HTMLInputElement | null>
}
type Actions = {
  setContextOpen: Dispatch<SetStateAction<boolean>>
  setSearchOpen: Dispatch<SetStateAction<boolean>>
  setSearchQuery: Dispatch<SetStateAction<string>>
  setMatchIndex: Dispatch<SetStateAction<number>>
  onBack: () => void
  onOpenProfile: () => void
  onToggleBlock: () => void
  onStartCall: () => void
  onCloseWindow?: () => void
}
type Props = { state: State; refs: Refs; actions: Actions }

export function MessagesThreadHeader({ state, refs, actions }: Props) {
  const { isFloatingThread, active, activeId, peerName, primaryContext, contextItems, contextOpen, searchOpen, searchQuery, matchedIds, matchIndex, blocking, sending, cannotSend, voiceBusy, voiceReady } = state
  const { contextRef, searchToggleRef, searchBarRef, searchInputRef } = refs
  const { setContextOpen, setSearchOpen, setSearchQuery, setMatchIndex, onBack, onOpenProfile, onToggleBlock, onStartCall, onCloseWindow } = actions

  return (
    <>
        <header className={`map-messages__thread-head${active?.otherParticipantIsPremium ? ' is-premium' : ''}`}>
          {isFloatingThread ? null : (
            <button type="button" className="map-messages__back map-motion-press" onClick={onBack} aria-label="Quay lại hộp thư">
              <svg viewBox="0 0 24 24" aria-hidden><path d="m15 6-6 6 6 6" /></svg>
            </button>
          )}
          <button type="button" className="chat-profile-link" aria-label={`Xem hồ sơ ${peerName}`} disabled={!active} onClick={() => active && onOpenProfile()}><Avatar name={peerName} seed={active?.otherParticipantId || activeId || peerName} small /></button>
          <div className="map-messages__thread-titles">
            <strong className="map-messages__peer-name" title={peerName}>
              <button type="button" className="chat-profile-link" onClick={() => active && onOpenProfile()}>{peerName}</button> {active?.otherParticipantIsPremium && <PremiumBadge />}
            </strong>
            {active && subjectTag[active.subjectType] ? (
              <small className="map-messages__peer-sub">{subjectTag[active.subjectType].label}</small>
            ) : null}
          </div>

          {primaryContext ? (
            <div className="map-messages__ctx" ref={contextRef}>
              <ContextCard item={primaryContext} />
              {contextItems.length > 1 ? (
                <button
                  type="button"
                  className={`map-messages__ctx-more${contextOpen ? ' is-open' : ''}`}
                  aria-expanded={contextOpen}
                  aria-haspopup="dialog"
                  aria-label={`Xem ${contextItems.length} mục đã nhắc trong cuộc trò chuyện`}
                  onClick={() => setContextOpen((v) => !v)}
                >
                  +{contextItems.length - 1}
                </button>
              ) : null}
              <AnimatePresence>
                {contextOpen ? (
                  <motion.div
                    className="map-messages__ctx-pop"
                    role="dialog"
                    aria-label="Các mục trong cuộc trò chuyện"
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 520, damping: 34 }}
                    onKeyDown={(e) => { if (e.key === 'Escape') setContextOpen(false) }}
                  >
                    <strong className="map-messages__ctx-pop-title">Đã nhắc trong cuộc trò chuyện</strong>
                    <ul>
                      {contextItems.map((item) => (
                        <li key={item.key}><ContextCard item={item} onPicked={() => setContextOpen(false)} /></li>
                      ))}
                    </ul>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          ) : null}

          <div className="map-messages__thread-actions">
            <button type="button" className="map-messages__icon-btn" aria-label={active?.isBlockedByMe ? 'Bỏ chặn người dùng' : 'Chặn người dùng'} title={active?.isBlockedByMe ? 'Bỏ chặn người dùng' : 'Chặn người dùng'} aria-pressed={Boolean(active?.isBlockedByMe)} disabled={!active || blocking || sending} onClick={() => void onToggleBlock()}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><circle cx="12" cy="12" r="8" /><path d="m6.5 6.5 11 11" /></svg>
            </button>
            <button type="button" className="map-messages__icon-btn" aria-label={`Gọi thoại cho ${peerName}`} title="Gọi thoại" disabled={cannotSend || voiceBusy || !voiceReady} onClick={() => active && onStartCall()}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><path d="M5 3h4l2 5-3 2a15 15 0 0 0 6 6l2-3 5 2v4c0 1-1 2-2 2C10 21 3 14 3 5c0-1 1-2 2-2Z" /></svg>
            </button>
            <button type="button" className="map-messages__icon-btn" aria-label={`Mở hồ sơ ${peerName}`} title="Xem hồ sơ" disabled={!active} onClick={() => active && onOpenProfile()}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></svg>
            </button>
            <button
              ref={searchToggleRef}
              type="button"
              className={`map-messages__icon-btn map-motion-press${searchOpen ? ' is-active' : ''}`}
              aria-label="Tìm kiếm tin nhắn"
              aria-pressed={searchOpen}
              onClick={() => setSearchOpen((v) => !v)}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                <path
                  fill="currentColor"
                  d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
                />
              </svg>
            </button>
            {isFloatingThread && onCloseWindow ? (
              <button
                type="button"
                className="map-messages__icon-btn map-messages__float-close map-motion-press"
                aria-label="Đóng cửa sổ chat"
                onClick={onCloseWindow}
              >
                ✕
              </button>
            ) : null}
          </div>
        </header>

        {searchOpen ? (
          <div className="map-messages__search-bar" ref={searchBarRef}>
            <input
              ref={searchInputRef}
              className="map-messages__search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo từ khóa…"
              aria-label="Tìm kiếm theo từ khóa trong hội thoại"
            />
            <span className="map-messages__search-count" aria-live="polite">
              {searchQuery.trim()
                ? matchedIds.length
                  ? `${Math.min(matchIndex + 1, matchedIds.length)}/${matchedIds.length}`
                  : '0'
                : ''}
            </span>
            <button
              type="button"
              className="map-messages__icon-btn"
              aria-label="Kết quả trước"
              disabled={!matchedIds.length}
              onClick={() =>
                setMatchIndex((i) => (i - 1 + matchedIds.length) % matchedIds.length)
              }
            >
              ↑
            </button>
            <button
              type="button"
              className="map-messages__icon-btn"
              aria-label="Kết quả sau"
              disabled={!matchedIds.length}
              onClick={() => setMatchIndex((i) => (i + 1) % matchedIds.length)}
            >
              ↓
            </button>
            <button
              type="button"
              className="map-messages__icon-btn"
              aria-label="Đóng tìm kiếm"
              onClick={() => {
                setSearchOpen(false)
                setSearchQuery('')
              }}
            >
              ✕
            </button>
          </div>
        ) : null}

    </>
  )
}
