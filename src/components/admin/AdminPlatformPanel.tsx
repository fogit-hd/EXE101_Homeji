import { useQuery } from '@tanstack/react-query'
import { apiRequest } from '../../api/client'
import { useAuth } from '../../contexts/AuthContext'

type PlatformSnapshot = {
  checkedAt: string
  publisherConfigured: boolean
  analyticsConfigured: boolean
  telemetryConfigured: boolean
  pendingSample: number
  retryingInSample: number
  sampleLimited: boolean
  publicationDays: { date: string; count: number }[]
}

const count = new Intl.NumberFormat('vi-VN')
const day = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' })
const timestamp = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'Asia/Ho_Chi_Minh' })

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

  return <div className="admin-home">
    <section className="card admin-platform-card" aria-labelledby="platform-status-title">
      <div className="admin-section-heading">
        <h2 id="platform-status-title">Tình trạng và hàng đợi</h2>
        <button type="button" className="btn btn-secondary btn-sm" disabled={snapshot.isFetching}
          onClick={() => void snapshot.refetch()}>{snapshot.isFetching ? 'Đang tải…' : 'Làm mới'}</button>
      </div>
      {snapshot.isPending ? <p role="status">Đang kiểm tra hệ thống…</p> : null}
      {snapshot.isError ? <p role="alert">{data ? 'Không làm mới được. Đang hiển thị số liệu lần kiểm tra gần nhất.' : 'Không tải được trạng thái hệ thống. Hãy thử làm mới.'}</p> : null}
      {data ? <>
        <div className="admin-pulse">
          <div className="admin-pulse__tile"><span>API và cơ sở dữ liệu</span><strong>Kết nối được</strong></div>
          <div className="admin-pulse__tile"><span>Gửi sự kiện Kafka</span><strong>{data.publisherConfigured ? 'Đã bật cấu hình' : 'Chưa bật'}</strong></div>
          <div className="admin-pulse__tile"><span>Consumer thống kê</span><strong>{data.analyticsConfigured ? 'Đã bật cấu hình' : 'Chưa bật'}</strong></div>
          <div className="admin-pulse__tile"><span>Xuất số liệu qua OTLP</span><strong>{data.telemetryConfigured ? 'Đã bật cấu hình' : 'Chưa bật'}</strong></div>
        </div>
        <div className="admin-platform-queue">
          <div className="admin-pulse__tile"><span>Sự kiện đang chờ gửi</span><strong>{count.format(data.pendingSample)}{data.sampleLimited ? '+' : ''}</strong></div>
          <div className="admin-pulse__tile"><span>Đã thử gửi, đang chờ xác nhận</span><strong>{count.format(data.retryingInSample)}</strong></div>
        </div>
        {data.sampleLimited ? <p>Số đã thử gửi được tính trong 1.000 sự kiện chờ đầu tiên.</p> : null}
        <p className="admin-queues__note">Kiểm tra lúc <time dateTime={data.checkedAt}>{timestamp.format(new Date(data.checkedAt))}</time> (giờ Việt Nam).</p>
      </> : null}
      {dashboardUrl ? <a className="btn btn-secondary btn-sm" href={dashboardUrl} target="_blank" rel="noopener noreferrer">Mở Grafana (tab mới)</a> : null}
    </section>
    {data ? <section className="card admin-platform-card" aria-labelledby="platform-publications-title">
      <h2 id="platform-publications-title">Lượt duyệt đã ghi nhận trong 7 ngày</h2>
      {data.publicationDays.some(item => item.count > 0) ? (
        <table className="admin-platform-days" aria-labelledby="platform-publications-title">
          <thead><tr><th scope="col">Ngày (giờ Việt Nam)</th><th scope="col">Lượt duyệt</th></tr></thead>
          <tbody>{data.publicationDays.map(item => <tr key={item.date}>
            <th scope="row"><time dateTime={item.date}>{day.format(new Date(item.date))}</time></th>
            <td>{count.format(item.count)}</td>
          </tr>)}</tbody>
        </table>
      ) : <p>Consumer chưa ghi nhận lượt duyệt nào trong 7 ngày qua.</p>}
    </section> : null}
  </div>
}
