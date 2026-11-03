import type { RefObject } from 'react'
import {
  ChatMessageSender,
  ChatbotNavigationActionKind,
  type AiHighlightResponse,
  type ChatbotFoodContext,
  type ChatbotFoodCriteria,
  type ChatbotNavigationAction,
  type ChatbotRentalContext,
} from '../../../api'
import type { RentalAssistantComparison, RentalAssistantSelection } from '../../../contexts/rental-assistant-context'
import type { ChatbotLocation } from '../../../lib/chatbotLocation'
import { foodCriteriaSnapshot } from '../../../lib/foodChatIntent'
import { rentalPriceBasis } from '../../ai/rentalPriceBasis'
import { AgentPostPreview } from '../../ai/AgentPostPreview'
import { AgentRoommateResults } from '../../ai/AgentRoommateResults'
import { AiSearchReview } from '../../ai/AiSearchReview'
import { ChatbotNearbyResults } from '../../ai/ChatbotNearbyResults'
import { FoodDiscoveryCard } from '../../ai/FoodDiscoveryCard'
import { RentalContextCard } from '../../ai/RentalContextCard'
import { ChatbotMessageContent } from '../ChatbotMessageContent'
import { ChatbotMediaPreview } from '../ChatbotMediaComposer'
import { AssistantIcon, HomejiAvatar } from '../ChatbotVisuals'
import { rentalTargetKey } from './chatbotModels'
import type { DisplayMessage } from './ChatbotMessageTypes'

type State = {
  messages: DisplayMessage[]
  showGreeting: boolean
  busy: boolean
  mediaBusy: boolean
  recordingActive: boolean
  draftWorkspaceId: string | null
}
type Context = {
  rentalContext: RentalAssistantSelection | null
  rentalSelection: RentalAssistantComparison | null
  sharedLocation: ChatbotLocation | null
}
type Refs = {
  latestMessageRef: RefObject<HTMLElement | null>
  bottomRef: RefObject<HTMLDivElement | null>
}
type Actions = {
  onDismissRentalContext?: () => void
  send: (text: string, fromSuggestion?: boolean, task?: ChatbotRentalContext['task'] | 'compare', retryMessage?: DisplayMessage, foodContext?: ChatbotFoodContext, foodCriteria?: ChatbotFoodCriteria, locationOverride?: ChatbotLocation) => void | Promise<void>
  prepareDraft: (text: string) => void
  openDraftWorkspace: (draftId: string) => void
  closeChat: () => void
  handleNavigationAction: (action: ChatbotNavigationAction) => void
  onSearchUpdate?: (update: AiHighlightResponse) => void
  openPayments: () => void
  openMarketplace: () => void
  copyReply: (content: string) => void | Promise<void>
}
type Props = { state: State; context: Context; refs: Refs; actions: Actions }

