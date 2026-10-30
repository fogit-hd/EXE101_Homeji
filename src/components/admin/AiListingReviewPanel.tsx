import { useCallback, useEffect, useRef, useState } from 'react'
import { getAiReviews, saveAiReviewSettings, queueAiReviewBackfill, resolveAiReview, type AiReviewDashboard, type AiReviewSettings } from '../../api/aiReviews'
import { getErrorMessage } from '../../lib/errors'
import './AiListingReviewPanel.css'

const labels: Record<string, string> = { pending: 'Đang chờ', processing: 'Đang kiểm tra', clear: 'Chưa thấy dấu hiệu vi phạm', needs_review: 'Cần người duyệt', blocked: 'AI đã ẩn', superseded: 'Tin đã được sửa', restored: 'Đã giữ hoặc khôi phục tin', confirmed: 'Đã xác nhận ẩn tin' }
const kindLabels: Record<string, string> = { rental: 'Tin phòng', goods: 'Chợ đồ', food: 'Đồ ăn' }
const fields: { key: keyof Omit<AiReviewSettings, 'enabled' | 'autoBlock'>; label: string; min: number; max: number }[] = [
  { key: 'batchSize', label: 'Số tin mỗi đợt', min: 1, max: 10 },
  { key: 'spacingSeconds', label: 'Khoảng nghỉ giữa hai tin (giây)', min: 30, max: 3600 },
  { key: 'pauseMinutes', label: 'Nghỉ giữa hai đợt (phút)', min: 5, max: 1440 },
  { key: 'dailyRequestLimit', label: 'Số lượt gọi tối đa mỗi ngày', min: 1, max: 500 },
  { key: 'dailyTokenBudget', label: 'Ngân sách token mỗi ngày', min: 10000, max: 1000000 },
]

