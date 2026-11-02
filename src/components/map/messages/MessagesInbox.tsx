import type { RefObject } from 'react'
import type { PostConversation } from '../../../api'
import { ConversationListSkeleton } from '../../skeletons/PageSkeletons'
import { LiquidTabList } from '../../ui/LiquidTabList'
import { PremiumBadge } from '../ChatExtras'
import { Avatar } from './MessagePrimitives'
import { conversationPreview, relativeTime, subjectTag, type InboxFilter } from './MessageFormatting'

type Props = {
  isFloatingThread: boolean
  isWorkspace: boolean
  isFloatingInbox: boolean
  threadVisible: boolean
  inboxSearchRef: RefObject<HTMLLabelElement | null>
  inboxQuery: string
  onInboxQueryChange: (value: string) => void
  onInboxFocus: () => void
  inboxFilter: InboxFilter
  onFilterChange: (filter: InboxFilter) => void
  unreadTotal: number
  loading: boolean
  filteredConversations: PostConversation[]
  conversations: PostConversation[]
  activeId: string | null
  currentUserId?: string | null
  onOpenThread: (conversationId: string) => void
}

export function MessagesInbox({
  isFloatingThread, isWorkspace, isFloatingInbox, threadVisible, inboxSearchRef,
  inboxQuery, onInboxQueryChange, onInboxFocus, inboxFilter, onFilterChange,
  unreadTotal, loading, filteredConversations, conversations, activeId, currentUserId,
  onOpenThread,
}: Props) {
  return (
    <>
      {!isFloatingThread ? (
      <div
        className={`map-messages__inbox${
          isWorkspace || isFloatingInbox || !threadVisible ? ' is-visible' : ''
        }`}
      >
        {isWorkspace ? (
          <>
            <header className="map-messages__inbox-head">
              <h1 className="map-messages__inbox-title">Tin nhắn</h1>
              <a href="/?section=listings" className="map-messages__new-icon liquid-action" aria-label="Tin nhắn mới" title="Tin nhắn mới">
                <svg viewBox="0 0 24 24" aria-hidden><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
              </a>
            </header>
            <label className="map-messages__inbox-search" ref={inboxSearchRef}>
              <input
                type="search"
                placeholder="Tìm cuộc trò chuyện"
                aria-label="Tìm cuộc trò chuyện"
                value={inboxQuery}
                onChange={(e) => onInboxQueryChange(e.target.value)}
                onFocus={() => onInboxFocus()}
              />
            </label>
            <LiquidTabList className="map-messages__inbox-filters" role="tablist" aria-label="Lọc hộp thư">
              <button
                type="button"
                role="tab"
                aria-selected={inboxFilter === 'all'}
                className={inboxFilter === 'all' ? 'is-active' : ''}
                onClick={() => onFilterChange('all')}
              >
                Tất cả
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={inboxFilter === 'unread'}
                className={inboxFilter === 'unread' ? 'is-active' : ''}
                onClick={() => onFilterChange('unread')}
              >
                Chưa đọc{unreadTotal > 0 ? <span className="map-messages__filter-count" aria-label={`${unreadTotal} tin chưa đọc`}>{unreadTotal > 99 ? '99+' : unreadTotal}</span> : null}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={inboxFilter === 'rental'}
                className={inboxFilter === 'rental' ? 'is-active' : ''}
                onClick={() => onFilterChange('rental')}
              >
                Phòng thuê
              </button>
            </LiquidTabList>
          </>
        ) : null}
        {loading ? <ConversationListSkeleton /> : null}
        {!loading && filteredConversations.length === 0 ? (
          <p className="map-messages__empty">
            {conversations.length === 0
              ? 'Chưa có cuộc trò chuyện. Mở tin đăng và chọn “Nhắn tin”.'
              : 'Không có cuộc trò chuyện khớp bộ lọc.'}
          </p>
        ) : null}
        <ul className="map-messages__conv-list">
          {filteredConversations.map((c, i) => (
            <li key={c.id} style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
              <button
                type="button"
                data-glass-exclude=""
                aria-current={activeId === c.id ? 'true' : undefined}
                className={`map-messages__row${c.otherParticipantIsPremium ? ' is-premium' : ''}${activeId === c.id ? ' is-active' : ''}${
                  (c.unreadCount ?? 0) > 0 ? ' is-unread' : ''
                }`}
                onClick={() => onOpenThread(c.id)}
              >
                <Avatar name={c.otherParticipantName || '?'} seed={c.otherParticipantId || c.id} subdued />
                <span className="map-messages__meta">
                  <span className="map-messages__meta-top">
                    <strong title={c.otherParticipantName || 'Người dùng'}>{c.otherParticipantName || 'Người dùng'}</strong>
                    <time className="map-messages__time" dateTime={c.updatedAt}>
                      {relativeTime(c.updatedAt)}
                    </time>
                  </span>
                  <span className="map-messages__meta-bottom">
                    {(() => {
                      const pv = conversationPreview(c.lastMessage, c.lastMessageSenderId, currentUserId)
                      return <small className={`map-messages__preview${pv.muted ? ' is-muted' : ''}`}>{pv.text}</small>
                    })()}
                    {(c.unreadCount ?? 0) > 0 ? (
                      <span className="map-messages__unread-badge" aria-label={`${c.unreadCount} tin chưa đọc`}>
                        {c.unreadCount > 99 ? '99+' : c.unreadCount}
                      </span>
                    ) : null}
                  </span>
                  <span className="chat-conversation-labels">
                    {subjectTag[c.subjectType] && <span className={`map-messages__tag is-${subjectTag[c.subjectType].tone}`}>{subjectTag[c.subjectType].label}</span>}
                    {c.otherParticipantIsPremium && <PremiumBadge />}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      ) : null}
    </>
  )
}
