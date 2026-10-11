import { useState } from 'react'
import { getAdminAssistantSummary, type AdminAssistantSummary } from '../../api/rentalAssistant'
import { getErrorMessage } from '../../lib/errors'
import './RentalAssistant.css'

export function AdminAssistant({ onOpen }: { onOpen: (kind: 'posts' | 'reports', id: string) => void }) {
  const [data, setData] = useState<AdminAssistantSummary>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const refresh = async () => {
    setBusy(true); setError(''); setData(undefined)
    try { setData(await getAdminAssistantSummary()) }
    catch (e) { setError(getErrorMessage(e, 'Chưa tải được tóm tắt công việc')) }
    finally { setBusy(false) }
  }
  return <section className="rental-assistant"><h3>Trợ lý điều hành</h3>
    <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void refresh()}>{busy ? 'Đang kiểm tra…' : 'Hôm nay có gì cần xử lý?'}</button>
    {error ? <p role="alert">{error}</p> : null}
    {data ? <><p>{data.summary}</p><small>Tính lúc {new Date(data.calculatedAt).toLocaleString('vi-VN')}</small><ul>{data.tasks.map(task => <li key={task.id}><button type="button" onClick={() => onOpen(task.kind === 'posts' ? 'posts' : 'reports', task.id)}>{task.kind === 'posts' ? 'Mở tin' : 'Mở báo cáo'}: {task.label}</button></li>)}</ul></> : null}
  </section>
}
