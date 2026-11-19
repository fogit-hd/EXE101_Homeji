import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { confirmDialog } from '../ui/confirmDialog'
import {
  getAiReviews,
  saveAiReviewSettings,
  queueAiReviewBackfill,
  resolveAiReview,
  resolveAllAiReviews,
  type AiReviewDashboard,
  type AiReviewItem,
  type AiReviewSettings,
} from '../../api/aiReviews'
import { getErrorMessage } from '../../lib/errors'
import './AiListingReviewPanel.css'

const labels: Record<string, string> = {
  pending: 'Đang chờ',
  processing: 'Đang kiểm tra',
  clear: 'Chưa thấy dấu hiệu vi phạm',
  needs_review: 'Cần người duyệt',
  blocked: 'AI đã ẩn',
  superseded: 'Tin đã được sửa',
  restored: 'Đã giữ hoặc khôi phục tin',
  confirmed: 'Đã xác nhận ẩn tin',
}
const kindLabels: Record<string, string> = { rental: 'Tin phòng', goods: 'Đồ cũ', food: 'Đồ ăn' }
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
  const [observedAt, setObservedAt] = useState(0)
  const [busy, setBusy] = useState(false)
  const [pendingItemIds, setPendingItemIds] = useState<Set<string>>(new Set())
  const [batchBusy, setBatchBusy] = useState(false)
  const [showRejectAllModal, setShowRejectAllModal] = useState(false)
  const [rejectAllReason, setRejectAllReason] = useState('')
  const [rejectModalError, setRejectModalError] = useState('')
  const lock = useRef(false)
  const mounted = useRef(true)

  const load = useCallback(async () => {
    const result = await getAiReviews()
    if (mounted.current) { setData(result); setSettings(result.settings); setObservedAt(Date.now()) }
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

  // Asynchronous per-item review action (non-blocking for other items)
  const resolveItem = async (item: AiReviewItem, restore: boolean, reason?: string) => {
    if (pendingItemIds.has(item.id)) return
    setPendingItemIds(prev => new Set(prev).add(item.id))
    setError('')
    try {
      await resolveAiReview(item.id, restore, reason)
      if (mounted.current) {
        setNotice(restore ? (item.state === 'blocked' ? 'Đã khôi phục tin.' : 'Đã ghi nhận quyết định giữ tin.') : 'Đã ghi nhận quyết định ẩn tin.')
        setData(prev => {
          if (!prev) return prev
          const nextItems = prev.items.map(i => i.id === item.id ? { ...i, state: restore ? 'restored' : 'confirmed', reviewedAt: new Date().toISOString() } : i)
          const needsReviewDiff = item.state === 'needs_review' ? 1 : 0
          const blockedDiff = item.state === 'blocked' ? 1 : 0
          return {
            ...prev,
            needsReview: Math.max(0, prev.needsReview - needsReviewDiff),
            blocked: Math.max(0, prev.blocked - blockedDiff),
            items: nextItems,
          }
        })
      }
    } catch (reason) {
      if (mounted.current) setError(getErrorMessage(reason))
    } finally {
      if (mounted.current) {
        setPendingItemIds(prev => {
          const next = new Set(prev)
          next.delete(item.id)
          return next
        })
      }
    }
  }

  const actionableItems = useMemo(() => {
    return data?.items.filter(item => !item.reviewedAt && (item.state === 'needs_review' || item.state === 'blocked')) ?? []
  }, [data?.items])

  const handleApproveAll = async () => {
    if (actionableItems.length === 0 || batchBusy) return
    const confirmed = await confirmDialog({
      title: 'Duyệt tất cả tin?',
      message: `Bạn có chắc muốn duyệt và giữ lại ${actionableItems.length} tin đang chờ duyệt không?`,
      confirmLabel: 'Duyệt tất cả',
    })
    if (!confirmed) return

    setBatchBusy(true)
    setError('')
    setNotice('')
    const targetIds = actionableItems.map(item => item.id)
    try {
      try {
        await resolveAllAiReviews(true, undefined, targetIds)
      } catch {
        // Fallback for rolling deploy: resolve concurrently
        await Promise.all(actionableItems.map(item => resolveAiReview(item.id, true)))
      }
      if (mounted.current) {
        setNotice(`Đã duyệt tất cả ${actionableItems.length} tin.`)
        setData(prev => {
          if (!prev) return prev
          const idSet = new Set(targetIds)
          return {
            ...prev,
            needsReview: 0,
            blocked: 0,
            items: prev.items.map(i => idSet.has(i.id) ? { ...i, state: 'restored', reviewedAt: new Date().toISOString() } : i),
          }
        })
      }
    } catch (err) {
      if (mounted.current) setError(getErrorMessage(err, 'Chưa thể duyệt tất cả tin. Vui lòng thử lại.'))
    } finally {
      if (mounted.current) setBatchBusy(false)
    }
  }

  const handleConfirmRejectAll = async () => {
    const reason = rejectAllReason.trim()
    if (!reason) {
      setRejectModalError('Vui lòng nhập lý do từ chối.')
      return
    }
    if (actionableItems.length === 0 || batchBusy) return

    setBatchBusy(true)
    setError('')
    setNotice('')
    const targetIds = actionableItems.map(item => item.id)
    try {
      try {
        await resolveAllAiReviews(false, reason, targetIds)
      } catch {
        // Fallback for rolling deploy: resolve concurrently
        await Promise.all(actionableItems.map(item => resolveAiReview(item.id, false, reason)))
      }
      if (mounted.current) {
        setShowRejectAllModal(false)
        setRejectAllReason('')
        setNotice(`Đã từ chối tất cả ${actionableItems.length} tin với lý do: "${reason}".`)
        setData(prev => {
          if (!prev) return prev
          const idSet = new Set(targetIds)
          return {
            ...prev,
            needsReview: 0,
            blocked: 0,
            items: prev.items.map(i => idSet.has(i.id) ? { ...i, state: 'confirmed', reason, reviewedAt: new Date().toISOString() } : i),
          }
        })
      }
    } catch (err) {
      if (mounted.current) setRejectModalError(getErrorMessage(err, 'Chưa thể từ chối tất cả tin. Vui lòng thử lại.'))
    } finally {
      if (mounted.current) setBatchBusy(false)
    }
  }

  return <section className="ai-review-panel" aria-label="AI kiểm tra tin" data-glass-exclude>
    <header><div><h2>AI kiểm tra tin</h2><p>Kiểm tra nội dung và ảnh của tin phòng, chợ đồ, đồ ăn. Kết quả AI hỗ trợ người duyệt; không xác minh danh tính hay chất lượng sản phẩm.</p></div>
      <button type="button" className="btn btn-secondary btn-sm" disabled={busy || loading} onClick={() => void act(load, 'Đã cập nhật kết quả.')}>Làm mới kết quả</button></header>
    {error ? <p className="ai-review-panel__error" role="alert">{error}</p> : null}
    {notice ? <p role="status">{notice}</p> : null}
    {loading ? <p role="status">Đang tải lịch kiểm tra…</p> : null}
    {data && settings ? <>
      <div className="ai-review-panel__stats">
        <div><strong>{data.pending}</strong><span>Tin đang chờ</span></div><div><strong>{data.needsReview}</strong><span>Cần người duyệt</span></div><div><strong>{data.blocked}</strong><span>AI đã ẩn, chờ xem lại</span></div>
        <div><strong>{data.requestsToday}/{data.settings.dailyRequestLimit}</strong><span>Lượt đã dùng hôm nay (UTC)</span></div>
      </div>
      <p role="status">{data.lastHeartbeatAt
        ? `Tiến trình kiểm tra phản hồi lúc ${new Date(data.lastHeartbeatAt).toLocaleString('vi-VN')}.${observedAt - new Date(data.lastHeartbeatAt).getTime() > 5 * 60_000 ? ' Phản hồi đã quá 5 phút tại lúc tải dữ liệu; cần kiểm tra máy chủ.' : ''}`
        : 'Chưa nhận được phản hồi từ tiến trình kiểm tra.'}</p>
      <p className="form-hint">Kiểm tra tin mới hoặc vừa chỉnh sửa của người dùng; không gọi AI lại cho nội dung đã kiểm tra và không thay đổi. Tin nhập từ website khác chưa nằm trong phạm vi này. Thời điểm phản hồi trên cho biết tiến trình còn hoạt động, không phải thời điểm AI duyệt xong một tin.</p>
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
        <button type="button" className="btn btn-secondary" disabled={busy} onClick={async () => {
          if (await confirmDialog({ title: 'Kiểm tra các tin cũ?', message: 'Hệ thống xử lý từng tin theo lịch, không gọi AI cùng lúc.', confirmLabel: 'Đưa vào hàng đợi' })) void act(queueAiReviewBackfill, 'Đã mở đợt kiểm tra tin cũ. Hệ thống sẽ xử lý dần theo lịch.')
        }}>Mở đợt kiểm tra tin cũ</button></div>
      <div className="ai-review-panel__queue-header">
        <div>
          <h3>Kết quả gần đây</h3>
          <p className="ai-review-panel__queue-count">
            {actionableItems.length > 0
              ? <>Có <strong>{actionableItems.length}</strong> tin đang chờ người duyệt trong danh sách.</>
              : 'Hiện không có tin nào cần xử lý.'}
          </p>
        </div>
        {actionableItems.length > 0 ? (
          <div className="ai-review-panel__batch-actions">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={batchBusy}
              onClick={() => void handleApproveAll()}
            >
              {batchBusy ? 'Đang duyệt…' : `Duyệt tất cả (${actionableItems.length})`}
            </button>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              disabled={batchBusy}
              onClick={() => {
                setRejectModalError('')
                setRejectAllReason('')
                setShowRejectAllModal(true)
              }}
            >
              Từ chối tất cả
            </button>
          </div>
        ) : null}
      </div>
      {data.items.length === 0 ? <p>Chưa có tin trong hàng đợi. Tin mới hoặc tin vừa sửa sẽ xuất hiện khi đến lượt kiểm tra.</p> : <div className="ai-review-panel__items">{data.items.map(item => <article key={item.id} className={`ai-review-panel__item ai-review-panel__item--${item.state}`}>
        <div className="ai-review-panel__item-heading"><span>{kindLabels[item.kind] || item.kind}</span><strong>{labels[item.state] || item.state}</strong></div>
        <h4>{item.title}</h4>{item.description ? <details><summary>Xem nội dung đã kiểm tra</summary><p style={{ whiteSpace: 'pre-wrap' }}>{item.description}</p></details> : null}<p>{item.reason || 'Hệ thống sẽ kiểm tra khi đến lượt.'}</p>
        {item.evidence ? <blockquote>{item.evidence}</blockquote> : null}
        <small>Đã thử {item.attempts} lần · {new Date(item.createdAt).toLocaleString('vi-VN')}</small>
        {!item.reviewedAt && (item.state === 'needs_review' || item.state === 'blocked') ? <div className="ai-review-panel__actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={pendingItemIds.has(item.id) || batchBusy}
            title={item.state === 'blocked' ? 'Khôi phục tin' : 'Duyệt và giữ tin'}
            onClick={() => void resolveItem(item, true)}
          >
            {item.state === 'blocked' ? 'Khôi phục tin' : 'Giữ tin'}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={pendingItemIds.has(item.id) || batchBusy}
            onClick={async () => {
              if (await confirmDialog({
                title: item.state === 'blocked' ? 'Giữ ẩn tin này?' : 'Ẩn tin này?',
                message: 'Hãy kiểm tra nội dung trước khi xác nhận.',
                confirmLabel: item.state === 'blocked' ? 'Giữ ẩn' : 'Ẩn tin',
                danger: true,
              })) {
                void resolveItem(item, false)
              }
            }}
          >
            {item.state === 'blocked' ? 'Xác nhận giữ ẩn' : 'Ẩn tin'}
          </button>
        </div> : null}
      </article>)}</div>}

      {showRejectAllModal && (
        <div className="ai-review-modal-backdrop" onClick={() => !batchBusy && setShowRejectAllModal(false)}>
          <div
            className="ai-review-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-all-title"
            onClick={e => e.stopPropagation()}
          >
            <h3 id="reject-all-title">Từ chối tất cả tin</h3>
            <p>
              Hệ thống sẽ từ chối và ẩn toàn bộ <strong>{actionableItems.length}</strong> tin đang chờ người duyệt.
            </p>
            <label className="form-label" htmlFor="reject-all-reason">
              Lý do từ chối (bắt buộc):
            </label>
            <textarea
              id="reject-all-reason"
              className="form-textarea"
              rows={3}
              maxLength={500}
              placeholder="Nhập lý do từ chối cho các tin (ví dụ: Vi phạm quy định đăng tin, hình ảnh không phù hợp...)"
              value={rejectAllReason}
              onChange={e => {
                setRejectAllReason(e.target.value)
                if (rejectModalError) setRejectModalError('')
              }}
              autoFocus
            />
            {rejectModalError ? <p className="ai-review-panel__error" role="alert">{rejectModalError}</p> : null}
            <div className="ai-review-modal__actions">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={batchBusy}
                onClick={() => setShowRejectAllModal(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                disabled={batchBusy || !rejectAllReason.trim()}
                onClick={() => void handleConfirmRejectAll()}
              >
                {batchBusy ? 'Đang từ chối…' : `Xác nhận từ chối (${actionableItems.length} tin)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </> : null}
  </section>
}
