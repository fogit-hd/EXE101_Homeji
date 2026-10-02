import { useEffect, useState } from 'react'
import { apiRequest } from '../../api/client'
import type { WebsiteTrafficReport } from '../../api/types'
import { trafficPageLabels } from '../../lib/websiteTraffic'

export function AdminTrafficPanel({ days }: { days: number }) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<{ days: number; data?: WebsiteTrafficReport; error?: string } | null>(null)
  useEffect(() => {
    let cancelled = false
    void apiRequest<WebsiteTrafficReport>('/api/admin/analytics/traffic', { params: { days } })
      .then((data) => { if (!cancelled) setState({ days, data }) })
      .catch(() => { if (!cancelled) setState({ days, error: 'Chưa tải được thống kê lượt ghé. Hãy thử lại.' }) })
    return () => { cancelled = true }
  }, [days, attempt])
  const current = state?.days === days ? state : null
  const data = current?.data
  const max = Math.max(1, ...(data?.trend.map(point => point.pageViews) ?? []))
  const trackingStartDate = data?.trackingStartedAt
    ? new Date(new Date(data.trackingStartedAt).getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10) : null
  // Leave unmeasured history blank instead of suggesting zero visitors before launch.
  const measuredTrend = data?.trend.map((point, index) => ({ point, index }))
    .filter(({ point }) => trackingStartDate !== null && point.date >= trackingStartDate) ?? []
  const line = measuredTrend.map(({ point, index }, measuredIndex) => `${measuredIndex ? 'L' : 'M'}${40 + index / Math.max(1, (data?.trend.length ?? 1) - 1) * 600},${170 - point.pageViews / max * 140}`).join(' ')

  return <section className="admin-analytics__panel" aria-labelledby="traffic-title">
    <div className="admin-analytics__panel-heading"><div><span className="admin-analytics__eyebrow">Website có được quan tâm không?</span><h3 id="traffic-title">Lượt ghé website</h3></div><span>{days} ngày gần nhất</span></div>
    {current?.error ? <div role="alert"><p>{current.error}</p><button type="button" onClick={() => { setState(null); setAttempt(value => value + 1) }}>Thử lại</button></div>
      : !data ? <p role="status">Đang tải thống kê lượt ghé…</p>
        : <>
          <div className="admin-traffic__kpis">
            <article className="admin-kpi-card"><span>Khách ghé (ước tính)</span><strong>{data.sessions.toLocaleString('vi-VN')}</strong><small>Theo phiên trình duyệt, không phải người duy nhất</small></article>
            <article className="admin-kpi-card"><span>Lượt xem trang</span><strong>{data.pageViews.toLocaleString('vi-VN')}</strong><small>Một phiên có thể xem nhiều trang</small></article>
            <article className="admin-kpi-card"><span>Vừa ghé trong 5 phút</span><strong>{data.activeSessions.toLocaleString('vi-VN')}</strong><small>Số phiên có lượt xem gần đây</small></article>
          </div>
          {data.trackingStartedAt ? <>
            <div className="admin-trend-chart"><svg viewBox="0 0 680 210" role="img" aria-label="Lượt xem website theo ngày">
              <line x1="40" y1="170" x2="640" y2="170" />
              <text x="30" y="34" textAnchor="end">{max}</text><text x="30" y="174" textAnchor="end">0</text>
              <path className="admin-trend-chart__line" d={line} style={{ stroke: '#7c3aed' }} />
              {measuredTrend.map(({ point, index }) => <circle key={point.date} cx={40 + index / Math.max(1, data.trend.length - 1) * 600} cy={170 - point.pageViews / max * 140} r="3" fill="#7c3aed"><title>{point.date}: {point.pageViews} lượt xem, {point.sessions} phiên</title></circle>)}
              <text x="40" y="200">{shortDate(data.trend[0]?.date)}</text><text x="640" y="200" textAnchor="end">{shortDate(data.trend.at(-1)?.date)}</text>
            </svg></div>
            <h4>Trang được xem nhiều</h4>
            <div className="admin-area-table-wrap"><table className="admin-area-table"><thead><tr><th>Trang</th><th>Lượt xem</th><th>Phiên ghé</th></tr></thead><tbody>{data.topPages.map(page => <tr key={page.page}><td>{trafficPageLabels[page.page] ?? 'Trang khác'}</td><td>{page.pageViews.toLocaleString('vi-VN')}</td><td>{page.sessions.toLocaleString('vi-VN')}</td></tr>)}</tbody></table></div>
          </> : <p>Chưa có lượt ghé được ghi nhận. Số liệu bắt đầu tích lũy sau khi tính năng được triển khai, không có lịch sử trước đó.</p>}
          <p className="admin-analytics__updated">Cập nhật {new Date(data.generatedAt).toLocaleString('vi-VN')}{data.trackingStartedAt ? ` · Lượt ghi nhận đầu tiên: ${new Date(data.trackingStartedAt).toLocaleDateString('vi-VN')}` : ''}</p>
          <p>Số liệu mới bắt đầu từ ngày ghi nhận đầu tiên. Các ngày trước đó chưa được đo, không có lịch sử để so sánh.</p>
          <details><summary>Cách đếm và giới hạn</summary><p>Phiên mới sau 30 phút không có lượt chuyển trang. Mở tab mới có thể được tính thành phiên khác. Không cộng lượt truy cập của tài khoản Admin, trang quản trị và trình duyệt yêu cầu không theo dõi. Chỉ ghi nhận khi trang tải được mã thống kê; bot, chặn quảng cáo hoặc lỗi mạng có thể làm số liệu khác thực tế. Không lưu IP, email, nội dung tìm kiếm hay đường dẫn chi tiết trong dữ liệu thống kê.</p><p>Tổng phiên trong kỳ là số phiên khác nhau; không cộng trực tiếp số phiên theo ngày hoặc theo trang vì một phiên có thể xuất hiện nhiều lần.</p></details>
        </>}
  </section>
}

function shortDate(date?: string) {
  return date ? new Date(`${date}T00:00:00+07:00`).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : ''
}
