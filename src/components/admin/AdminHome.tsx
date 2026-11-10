import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { AdminAnalyticsTrendPoint } from '../../api'
import { getAdminExports, type AdminReportExport } from '../../api/adminReporting'
import { getAiReviews, type AiReviewDashboard } from '../../api/aiReviews'
import { ReportStatus } from '../../api/types'
import { useAuth } from '../../contexts/AuthContext'
import { aiFeatureFlags } from '../../lib/aiFeatureFlags'
import { formatPrice, reportStatusLabel } from '../../lib/labels'
import { AdminAssistant } from '../ai/AdminAssistant'
import { AdminOperationsSummary, type AdminQueueSummary } from './AdminOperationsSummary'
import { adminQueueLabels, adminSectionPath, waitingLabel, type AdminQueue } from './adminSections'
import type { AdminWorkspace } from './useAdminWorkspace'

type Task = { kind: AdminQueue; id: string; title: string; detail: string; since: string | null }
type Health = { tone: 'ok' | 'warn' | 'idle'; text: string }
type Probe<T> = { data?: T; failed?: boolean; observedAt: number }

const HEARTBEAT_STALE_MS = 5 * 60_000
const NEXT_UP_LIMIT = 6

const oldest = (dates: (string | null | undefined)[]) =>
  dates.filter((date): date is string => !!date).sort()[0] ?? null

const byWaiting = (a: Task, b: Task) => (a.since ?? '9999').localeCompare(b.since ?? '9999')

function aiHealth(probe: Probe<AiReviewDashboard> | null): Health {
  if (!probe) return { tone: 'idle', text: 'Đang kiểm tra…' }
  if (!probe.data?.settings) return { tone: 'warn', text: 'Chưa đọc được trạng thái.' }
  const { settings, lastHeartbeatAt, needsReview, blocked } = probe.data
  if (!settings.enabled) return { tone: 'idle', text: 'Đang tạm dừng kiểm tra tự động.' }
  if (!lastHeartbeatAt) return { tone: 'warn', text: 'Chưa nhận được phản hồi từ tiến trình.' }
  if (probe.observedAt - new Date(lastHeartbeatAt).getTime() > HEARTBEAT_STALE_MS) return { tone: 'warn', text: 'Tiến trình không phản hồi quá 5 phút.' }
  const waiting = needsReview + blocked
  return waiting ? { tone: 'warn', text: `${waiting.toLocaleString('vi-VN')} tin cần người xem lại.` } : { tone: 'ok', text: 'Đang chạy, không có tin cần xem lại.' }
}

function exportHealth(probe: Probe<AdminReportExport[]> | null): Health {
  if (!probe) return { tone: 'idle', text: 'Đang kiểm tra…' }
  if (!Array.isArray(probe.data)) return { tone: 'warn', text: 'Chưa đọc được lịch sử báo cáo.' }
  if (!probe.data.length) return { tone: 'idle', text: 'Chưa tạo báo cáo nào.' }
  const troubled = probe.data.filter(report => report.emailStatus === 'failed' || report.emailStatus === 'uncertain').length
  return troubled ? { tone: 'warn', text: `${troubled.toLocaleString('vi-VN')} báo cáo chưa gửi được email.` } : { tone: 'ok', text: 'Không có lỗi gửi email gần đây.' }
}

function useProbe<T>(load: () => Promise<T>) {
  const [probe, setProbe] = useState<Probe<T> | null>(null)
  useEffect(() => {
    let active = true
    void load()
      .then(data => { if (active) setProbe({ data, observedAt: Date.now() }) })
      .catch(() => { if (active) setProbe({ failed: true, observedAt: Date.now() }) })
    return () => { active = false }
  }, [load])
  return probe
}

