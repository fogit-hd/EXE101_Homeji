import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type { ChatbotPopupConfig } from '../../api'
import type { ChatbotDraftAttachment } from '../../lib/chatbotMedia'
import { ChatbotMediaComposer } from './ChatbotMediaComposer'
import { ProfileGate } from '../auth/ProfileGate'
import { AssistantIcon } from './ChatbotVisuals'

type Props = {
  open: boolean
  mediaSession: number
  attachments: ChatbotDraftAttachment[]
  setAttachments: Dispatch<SetStateAction<ChatbotDraftAttachment[]>>
  busy: boolean
  mediaBusy: boolean
  setMediaBusy: Dispatch<SetStateAction<boolean>>
  recordingActive: boolean
  setRecordingActive: Dispatch<SetStateAction<boolean>>
  draft: string
  setDraft: Dispatch<SetStateAction<string>>
  draftRevisionRef: MutableRefObject<number>
  inputRef: MutableRefObject<HTMLTextAreaElement | null>
  setError: Dispatch<SetStateAction<string | null>>
  send: (text: string) => void | Promise<void>
  saveHistory: boolean
  setSaveHistory: Dispatch<SetStateAction<boolean>>
  config: ChatbotPopupConfig | null
  startNewConversation: () => void
  setResetRequested: Dispatch<SetStateAction<boolean>>
  deleteConversation: () => void | Promise<void>
  conversationId?: string
  rentalContext: boolean
  closeChat: () => void
}

export function ChatbotComposer({
  open, mediaSession, attachments, setAttachments, busy, mediaBusy, setMediaBusy,
  recordingActive, setRecordingActive, draft, setDraft, draftRevisionRef, inputRef,
  setError, send, saveHistory, setSaveHistory, config, startNewConversation,
  setResetRequested, deleteConversation, conversationId, rentalContext, closeChat,
}: Props) {
  return (
            <div className="homeji-assistant__composer-area">
              <ProfileGate action="trò chuyện với trợ lý AI" onNavigate={closeChat}>
              {open ? <ChatbotMediaComposer key={mediaSession} attachments={attachments} disabled={busy || mediaBusy || !config}
                recaptchaSiteKey={config?.recaptchaSiteKey}
                onChange={setAttachments} onError={setError} onBusyChange={setMediaBusy} onRecordingChange={setRecordingActive}
                onDictation={text => {
                  if (!text.trim()) throw new Error('Không nghe rõ lời nói. Hãy ghi âm lại.')
                  if (draft.length + text.length + (draft ? 1 : 0) > 1000) throw new Error('Nội dung vượt quá 1.000 ký tự. Hãy rút gọn tin nhắn hoặc bản ghi.')
                  draftRevisionRef.current += 1
                  setDraft(current => current ? `${current} ${text}` : text)
                  inputRef.current?.focus()
                }} /> : null}
              <form className="map-chatbot__form" onSubmit={event => { event.preventDefault(); void send(draft) }}>
                <textarea
                  ref={inputRef}
                  value={draft}
                  readOnly={mediaBusy}
                  maxLength={1000}
                  rows={1}
                  onChange={event => {
                    draftRevisionRef.current += 1
                    setDraft(event.target.value)
                  }}
                  onKeyDown={event => {
                    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229) {
                      event.preventDefault()
                      if (!busy && !mediaBusy && !recordingActive && (draft.trim() || attachments.length)) event.currentTarget.form?.requestSubmit()
                    }
                  }}
                  placeholder={rentalContext ? 'Hỏi về phòng này, hoặc điều bạn cần…' : 'Kể Homeji nghe điều bạn đang cần…'}
                  aria-label="Nhập tin nhắn cho Homeji"
                />
                <button type="submit" className="map-chatbot__send" disabled={busy || mediaBusy || recordingActive || (!draft.trim() && !attachments.length)} aria-label="Gửi">
                  <span className="sr-only">Gửi</span>
                  <AssistantIcon name="send" />
                </button>
              </form>
              <div className="homeji-assistant__composer-meta">
                {draft.length ? <span className="homeji-assistant__char-count">{draft.length}/1.000</span> : null}
                <details className="map-chatbot__privacy" data-glass-exclude>
                  <summary>Quyền riêng tư & lịch sử</summary>
                  <p>Ảnh và âm thanh bạn gửi được chuyển tới Gemini để xử lý. Homeji không lưu tệp gốc vào lịch sử chatbot. Bản chép lời chỉ được gửi vào hội thoại sau khi bạn bấm Gửi.</p>
                  <p>{saveHistory ? 'Bạn đã đồng ý lưu hội thoại thuộc tài khoản của mình.' : 'Homeji không lưu hội thoại này vào lịch sử chatbot của bạn.'} Homeji dùng tiêu chí bạn nhập để tìm phòng; chỉ dùng vị trí thiết bị sau khi bạn cho phép. Nội dung bạn nhập, kể cả yêu cầu tìm phòng, có thể được gửi tới Gemini để xử lý. Tránh nhập thông tin nhạy cảm.</p>
                  {config?.historyStorageEnabled ? (
                    <label>
                      <input
                        type="checkbox"
                        checked={saveHistory}
                        disabled={busy}
                        onChange={event => {
                          setSaveHistory(event.target.checked)
                          startNewConversation()
                        }}
                      />
                      Đồng ý lưu hội thoại và tiêu chí theo chính sách lưu lịch sử
                    </label>
                  ) : (
                    <p>Lưu lịch sử hiện đang tắt.</p>
                  )}
                  {!saveHistory ? (
                    <button type="button" disabled={busy} onClick={() => setResetRequested(true)}>
                      Xóa nội dung phiên và tiêu chí
                    </button>
                  ) : null}
                  {conversationId ? (
                    <button type="button" disabled={busy} onClick={() => void deleteConversation()}>
                      Xóa hội thoại và tiêu chí hiện tại
                    </button>
                  ) : null}
                </details>
              </div>
              </ProfileGate>
              <p className="homeji-assistant__disclaimer">
                Trong một số trường hợp Bot AI có thể chưa hoàn toàn chính xác. Cần xác minh thêm thông tin, Quý khách vui lòng liên hệ Nhân viên tư vấn qua{' '}
                <a href="mailto:duongduy12314@gmail.com">duongduy12314@gmail.com</a>.
              </p>
              {config?.recaptchaSiteKey ? (
                <p className="homeji-assistant__disclaimer">
                  Được bảo vệ bởi reCAPTCHA theo{' '}
                  <a href="https://policies.google.com/privacy?hl=vi" target="_blank" rel="noreferrer">Chính sách quyền riêng tư</a>
                  {' '}và{' '}
                  <a href="https://policies.google.com/terms?hl=vi" target="_blank" rel="noreferrer">Điều khoản dịch vụ</a>
                  {' '}của Google.
                </p>
              ) : null}
            </div>
  )
}
