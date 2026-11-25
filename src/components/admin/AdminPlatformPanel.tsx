import { useQuery } from '@tanstack/react-query'
import { Activity, ArrowDown, ExternalLink, Layers3, ListTodo, Radio, RefreshCw, Users } from 'lucide-react'
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
}

type PlatformAction = {
  id: string
  severity: string
  title: string
  userImpact: string
  whatToDo: string
  targetSection?: string | null
  actionLabel?: string | null
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
  kafkaAnalyticsWorkerEnabled: boolean
  otlpExporterConfigured: boolean
  emailProvider: string
  emailDeliveryReady: boolean
  receiptEmailEnabled: boolean
  geminiConfigured: boolean
  momoConfigured: boolean
  payOsConfigured: boolean
  payPalConfigured: boolean
  payPalMode: string
  oldestPendingOutboxAt?: string | null
}

type PlatformSnapshot = {
  checkedAt: string
  publisherConfigured: boolean
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

function getDashboardUrl(value: string | undefined) {
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
    case 'healthy':
      return { tone: 'healthy', label: 'Ổn định' }
    default:
      return { tone: 'off', label: 'Dữ liệu giới hạn' }
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
    case 'ok':
      return 'ok'
    default:
      return 'off'
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
      oldestAt: null,
    })
  }
  return list
}

