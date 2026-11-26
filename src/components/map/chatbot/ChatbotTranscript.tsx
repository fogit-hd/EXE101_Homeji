import { lazy, memo, Suspense, type RefObject } from 'react'
import { ArrowUpRight } from 'lucide-react'
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
import { ChatbotMessageContent } from '../ChatbotMessageContent'
import { ChatbotMediaPreview } from '../ChatbotMediaPreview'
import { ErrorBoundary } from '../../ErrorBoundary'
import { AssistantIcon, HomejiAvatar } from '../ChatbotVisuals'
import { rentalTargetKey } from './chatbotModels'
import type { DisplayMessage } from './ChatbotMessageTypes'

const AgentPostPreview = lazy(() => import('../../ai/AgentPostPreview').then(module => ({ default: module.AgentPostPreview })))
const AgentRoommateResults = lazy(() => import('../../ai/AgentRoommateResults').then(module => ({ default: module.AgentRoommateResults })))
const AiSearchReview = lazy(() => import('../../ai/AiSearchReview').then(module => ({ default: module.AiSearchReview })))
const ChatbotNearbyResults = lazy(() => import('../../ai/ChatbotNearbyResults').then(module => ({ default: module.ChatbotNearbyResults })))
const ChatbotSourceResults = lazy(() => import('../../ai/ChatbotSourceResults').then(module => ({ default: module.ChatbotSourceResults })))
const FoodDiscoveryCard = lazy(() => import('../../ai/FoodDiscoveryCard').then(module => ({ default: module.FoodDiscoveryCard })))
const RentalContextCard = lazy(() => import('../../ai/RentalContextCard').then(module => ({ default: module.RentalContextCard })))
const BotAvatar = lazy(() => import('bot-avatars').then(module => ({ default: module.BotAvatar })))

