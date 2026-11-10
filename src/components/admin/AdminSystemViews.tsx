import { useAuth } from '../../contexts/AuthContext'
import { formatDate, userRoleLabel } from '../../lib/labels'
import type { AdminWorkspace } from './useAdminWorkspace'

type Props = { ws: AdminWorkspace }

export function AdminPresencePanel({ ws }: Props) {
  const { profile } = useAuth()
  return <div className="admin-list admin-presence-list">
    <div className="admin-presence-summary">
      <strong>{ws.onlineCount} người đang hoạt động</strong>
      <span>Tự cập nhật mỗi 30 giây · dựa trên kết nối realtime đang mở</span>
    </div>
    {ws.visibleUsers.length === 0 ? (
      <div className="empty-state card">{ws.query ? 'Không tìm thấy mục phù hợp. Thử từ khóa khác hoặc xóa tìm kiếm.' : 'Hiện chưa có người dùng đang kết nối.'}</div>
    ) : ws.visibleUsers.map(user => (
      <article key={user.userId} className={`card admin-item admin-presence-item${user.isOnline ? ' is-online' : ''}`}>
        <div className="admin-presence-user">
          <span className="admin-presence-avatar" aria-hidden>{(user.displayName || '?').slice(0, 1).toUpperCase()}</span>
          <div>
            <h3>{user.displayName || 'Người dùng'}</h3>
            <p>{userRoleLabel[user.role] ?? 'Người dùng'}</p>
            <small>Kết nối từ: {formatDate(user.lastSeenAt)}</small>
          </div>
        </div>
        <div className="admin-presence-actions">
          <span className={`badge ${user.isOnline ? 'badge-green' : 'badge-gray'}`}>{user.isOnline ? 'Đang hoạt động' : 'Đã rời đi'}</span>
          {user.isOnline && user.userId !== profile?.id ? (
            ws.terminationTargetId === user.userId ? (
              <div className="admin-terminate-panel">
                <textarea
                  className="form-textarea"
                  maxLength={300}
                  aria-label={`Lý do kết thúc phiên: ${user.displayName}`}
                  placeholder="Lý do kết thúc phiên…"
                  value={ws.terminationReasons[user.userId] ?? ''}
                  onChange={event => ws.setTerminationReasons(current => ({ ...current, [user.userId]: event.target.value }))}
                />
                <div className="admin-actions">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => ws.setTerminationTargetId(null)}>Hủy</button>
                  <button type="button" className="btn btn-danger btn-sm" disabled={ws.terminatingUserId === user.userId} onClick={() => void ws.terminateSession(user)}>
                    {ws.terminatingUserId === user.userId ? 'Đang kết thúc…' : 'Xác nhận kết thúc'}
                  </button>
                </div>
              </div>
            ) : <button type="button" className="btn btn-danger btn-sm" onClick={() => ws.setTerminationTargetId(user.userId)}>Kết thúc phiên</button>
          ) : null}
        </div>
      </article>
    ))}
  </div>
}

export function AdminMaintenancePanel({ ws }: Props) {
  return <section className="admin-maintenance-card card" aria-labelledby="maintenance-heading">
    <div className="admin-maintenance-intro">
      <span className="admin-maintenance-icon" aria-hidden>⚡</span>
      <div>
        <h2 id="maintenance-heading">Thông báo bảo trì toàn hệ thống</h2>
        <p>Hiện banner cho người xem web và gửi vào hộp thông báo của tất cả tài khoản.</p>
      </div>
    </div>
    <div className="admin-maintenance-form">
      <label className="form-label" htmlFor="maintenance-title">Tiêu đề</label>
      <input id="maintenance-title" className="form-input" maxLength={200} value={ws.maintenanceTitle} onChange={event => ws.setMaintenanceTitle(event.target.value)} />
      <label className="form-label" htmlFor="maintenance-message">Nội dung thông báo</label>
      <textarea id="maintenance-message" className="form-textarea" maxLength={1000} rows={5} placeholder="Ví dụ: Homeji bảo trì từ 23:00 đến 23:30. Bạn vẫn có thể xem tin đã tải trước đó." value={ws.maintenanceMessage} onChange={event => ws.setMaintenanceMessage(event.target.value)} />
      <div className="admin-maintenance-schedule">
        <div>
          <label className="form-label" htmlFor="maintenance-start">Bắt đầu dự kiến</label>
          <input id="maintenance-start" className="form-input" type="datetime-local" value={ws.maintenanceStart} onChange={event => ws.setMaintenanceStart(event.target.value)} />
        </div>
        <div>
          <label className="form-label" htmlFor="maintenance-end">Kết thúc dự kiến</label>
          <input id="maintenance-end" className="form-input" type="datetime-local" value={ws.maintenanceEnd} onChange={event => ws.setMaintenanceEnd(event.target.value)} />
        </div>
      </div>
      <div className="admin-maintenance-footer">
        <small>Banner hiển thị đến khi kết thúc bảo trì. Nếu chưa đặt giờ kết thúc, banner hiển thị trong 24 giờ từ lúc bắt đầu hoặc công bố.</small>
        <button type="button" className="btn btn-primary" disabled={ws.sendingMaintenance} onClick={() => void ws.sendMaintenance()}>
          {ws.sendingMaintenance ? 'Đang công bố…' : 'Công bố banner & gửi thông báo'}
        </button>
      </div>
    </div>
  </section>
}
