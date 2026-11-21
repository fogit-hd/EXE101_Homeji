import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { apiRequest } from '../../api/client'
import { useAuth } from '../../contexts/AuthContext'
import { adminSectionPath, adminSections, waitingLabel, type AdminSection } from './adminSections'

type PlatformOverview = {
  status: string
  headline: string
  summary: string
  actionRequiredCount: number
  pendingQueueTotal: number
  onlineUsersCount: number
  operatingMode: string
  operatingModeLabel: string
}

type PlatformAction = {
  id: string
  severity: string
  title: string
  userImpact: string
  whatToDo: string
  targetSection?: string | null
  actionLabel?: string | null
  count?: number | null
  oldestAt?: string | null
}

type PlatformMetric = {
  label: string
  value: string
  hint?: string | null
}

type PlatformServiceStatus = {
  key: string
  title: string
  status: string
  statusLabel: string
  userImpact: string
  adminGuidance: string
  targetSection?: string | null
  actionLabel?: string | null
  metrics: PlatformMetric[]
}

type PlatformPulseDay = {
  date: string
  newUsers: number
  newListings: number
  publishedRentals: number
  paidTransactions: number
  marketplaceOrders: number
  newReports: number
}

type PlatformMaintenanceStatus = {
  isActive: boolean
  title?: string | null
  message?: string | null
  scheduledStartAt?: string | null
  scheduledEndAt?: string | null
  expiresAt?: string | null
}

type PlatformDiagnostics = {
  backgroundJobsEnabled: boolean
  kafkaBrokerConfigured: boolean
  outboxWorkerEnabled: boolean
  kafkaAnalyticsWorkerEnabled: boolean
  telemetryEnabled: boolean
  otlpExporterConfigured: boolean
  emailProvider: string
  emailDeliveryReady: boolean
  receiptEmailEnabled: boolean
  geminiConfigured: boolean
  momoConfigured: boolean
  payOsConfigured: boolean
  payPalConfigured: boolean
  payPalMode: string
  outboxPendingCount: number
  outboxRetryingCount: number
  outboxSampleLimited: boolean
  oldestPendingOutboxAt?: string | null
}

type PlatformSnapshot = {
  checkedAt: string
  publisherConfigured: boolean
  analyticsConfigured: boolean
  telemetryConfigured: boolean
  pendingSample: number
  retryingInSample: number
  sampleLimited: boolean
  publicationDays: { date: string; count: number }[]
  overview?: PlatformOverview | null
  actions?: PlatformAction[] | null
  services?: PlatformServiceStatus[] | null
  operationalPulse?: PlatformPulseDay[] | null
  maintenance?: PlatformMaintenanceStatus | null
  diagnostics?: PlatformDiagnostics | null
}

const count = new Intl.NumberFormat('vi-VN')
const day = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' })
const timestamp = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'Asia/Ho_Chi_Minh' })

const knownSections = new Set<string>(adminSections.map(section => section.id))

function resolveSectionPath(targetSection: string | null | undefined): string | null {
  if (!targetSection || !knownSections.has(targetSection)) return null
  return adminSectionPath(targetSection as AdminSection)
}

