type Queue = 'posts' | 'reports' | 'verifications' | 'withdrawals'
export function AdminOperationsSummary({ counts, reportLabel, loading, error, onOpen }: {
  counts: Record<Queue, number>; reportLabel: string; loading: boolean; error: string
  onOpen: (queue: Queue) => void
}) {
  const labels: Record<Queue, string> = { posts: 'Tin chờ duyệt', reports: 'Báo cáo', verifications: 'Xác minh chủ nhà', withdrawals: 'Yêu cầu rút tiền' }
  return <section className="admin-queues" aria-labelledby="admin-queues-title">
    <div className="admin-section-heading"><div><span className="admin-section-kicker">Vận hành</span><h2 id="admin-queues-title">Hàng chờ xử lý</h2></div><span>Mở một nhóm để kiểm tra</span></div>
    {error ? <p role="alert">Chưa có đủ dữ liệu hàng chờ để tóm tắt. {error}</p> : loading ? <p role="status">Đang tải hàng chờ…</p> : <>
      <ul className="admin-queues__grid">{(Object.keys(labels) as Queue[]).map(queue => <li key={queue}>
        <button type="button" onClick={() => onOpen(queue)}>
          <span>{labels[queue]}</span><strong>{counts[queue].toLocaleString('vi-VN')}</strong>
          <span className="admin-queues__status">{queue === 'reports' ? reportLabel : 'Chờ xử lý'}<span aria-hidden="true">↗</span></span>
        </button>
      </li>)}</ul>
      <p className="admin-queues__note">Số mục trong danh sách đã tải gần nhất, gồm cả các ngày trước.</p>
    </>}
  </section>
}
