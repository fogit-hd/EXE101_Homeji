import { useState } from 'react'
import type { AdminProductAnalytics } from '../../api'

type Queue = 'posts' | 'reports' | 'verifications' | 'withdrawals'
export function AdminOperationsSummary({ counts, analytics, loading, error, onOpen }: {
  counts: Record<Queue, number>; analytics: AdminProductAnalytics | null; loading: boolean; error: string
  onOpen: (queue: Queue) => void
}) {
  const [open, setOpen] = useState(false)
  const labels: Record<Queue, string> = { posts: 'tin chờ duyệt', reports: 'báo cáo trong bộ lọc đang chọn', verifications: 'hồ sơ chủ nhà chờ xác minh', withdrawals: 'yêu cầu rút tiền chờ xử lý' }
  return <section className="card" aria-label="Trợ lý điều hành">
    <button type="button" className="btn btn-secondary" aria-expanded={open} onClick={() => setOpen(value => !value)}>Hôm nay có gì cần xử lý?</button>
    {open ? loading ? <p role="status">Đang tải hàng chờ…</p> : error ? <p role="alert">Chưa có đủ dữ liệu hàng chờ để tóm tắt. {error}</p> : <>
      <p>Số mục trong các danh sách đã tải ở lần gần nhất; không chỉ tính các mục tạo hôm nay và không suy ra tổng nếu danh sách bị giới hạn.</p>
      <ul>{(Object.keys(labels) as Queue[]).map(queue => <li key={queue}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onOpen(queue)}>{counts[queue].toLocaleString('vi-VN')} {labels[queue]} · mở danh sách</button>
      </li>)}</ul>
      {analytics ? <p>Trong kỳ {analytics.periodDays} ngày: {analytics.kpis.listingViews.toLocaleString('vi-VN')} lượt xem tin, {analytics.kpis.saves.toLocaleString('vi-VN')} lượt lưu và {analytics.kpis.viewingRequests.toLocaleString('vi-VN')} yêu cầu xem phòng. Lượt xem là số sự kiện xem tin, không phải số người khác nhau. Cập nhật báo cáo: {new Date(analytics.generatedAt).toLocaleString('vi-VN')}. Các số này chưa chứng minh nguyên nhân biến động nhu cầu thuê.</p> : <p>Chưa có báo cáo sản phẩm cho kỳ đã chọn.</p>}
    </> : null}
  </section>
}
