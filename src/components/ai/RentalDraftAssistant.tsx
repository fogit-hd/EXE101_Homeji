import { useState } from 'react'
import { buildRentalDraft, type RentalDraftFacts } from '../../lib/rentalDraft'
import './RentalDraftAssistant.css'

export function RentalDraftAssistant({ facts, title, description, disabled, onApply }: {
  facts: RentalDraftFacts; title: string; description: string; disabled: boolean
  onApply: (draft: { title: string; description: string }) => void
}) {
  const [preview, setPreview] = useState<ReturnType<typeof buildRentalDraft> | null>(null)
  const [snapshot, setSnapshot] = useState('')
  const version = JSON.stringify({ facts, title, description })
  const stale = snapshot !== version
  return <details className="rental-draft-assistant">
    <summary>Trợ lý soạn tin · xem trước rồi xác nhận</summary>
    <p>Gợi ý theo thông tin bạn đã điền. Ảnh không được dùng để đo diện tích hoặc suy ra tiện ích. Mẫu có căn cứ dùng được cả khi dịch vụ AI gián đoạn.</p>
    <button type="button" className="btn btn-secondary btn-sm ai-spectrum-button" disabled={disabled} onClick={() => { setPreview(buildRentalDraft(facts)); setSnapshot(version) }}>Tạo bản gợi ý</button>
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
