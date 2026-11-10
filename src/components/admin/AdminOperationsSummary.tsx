import { Link } from 'react-router-dom'
import { adminQueueLabels, adminSectionPath, waitingLabel, type AdminQueue } from './adminSections'

export type AdminQueueSummary = { id: AdminQueue; count: number; oldestAt: string | null; status: string }

/** The four work queues as doorways: how much is waiting, and for how long. */
export function AdminOperationsSummary({ queues, now, loading, error }: {
  queues: AdminQueueSummary[]; now: number; loading: boolean; error: string
}) {
  return <section className="admin-queues" aria-labelledby="admin-queues-title">
    <div className="admin-section-heading"><div><span className="admin-section-kicker">Vận hành</span><h2 id="admin-queues-title">Hàng chờ xử lý</h2></div><span>Mở một nhóm để kiểm tra</span></div>
    {error ? <p role="alert">Chưa có đủ dữ liệu hàng chờ để tóm tắt. {error}</p> : loading ? <p role="status">Đang tải hàng chờ…</p> : <>
      <ul className="admin-queues__grid">{queues.map(queue => {
        const oldest = queue.count ? waitingLabel(queue.oldestAt, now) : null
        return <li key={queue.id}>
          <Link to={adminSectionPath(queue.id)} className={queue.count ? 'has-items' : ''}>
            <span>{adminQueueLabels[queue.id]}</span><strong>{queue.count.toLocaleString('vi-VN')}</strong>
            <span className="admin-queues__status">{queue.count === 0 ? 'Đã xử lý hết' : oldest ? `${queue.status} · lâu nhất ${oldest}` : queue.status}<span aria-hidden="true">↗</span></span>
          </Link>
        </li>
      })}</ul>
      <p className="admin-queues__note">Số mục trong danh sách đã tải gần nhất, gồm cả các ngày trước.</p>
    </>}
  </section>
}
