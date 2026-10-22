import { useSyncExternalStore } from 'react'
import type { PostConversation } from '../../api/types'
import { getStoredSession } from '../../api/client'
import { rentalDraftTarget, rentalMessageDraftStore } from '../../lib/rentalMessageDraft'

export function RentalMessageDraftNotice({ userId, conversation, existingDraft, onUse }: {
  userId?: string
  conversation: PostConversation | null
  existingDraft: string
  onUse: (body: string) => void
}) {
  const target = rentalDraftTarget(userId, conversation)
  const snapshot = () => target ? rentalMessageDraftStore.peek(target) : null
  const draft = useSyncExternalStore(rentalMessageDraftStore.subscribe, snapshot, () => null)
  if (!draft || !target) return null
  const consume = (use: boolean) => {
    if (getStoredSession()?.userId !== target.userId) return
    const current = rentalMessageDraftStore.take(target, draft.id)
    if (current && use) onUse(current.body)
  }
  return <section className="map-messages__draft-notice" aria-label="Bản nháp câu hỏi về phòng">
    <strong>Câu hỏi cho {conversation?.otherParticipantName || 'người đăng phòng'}</strong>
    <p>Đây là bản nháp từ phòng bạn vừa xem. Chưa có tin nhắn nào được gửi.</p>
    <details><summary>Xem bản nháp</summary><p className="map-messages__draft-preview">{draft.body}</p></details>
    {existingDraft.trim() ? <p>Bạn đang soạn nội dung khác. Chỉ thay khi chọn dùng bản nháp.</p> : null}
    <div><button type="button" onClick={() => consume(true)}>{existingDraft.trim() ? 'Thay nội dung bằng bản nháp' : 'Dùng bản nháp để chỉnh và gửi'}</button>
      <button type="button" onClick={() => consume(false)}>Bỏ bản nháp</button></div>
  </section>
}
