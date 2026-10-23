import { useEffect, useId, useRef, useState } from 'react'
import { getAdminAssistantSummary, type AdminAssistantSummary } from '../../api/rentalAssistant'
import { getErrorMessage } from '../../lib/errors'
import './RentalAssistant.css'

export function AdminAssistant({ onOpen, onRefreshQueues }: {
  onOpen: (kind: 'posts' | 'reports', id: string) => void
  onRefreshQueues: () => Promise<void>
}) {
  const [data, setData] = useState<AdminAssistantSummary>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const requestRef = useRef<AbortController | null>(null)
  const contentId = useId()
  useEffect(() => () => { requestRef.current?.abort(); requestRef.current = null }, [])
  const refresh = async () => {
    if (requestRef.current) return
    const controller = new AbortController()
    requestRef.current = controller
    setOpen(true)
    setBusy(true); setError(''); setData(undefined)
    try {
      const [result] = await Promise.all([getAdminAssistantSummary(controller.signal), onRefreshQueues()])
      if (!controller.signal.aborted) setData(result)
    }
    catch (e) { if (!controller.signal.aborted) setError(getErrorMessage(e, 'Chưa tải được tóm tắt công việc')) }
    finally { if (requestRef.current === controller) { requestRef.current = null; setBusy(false) } }
  }
  return <section className="rental-assistant admin-assistant" aria-label="Trợ lý điều hành"><div className="admin-assistant__heading"><div><h3>Trợ lý điều hành</h3><p>Tóm tắt hàng chờ và mở đúng nội dung cần kiểm tra.</p></div>
    <button type="button" className="btn btn-primary" disabled={busy} aria-expanded={open} aria-controls={contentId} onClick={() => open ? setOpen(false) : void refresh()}>{busy ? 'Đang kiểm tra…' : open ? 'Thu gọn công việc' : 'Hôm nay có gì cần xử lý?'}</button>
    </div>{open ? <div id={contentId}>
      {busy ? <p role="status">Đang kiểm tra công việc cần xử lý…</p> : <button type="button" className="btn btn-secondary btn-sm" onClick={() => void refresh()}>Kiểm tra lại</button>}
      {error ? <p role="alert">{error}</p> : null}
      {data ? <><p>{data.summary}</p><small>Tính lúc {new Date(data.calculatedAt).toLocaleString('vi-VN')}</small><ul className="admin-assistant-tasks">{data.tasks.map(task => {
        const kind = task.kind
        if ((kind !== 'posts' && kind !== 'reports') || !task.id) return null
        return <li key={`${kind}:${task.id}`}><button type="button" className="btn btn-secondary btn-sm" onClick={() => onOpen(kind, task.id)}>{kind === 'posts' ? 'Mở tin' : 'Mở báo cáo'}: {task.label}</button></li>
      })}</ul></> : null}
    </div> : null}
  </section>
}