type State = {
  messages: DisplayMessage[]
  showGreeting: boolean
  busy: boolean
  mediaBusy: boolean
  recordingActive: boolean
  draftWorkspaceId: string | null
  agentMode?: boolean
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

function AssistantWelcomeAvatar({ busy }: { busy: boolean }) {
  if (
    typeof window === 'undefined' ||
    typeof globalThis.requestAnimationFrame !== 'function' ||
    typeof window.CanvasRenderingContext2D === 'undefined'
  ) {
    return <img loading="eager" decoding="async" width={32} height={32} src="/brand/homeji-logo2.png" alt="" draggable={false} />
  }
  return <ErrorBoundary fallback={<img src="/brand/homeji-logo2.png" alt="" draggable={false} />}>
    <Suspense fallback={<img src="/brand/homeji-logo2.png" alt="" draggable={false} />}>
      <BotAvatar type="clover" size={36} state={busy ? 'working' : 'default'} color="#388e3c" />
    </Suspense>
  </ErrorBoundary>
}

export const ChatbotTranscript = memo(function ChatbotTranscript({ state, context, refs, actions }: Props) {
  const { messages, showGreeting, busy, mediaBusy, recordingActive, draftWorkspaceId, agentMode = false } = state
  const { rentalContext, rentalSelection, sharedLocation } = context
  const { latestMessageRef, bottomRef } = refs
  const { onDismissRentalContext, send, prepareDraft, openDraftWorkspace, closeChat, handleNavigationAction, onSearchUpdate, openPayments, openMarketplace, copyReply } = actions

  return (
    <>
              {rentalSelection ? <section className="map-chatbot__context" aria-label="Các phòng đang hỗ trợ">
                <div className="homeji-assistant__room-heading"><span className="homeji-assistant__room-icon"><AssistantIcon name="home" /></span><div><span>CÁC LỰA CHỌN ĐANG HỖ TRỢ</span><strong>{rentalSelection.title}</strong></div><button type="button" className="homeji-assistant__icon-button" onClick={onDismissRentalContext} aria-label="Bỏ ngữ cảnh so sánh" title="Bỏ ngữ cảnh so sánh"><AssistantIcon name="close" /></button></div>
                <div className="map-chatbot__context-prompts"><button type="button" disabled={busy} onClick={() => void send('So sánh các lựa chọn này', false, 'compare')}>So sánh các lựa chọn</button><button type="button" disabled={busy} onClick={() => void send('Những điều cần hỏi về các lựa chọn này', false, 'questions')}>Những điều cần hỏi</button></div>
                <small>Cùng mức sử dụng cho {rentalSelection.scenario.occupants} người. Đổi phí hoặc danh sách tại màn so sánh; các khoản chưa xác nhận vẫn được giữ là chưa biết.</small>
              </section> : null}
              {rentalContext ? <section className="map-chatbot__context" aria-label="Phòng đang hỗ trợ">
                <div className="homeji-assistant__room-heading"><span className="homeji-assistant__room-icon"><AssistantIcon name="home" /></span><div><span>PHÒNG ĐANG HỖ TRỢ</span><strong>{rentalContext.title || 'Tin phòng đang xem'}</strong></div><button type="button" className="homeji-assistant__icon-button" onClick={onDismissRentalContext} aria-label="Bỏ ngữ cảnh phòng đang xem" title="Bỏ ngữ cảnh phòng đang xem"><AssistantIcon name="close" /></button></div>
                <div className="map-chatbot__context-prompts"><button type="button" disabled={busy} onClick={() => void send('Tính tiền tháng của phòng này', false, 'cost')}>Tính tiền tháng <ArrowUpRight aria-hidden="true" size={14} /></button><button type="button" disabled={busy} onClick={() => void send('Những điều cần hỏi về phòng này', false, 'questions')}>Những điều cần hỏi <ArrowUpRight aria-hidden="true" size={14} /></button></div>
                <small>Giá và phí lấy từ tin này. Khi tìm phòng mới, hãy nhập nhu cầu mới của bạn.</small>
              </section> : null}
              {showGreeting ? <div className="map-chatbot__greeting">
                <div className="homeji-assistant__greeting-hero">
                  <div className="homeji-assistant__welcome-mark" aria-hidden="true">
                    <AssistantWelcomeAvatar busy={busy} />
                  </div>
                  <h2>{agentMode ? 'Agent sẵn sàng hỗ trợ theo mục tiêu' : 'Homeji giúp gì cho bạn?'}</h2>
                  <p className="homeji-assistant__greeting-sub">
                    {agentMode ? 'Ghi nhớ ngữ cảnh xuyên phiên, tìm phòng chuẩn nhu cầu và hỗ trợ soạn bài đăng.' : 'Tìm phòng theo khu vực, tính chi phí hàng tháng hoặc khám phá Chợ Homeji.'}
                  </p>
                </div>
                <div className="homeji-assistant__starters">
                  {agentMode ? <>
                    <button type="button" onClick={() => void send('Giúp mình tìm phòng trọ phù hợp nhu cầu')}>
                      <span className="homeji-assistant__starter-icon"><AssistantIcon name="search" /></span>
                      <span className="homeji-assistant__starter-copy"><strong>Tìm phòng theo mục tiêu</strong><span>Khu vực & ngân sách</span></span>
                      <ArrowUpRight aria-hidden="true" size={14} />
                    </button>
                    <button type="button" onClick={() => void send('Kiểm tra và so sánh các phòng mình đã lưu')}>
                      <span className="homeji-assistant__starter-icon"><AssistantIcon name="home" /></span>
                      <span className="homeji-assistant__starter-copy"><strong>Phân tích phòng đã lưu</strong><span>So sánh giá & chi phí</span></span>
                      <ArrowUpRight aria-hidden="true" size={14} />
                    </button>
                    <button type="button" onClick={() => prepareDraft('Giúp mình soạn bài đăng ')}>
                      <span className="homeji-assistant__starter-icon"><AssistantIcon name="bag" /></span>
                      <span className="homeji-assistant__starter-copy"><strong>Soạn bài đăng từ ảnh</strong><span>Tạo nháp trước khi đăng</span></span>
                      <ArrowUpRight aria-hidden="true" size={14} />
                    </button>
                    <button type="button" onClick={() => void send('Mình muốn tìm bạn ở ghép phù hợp')}>
                      <span className="homeji-assistant__starter-icon"><AssistantIcon name="chat" /></span>
                      <span className="homeji-assistant__starter-copy"><strong>Tìm bạn ở ghép</strong><span>Hồ sơ cùng thói quen</span></span>
                      <ArrowUpRight aria-hidden="true" size={14} />
                    </button>
                  </> : <>
                    <button type="button" onClick={() => prepareDraft('Mình muốn tìm phòng ở ')}>
                      <span className="homeji-assistant__starter-icon"><AssistantIcon name="search" /></span>
                      <span className="homeji-assistant__starter-copy"><strong>Tìm nơi phù hợp</strong><span>Phòng trọ & căn hộ</span></span>
                      <ArrowUpRight aria-hidden="true" size={14} />
                    </button>
                    <button type="button" onClick={() => prepareDraft('Hướng dẫn mình các khoản chi phí cần hỏi trước khi thuê phòng.')}>
                      <span className="homeji-assistant__starter-icon"><AssistantIcon name="home" /></span>
                      <span className="homeji-assistant__starter-copy"><strong>Hiểu trước khi thuê</strong><span>Điện nước & hợp đồng</span></span>
                      <ArrowUpRight aria-hidden="true" size={14} />
                    </button>
                    <button type="button" onClick={() => prepareDraft('Hướng dẫn mình mua đồ ăn và đồ dùng trên Homeji.')}>
                      <span className="homeji-assistant__starter-icon"><AssistantIcon name="bag" /></span>
                      <span className="homeji-assistant__starter-copy"><strong>Xem Chợ Homeji</strong><span>Đồ ăn & đồ cũ gần bạn</span></span>
                      <ArrowUpRight aria-hidden="true" size={14} />
                    </button>
                    <button type="button" onClick={() => prepareDraft('Homeji có thể giúp mình làm những gì?')}>
                      <span className="homeji-assistant__starter-icon"><AssistantIcon name="chat" /></span>
                      <span className="homeji-assistant__starter-copy"><strong>Hỏi điều bạn muốn</strong><span>Khám phá mọi tính năng</span></span>
                      <ArrowUpRight aria-hidden="true" size={14} />
                    </button>
                  </>}
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
                        {m.rentalDecision ? <section className="map-chatbot__decision" aria-label="Thông tin và chi phí theo tin phòng"><ErrorBoundary fallback={<small role="alert">Chưa tải được kết quả.</small>}><Suspense fallback={null}><RentalContextCard data={m.rentalDecision} onOpenDetail={() => closeChat()} /></Suspense></ErrorBoundary></section> : null}
                        {m.searchUpdate ? <ErrorBoundary fallback={<small role="alert">Chưa tải được kết quả.</small>}><Suspense fallback={null}><AiSearchReview result={m.searchUpdate} hasOtherRooms={Boolean(m.sourceRooms?.rooms.length)} applied={Boolean(onSearchUpdate) && !m.searchUpdate.criteria.unknown?.length && !m.searchUpdate.posts.some(item => rentalPriceBasis(item.post) === 'unknown')} onApply={update => { onSearchUpdate?.(update) }} onRefine={prepareDraft} onOpenListing={() => closeChat()} /></Suspense></ErrorBoundary> : null}
                        {m.sourceRooms ? <ErrorBoundary fallback={<small role="alert">Chưa tải được kết quả.</small>}><Suspense fallback={null}><ChatbotSourceResults data={m.sourceRooms} startAt={(m.searchUpdate?.posts.length ?? 0) + 1} onOpen={() => closeChat()} /></Suspense></ErrorBoundary> : null}
                        {m.quickReplies?.length && index === messages.length - 1 ? (
                          <div className="homeji-assistant__quick-replies" role="group" aria-label="Trả lời nhanh">
                            {m.quickReplies.map((replyItem, replyIdx) => (
                              <button
                                key={`${replyItem.label}-${replyIdx}`}
                                type="button"
                                disabled={busy || mediaBusy || recordingActive}
                                onClick={() => {
                                  if (replyItem.value.endsWith(' ')) prepareDraft(replyItem.value)
                                  else void send(replyItem.value)
                                }}
                              >
                                {replyItem.label}
                              </button>
                            ))}
                          </div>
                        ) : m.sourceRooms && index === messages.length - 1 ? <div className="map-chatbot__context-prompts" aria-label="Gợi ý hỏi tiếp"><button type="button" disabled={busy} onClick={() => void send('Phòng nào rẻ nhất?')}>Phòng nào rẻ nhất?</button><button type="button" disabled={busy} onClick={() => void send('So sánh 2 phòng đầu')}>So sánh 2 phòng đầu</button></div> : null}
                        {m.agentDraft ? m.agentDraft.id === draftWorkspaceId ? <button type="button" className="homeji-assistant__draft-open" onClick={() => openDraftWorkspace(m.agentDraft!.id)}><span>Loại tin · nội dung · chi phí · vị trí</span><strong>Mở bản nháp để xem và chỉnh sửa ↗</strong></button> : <ErrorBoundary fallback={<small role="alert">Chưa tải được kết quả.</small>}><Suspense fallback={null}><AgentPostPreview key={m.agentDraft.id} draft={m.agentDraft} sharedLocation={sharedLocation} active={false} onFinished={() => {}} /></Suspense></ErrorBoundary> : null}
                        {m.upgradeRequired ? <div className="map-chatbot__actions"><button className="map-chatbot__action" type="button" onClick={openPayments}>Xem gói Premium</button><button className="map-chatbot__action" type="button" onClick={() => { if (m.actions?.[0]) handleNavigationAction(m.actions[0]); else { openMarketplace() } }}>Tự đăng bài</button></div> : null}
                        {m.roommateCandidates ? <ErrorBoundary fallback={<small role="alert">Chưa tải được kết quả.</small>}><Suspense fallback={null}><AgentRoommateResults items={m.roommateCandidates} onOpen={() => closeChat()} /></Suspense></ErrorBoundary> : null}
                        {m.nearbyRooms ? <ErrorBoundary fallback={<small role="alert">Chưa tải được kết quả.</small>}><Suspense fallback={null}><ChatbotNearbyResults data={m.nearbyRooms} onOpen={() => closeChat()} /></Suspense></ErrorBoundary> : null}
                        {m.foodDiscovery ? <ErrorBoundary fallback={<small role="alert">Chưa tải được kết quả.</small>}><Suspense fallback={null}><FoodDiscoveryCard data={m.foodDiscovery} busy={busy} onSearch={origin => void send(m.foodQuery || '', false, undefined, undefined, origin, foodCriteriaSnapshot(m.foodDiscovery!))} onOpen={() => closeChat()} /></Suspense></ErrorBoundary> : null}
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
})
