import { useEffect, useRef, useState } from 'react'
import { generateRentalDraft } from '../../api'
import { getErrorMessage } from '../../lib/errors'
import { type RentalDraftFacts } from '../../lib/rentalDraft'
import './RentalDraftAssistant.css'

export function RentalDraftAssistant({ facts, title, description, disabled, onApply }: {
  facts: RentalDraftFacts; title: string; description: string; disabled: boolean
  onApply: (draft: { title: string; description: string }) => void
}) {
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof generateRentalDraft>> | null>(null)
  const [snapshot, setSnapshot] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const requestId = useRef(0)
  const pending = useRef<AbortController | null>(null)
  useEffect(() => () => { requestId.current += 1; pending.current?.abort() }, [])
  const cancel = () => {
    requestId.current += 1
    pending.current?.abort()
    pending.current = null
    setBusy(false)
  }
  const version = JSON.stringify({ facts, title, description })
  const stale = snapshot !== version
  const generate = async () => {
    if (busy || disabled) return
    const current = ++requestId.current
    const controller = new AbortController()
    pending.current?.abort()
    pending.current = controller
    setBusy(true); setError(''); setPreview(null)
    try {
      const result = await generateRentalDraft(facts, controller.signal)
      if (requestId.current === current) { setPreview(result); setSnapshot(version) }
    } catch (reason) {
      if (requestId.current === current) setError(getErrorMessage(reason, 'Gemini chưa tạo được bản nháp. Vui lòng thử lại.'))
    } finally { if (requestId.current === current) { pending.current = null; setBusy(false) } }
  }
  return <details className="rental-draft-assistant" onToggle={event => { if (!event.currentTarget.open) cancel() }}>
    <summary>Trợ lý soạn tin · xem trước rồi xác nhận</summary>
    <p>Gemini gợi ý cách trình bày từ thông tin bạn đã điền. Bản nháp không xác minh giá, tiện ích hay tình trạng phòng. Ảnh không được dùng để đo diện tích hoặc suy ra tiện ích. Bạn kiểm tra lại trước khi áp dụng.</p>
    <button type="button" className="btn btn-secondary btn-sm ai-spectrum-button" disabled={disabled || busy} aria-busy={busy} onClick={() => void generate()}>{busy ? 'Gemini đang soạn…' : 'Tạo bản gợi ý bằng Gemini'}</button>
    {busy ? <button type="button" className="btn btn-ghost btn-sm" onClick={cancel}>Hủy soạn</button> : null}
    {busy ? <p role="status">Đang soạn từ thông tin bạn cung cấp…</p> : null}
    {error ? <p role="alert">{error}</p> : null}
    {preview ? <>
      <div className="rental-draft-assistant__preview">
        <section><h3>Hiện tại</h3><strong>{title || 'Chưa có tiêu đề'}</strong><p>{description || 'Chưa có mô tả'}</p></section>
        <section><h3>Bản gợi ý</h3><strong>{preview.title}</strong><p>{preview.description}</p></section>
      </div>
      <strong>Thông tin cần bổ sung / kiểm tra</strong><ul>{preview.missing.map(item => <li key={item}>{item}</li>)}</ul>
      {stale ? <p role="status">Thông tin đã thay đổi. Tạo lại bản gợi ý trước khi áp dụng.</p> : null}
      <button type="button" className="btn btn-primary btn-sm ai-spectrum-button" disabled={disabled || stale} onClick={() => { onApply(preview); setPreview(null) }}>Xác nhận thay tiêu đề và mô tả trong biểu mẫu</button>
      <p>Bạn vẫn cần nhấn Lưu hoặc Gửi duyệt để cập nhật tin.</p>
    </> : null}
  </details>
}