export function ChatbotTranscript({ state, context, refs, actions }: Props) {
  const { messages, showGreeting, busy, mediaBusy, recordingActive, draftWorkspaceId } = state
  const { rentalContext, rentalSelection, sharedLocation } = context
  const { latestMessageRef, bottomRef } = refs
  const { onDismissRentalContext, send, prepareDraft, openDraftWorkspace, closeChat, handleNavigationAction, onSearchUpdate, openPayments, openMarketplace, copyReply } = actions

  return (
    <>
              {rentalSelection ? <section className="map-chatbot__context" aria-label="Các phòng đang hỗ trợ">
                <div className="homeji-assistant__room-heading"><span className="homeji-assistant__room-icon"><AssistantIcon name="home" /></span><div><span>CÁC LỰA CHỌN ĐANG HỖ TRỢ</span><strong>{rentalSelection.title}</strong></div><button type="button" className="homeji-assistant__icon-button" onClick={onDismissRentalContext} aria-label="Bỏ ngữ cảnh so sánh"><AssistantIcon name="close" /></button></div>
                <div className="map-chatbot__context-prompts"><button type="button" disabled={busy} onClick={() => void send('So sánh các lựa chọn này', false, 'compare')}>So sánh các lựa chọn</button><button type="button" disabled={busy} onClick={() => void send('Những điều cần hỏi về các lựa chọn này', false, 'questions')}>Những điều cần hỏi</button></div>
                <small>Cùng mức sử dụng cho {rentalSelection.scenario.occupants} người. Đổi phí hoặc danh sách tại màn so sánh; các khoản chưa xác nhận vẫn được giữ là chưa biết.</small>
              </section> : null}
              {rentalContext ? <section className="map-chatbot__context" aria-label="Phòng đang hỗ trợ">
                <div className="homeji-assistant__room-heading"><span className="homeji-assistant__room-icon"><AssistantIcon name="home" /></span><div><span>PHÒNG ĐANG HỖ TRỢ</span><strong>{rentalContext.title || 'Tin phòng đang xem'}</strong></div><button type="button" className="homeji-assistant__icon-button" onClick={onDismissRentalContext} aria-label="Bỏ ngữ cảnh phòng đang xem"><AssistantIcon name="close" /></button></div>
                <div className="map-chatbot__context-prompts"><button type="button" disabled={busy} onClick={() => void send('Tính tiền tháng của phòng này', false, 'cost')}>Tính tiền tháng <span aria-hidden>↗</span></button><button type="button" disabled={busy} onClick={() => void send('Những điều cần hỏi về phòng này', false, 'questions')}>Những điều cần hỏi <span aria-hidden>↗</span></button></div>
                <small>Giá và phí lấy từ tin này. Khi tìm phòng mới, hãy nhập nhu cầu mới của bạn.</small>
              </section> : null}
              {showGreeting ? <div className="map-chatbot__greeting">
                <div className="homeji-assistant__welcome-mark" aria-hidden="true"><img src="/brand/homeji-logo2.png" alt="" draggable={false} /></div>
                <h2>Homeji giúp gì cho bạn?</h2>
                <div className="homeji-assistant__starters">
                  <button type="button" onClick={() => prepareDraft('Mình muốn tìm phòng ở ')}><AssistantIcon name="search" /><strong>Tìm nơi phù hợp</strong><b aria-hidden>↗</b></button>
                  <button type="button" onClick={() => prepareDraft('Hướng dẫn mình các khoản chi phí cần hỏi trước khi thuê phòng.')}><AssistantIcon name="home" /><strong>Hiểu trước khi thuê</strong><b aria-hidden>↗</b></button>
                  <button type="button" onClick={() => prepareDraft('Hướng dẫn mình mua đồ ăn và đồ dùng trên Homeji.')}><AssistantIcon name="bag" /><strong>Khám phá chợ Homeji</strong><b aria-hidden>↗</b></button>
                  <button type="button" onClick={() => prepareDraft('Homeji có thể giúp mình làm những gì?')}><AssistantIcon name="chat" /><strong>Hỏi điều bạn muốn</strong><b aria-hidden>↗</b></button>
                </div>
              </div> : null}
              {messages.map((m, index) => {
                const isUser = m.sender === ChatMessageSender.User
                const needsRoomReselection = Boolean(m.rentalContext && m.rentalContext.postId !== rentalContext?.postId)
                const needsChoiceReselection = Boolean(m.rentalSelection && rentalTargetKey(null, m.rentalSelection) !== rentalTargetKey(null, rentalSelection))
                return <article key={m.id} ref={index === messages.length - 1 ? latestMessageRef : undefined} className={`map-chatbot__msg ${isUser ? 'is-user' : 'is-assistant'}${m.pending ? ' is-pending' : ''}${m.rentalDecision ? ' is-grounded' : ''}`}>
                  <div className="homeji-assistant__message-author">{isUser ? <span className="homeji-assistant__you" aria-hidden>B</span> : <HomejiAvatar inline />}<strong>{isUser ? 'Bạn' : 'Homeji'}</strong>{!isUser ? <span>AI</span> : null}</div>
                  <div className="map-chatbot__bubble">
                    {m.rentalContext ? <small className="map-chatbot__message-context">Về phòng: {m.rentalContext.title || 'Tin phòng đã chọn'}</small> : null}
                    {m.rentalSelection ? <small className="map-chatbot__message-context">Về lựa chọn: {m.rentalSelection.title}</small> : null}
                    {isUser ? <><ChatbotMediaPreview attachments={m.attachments ?? []} /><span className="map-chatbot__bubble-text">{m.content}</span>{m.failure ? <div className="map-chatbot__recovery"><p role="status">{m.failure}</p><button type="button" disabled={busy || mediaBusy || recordingActive} onClick={() => void send(m.content, false, undefined, m)}>Thử lại câu hỏi này</button></div> : null}</>
                      : <><ChatbotMessageContent content={m.content} />
                        {m.rentalDecision ? <section className="map-chatbot__decision" aria-label="Thông tin và chi phí theo tin phòng"><RentalContextCard data={m.rentalDecision} onOpenDetail={() => closeChat()} /></section> : null}
                        {m.searchUpdate ? <AiSearchReview result={m.searchUpdate} applied={Boolean(onSearchUpdate) && !m.searchUpdate.criteria.unknown?.length && !m.searchUpdate.posts.some(item => rentalPriceBasis(item.post) === 'unknown')} onApply={update => { onSearchUpdate?.(update) }} onRefine={prepareDraft} onOpenListing={() => closeChat()} /> : null}
                        {m.agentDraft ? m.agentDraft.id === draftWorkspaceId ? <button type="button" className="homeji-assistant__draft-open" onClick={() => openDraftWorkspace(m.agentDraft!.id)}><span>Loại tin · nội dung · chi phí · vị trí</span><strong>Mở bản nháp để xem và chỉnh sửa ↗</strong></button> : <AgentPostPreview key={m.agentDraft.id} draft={m.agentDraft} sharedLocation={sharedLocation} active={false} onFinished={() => {}} /> : null}
                        {m.upgradeRequired ? <div className="map-chatbot__actions"><button className="map-chatbot__action" type="button" onClick={openPayments}>Khám phá Premium</button><button className="map-chatbot__action" type="button" onClick={() => { if (m.actions?.[0]) handleNavigationAction(m.actions[0]); else { openMarketplace() } }}>Tự đăng bài</button></div> : null}
                        {m.roommateCandidates ? <AgentRoommateResults items={m.roommateCandidates} onOpen={() => closeChat()} /> : null}
                        {m.nearbyRooms ? <ChatbotNearbyResults data={m.nearbyRooms} onOpen={() => closeChat()} /> : null}
                        {m.foodDiscovery ? <FoodDiscoveryCard data={m.foodDiscovery} busy={busy} onSearch={origin => void send(m.foodQuery || '', false, undefined, undefined, origin, foodCriteriaSnapshot(m.foodDiscovery!))} onOpen={() => closeChat()} /> : null}
                        {m.actions?.length && !m.upgradeRequired ? <div className="map-chatbot__actions" aria-label="Đi tới tính năng Homeji">{m.actions.map(action => <button key={action.id} type="button" className="map-chatbot__action" title={action.description} onClick={() => handleNavigationAction(action)}>{action.label}<AssistantIcon name="arrow" /></button>)}</div> : null}
                        <div className="homeji-assistant__reply-actions"><button type="button" onClick={() => void copyReply(m.content)} aria-label="Sao chép câu trả lời"><AssistantIcon name="copy" />Sao chép</button><button type="button" onClick={() => {
                          if (needsChoiceReselection) handleNavigationAction({ id: `reselect-${m.id}`, kind: ChatbotNavigationActionKind.Navigate, label: 'Chọn lại danh sách', description: '', target: '/?section=saved&view=considering' })
                          else if (needsRoomReselection && m.rentalContext) handleNavigationAction({ id: `reselect-${m.id}`, kind: ChatbotNavigationActionKind.Navigate, label: 'Mở lại phòng', description: '', target: `/?post=${encodeURIComponent(m.rentalContext.postId)}` })
                          else prepareDraft(m.foodDiscovery ? 'Gợi ý đồ ăn ' : m.rentalSelection ? 'Về các lựa chọn này, mình muốn hỏi thêm: ' : m.rentalContext ? 'Về phòng này, mình muốn hỏi thêm: ' : 'Mình muốn hỏi thêm: ')
                        }}><AssistantIcon name="chat" />{needsChoiceReselection ? 'Mở danh sách để chọn lại' : needsRoomReselection ? 'Mở lại phòng để hỏi tiếp' : 'Hỏi tiếp'}</button></div>
                      </>}
                  </div>
                </article>
              })}
              <div ref={bottomRef} />
    </>
  )
}
