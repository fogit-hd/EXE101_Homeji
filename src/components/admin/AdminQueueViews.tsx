import { Link } from 'react-router-dom'
import { ReportStatus, ReportTargetType } from '../../api/types'
import { ChoicePicker } from '../ui/ChoicePicker'
import {
  formatDate,
  formatPrice,
  landlordVerificationLabel,
  rentalPostTypeLabel,
  reportStatusLabel,
  reportTargetLabel,
} from '../../lib/labels'
import { mapPostUrl } from '../../lib/mapDeepLinks'
import { cleanAdminReportText } from '../../pages/AdminModerationPage.logic'
import { waitingLabel } from './adminSections'
import type { AdminWorkspace } from './useAdminWorkspace'

type Props = { ws: AdminWorkspace }

function QueueEmpty({ searching, children }: { searching: boolean; children: string }) {
  return <div className="empty-state card">{searching ? 'Không tìm thấy mục phù hợp. Thử từ khóa khác hoặc xóa tìm kiếm.' : children}</div>
}

function Waiting({ since }: { since: string | null | undefined }) {
  const label = waitingLabel(since)
  return label ? <span className="admin-wait" title={since ? formatDate(since) : undefined}>Chờ {label}</span> : null
}

export function AdminPostsQueue({ ws }: Props) {
  const busy = ws.pendingAction !== null
  return <div className="admin-list">
    {ws.visiblePosts.length === 0 ? <QueueEmpty searching={!!ws.query}>Không có tin chờ duyệt.</QueueEmpty> : ws.visiblePosts.map(post => (
      <article key={post.id} id={`admin-posts-${post.id}`} tabIndex={-1} className="card admin-item admin-task-target" aria-label={post.title || 'Tin chờ duyệt'}>
        <div className="admin-item__body">
          {post.ownerConsentContact ? <>
            <p className="alert alert-warning"><strong>Nhượng phòng — cần xác minh chủ nhà:</strong>{' '}{post.ownerConsentContact}</p>
            <label className="form-label" htmlFor={`consent-note-${post.id}`}>Nhật ký xác minh bắt buộc</label>
            <textarea
              id={`consent-note-${post.id}`}
              disabled={busy}
              className="form-textarea"
              maxLength={500}
              placeholder="Ví dụ: Đã gọi số trên hợp đồng lúc 14:30; chủ nhà xác nhận cho chuyển hợp đồng đến 01/02/2027."
              value={ws.consentVerificationNotes[post.id] ?? ''}
              onChange={event => ws.setConsentVerificationNotes(current => ({ ...current, [post.id]: event.target.value }))}
            />
          </> : null}
          <div className="admin-item__lead">
            {post.thumbnailPath ? <img className="admin-item__thumb" src={post.thumbnailPath} alt="" loading="lazy" /> : <span className="admin-item__thumb admin-item__thumb--empty" aria-hidden>⌂</span>}
            <div>
              <div className="admin-item__meta"><span className="badge badge-green">{rentalPostTypeLabel[post.type]}</span><Waiting since={post.updatedAt} /></div>
              <h3>{post.title || 'Tin nháp'}</h3>
              <p>{formatPrice(post.price)}/tháng · {post.area} m² · {post.address}</p>
              {post.ownerDisplayName ? <small>Người đăng: {post.ownerDisplayName}</small> : null}
            </div>
          </div>
          <Link to={mapPostUrl(post.id)} className="btn btn-ghost btn-sm">Xem trên bản đồ</Link>
        </div>
        <div className="admin-actions">
          <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => void ws.runAction(post.id, () => ws.approvePost(post))}>Duyệt</button>
          <label className="admin-review-label" htmlFor={`reject-${post.id}`}>Lý do nếu từ chối</label>
          <input id={`reject-${post.id}`}
            disabled={busy}
            className="form-input"
            placeholder="Lý do từ chối"
            aria-label={`Lý do từ chối: ${post.title}`}
            value={ws.rejectReasons[post.id] ?? ''}
            onChange={event => ws.setRejectReasons(current => ({ ...current, [post.id]: event.target.value }))}
          />
          <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => void ws.runAction(post.id, () => ws.rejectPost(post.id))}>Từ chối</button>
        </div>
      </article>
    ))}
  </div>
}