function formatPulseDate(value: string): string {
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00+07:00` : value
  const parsed = new Date(normalized)
  return Number.isFinite(parsed.getTime()) ? day.format(parsed) : value
}

function formatTimestamp(value: string | null | undefined): string | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isFinite(parsed.getTime()) ? timestamp.format(parsed) : null
}

function getDashboardUrl() {
  const value = import.meta.env.VITE_ADMIN_GRAFANA_URL
  if (!value) return null
  try {
    const url = new URL(value)
    const local = import.meta.env.DEV && url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    return !url.username && !url.password && (url.protocol === 'https:' || local) ? url.href : null
  } catch {
    return null
  }
}

function overviewStatusMeta(status: string): { tone: string; label: string } {
  switch (status) {
    case 'degraded':
      return { tone: 'degraded', label: 'Có sự cố cần xử lý' }
    case 'attention':
      return { tone: 'attention', label: 'Cần chú ý' }
    default:
      return { tone: 'healthy', label: 'Ổn định' }
  }
}

function severityMeta(severity: string): { tone: string; label: string } {
  switch (severity) {
    case 'critical':
      return { tone: 'critical', label: 'Khẩn cấp' }
    case 'high':
      return { tone: 'high', label: 'Ưu tiên cao' }
    case 'medium':
      return { tone: 'medium', label: 'Cần xử lý' }
    default:
      return { tone: 'info', label: 'Thông tin' }
  }
}

function serviceTone(status: string): string {
  switch (status) {
    case 'degraded':
      return 'degraded'
    case 'attention':
      return 'attention'
    case 'off':
      return 'off'
    default:
      return 'ok'
  }
}

function buildFallbackActions(data: PlatformSnapshot): PlatformAction[] {
  const list: PlatformAction[] = []
  if (data.retryingInSample > 0) {
    list.push({
      id: 'fallback-outbox-retrying',
      severity: 'high',
      title: `${count.format(data.retryingInSample)} sự kiện duyệt tin đang thử đồng bộ lại`,
      userImpact: 'Tin phòng đã duyệt vẫn hoạt động, nhưng số liệu đồng bộ sau xuất bản đang bị chậm.',
      whatToDo: 'Kiểm tra tiến trình nền trên máy chủ nếu số thử lại tiếp tục tăng trong nhiều lần làm mới.',
      targetSection: null,
      actionLabel: null,
      count: data.retryingInSample,
      oldestAt: null,
    })
  } else if (!data.publisherConfigured) {
    list.push({
      id: 'fallback-publisher-off',
      severity: 'medium',
      title: 'Tiến trình đồng bộ sau duyệt tin chưa bật',
      userImpact: 'Các lượt duyệt tin mới chưa được ghi nhận qua hàng đợi đồng bộ tự động.',
      whatToDo: 'Kiểm tra cấu hình tác vụ nền trên máy chủ hoặc vào Tin chờ duyệt để theo dõi thủ công.',
      targetSection: 'posts',
      actionLabel: 'Xem Tin chờ duyệt',
      count: data.pendingSample > 0 ? data.pendingSample : null,
      oldestAt: null,
    })
  }
  return list
}

function buildFallbackOverview(data: PlatformSnapshot, fallbackActions: PlatformAction[]): PlatformOverview {
  const needsAttention = fallbackActions.length > 0
  return {
    status: needsAttention ? 'attention' : 'healthy',
    headline: needsAttention ? 'Có trạng thái đồng bộ cần lưu ý' : 'Hệ thống đang phục vụ người dùng ổn định',
    summary: needsAttention
      ? fallbackActions[0].userImpact
      : 'API, cơ sở dữ liệu và luồng xử lý tin phòng đang hoạt động bình thường.',
    actionRequiredCount: fallbackActions.length,
    pendingQueueTotal: data.pendingSample,
    onlineUsersCount: 0,
    operatingMode: data.publisherConfigured ? 'postgresql_native' : 'jobs_paused',
    operatingModeLabel: data.publisherConfigured ? 'Đồng bộ nội bộ' : 'Tác vụ nền chưa bật',
  }
}

function buildFallbackServices(data: PlatformSnapshot): PlatformServiceStatus[] {
  const totalPublications = data.publicationDays.reduce((sum, item) => sum + item.count, 0)
  return [
    {
      key: 'listing_publishing',
      title: 'Đồng bộ duyệt tin phòng',
      status: data.retryingInSample > 0 ? 'attention' : data.publisherConfigured ? 'ok' : 'off',
      statusLabel: data.retryingInSample > 0 ? 'Cần chú ý' : data.publisherConfigured ? 'Hoạt động tốt' : 'Chưa bật',
      userImpact: data.publisherConfigured
        ? 'Tin phòng được duyệt và ghi nhận thống kê bình thường.'
        : 'Tiến trình đồng bộ sau duyệt tin chưa bật trong cấu hình hiện tại.',
      adminGuidance: 'Theo dõi các tin mới tại mục Tin chờ duyệt.',
      targetSection: 'posts',
      actionLabel: 'Xem Tin chờ duyệt',
      metrics: [
        { label: 'Lượt duyệt 7 ngày', value: count.format(totalPublications) },
        { label: 'Chờ đồng bộ', value: `${count.format(data.pendingSample)}${data.sampleLimited ? '+' : ''}` },
      ],
    },
  ]
}

function formatGatewaySummary(diagnostics: PlatformDiagnostics): string {
  const gateways: string[] = []
  if (diagnostics.momoConfigured) gateways.push('MoMo')
  if (diagnostics.payOsConfigured) gateways.push('PayOS')
  if (diagnostics.payPalConfigured) {
    gateways.push(diagnostics.payPalMode ? `PayPal (${diagnostics.payPalMode})` : 'PayPal')
  }
  return gateways.length > 0 ? gateways.join(', ') : 'Chưa có cổng sẵn sàng'
}

function formatActionTimeBadge(action: PlatformAction): string | null {
  if (!action.oldestAt) return null
  const parsed = new Date(action.oldestAt).getTime()
  if (!Number.isFinite(parsed)) return null
  const now = Date.now()
  if (parsed > now) {
    const formatted = formatTimestamp(action.oldestAt)
    return formatted ? `Hiệu lực đến ${formatted}` : null
  }
  const waited = waitingLabel(action.oldestAt, now)
  return waited ? `Chờ ${waited}` : null
}

export function AdminPlatformPanel() {
  const { profile } = useAuth()
  const snapshot = useQuery({
    queryKey: ['admin', 'platform', profile?.id],
    queryFn: ({ signal }) => apiRequest<PlatformSnapshot>('/api/admin/platform', { signal }),
    staleTime: 15_000,
    retry: false,
  })
  const data = snapshot.data
  const dashboardUrl = getDashboardUrl()

  const fallbackActions = data && !data.actions ? buildFallbackActions(data) : []
  const overview = data ? (data.overview ?? buildFallbackOverview(data, fallbackActions)) : null
  const actions = data ? (data.actions ?? fallbackActions) : []
  const services = data ? (data.services ?? buildFallbackServices(data)) : []
  const maintenance = data?.maintenance
  const pulse = data?.operationalPulse ?? []
  const diagnostics = data?.diagnostics
  const verdictMeta = overview ? overviewStatusMeta(overview.status) : null
  const checkedAtLabel = formatTimestamp(data?.checkedAt)
  const maintenanceExpiresLabel = formatTimestamp(maintenance?.expiresAt)

  const pulseTotals = pulse.reduce(
    (acc, item) => ({
      newUsers: acc.newUsers + item.newUsers,
      newListings: acc.newListings + item.newListings,
      publishedRentals: acc.publishedRentals + item.publishedRentals,
      paidTransactions: acc.paidTransactions + item.paidTransactions,
      marketplaceOrders: acc.marketplaceOrders + item.marketplaceOrders,
      newReports: acc.newReports + item.newReports,
    }),
    { newUsers: 0, newListings: 0, publishedRentals: 0, paidTransactions: 0, marketplaceOrders: 0, newReports: 0 },
  )

  return <div className="admin-home">
    <section className="card admin-platform-card admin-platform-verdict" aria-labelledby="platform-status-title">
      <div className="admin-platform-verdict__top">
        <div className="admin-platform-verdict__intro">
          {verdictMeta ? (
            <span className={`admin-platform-badge is-${verdictMeta.tone}`}>{verdictMeta.label}</span>
          ) : null}
          <h2 id="platform-status-title">{overview ? overview.headline : 'Tình trạng vận hành hệ thống'}</h2>
          {overview ? <p className="admin-platform-verdict__summary">{overview.summary}</p> : null}
        </div>
        <div className="admin-platform-verdict__controls">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={snapshot.isFetching}
            onClick={() => void snapshot.refetch()}
          >
            {snapshot.isFetching ? 'Đang tải…' : 'Làm mới'}
          </button>
          {checkedAtLabel ? (
            <p className="admin-queues__note">
              Kiểm tra lúc <time dateTime={data?.checkedAt}>{checkedAtLabel}</time> (giờ Việt Nam).
            </p>
          ) : null}
        </div>
      </div>

      {snapshot.isPending ? <p role="status">Đang kiểm tra hệ thống…</p> : null}
      {snapshot.isError ? (
        <p className="admin-platform-error" role="alert">
          {data
            ? 'Không làm mới được. Đang hiển thị số liệu lần kiểm tra gần nhất.'
            : 'Không tải được trạng thái hệ thống. Hãy thử làm mới.'}
        </p>
      ) : null}

      {overview ? (
        <div className="admin-pulse admin-platform-kpis">
          <div className="admin-pulse__tile">
            <span>Việc cần quyết định</span>
            <strong>{count.format(overview.actionRequiredCount)}</strong>
            <small>Ưu tiên theo mức ảnh hưởng người dùng</small>
          </div>
          <div className="admin-pulse__tile">
            <span>Tổng mục chờ duyệt</span>
            <strong>{count.format(overview.pendingQueueTotal)}</strong>
            <small>Tin phòng, báo cáo, xác minh, rút tiền, AI</small>
          </div>
          <div className="admin-pulse__tile">
            <span>Người đang trực tuyến</span>
            <strong>{count.format(overview.onlineUsersCount)}</strong>
            <small>Kết nối trực tiếp đang mở</small>
          </div>
          <div className="admin-pulse__tile">
            <span>Chế độ đồng bộ</span>
            <strong className="admin-platform-kpis__mode">{overview.operatingModeLabel}</strong>
            <small>Cơ chế xử lý dữ liệu nền</small>
          </div>
        </div>
      ) : null}

      {maintenance?.isActive ? (
        <div className="admin-platform-maintenance" role="region" aria-label="Banner bảo trì đang hiển thị">
          <div>
            <strong>Banner bảo trì đang hiển thị: {maintenance.title || 'Thông báo bảo trì'}</strong>
            {maintenance.message ? <p>{maintenance.message}</p> : null}
            {maintenanceExpiresLabel ? (
              <small>Hiển thị tới {maintenanceExpiresLabel} (giờ Việt Nam).</small>
            ) : null}
          </div>
          <Link className="btn btn-secondary btn-sm" to={adminSectionPath('maintenance')}>
            Quản lý Bảo trì
          </Link>
        </div>
      ) : null}
    </section>

    {data ? (
      <section className="card admin-platform-card" aria-labelledby="platform-actions-title">
        <div className="admin-section-heading">
          <div>
            <h2 id="platform-actions-title">Việc cần làm ngay</h2>
            <p>Sắp xếp theo mức độ ảnh hưởng đến người dùng và thời gian chờ lâu nhất.</p>
          </div>
        </div>

        {actions.length > 0 ? (
          <ol className="admin-platform-actions">
            {actions.map(action => {
              const severity = severityMeta(action.severity)
              const sectionPath = resolveSectionPath(action.targetSection)
              const timeBadge = formatActionTimeBadge(action)
              return (
                <li key={action.id} className={`admin-platform-action-card is-${severity.tone}`}>
                  <div className="admin-platform-action__header">
                    <span className={`admin-platform-badge is-${severity.tone}`}>{severity.label}</span>
                    {action.count != null && action.count > 0 ? (
                      <span className="admin-platform-pill">{count.format(action.count)} mục</span>
                    ) : null}
                    {timeBadge ? <span className="admin-wait">{timeBadge}</span> : null}
                  </div>
                  <h3>{action.title}</h3>
                  <dl className="admin-platform-action__details">
                    <div>
                      <dt>Ảnh hưởng người dùng</dt>
                      <dd>{action.userImpact}</dd>
                    </div>
                    <div>
                      <dt>Việc bạn nên làm</dt>
                      <dd>{action.whatToDo}</dd>
                    </div>
                  </dl>
                  <div className="admin-platform-action__footer">
                    {sectionPath ? (
                      <Link className="btn btn-primary btn-sm" to={sectionPath}>
                        {action.actionLabel || 'Mở mục xử lý'} →
                      </Link>
                    ) : (
                      <span className="admin-platform-action__server-tag">Thao tác cấu hình trên máy chủ</span>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        ) : (
          <div className="admin-platform-empty">
            <p>
              Không có sự cố hay tồn đọng khẩn cấp nào. Tất cả luồng chính cho người thuê, chủ trọ và chợ sinh viên
              đang vận hành bình thường.
            </p>
            <div className="admin-platform-empty__links">
              <Link className="btn btn-secondary btn-sm" to={adminSectionPath('home')}>Trang chủ điều hành</Link>
              <Link className="btn btn-secondary btn-sm" to={adminSectionPath('analytics')}>Phân tích sản phẩm</Link>
              <Link className="btn btn-secondary btn-sm" to={adminSectionPath('exports')}>Báo cáo Excel</Link>
            </div>
          </div>
        )}
      </section>
    ) : null}

    {data && services.length > 0 ? (
      <section className="card admin-platform-card" aria-labelledby="platform-services-title">
        <div className="admin-section-heading">
          <div>
            <h2 id="platform-services-title">Sức khỏe dịch vụ theo hành trình người dùng</h2>
            <p>Hiển thị trạng thái thực tế của từng mảng tính năng phục vụ người thuê, chủ trọ và chợ sinh viên.</p>
          </div>
        </div>
        <div className="admin-platform-services">
          {services.map(service => {
            const tone = serviceTone(service.status)
            const sectionPath = resolveSectionPath(service.targetSection)
            return (
              <article key={service.key} className="admin-platform-service-card">
                <div className="admin-platform-service__header">
                  <h3>{service.title}</h3>
                  <span className={`admin-platform-badge is-${tone}`}>{service.statusLabel}</span>
                </div>
                <dl className="admin-platform-service__copy">
                  <div>
                    <dt>Trải nghiệm người dùng</dt>
                    <dd>{service.userImpact}</dd>
                  </div>
                  <div>
                    <dt>Hướng dẫn quản trị</dt>
                    <dd>{service.adminGuidance}</dd>
                  </div>
                </dl>
                {service.metrics.length > 0 ? (
                  <dl className="admin-platform-metrics">
                    {service.metrics.map(metric => (
                      <div key={metric.label}>
                        <dt>{metric.label}</dt>
                        <dd>
                          <strong>{metric.value}</strong>
                          {metric.hint ? <small>{metric.hint}</small> : null}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
                {sectionPath ? (
                  <Link className="admin-platform-service__link" to={sectionPath}>
                    {service.actionLabel || 'Mở mục quản trị'} →
                  </Link>
                ) : null}
              </article>
            )
          })}
        </div>
      </section>
    ) : null}

    {data ? (
      <section className="card admin-platform-card" aria-labelledby="platform-publications-title">
        <div className="admin-section-heading">
          <div>
            <h2 id="platform-publications-title">Nhịp vận hành 7 ngày gần nhất</h2>
            <p>Số liệu thực tế theo múi giờ Việt Nam (GMT+7) giúp bạn theo dõi tăng trưởng và khối lượng công việc trong tuần.</p>
          </div>
        </div>

        {pulse.length > 0 ? (
          <>
            <div className="admin-platform-pulse-totals">
              <div className="admin-pulse__tile">
                <span>Người dùng mới</span>
                <strong>{count.format(pulseTotals.newUsers)}</strong>
              </div>
              <div className="admin-pulse__tile">
                <span>Tin phòng mới</span>
                <strong>{count.format(pulseTotals.newListings)}</strong>
              </div>
              <div className="admin-pulse__tile">
                <span>Tin duyệt hiển thị</span>
                <strong>{count.format(pulseTotals.publishedRentals)}</strong>
              </div>
              <div className="admin-pulse__tile">
                <span>Thanh toán thành công</span>
                <strong>{count.format(pulseTotals.paidTransactions)}</strong>
              </div>
              <div className="admin-pulse__tile">
                <span>Đơn chợ sinh viên</span>
                <strong>{count.format(pulseTotals.marketplaceOrders)}</strong>
              </div>
              <div className="admin-pulse__tile">
                <span>Báo cáo vi phạm</span>
                <strong>{count.format(pulseTotals.newReports)}</strong>
              </div>
            </div>

            <div className="admin-platform-table-wrap">
              <table className="admin-platform-days" aria-labelledby="platform-publications-title">
                <thead>
                  <tr>
                    <th scope="col">Ngày (giờ Việt Nam)</th>
                    <th scope="col">Người mới</th>
                    <th scope="col">Tin phòng mới</th>
                    <th scope="col">Tin duyệt hiển thị</th>
                    <th scope="col">Thanh toán</th>
                    <th scope="col">Đơn chợ</th>
                    <th scope="col">Báo cáo mới</th>
                  </tr>
                </thead>
                <tbody>
                  {pulse.map(item => (
                    <tr key={item.date}>
                      <th scope="row">
                        <time dateTime={item.date}>{formatPulseDate(item.date)}</time>
                      </th>
                      <td>{count.format(item.newUsers)}</td>
                      <td>{count.format(item.newListings)}</td>
                      <td>{count.format(item.publishedRentals)}</td>
                      <td>{count.format(item.paidTransactions)}</td>
                      <td>{count.format(item.marketplaceOrders)}</td>
                      <td>{count.format(item.newReports)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : data.publicationDays.some(item => item.count > 0) ? (
          <div className="admin-platform-table-wrap">
            <table className="admin-platform-days" aria-labelledby="platform-publications-title">
              <thead>
                <tr>
                  <th scope="col">Ngày (giờ Việt Nam)</th>
                  <th scope="col">Lượt duyệt</th>
                </tr>
              </thead>
              <tbody>
                {data.publicationDays.map(item => (
                  <tr key={item.date}>
                    <th scope="row">
                      <time dateTime={item.date}>{formatPulseDate(item.date)}</time>
                    </th>
                    <td>{count.format(item.count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="admin-queues__note">Chưa có tin phòng mới nào được duyệt trong 7 ngày qua.</p>
        )}
      </section>
    ) : null}

    {data ? (
      <section className="card admin-platform-card">
        <details className="admin-platform-diagnostics">
          <summary>Chi tiết kỹ thuật &amp; cấu hình máy chủ (dành cho kỹ thuật viên)</summary>
          <div className="admin-platform-diagnostics__body">
            <div className="admin-platform-diag-grid">
              <div className="admin-pulse__tile">
                <span>Tiến trình nền tự động</span>
                <strong>
                  {diagnostics
                    ? diagnostics.backgroundJobsEnabled ? 'Đang chạy' : 'Đang tắt'
                    : data.publisherConfigured ? 'Đang bật' : 'Chưa bật'}
                </strong>
              </div>
              <div className="admin-pulse__tile">
                <span>Gửi sự kiện Kafka</span>
                <strong>
                  {diagnostics
                    ? diagnostics.kafkaBrokerConfigured ? 'Đã kết nối Kafka broker' : 'Đồng bộ PostgreSQL nội bộ'
                    : data.publisherConfigured ? 'Đã bật cấu hình' : 'Chưa bật'}
                </strong>
              </div>
              <div className="admin-pulse__tile">
                <span>Consumer thống kê</span>
                <strong>
                  {diagnostics
                    ? diagnostics.kafkaAnalyticsWorkerEnabled ? 'Đang chạy qua Kafka' : 'Thống kê trực tiếp từ DB'
                    : data.analyticsConfigured ? 'Đã bật cấu hình' : 'Chưa bật'}
                </strong>
              </div>
              <div className="admin-pulse__tile">
                <span>Xuất số liệu qua OTLP</span>
                <strong>
                  {diagnostics
                    ? diagnostics.otlpExporterConfigured
                      ? 'Đã gắn OTLP endpoint'
                      : data.telemetryConfigured ? 'Chỉ ghi số liệu nội bộ' : 'Chưa bật'
                    : data.telemetryConfigured ? 'Đã bật cấu hình' : 'Chưa bật'}
                </strong>
              </div>
              {diagnostics ? (
                <>
                  <div className="admin-pulse__tile">
                    <span>Kênh gửi Email</span>
                    <strong>{`${diagnostics.emailProvider} (${diagnostics.emailDeliveryReady ? 'Sẵn sàng' : 'Thiếu cấu hình'})`}</strong>
                  </div>
                  <div className="admin-pulse__tile">
                    <span>Biên nhận Email tự động</span>
                    <strong>{diagnostics.receiptEmailEnabled ? 'Đã bật' : 'Đang tắt'}</strong>
                  </div>
                  <div className="admin-pulse__tile">
                    <span>Kết nối AI Gemini</span>
                    <strong>{diagnostics.geminiConfigured ? 'Đã cấu hình khóa' : 'Chưa cấu hình'}</strong>
                  </div>
                  <div className="admin-pulse__tile">
                    <span>Cổng thanh toán</span>
                    <strong>{formatGatewaySummary(diagnostics)}</strong>
                  </div>
                </>
              ) : null}
            </div>

            <div className="admin-platform-queue">
              <div className="admin-pulse__tile">
                <span>Sự kiện đang chờ gửi</span>
                <strong>
                  {count.format(data.pendingSample)}
                  {data.sampleLimited ? '+' : ''}
                </strong>
              </div>
              <div className="admin-pulse__tile">
                <span>Đã thử gửi, đang chờ xác nhận</span>
                <strong>{count.format(data.retryingInSample)}</strong>
              </div>
            </div>

            {data.sampleLimited ? (
              <p className="admin-queues__note">Số đã thử gửi được tính trong 1.000 sự kiện chờ đầu tiên.</p>
            ) : null}
            {diagnostics?.oldestPendingOutboxAt ? (
              <p className="admin-queues__note">
                Sự kiện chờ lâu nhất tạo lúc {formatTimestamp(diagnostics.oldestPendingOutboxAt)} (giờ Việt Nam).
              </p>
            ) : null}
            {dashboardUrl ? (
              <a className="btn btn-secondary btn-sm" href={dashboardUrl} target="_blank" rel="noopener noreferrer">
                Mở Grafana (tab mới)
              </a>
            ) : null}
          </div>
        </details>
      </section>
    ) : null}
  </div>
}
