import { useState } from 'react'
import { previewRentalDraft, type DraftPreview } from '../../api/rentalAssistant'
import { getErrorMessage } from '../../lib/errors'
import './RentalAssistant.css'

export function RentalDraftAssistant({ postId, title, description, onApply }: {
  postId: string; title: string; description: string; onApply: (title: string, description: string) => void
}) {
  const [notes, setNotes] = useState('')
  const [preview, setPreview] = useState<DraftPreview>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const generate = async () => {
    setBusy(true); setError(''); setPreview(undefined)
    try { setPreview(await previewRentalDraft(postId, notes)) }
    catch (e) { setError(getErrorMessage(e, 'Chưa tạo được bản xem trước')) }
    finally { setBusy(false) }
  }
  return <section className="rental-assistant"><details><summary>Trợ lý chuẩn bị nội dung đăng tin</summary>
    <p>Dùng ghi chú của bạn để chuẩn bị nội dung và nhắc thông tin còn thiếu. Kiểm tra trước khi áp dụng; thay đổi chỉ vào biểu mẫu, bạn vẫn cần nhấn lưu / gửi duyệt.</p>
    <label>Ghi chú về phòng<textarea value={notes} maxLength={3000} rows={4} onChange={e => { setNotes(e.target.value); setPreview(undefined) }} /></label>
    <button type="button" disabled={busy || !notes.trim()} onClick={() => void generate()}>{busy ? 'Đang chuẩn bị…' : 'Tạo bản xem trước'}</button>
    {error ? <p role="alert">{error}</p> : null}
    {preview ? <><div className="rental-assistant__fields"><article><h4>Hiện tại</h4><strong>{title || 'Chưa có tiêu đề'}</strong><p style={{ whiteSpace: 'pre-wrap' }}>{description || 'Chưa có mô tả'}</p></article><article><h4>Đề xuất từ ghi chú của bạn</h4><strong>{preview.title}</strong><p style={{ whiteSpace: 'pre-wrap' }}>{preview.description}</p></article></div>
      <p>Thông tin cần bổ sung / kiểm tra:</p><ul>{preview.missing.map(text => <li key={text}>{text}</li>)}</ul>
      <button type="button" className="btn btn-secondary" onClick={() => { onApply(title.trim() || preview.title, preview.description); setPreview(undefined) }}>Xác nhận áp dụng vào biểu mẫu</button>
      <button type="button" onClick={() => setPreview(undefined)}>Bỏ đề xuất</button></> : null}
  </details></section>
}