export function AdminReportsQueue({ ws }: Props) {
  const busy = ws.pendingAction !== null
  const { reportResolutionNotes } = ws
  return <>
    <ChoicePicker
      disableGlass
      aria-label="Trạng thái báo cáo"
      className="form-select admin-status-filter"
      value={ws.reportStatus ?? ''}
      onChange={event => ws.setReportStatus(event.target.value ? Number(event.target.value) as ReportStatus : undefined)}
    >
      <option value="">Tất cả</option>
      {Object.entries(reportStatusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </ChoicePicker>
    <div className="admin-list">
      {ws.visibleReports.length === 0 ? <QueueEmpty searching={!!ws.query}>Không có báo cáo.</QueueEmpty> : ws.visibleReports.map(r => (
        <article key={r.id} id={`admin-reports-${r.id}`} tabIndex={-1} className="card admin-item admin-report-item admin-task-target" aria-label={`Báo cáo: ${r.targetDisplayName || 'Nội dung cần kiểm tra'}`}>
          <div className="admin-report-content">
            <div className="admin-report-badges">
              <span className="badge badge-gray">Báo cáo {reportTargetLabel[r.targetType].toLowerCase()}</span>
              <span className="badge badge-blue">{reportStatusLabel[r.status]}</span>
              {r.status === ReportStatus.Pending ? <Waiting since={r.createdAt} /> : null}
            </div>
            <div className="admin-report-target">
              {r.targetImagePath ? <img src={r.targetImagePath} alt="" loading="lazy" /> : <span className="admin-report-target-placeholder" aria-hidden>⌂</span>}
              <div>
                <h3>{r.targetDisplayName || reportTargetLabel[r.targetType]}</h3>
                <span className="admin-report-target-caption">Nội dung được báo cáo</span>
              </div>
            </div>
            <p className="admin-report-reporter"><strong>Người gửi báo cáo:</strong> {r.reporterDisplayName || 'Không xác định'}</p>
            <dl className="admin-report-details">
              <div><dt>Lý do</dt><dd>{cleanAdminReportText(r.reason) || 'Không ghi lý do'}</dd></div>
              <div><dt>Chi tiết</dt><dd>{cleanAdminReportText(r.description) || 'Người báo cáo không nhập thêm chi tiết.'}</dd></div>
            </dl>
            {r.relatedRentalPostId && (
              r.targetType === ReportTargetType.RentalPost
              || r.targetType === ReportTargetType.RoommateInvitation
              || r.targetType === ReportTargetType.RentalReview
            ) ? <Link to={mapPostUrl(r.relatedRentalPostId)}>Mở nội dung bị báo cáo</Link> : null}
            {r.resolutionNote ? <p className="admin-report-resolution"><strong>Kết quả xử lý:</strong> {r.resolutionNote}</p> : null}
            <small>Gửi lúc {formatDate(r.createdAt)}</small>
          </div>
          {r.status === ReportStatus.Pending ? <div className="admin-actions admin-report-actions">
            <label className="admin-review-label" htmlFor={`report-note-${r.id}`}>Kết quả kiểm tra</label>
            <textarea id={`report-note-${r.id}`}
              disabled={busy}
              className="form-textarea"
              aria-label={`Kết quả kiểm tra: ${r.targetDisplayName || 'Báo cáo'}`}
              placeholder="Ghi rõ cách đã kiểm tra hoặc lý do kết luận"
              value={reportResolutionNotes[r.id] ?? ''}
              onChange={event => ws.setReportResolutionNotes(current => ({ ...current, [r.id]: event.target.value }))}
              maxLength={500}
            />
            <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => void ws.runAction(r.id, () => ws.confirmReportViolation(r.id))}>Xác nhận vi phạm</button>
            <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => void ws.runAction(r.id, () => ws.dismissReport(r.id))}>Không vi phạm</button>
          </div> : null}
        </article>
      ))}
    </div>
  </>
}