export function AdminHome({ ws }: { ws: AdminWorkspace }) {
  const { profile } = useAuth()
  const [now] = useState(() => Date.now())
  const aiProbe = useProbe(getAiReviews)
  const exportProbe = useProbe(getAdminExports)

  const pendingReports = ws.reports.filter(report => report.status === ReportStatus.Pending)
  const queues: AdminQueueSummary[] = [
    { id: 'posts', count: ws.counts.posts, oldestAt: oldest(ws.pendingPosts.map(post => post.updatedAt)), status: 'Chờ xử lý' },
    { id: 'reports', count: ws.counts.reports, oldestAt: oldest(pendingReports.map(report => report.createdAt)), status: ws.reportStatus === undefined ? 'Tất cả trạng thái' : reportStatusLabel[ws.reportStatus] },
    { id: 'verifications', count: ws.counts.verifications, oldestAt: oldest(ws.verifications.map(item => item.createdAt)), status: 'Chờ xử lý' },
    { id: 'withdrawals', count: ws.counts.withdrawals, oldestAt: oldest(ws.withdrawals.map(item => item.createdAt)), status: 'Chờ xử lý' },
  ]
  const tasks: Task[] = [
    ...ws.pendingPosts.map(post => ({ kind: 'posts' as const, id: post.id, title: post.title || 'Tin nháp', detail: post.address, since: post.updatedAt ?? null })),
    ...pendingReports.map(report => ({ kind: 'reports' as const, id: report.id, title: report.targetDisplayName || 'Nội dung bị báo cáo', detail: report.reason, since: report.createdAt })),
    ...ws.verifications.map(item => ({ kind: 'verifications' as const, id: item.id, title: item.applicantDisplayName, detail: item.applicantNote || 'Hồ sơ xác minh chủ nhà', since: item.createdAt })),
    ...ws.withdrawals.map(item => ({ kind: 'withdrawals' as const, id: item.id, title: formatPrice(item.amount), detail: `${item.accountHolder} · ${item.bankName}`, since: item.createdAt })),
  ].sort(byWaiting)
  const waitingTotal = tasks.length
  const queuesReady = !ws.showLoader && !ws.loadError
  const health: { label: string; to: string; state: Health }[] = [
    { label: 'Người đang hoạt động', to: adminSectionPath('active'), state: queuesReady ? { tone: 'ok', text: `${ws.onlineCount.toLocaleString('vi-VN')} kết nối realtime đang mở.` } : { tone: 'idle', text: 'Đang kiểm tra…' } },
    { label: 'AI kiểm tra tin', to: adminSectionPath('aiReviews'), state: aiHealth(aiProbe) },
    { label: 'Email báo cáo Excel', to: adminSectionPath('exports'), state: exportHealth(exportProbe) },
  ]

  return <div className="admin-home">
    <header className="admin-home__hero">
      <div>
        <span className="admin-section-kicker">{new Date(now).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
        <h2>Chào {profile?.displayName || 'bạn'}</h2>
        <p role="status">{!queuesReady ? 'Đang tổng hợp việc cần xử lý…' : waitingTotal ? `Có ${waitingTotal.toLocaleString('vi-VN')} việc đang chờ bạn quyết định.` : 'Không còn việc nào đang chờ. Hàng chờ đã được xử lý hết.'}</p>
      </div>
      <button type="button" className="btn btn-secondary btn-sm" disabled={ws.showLoader} onClick={() => void ws.reload()}>Làm mới</button>
    </header>

    <AdminOperationsSummary queues={queues} now={now} loading={ws.showLoader} error={ws.loadError || ''} />
    {ws.loadError && !ws.showLoader ? <button type="button" className="btn btn-secondary" onClick={() => void ws.reload()}>Tải lại hàng chờ</button> : null}

    <div className="admin-home__grid">
      <section className="admin-panel" aria-labelledby="admin-next-title">
        <div className="admin-panel__heading"><h3 id="admin-next-title">Nên xử lý trước</h3><span>Chờ lâu nhất ở trên</span></div>
        {!queuesReady ? <p role="status">Đang tải…</p> : !tasks.length ? <p className="admin-panel__empty">Không có mục nào đang chờ.</p> : <ol className="admin-next">{tasks.slice(0, NEXT_UP_LIMIT).map(task => {
          const waited = waitingLabel(task.since, now)
          return <li key={`${task.kind}:${task.id}`}>
            <button type="button" onClick={() => ws.openTask(task.kind, task.id)}>
              <span className={`admin-next__kind is-${task.kind}`}>{adminQueueLabels[task.kind]}</span>
              <span className="admin-next__text"><strong>{task.title}</strong><small>{task.detail}</small></span>
              <span className="admin-next__wait">{waited ? `Chờ ${waited}` : 'Mở'}<span aria-hidden="true"> →</span></span>
            </button>
          </li>
        })}</ol>}
        {queuesReady && tasks.length > NEXT_UP_LIMIT ? <p className="admin-panel__note">Còn {(tasks.length - NEXT_UP_LIMIT).toLocaleString('vi-VN')} mục khác trong các hàng chờ.</p> : null}
      </section>

      <div className="admin-home__side">
        <section className="admin-panel" aria-labelledby="admin-health-title">
          <div className="admin-panel__heading"><h3 id="admin-health-title">Tình trạng hệ thống</h3></div>
          <ul className="admin-health">{health.map(row => <li key={row.label}>
            <Link to={row.to}>
              <span className={`admin-health__dot is-${row.state.tone}`} aria-hidden />
              <span><strong>{row.label}</strong><small>{row.state.text}</small></span>
            </Link>
          </li>)}</ul>
        </section>
        <section className="admin-panel" aria-labelledby="admin-quick-title">
          <div className="admin-panel__heading"><h3 id="admin-quick-title">Thao tác nhanh</h3></div>
          <div className="admin-quick">
            <Link className="btn btn-secondary btn-sm" to={adminSectionPath('exports')}>Tạo báo cáo Excel</Link>
            <Link className="btn btn-secondary btn-sm" to={adminSectionPath('maintenance')}>Gửi thông báo bảo trì</Link>
            <Link className="btn btn-secondary btn-sm" to={adminSectionPath('pricing')}>Sửa giá Premium</Link>
          </div>
        </section>
      </div>
    </div>

    {aiFeatureFlags.adminSummary ? <AdminAssistant onOpen={ws.openTask} onRefreshQueues={ws.reload} /> : null}

    <section className="admin-panel" aria-labelledby="admin-pulse-title">
      <div className="admin-panel__heading">
        <h3 id="admin-pulse-title">Nhịp sản phẩm{ws.analytics ? ` · ${ws.analytics.periodDays} ngày qua` : ''}</h3>
        <Link to={adminSectionPath('analytics')}>Xem phân tích đầy đủ →</Link>
      </div>
      {ws.analyticsError ? <div className="admin-load-error" role="alert"><strong>Chưa cập nhật được báo cáo sản phẩm</strong><p>{ws.analyticsError}</p>
        <button type="button" className="btn btn-secondary" disabled={ws.analyticsLoading} onClick={ws.retryAnalytics}>{ws.analyticsLoading ? 'Đang tải lại…' : 'Thử lại'}</button>
      </div> : !ws.analytics ? <p role="status">Đang tải chỉ số…</p> : <>
        <div className="admin-pulse">
          <Pulse label="Người dùng mới" value={ws.analytics.kpis.newUsers} trend={ws.analytics.trend} metric="newUsers" />
          <Pulse label="Lượt tìm phòng" value={ws.analytics.kpis.searches} trend={ws.analytics.trend} metric="searches" />
          <Pulse label="Lượt xem tin" value={ws.analytics.kpis.listingViews} trend={ws.analytics.trend} metric="listingViews" />
          <Pulse label="Yêu cầu xem phòng" value={ws.analytics.kpis.viewingRequests} trend={ws.analytics.trend} metric="viewingRequests" />
        </div>
        <p className="admin-panel__note">Số liệu từ hệ thống Homeji, có thể gồm tin mẫu và hoạt động kiểm thử. Ngày hôm nay vẫn đang tích lũy.</p>
      </>}
    </section>
  </div>
}

type PulseMetric = 'newUsers' | 'searches' | 'listingViews' | 'viewingRequests'

function Pulse({ label, value, trend, metric }: { label: string; value: number; trend: AdminAnalyticsTrendPoint[]; metric: PulseMetric }) {
  const values = trend.map(point => point[metric])
  const max = Math.max(1, ...values)
  const points = values.map((point, index) => `${values.length <= 1 ? 60 : (index / (values.length - 1)) * 120},${34 - (point / max) * 30}`).join(' ')
  return <article className="admin-pulse__tile">
    <span>{label}</span>
    <strong>{value.toLocaleString('vi-VN')}</strong>
    {values.length > 1 ? <svg viewBox="0 0 120 36" preserveAspectRatio="none" aria-hidden="true"><polyline points={points} /></svg> : null}
  </article>
}
