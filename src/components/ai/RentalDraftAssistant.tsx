import { useEffect, useId, useRef, useState } from 'react'
import { generateRentalDraft } from '../../api'
import { getErrorMessage } from '../../lib/errors'
import { type RentalDraftFacts } from '../../lib/rentalDraft'
import './RentalDraftAssistant.css'

type Props = {
  field: 'title' | 'description'
  facts: RentalDraftFacts
  title: string
  description: string
  disabled: boolean
  onApply: (text: string) => void
}

export function RentalDraftAssistant({ field, facts, title, description, disabled, onApply }: Props) {
  const panelId = useId()
  const label = field === 'title' ? 'tiêu đề' : 'mô tả'
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
    if (pending.current || disabled) return
    const current = ++requestId.current
    const controller = new AbortController()
    pending.current = controller
    setBusy(true)
    setError('')
    setPreview(null)
    try {
      const result = await generateRentalDraft(facts, controller.signal)
      if (requestId.current === current) { setPreview(result); setSnapshot(version) }
    } catch (reason) {
      if (requestId.current === current) setError(getErrorMessage(reason, 'Chưa tạo được gợi ý. Hãy thử lại.'))
    } finally {
      if (requestId.current === current) { pending.current = null; setBusy(false) }
    }
  }
  return <section className="rental-draft-tool" data-glass-exclude aria-label={`AI gợi ý ${label}`}>
    <div className="rental-draft-tool__actions">
      <button type="button" className="rental-draft-tool__generate" disabled={disabled || busy}
        aria-busy={busy} aria-controls={panelId} onClick={() => void generate()}>
        {busy ? `Đang viết ${label}…` : `AI gợi ý ${label}`}
      </button>
      {busy ? <button type="button" className="rental-draft-tool__cancel" onClick={cancel}>Hủy</button> : null}
      <span className="rental-draft-tool__hint">Dựa trên thông tin phòng bạn đã điền.</span>
    </div>
    <div id={panelId}>
      {error ? <p className="rental-draft-tool__error" role="alert">{error}</p> : null}
      {preview ? <div className="rental-draft-tool__preview">
        <strong>Gợi ý {label}</strong>
        <p className="rental-draft-tool__text">{preview[field]}</p>
        {field === 'description' && preview.missing.length > 0 ? <details className="rental-draft-tool__missing">
          <summary>Thông tin cần bổ sung</summary>
          <ul>{preview.missing.map(item => <li key={item}>{item}</li>)}</ul>
        </details> : null}
        {stale ? <p role="status">Bạn vừa sửa thông tin. Hãy tạo lại gợi ý trước khi áp dụng.</p> : null}
        <div className="rental-draft-tool__actions">
          <button type="button" className="btn btn-secondary btn-sm" disabled={disabled || stale || busy}
            onClick={() => { onApply(preview[field]); setPreview(null) }}>Dùng {label} này</button>
          <button type="button" className="rental-draft-tool__cancel" onClick={() => setPreview(null)}>Bỏ qua</button>
        </div>
        <p className="rental-draft-tool__hint">Kiểm tra nội dung rồi bấm Lưu nháp hoặc Gửi duyệt.</p>
      </div> : null}
    </div>
  </section>
}
