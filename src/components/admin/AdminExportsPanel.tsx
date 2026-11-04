import { useCallback, useEffect, useRef, useState } from 'react'
import { createAdminExport, downloadAdminExport, getAdminExports, type AdminReportExport } from '../../api/adminReporting'
import { getStoredSession } from '../../api/client'
import { formatDate } from '../../lib/labels'
import { getErrorMessage } from '../../lib/errors'
import './AdminReporting.css'

const emailLabel: Record<string, string> = { queued: 'Đang chờ gửi', sending: 'Đang gửi email', accepted: 'Nhà cung cấp đã tiếp nhận', uncertain: 'Chưa xác định kết quả gửi', failed: 'Gửi email thất bại' }

export function AdminExportsPanel() {
  const [days, setDays] = useState(30)
  const [reports, setReports] = useState<AdminReportExport[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const gate = useRef(false)
  const generation = useRef(0)
  const active = useRef(true)
  const ownerId = getStoredSession()?.userId
  const current = useCallback(() => active.current && getStoredSession()?.userId === ownerId, [ownerId])
  const load = useCallback(async () => {
    const version = ++generation.current
    try {
      const rows = await getAdminExports()
      if (current() && version === generation.current) { setReports(rows); setError('') }
    } catch (reason) { if (current() && version === generation.current) setError(getErrorMessage(reason, 'Chưa tải được lịch sử báo cáo.')) }
    finally { if (current()) setLoading(false) }
  }, [current])
  useEffect(() => {
    active.current = true
    let cancelled = false
    void Promise.resolve().then(() => { if (!cancelled) void load() })
    return () => { cancelled = true; active.current = false }
  }, [load])
  const waiting = reports.some(report => report.emailStatus === 'queued' || report.emailStatus === 'sending')
  useEffect(() => {
    const recover = () => { if (document.visibilityState !== 'hidden') void load() }
    const timer = waiting ? window.setInterval(recover, 10000) : undefined
    window.addEventListener('focus', recover)
    document.addEventListener('visibilitychange', recover)
    return () => { if (timer) clearInterval(timer); window.removeEventListener('focus', recover); document.removeEventListener('visibilitychange', recover) }
  }, [load, waiting])
  const create = async () => {
    if (gate.current || !ownerId) return
    gate.current = true; setCreating(true); setError(''); setNotice('')
    const storageKey = `homeji-admin-report:${ownerId}:${days}`
    try {
      let requestId = sessionStorage.getItem(storageKey)
      if (!requestId) { requestId = crypto.randomUUID(); sessionStorage.setItem(storageKey, requestId) }
      const report = await createAdminExport(requestId, days)
      if (!current()) return
      generation.current++
      setReports(previous => [report, ...previous.filter(row => row.id !== report.id)].slice(0, 30))
      try { sessionStorage.removeItem(storageKey) } catch { /* The retained request remains safe to retry. */ }
      setNotice('Đã tạo file Excel và xếp hàng gửi email. Bạn có thể tải file ngay bên dưới.')
    } catch (reason) {
      if (current()) setError(getErrorMessage(reason, 'Chưa xác nhận tạo được báo cáo. Thử lại sẽ dùng cùng mã yêu cầu để tránh tạo và gửi trùng.'))
    } finally { gate.current = false; if (current()) setCreating(false) }
  }
  const download = async (report: AdminReportExport) => {
    if (downloading) return
    setDownloading(report.id); setError('')
    try {
      const blob = await downloadAdminExport(report.id)
      if (!current()) return
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a'); link.href = url; link.download = report.fileName; document.body.append(link); link.click(); link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (reason) { if (current()) setError(getErrorMessage(reason, 'Chưa tải được file Excel.')) }
    finally { if (current()) setDownloading(null) }
  }
  return <section className="admin-exports" aria-label="Xuất báo cáo quản trị">
    <div className="admin-export-create">
      <div><span className="admin-section-kicker">Báo cáo quản trị</span><h3>Xuất dữ liệu tài khoản và thành viên</h3>
        <p>Mỗi lần tạo sẽ lưu một file Excel và gửi bản đính kèm đến <strong>duongduy12314@gmail.com</strong>.</p>
        <p className="admin-report-note">Gồm tổng quan, tài khoản đăng ký, lịch sử gói Premium, hoạt động và khu vực. Danh sách tài khoản và gói gồm toàn bộ dữ liệu hiện có; số liệu hoạt động theo khoảng ngày chọn.</p></div>
      <div className="admin-export-create__action"><label>Khoảng hoạt động<select className="form-select" value={days} disabled={creating} onChange={event => setDays(Number(event.target.value))}>{[7, 30, 90].map(value => <option key={value} value={value}>{value} ngày gần nhất</option>)}</select></label>
        <button type="button" className="btn btn-primary" disabled={creating} onClick={() => void create()}>{creating ? 'Đang tạo báo cáo…' : 'Tạo báo cáo & gửi email'}</button></div>
    </div>
    {notice ? <p className="admin-report-success" role="status">{notice}</p> : null}
    {error ? <p role="alert">{error}</p> : null}
    <div className="admin-section-heading"><div><h3>Báo cáo đã tạo</h3><p>Tải lại file không gửi thêm email. Trạng thái tiếp nhận email chưa phải xác nhận Gmail đã nhận vào hộp thư.</p></div><button type="button" className="btn btn-secondary" disabled={loading || creating} onClick={() => void load()}>Cập nhật trạng thái</button></div>
    {loading ? <p role="status">Đang tải lịch sử báo cáo…</p> : !reports.length ? <p className="empty-state">Chưa có báo cáo Excel nào được tạo.</p> : <div className="admin-export-list">{reports.map(report => <article key={report.id} className="admin-export-row">
      <div><strong>{report.fileName}</strong><span>{report.periodDays} ngày hoạt động · Tạo {formatDate(report.createdAt)}</span><small>Gửi đến {report.recipient}</small></div>
      <div><span className={`admin-state ${report.emailStatus === 'accepted' ? 'is-active' : ''}`}>{emailLabel[report.emailStatus] ?? 'Chưa rõ trạng thái email'}</span>
        {report.emailAcceptedAt ? <small>Tiếp nhận {formatDate(report.emailAcceptedAt)}</small> : report.lastErrorCode ? <small>{report.emailStatus === 'uncertain' ? 'Cần kiểm tra hộp thư trước khi tạo bản gửi mới.' : report.emailStatus === 'failed' ? 'Đã hết lượt thử gửi. Bạn vẫn có thể tải file.' : 'Chưa gửi được; hệ thống sẽ thử lại. File vẫn tải được.'}</small> : null}</div>
      <button type="button" className="btn btn-secondary" aria-label={`Tải Excel ${report.fileName}`} disabled={downloading !== null} onClick={() => void download(report)}>{downloading === report.id ? 'Đang tải…' : 'Tải Excel'}</button>
    </article>)}</div>}
  </section>
}
