import { Fragment, type Dispatch, type MutableRefObject, type SetStateAction } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { MessageAttachmentStatus, type PostMessage } from '../../../api'
import { parseChatGif } from '../../../lib/chatGif'
import { parseChatLocation, type ChatLocationPayload } from '../../../lib/chatLocation'
import { ChatGifMessage } from '../ChatExtras'
import { Avatar, LocationBubble, MessageSearchHighlight, SecureMessageAttachment } from './MessagePrimitives'
import { clock, dayLabel, startOfDay } from './MessageFormatting'

const GROUP_GAP_MS = 5 * 60_000

type Props = {
  history: { loading: boolean; error: string | null; retry: () => void }
  messages: PostMessage[]
  currentUserId?: string | null
  activeId: string | null
  peerName: string
  matchedIds: string[]
  matchIndex: number
  searchQuery: string
  matchRefs: MutableRefObject<Map<string, HTMLDivElement>>
  bottomRef: MutableRefObject<HTMLDivElement | null>
  setMessages: Dispatch<SetStateAction<PostMessage[]>>
  onError: (message: string) => void
  onFocusMap?: (loc: { lat: number; lng: number; title?: string; address?: string; kind?: ChatLocationPayload['kind']; conversationId?: string }) => void
}

export function MessagesTimeline({
  history, messages, currentUserId, activeId, peerName, matchedIds, matchIndex,
  searchQuery, matchRefs, bottomRef, setMessages, onError, onFocusMap,
}: Props) {
  return (
        <div className="map-messages__bubbles">
          {history.loading && !messages.length ? <p className="map-messages__empty" role="status">Đang tải tin nhắn…</p> : null}
          {history.error ? <div className="map-messages__block-notice" role="alert">{history.error} <button type="button" onClick={history.retry}>Thử lại</button></div> : null}
          <AnimatePresence initial={false}>
          {messages.map((m, idx) => {
            const mine = currentUserId != null && m.senderId === currentUserId
            const location = parseChatLocation(m.body)
            const gif = parseChatGif(m.body)
            const isHit = matchedIds.includes(m.id)
            const isCurrent =
              isHit && matchedIds[Math.min(matchIndex, matchedIds.length - 1)] === m.id
            const prev = messages[idx - 1]
            const next = messages[idx + 1]
            const t = new Date(m.sentAt).getTime()
            const newDay = !prev || startOfDay(new Date(prev.sentAt)) !== startOfDay(new Date(m.sentAt))
            const joinsPrev = !newDay && prev?.senderId === m.senderId && t - new Date(prev.sentAt).getTime() < GROUP_GAP_MS
            const nextNewDay = !next || startOfDay(new Date(next.sentAt)) !== startOfDay(new Date(m.sentAt))
            const joinsNext = !nextNewDay && next?.senderId === m.senderId && new Date(next.sentAt).getTime() - t < GROUP_GAP_MS
            const hasText = !location && !gif && !m.attachments?.some(a => a.mimeType === 'audio/wav') && m.body.trim().length > 0
            return (
              <Fragment key={m.id}>
              {newDay ? <div className="map-messages__day" role="separator">{dayLabel(m.sentAt)}</div> : null}
              <motion.div
                ref={(el: HTMLDivElement | null) => {
                  if (el) matchRefs.current.set(m.id, el)
                  else matchRefs.current.delete(m.id)
                }}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 460, damping: 32 }}
                className={`map-messages__bubble${mine ? ' is-mine' : ''}${
                  location ? ' is-location' : ''
                }${joinsPrev ? ' joins-prev' : ''}${joinsNext ? ' joins-next' : ''}${!hasText && !location ? ' is-media' : ''}${isHit ? ' is-hit' : ''}${isCurrent ? ' is-hit-current' : ''}`}
              >
                {!mine && !joinsNext ? (
                  <span className="map-messages__bubble-avatar"><Avatar name={peerName} seed={m.senderId} small /></span>
                ) : null}
                <div className="map-messages__bubble-body">
                {gif && <ChatGifMessage key={gif.id} id={gif.id} />}
                {m.attachments?.length ? (
                  <div className="map-messages__images">
                    {m.attachments.map((attachment) => (
                      <SecureMessageAttachment
                        key={attachment.id}
                        attachment={attachment}
                        conversationId={m.conversationId}
                        messageId={m.id}
                        mine={mine}
                        onError={onError}
                        onDeleted={() => {
                          setMessages((previous) => previous.map((message) =>
                            message.id === m.id
                              ? {
                                  ...message,
                                  attachments: message.attachments?.map((item) =>
                                    item.id === attachment.id
                                      ? { ...item, status: MessageAttachmentStatus.Deleted }
                                      : item,
                                  ),
                                }
                              : message,
                          ))
                        }}
                      />
                    ))}
                  </div>
                ) : null}
                {location ? (
                  <LocationBubble
                    payload={location}
                    onOpen={onFocusMap}
                    query={searchQuery}
                    conversationId={activeId}
                  />
                ) : hasText ? (
                  <p><MessageSearchHighlight text={m.body} query={searchQuery} /></p>
                ) : null}
                </div>
                {!joinsNext ? <time dateTime={m.sentAt}>{clock(m.sentAt)}</time> : null}
              </motion.div>
              </Fragment>
            )
          })}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>

  )
}