function buildFallbackOverview(fallbackActions: PlatformAction[]): Pick<PlatformOverview, 'status' | 'headline' | 'summary'> {
  const needsAttention = fallbackActions.length > 0
  return {
    status: needsAttention ? 'attention' : 'unknown',
    headline: needsAttention ? 'Cần xem lại thống kê duyệt tin' : 'Đã tải dữ liệu duyệt tin',
    summary: needsAttention
      ? fallbackActions[0].userImpact
      : 'Lần kiểm tra này chỉ có dữ liệu duyệt tin.',
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
        ? 'Hệ thống đã bật ghi nhận thống kê sau khi duyệt tin phòng.'
        : 'Tiến trình đồng bộ sau duyệt tin chưa bật trong cấu hình hiện tại.',
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

function formatActionTimeBadge(action: PlatformAction, checkedAt: string): string | null {
  if (!action.oldestAt) return null
  const parsed = new Date(action.oldestAt).getTime()
  const now = new Date(checkedAt).getTime()
  if (!Number.isFinite(parsed) || !Number.isFinite(now)) return null
  if (parsed > now) {
    const formatted = formatTimestamp(action.oldestAt)
    return formatted ? `Hiệu lực đến ${formatted}` : null
  }
  const waited = waitingLabel(action.oldestAt, now)
  return waited ? `Chờ ${waited}` : null
}

function PlatformToolLink({ href, label }: { href: string; label: string }) {
  return (
    <a className="btn btn-secondary btn-sm" href={href} target="_blank" rel="noopener noreferrer">
      {label} <ExternalLink size={15} aria-hidden="true" />
      <span className="sr-only"> (mở tab mới)</span>
    </a>
  )
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
  const grafanaUrl = getDashboardUrl(import.meta.env.VITE_ADMIN_GRAFANA_URL)
  const kubernetesUrl = getDashboardUrl(import.meta.env.VITE_ADMIN_KUBERNETES_URL)

  const fallbackActions = data && !data.actions ? buildFallbackActions(data) : []
  const overview = data ? (data.overview ?? buildFallbackOverview(data.actions ?? fallbackActions)) : null
  const maintenance = data?.maintenance
  const actions = (data?.actions ?? fallbackActions).filter(action => !maintenance?.isActive || action.id !== 'active-maintenance-banner')
  const services = data ? (data.services ?? buildFallbackServices(data)).filter(service => service.key !== 'core_api') : []
  const pulse = data?.operationalPulse ?? []
  const diagnostics = data?.diagnostics
  const telemetryStatus = !data ? 'Chưa có dữ liệu'
    : !data.telemetryConfigured ? 'Chưa bật thu thập số liệu'
      : diagnostics?.otlpExporterConfigured === true ? 'Đã cấu hình gửi số liệu'
        : diagnostics ? 'Chỉ thu thập nội bộ' : 'Đã bật thu thập số liệu'
  const eventStatus = !data ? 'Chưa có dữ liệu'
    : diagnostics?.kafkaBrokerConfigured === true ? 'Đã cấu hình Kafka'
      : diagnostics?.kafkaBrokerConfigured === false ? 'Đồng bộ nội bộ' : 'Chưa rõ cấu hình Kafka'
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

  return <div className="admin-home admin-platform">
    <section className="card admin-platform-card admin-platform-verdict" aria-labelledby="platform-status-title" data-status={verdictMeta?.tone}>
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
            <RefreshCw size={16} aria-hidden="true" />
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

      {data?.overview ? (
        <div className="admin-pulse admin-platform-kpis">
          <div className="admin-pulse__tile">
            <span><ListTodo size={17} aria-hidden="true" /> Việc cần chú ý</span>
            <strong>{count.format(data.overview.actionRequiredCount)}</strong>
          </div>
          <div className="admin-pulse__tile">
            <span><Layers3 size={17} aria-hidden="true" /> Mục chờ xử lý</span>
            <strong>{count.format(data.overview.pendingQueueTotal)}</strong>
            <small>Tin phòng, báo cáo, xác minh, rút tiền và tin AI đánh dấu</small>
          </div>
          <div className="admin-pulse__tile">
            <span><Users size={17} aria-hidden="true" /> Đang kết nối</span>
            <strong>{count.format(data.overview.onlineUsersCount)}</strong>
            <Link to={adminSectionPath('active')}>Xem người đang hoạt động</Link>
          </div>
        </div>
      ) : null}

      {maintenance?.isActive ? (
        <div className="admin-platform-maintenance" role="region" aria-label="Thông báo bảo trì đang hiển thị">
          <div>
            <small>Thông báo bảo trì đang hiển thị</small>
            <strong>{maintenance.title || 'Thông báo bảo trì'}</strong>
            {maintenance.message ? <p>{maintenance.message}</p> : null}
            {maintenanceExpiresLabel ? (
              <small>Hiển thị tới {maintenanceExpiresLabel} (giờ Việt Nam).</small>
            ) : null}
          </div>
          <Link className="btn btn-secondary btn-sm" to={adminSectionPath('maintenance')}>
            Quản lý bảo trì
          </Link>
        </div>
      ) : null}
      <a className="admin-platform-jump" href="#platform-tools-title">
        Công cụ kỹ thuật <ArrowDown size={15} aria-hidden="true" />
      </a>
    </section>

    {data ? (
      <section className="card admin-platform-card" aria-labelledby="platform-actions-title">
        <div className="admin-section-heading">
          <div>
            <h2 id="platform-actions-title">Việc cần xử lý</h2>
          </div>
        </div>

        {actions.length > 0 ? (
          <ol className="admin-platform-actions">
            {actions.map(action => {
              const severity = severityMeta(action.severity)
              const sectionPath = resolveSectionPath(action.targetSection)
              const timeBadge = formatActionTimeBadge(action, data.checkedAt)
              return (
                <li key={action.id} className={`admin-platform-action-card is-${severity.tone}`}>
                  <div className="admin-platform-action__header">
                    <span className={`admin-platform-badge is-${severity.tone}`}>{severity.label}</span>
                    {timeBadge ? <span className="admin-wait">{timeBadge}</span> : null}
                  </div>
                  <h3>{action.title}</h3>
                  <dl className="admin-platform-action__details">
                    <div>
                      <dt>Ảnh hưởng</dt>
                      <dd>{action.userImpact}</dd>
                    </div>
                    <div>
                      <dt>Bước tiếp theo</dt>
                      <dd>{action.whatToDo}</dd>
                    </div>
                  </dl>
                  <div className="admin-platform-action__footer">
                    {sectionPath ? (
                      <Link className="btn btn-primary btn-sm" to={sectionPath}>
                        {action.actionLabel || 'Mở mục xử lý'} →
                      </Link>
                    ) : (
                      <a className="btn btn-secondary btn-sm" href="#platform-tools-title">Xem công cụ kỹ thuật</a>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        ) : (
          <div className="admin-platform-empty">
            <p>Lần kiểm tra này chưa ghi nhận việc cần xử lý.</p>
          </div>
        )}
      </section>
    ) : null}

    {data && services.length > 0 ? (
      <section className="card admin-platform-card" aria-labelledby="platform-services-title">
        <div className="admin-section-heading">
          <div>
            <h2 id="platform-services-title">Tính năng người dùng</h2>
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
                <p className="admin-platform-service__impact">{service.userImpact}</p>
                {service.metrics.length > 0 ? (
                  <details className="admin-platform-service__details">
                    <summary aria-label={`Xem số liệu ${service.title}`}>Xem số liệu</summary>
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
                  </details>
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
            <h2 id="platform-publications-title">Hoạt động 7 ngày qua</h2>
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

            <details className="admin-platform-daily">
              <summary>Xem số liệu từng ngày</summary>
              <div className="admin-platform-table-wrap" role="region" aria-label="Số liệu từng ngày" tabIndex={0}>
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
            </details>
          </>
        ) : data.publicationDays.some(item => item.count > 0) ? (
          <div className="admin-platform-table-wrap" role="region" aria-label="Lượt duyệt theo ngày" tabIndex={0}>
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

    <section className="card admin-platform-card" aria-labelledby="platform-tools-title">
      <div className="admin-section-heading">
        <div>
          <h2 id="platform-tools-title" tabIndex={-1}>Công cụ kỹ thuật</h2>
          <p>Tra cứu lỗi, theo dõi máy chủ và kiểm tra việc cập nhật thống kê.</p>
        </div>
      </div>
      <div className="admin-platform-tools">
        <article className="admin-platform-tool">
          <div className="admin-platform-tool__header">
            <Activity size={22} aria-hidden="true" />
            <div>
              <h3>Theo dõi tốc độ và lỗi</h3>
              <span>Grafana</span>
            </div>
          </div>
          <p>Xem thời gian phản hồi, số lượt yêu cầu và lỗi của Homeji.</p>
          <dl>
            <div><dt>Nguồn số liệu</dt><dd>{telemetryStatus}</dd></div>
          </dl>
          {grafanaUrl ? <PlatformToolLink href={grafanaUrl} label="Mở Grafana" /> : (
            <p>Chưa có liên kết Grafana cho môi trường này.</p>
          )}
        </article>
        <article className="admin-platform-tool">
          <div className="admin-platform-tool__header">
            <Layers3 size={22} aria-hidden="true" />
            <div>
              <h3>Theo dõi cụm máy chủ</h3>
              <span>Kubernetes</span>
            </div>
          </div>
          <p>Dùng bảng điều khiển của cụm để xem dịch vụ nào đang chạy, khởi động lại hoặc lỗi triển khai.</p>
          <dl>
            <div><dt>Dữ liệu cụm trong Homeji</dt><dd>Chưa tích hợp</dd></div>
          </dl>
          {kubernetesUrl ? <PlatformToolLink href={kubernetesUrl} label="Mở bảng điều khiển Kubernetes" /> : (
            <p>Chưa có liên kết bảng điều khiển cho môi trường này.</p>
          )}
        </article>
        <article className="admin-platform-tool">
          <div className="admin-platform-tool__header">
            <Radio size={22} aria-hidden="true" />
            <div>
              <h3>Cập nhật thống kê duyệt tin</h3>
              <span>Kafka</span>
            </div>
          </div>
          <p>Kiểm tra số lượt duyệt đang chờ ghi vào báo cáo sau khi tin được duyệt.</p>
          <dl>
            <div><dt>Cách cập nhật</dt><dd>{eventStatus}</dd></div>
            <div>
              <dt>Đang chờ</dt>
              <dd>{data ? `${count.format(data.pendingSample)}${data.sampleLimited ? '+' : ''}` : 'Chưa có dữ liệu'}</dd>
            </div>
            <div>
              <dt>Đã thử, đang chờ gửi lại{data?.sampleLimited ? ' (trong mẫu)' : ''}</dt>
              <dd>{data ? count.format(data.retryingInSample) : 'Chưa có dữ liệu'}</dd>
            </div>
          </dl>
        </article>
      </div>

      {data ? (
        <details className="admin-platform-diagnostics">
          <summary>Chi tiết cấu hình</summary>
          <div className="admin-platform-diagnostics__body">
            <dl className="admin-platform-metrics">
              <div>
                <dt>Tự chạy công việc định kỳ</dt>
                <dd><strong>{diagnostics ? diagnostics.backgroundJobsEnabled ? 'Đã bật' : 'Đã tắt' : 'Chưa rõ'}</strong></dd>
              </div>
              <div>
                <dt>Ghi thống kê qua Kafka</dt>
                <dd><strong>{diagnostics ? diagnostics.kafkaAnalyticsWorkerEnabled ? 'Đã bật' : 'Đã tắt' : 'Chưa rõ'}</strong></dd>
              </div>
              {diagnostics ? (
                <>
                  <div>
                    <dt>Kênh gửi email</dt>
                    <dd><strong>{diagnostics.emailProvider} ({diagnostics.emailDeliveryReady ? 'Đủ cấu hình' : 'Thiếu cấu hình'})</strong></dd>
                  </div>
                  <div>
                    <dt>Email biên nhận tự động</dt>
                    <dd><strong>{diagnostics.receiptEmailEnabled ? 'Đã bật' : 'Đã tắt'}</strong></dd>
                  </div>
                  <div>
                    <dt>Kết nối AI</dt>
                    <dd><strong>{diagnostics.geminiConfigured ? 'Đã cấu hình' : 'Chưa cấu hình'}</strong></dd>
                  </div>
                  <div>
                    <dt>Cổng thanh toán</dt>
                    <dd><strong>{formatGatewaySummary(diagnostics)}</strong></dd>
                  </div>
                </>
              ) : null}
            </dl>
            {data.sampleLimited ? (
              <p className="admin-queues__note">Số đã thử gửi lại được tính trong 1.000 lượt chờ đầu tiên.</p>
            ) : null}
            {formatTimestamp(diagnostics?.oldestPendingOutboxAt) ? (
              <p className="admin-queues__note">
                Lượt chờ lâu nhất từ {formatTimestamp(diagnostics?.oldestPendingOutboxAt)} (giờ Việt Nam).
              </p>
            ) : null}
          </div>
        </details>
      ) : null}
    </section>
  </div>
}