export function AdminVerificationsQueue({ ws }: Props) {
  const busy = ws.pendingAction !== null
  return <div className="admin-list">
    {ws.visibleVerifications.length === 0 ? <QueueEmpty searching={!!ws.query}>Không có yêu cầu xác minh chờ duyệt.</QueueEmpty> : ws.visibleVerifications.map(v => (
      <article key={v.id} id={`admin-verifications-${v.id}`} tabIndex={-1} className="card admin-item admin-task-target" aria-label={`Xác minh: ${v.applicantDisplayName}`}>
        <div className="admin-item__body">
          <div className="admin-item__meta"><span className="badge badge-gray">{landlordVerificationLabel[v.status]}</span><Waiting since={v.createdAt} /></div>
          <h3>{v.applicantDisplayName}</h3>
          <p>{v.applicantNote || 'Không có ghi chú'}</p>
          <p><a href={v.documentUrl} target="_blank" rel="noreferrer">Xem giấy tờ</a></p>
          <small>{formatDate(v.createdAt)}</small>
        </div>
        <div className="admin-actions">
          <label className="admin-review-label" htmlFor={`verification-note-${v.id}`}>Ghi chú xử lý</label>
          <input id={`verification-note-${v.id}`}
            disabled={busy}
            className="form-input"
            placeholder="Ghi chú duyệt"
            aria-label={`Ghi chú duyệt: ${v.applicantDisplayName}`}
            value={ws.verificationNotes[v.id] ?? ''}
            onChange={event => ws.setVerificationNotes(current => ({ ...current, [v.id]: event.target.value }))}
          />
          <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => void ws.runAction(v.id, () => ws.reviewVerification(v.id, true))}>Duyệt</button>
          <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => void ws.runAction(v.id, () => ws.reviewVerification(v.id, false))}>Từ chối</button>
        </div>
      </article>
    ))}
  </div>
}

export function AdminWithdrawalsQueue({ ws }: Props) {
  const busy = ws.pendingAction !== null
  return <div className="admin-list">
    {ws.visibleWithdrawals.length === 0 ? <QueueEmpty searching={!!ws.query}>Không có yêu cầu rút tiền chờ xử lý.</QueueEmpty> : ws.visibleWithdrawals.map(withdrawal => (
      <article key={withdrawal.id} id={`admin-withdrawals-${withdrawal.id}`} tabIndex={-1} className="card admin-item admin-task-target" aria-label={`Rút tiền: ${withdrawal.accountHolder}`}>
        <div className="admin-item__body">
          <div className="admin-item__meta"><span className="badge badge-blue">Chờ chuyển khoản</span><Waiting since={withdrawal.createdAt} /></div>
          <h3 className="admin-item__amount">{formatPrice(withdrawal.amount)}</h3>
          <dl className="admin-withdrawal-details">
            <div><dt>Ngân hàng</dt><dd>{withdrawal.bankName}</dd></div>
            <div><dt>Số tài khoản</dt><dd>{withdrawal.accountNumber}</dd></div>
            <div><dt>Chủ tài khoản</dt><dd>{withdrawal.accountHolder}</dd></div>
            <div><dt>Yêu cầu lúc</dt><dd>{formatDate(withdrawal.createdAt)}</dd></div>
          </dl>
          <details className="admin-reference"><summary>Thông tin đối soát</summary><small>Mã yêu cầu: {withdrawal.id}<br />Mã tài khoản: {withdrawal.userId}</small></details>
        </div>
        <div className="admin-actions">
          <label className="admin-review-label" htmlFor={`withdrawal-note-${withdrawal.id}`}>Mã chuyển khoản / lý do từ chối</label>
          <input id={`withdrawal-note-${withdrawal.id}`}
            disabled={busy}
            className="form-input"
            placeholder="Mã giao dịch hoặc lý do từ chối"
            aria-label={`Mã giao dịch hoặc lý do từ chối: ${withdrawal.accountHolder}`}
            value={ws.withdrawalNotes[withdrawal.id] ?? ''}
            onChange={event => ws.setWithdrawalNotes(current => ({ ...current, [withdrawal.id]: event.target.value }))}
            maxLength={300}
          />
          <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => void ws.runAction(withdrawal.id, () => ws.completeWithdrawal(withdrawal.id))}>Xác nhận đã chuyển</button>
          <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => void ws.runAction(withdrawal.id, () => ws.rejectWithdrawal(withdrawal.id))}>Từ chối &amp; hoàn tiền</button>
        </div>
      </article>
    ))}
  </div>
}