export function AiListingReviewPanel() {
  const [data, setData] = useState<AiReviewDashboard | null>(null)
  const [settings, setSettings] = useState<AiReviewSettings | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const mounted = useRef(true)
  const load = useCallback(async () => {
    const result = await getAiReviews()
    if (mounted.current) { setData(result); setSettings(result.settings) }
  }, [])
  useEffect(() => {
    mounted.current = true
    void load().catch(reason => { if (mounted.current) setError(getErrorMessage(reason)) }).finally(() => { if (mounted.current) setLoading(false) })
    return () => { mounted.current = false }
  }, [load])
  const act = async (action: () => Promise<void>, message: string) => {
    if (lock.current) return
    lock.current = true; setBusy(true); setError(''); setNotice('')
    try { await action(); if (mounted.current) setNotice(message); await load() }
    catch (reason) { if (mounted.current) setError(getErrorMessage(reason)) }
    finally { lock.current = false; if (mounted.current) setBusy(false) }
  }
  return <section className="ai-review-panel" aria-label="AI kiểm tra tin" data-glass-exclude>
    <header><div><h2>AI kiểm tra tin</h2><p>Tin phòng, chợ đồ và đồ ăn được kiểm tra lần lượt. AI chỉ xem nội dung chữ; không xác nhận ảnh, người bán hay chất lượng thực phẩm.</p></div>
      <button type="button" className="btn btn-secondary btn-sm" disabled={busy || loading} onClick={() => void act(load, 'Đã cập nhật kết quả.')}>Làm mới kết quả</button></header>
    {error ? <p className="ai-review-panel__error" role="alert">{error}</p> : null}
    {notice ? <p role="status">{notice}</p> : null}
    {loading ? <p role="status">Đang tải lịch kiểm tra…</p> : null}
    {data && settings ? <>
      <div className="ai-review-panel__stats">
        <div><strong>{data.pending}</strong><span>Tin đang chờ</span></div><div><strong>{data.needsReview}</strong><span>Cần người duyệt</span></div><div><strong>{data.blocked}</strong><span>AI đã ẩn, chờ xem lại</span></div>
        <div><strong>{data.requestsToday}/{data.settings.dailyRequestLimit}</strong><span>Lượt đã dùng hôm nay (UTC)</span></div>
      </div>
      <p className="ai-review-panel__schedule">{!data.settings.enabled ? 'Đã tạm dừng kiểm tra tự động.' : data.pauseReason || `Lượt kiểm tra tiếp theo không sớm hơn ${new Date(data.nextAllowedAt).toLocaleString('vi-VN')}.`}</p>
      <p className="form-hint">Đã giữ ngân sách {data.tokensReservedToday.toLocaleString('vi-VN')} token cho các yêu cầu hôm nay. Đây là mức dự phòng, không phải số token tính phí thực tế. Hạn mức dùng chung với các tính năng AI khác nên hệ thống vẫn có thể phải nghỉ thêm khi cổng quá tải.</p>
      <form className="ai-review-panel__settings" onSubmit={event => { event.preventDefault(); void act(() => saveAiReviewSettings(settings), 'Đã lưu lịch kiểm tra.') }}>
        <fieldset disabled={busy}><legend>Lịch và giới hạn sử dụng</legend>
          <label className="ai-review-panel__check"><input type="checkbox" checked={settings.enabled} onChange={event => setSettings({ ...settings, enabled: event.target.checked })} />Bật kiểm tra tự động cho tin mới hoặc vừa chỉnh sửa</label>
          <label className="ai-review-panel__check"><input type="checkbox" checked={settings.autoBlock} onChange={event => setSettings({ ...settings, autoBlock: event.target.checked })} />Tự ẩn vi phạm rõ ràng, có đoạn trích làm bằng chứng</label>
          <div className="ai-review-panel__fields">{fields.map(field => <label key={field.key}>{field.label}<input className="form-input" type="number" min={field.min} max={field.max} step="1" required value={settings[field.key]} onChange={event => setSettings({ ...settings, [field.key]: Number(event.target.value) })} /></label>)}</div>
          <button className="btn btn-primary btn-sm" type="submit">{busy ? 'Đang lưu…' : 'Lưu lịch kiểm tra'}</button>
        </fieldset>
      </form>
      <div className="ai-review-panel__backfill"><div><h3>Kiểm tra tin cũ</h3><p>Chỉ mở khi cần. Tin cũ đi vào hàng đợi riêng, vẫn giữ các khoảng nghỉ và ngân sách trên; tin mới được ưu tiên.</p></div>
        <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => {
          if (window.confirm('Đưa các tin cũ chưa kiểm tra vào hàng đợi? Hệ thống xử lý từng tin theo lịch, không gọi AI cùng lúc.')) void act(queueAiReviewBackfill, 'Đã mở đợt kiểm tra tin cũ. Hệ thống sẽ xử lý dần theo lịch.')
        }}>Mở đợt kiểm tra tin cũ</button></div>
      <h3>Kết quả gần đây</h3>
      {data.items.length === 0 ? <p>Chưa có tin trong hàng đợi. Tin mới hoặc tin vừa sửa sẽ xuất hiện khi đến lượt kiểm tra.</p> : <div className="ai-review-panel__items">{data.items.map(item => <article key={item.id} className={`ai-review-panel__item ai-review-panel__item--${item.state}`}>
        <div className="ai-review-panel__item-heading"><span>{kindLabels[item.kind] || item.kind}</span><strong>{labels[item.state] || item.state}</strong></div>
        <h4>{item.title}</h4>{item.description ? <details><summary>Xem nội dung đã kiểm tra</summary><p style={{ whiteSpace: 'pre-wrap' }}>{item.description}</p></details> : null}<p>{item.reason || 'Hệ thống sẽ kiểm tra khi đến lượt.'}</p>
        {item.evidence ? <blockquote>{item.evidence}</blockquote> : null}
        <small>Đã thử {item.attempts} lần · {new Date(item.createdAt).toLocaleString('vi-VN')}</small>
        {!item.reviewedAt && (item.state === 'needs_review' || item.state === 'blocked') ? <div className="ai-review-panel__actions">
          <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => void act(() => resolveAiReview(item.id, true), item.state === 'blocked' ? 'Đã khôi phục tin.' : 'Đã ghi nhận quyết định giữ tin.')}>{item.state === 'blocked' ? 'Khôi phục tin' : 'Giữ tin'}</button>
          <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => {
            if (window.confirm(item.state === 'blocked' ? 'Xác nhận giữ ẩn tin này?' : 'Ẩn tin này sau khi đã kiểm tra nội dung?')) void act(() => resolveAiReview(item.id, false), 'Đã ghi nhận quyết định ẩn tin.')
          }}>{item.state === 'blocked' ? 'Xác nhận giữ ẩn' : 'Ẩn tin'}</button>
        </div> : null}
      </article>)}</div>}
    </> : null}
  </section>
}
