import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  approveRentalPost,
  completeWalletWithdrawal,
  getAdminWalletWithdrawals,
  getAdminLandlordVerifications,
  getAdminActiveUsers,
  terminateAdminUserSession,
  sendMaintenanceAnnouncement,
  getAdminReports,
  getPendingRentalPosts,
  rejectRentalPost,
  rejectWalletWithdrawal,
  rejectReport,
  resolveReport,
  reviewLandlordVerification,
  type LandlordVerification,
  type AdminActiveUser,
  type RentalPostSummary,
  type Report,
  type WalletWithdrawal,
} from '../api'
import { LandlordVerificationStatus, ReportStatus, ReportTargetType, WalletWithdrawalStatus } from '../api/types'
import { HomejiLoader, usePersistentLoad } from '../components/HomejiLoader'
import { ContentSkeleton } from '../components/ContentSkeleton'
import { getErrorMessage } from '../lib/errors'
import { mapPostUrl } from '../lib/mapDeepLinks'
import { useAuth } from '../contexts/AuthContext'
import {
  formatDate,
  formatPrice,
  landlordVerificationLabel,
  reportStatusLabel,
  reportTargetLabel,
  rentalPostTypeLabel,
  userRoleLabel,
} from '../lib/labels'

export function cleanAdminReportText(value: string | null | undefined) {
  const cleaned = value?.replace(/\s*\[[A-Z][A-Z0-9_:-]{4,}\]\s*$/u, '').trim()
  return cleaned || ''
}

export function AdminModerationPage() {
  const { profile } = useAuth()
  const [pendingPosts, setPendingPosts] = useState<RentalPostSummary[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [verifications, setVerifications] = useState<LandlordVerification[]>([])
  const [withdrawals, setWithdrawals] = useState<WalletWithdrawal[]>([])
  const [activeUsers, setActiveUsers] = useState<AdminActiveUser[]>([])
  const [tab, setTab] = useState<'posts' | 'reports' | 'verifications' | 'withdrawals' | 'active' | 'maintenance'>('posts')
  const [reportStatus, setReportStatus] = useState<ReportStatus | undefined>(ReportStatus.Pending)
  const [rejectReason, setRejectReason] = useState('')
  const [resolutionNote, setResolutionNote] = useState('')
  const [reportResolutionNotes, setReportResolutionNotes] = useState<Record<string, string>>({})
  const [consentVerificationNotes, setConsentVerificationNotes] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [terminationTargetId, setTerminationTargetId] = useState<string | null>(null)
  const [terminationReasons, setTerminationReasons] = useState<Record<string, string>>({})
  const [terminatingUserId, setTerminatingUserId] = useState<string | null>(null)
  const [maintenanceTitle, setMaintenanceTitle] = useState('Bảo trì hệ thống Homeji')
  const [maintenanceMessage, setMaintenanceMessage] = useState('')
  const [maintenanceStart, setMaintenanceStart] = useState('')
  const [maintenanceEnd, setMaintenanceEnd] = useState('')
  const [sendingMaintenance, setSendingMaintenance] = useState(false)

  const loadFn = useCallback(async () => {
    const [posts, reportList, verificationList, withdrawalList, activeUserList] = await Promise.all([
      getPendingRentalPosts(),
      getAdminReports(reportStatus),
      getAdminLandlordVerifications(LandlordVerificationStatus.Pending),
      getAdminWalletWithdrawals(WalletWithdrawalStatus.Pending),
      getAdminActiveUsers(),
    ])
    setPendingPosts(posts)
    setReports(reportList)
    setVerifications(verificationList)
    setWithdrawals(withdrawalList)
    setActiveUsers(activeUserList)
  }, [reportStatus])

  const { showLoader, onIntroComplete, error: loadError, disrupted, reload } = usePersistentLoad(
    loadFn,
    [reportStatus],
  )

  const loadPosts = () => void reload()
  const loadReports = () => void reload()
  const loadActiveUsers = useCallback(async () => {
    try {
      setActiveUsers(await getAdminActiveUsers())
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể cập nhật người đang hoạt động'))
    }
  }, [])

  useEffect(() => {
    if (tab !== 'active') return
    const timer = window.setInterval(() => void loadActiveUsers(), 30_000)
    return () => window.clearInterval(timer)
  }, [loadActiveUsers, tab])

  const handleTerminateSession = async (user: AdminActiveUser) => {
    const reason = terminationReasons[user.userId]?.trim()
    if (!reason) {
      setError('Vui lòng ghi lý do kết thúc phiên để người dùng hiểu và đối soát.')
      return
    }
    setTerminatingUserId(user.userId)
    try {
      await terminateAdminUserSession(user.userId, reason)
      setMessage(`Đã kết thúc phiên của ${user.displayName || 'người dùng'}.`)
      setTerminationTargetId(null)
      setTerminationReasons((current) => ({ ...current, [user.userId]: '' }))
      await loadActiveUsers()
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể kết thúc phiên đăng nhập'))
    } finally {
      setTerminatingUserId(null)
    }
  }

  const handleSendMaintenance = async () => {
    if (!maintenanceMessage.trim()) {
      setError('Vui lòng nhập nội dung bảo trì để người dùng biết cần chuẩn bị gì.')
      return
    }
    setSendingMaintenance(true)
    try {
      const result = await sendMaintenanceAnnouncement({
        title: maintenanceTitle.trim() || undefined,
        message: maintenanceMessage.trim(),
        scheduledStartAt: maintenanceStart ? new Date(maintenanceStart).toISOString() : undefined,
        scheduledEndAt: maintenanceEnd ? new Date(maintenanceEnd).toISOString() : undefined,
      })
      setMessage(`Đã gửi thông báo bảo trì đến ${result.recipientCount.toLocaleString('vi-VN')} tài khoản (${result.onlineRecipientCount.toLocaleString('vi-VN')} đang online).`)
      setMaintenanceMessage('')
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể gửi thông báo bảo trì'))
    } finally {
      setSendingMaintenance(false)
    }
  }

  const handleApprove = async (post: RentalPostSummary) => {
    const consentNote = consentVerificationNotes[post.id]?.trim()
    if (post.ownerConsentContact && !consentNote) {
      setError('Vui lòng ghi lại cách đã xác minh sự đồng ý của chủ nhà trước khi duyệt tin pass.')
      return
    }
    try {
      await approveRentalPost(post.id, post.ownerConsentContact ? consentNote : undefined)
      setMessage('Đã duyệt tin đăng.')
      setConsentVerificationNotes((current) => {
        const next = { ...current }
        delete next[post.id]
        return next
      })
      void loadPosts()
    } catch (err) {
      setError(getErrorMessage(err, 'Duyệt thất bại'))
    }
  }

  const handleRejectPost = async (postId: string) => {
    try {
      await rejectRentalPost(postId, rejectReason)
      setMessage('Đã từ chối tin đăng.')
      setRejectReason('')
      void loadPosts()
    } catch (err) {
      setError(getErrorMessage(err, 'Từ chối thất bại'))
    }
  }

  const handleResolveReport = async (reportId: string) => {
    try {
      await resolveReport(reportId, reportResolutionNotes[reportId]?.trim() || undefined)
      setMessage('Đã xác nhận vi phạm và lưu kết quả xử lý.')
      setReportResolutionNotes((current) => {
        const next = { ...current }
        delete next[reportId]
        return next
      })
      void loadReports()
    } catch (err) {
      setError(getErrorMessage(err, 'Xử lý thất bại'))
    }
  }

  const handleRejectReport = async (reportId: string) => {
    try {
      await rejectReport(reportId, reportResolutionNotes[reportId]?.trim() || undefined)
      setMessage('Đã kết luận nội dung không vi phạm.')
      setReportResolutionNotes((current) => {
        const next = { ...current }
        delete next[reportId]
        return next
      })
      void loadReports()
    } catch (err) {
      setError(getErrorMessage(err, 'Thao tác thất bại'))
    }
  }

  const handleCompleteWithdrawal = async (id: string) => {
    if (!resolutionNote.trim()) {
      setError('Vui lòng nhập mã giao dịch chuyển khoản trước khi xác nhận.')
      return
    }
    if (!window.confirm('Xác nhận tiền đã được chuyển tới đúng tài khoản người dùng?')) return
    try {
      await completeWalletWithdrawal(id, resolutionNote || undefined)
      setMessage('Đã xác nhận chuyển khoản thành công.')
      setResolutionNote('')
      void reload()
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể hoàn tất yêu cầu rút tiền.'))
    }
  }

  const handleRejectWithdrawal = async (id: string) => {
    if (!resolutionNote.trim()) {
      setError('Vui lòng nhập lý do từ chối để người dùng đối soát.')
      return
    }
    if (!window.confirm('Từ chối yêu cầu này và hoàn toàn bộ số tiền về ví?')) return
    try {
      await rejectWalletWithdrawal(id, resolutionNote || undefined)
      setMessage('Đã từ chối và hoàn tiền vào ví người dùng.')
      setResolutionNote('')
      void reload()
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể từ chối yêu cầu rút tiền.'))
    }
  }

  return (
    <div className="container page">
      <h1 className="page-title">Quản trị</h1>
      <p className="page-subtitle">Kiểm duyệt tin đăng và xử lý báo cáo</p>

      {(error || (loadError && !disrupted)) && (
        <div className="alert alert-error">{error || loadError}</div>
      )}
      {message && <div className="alert alert-success">{message}</div>}

      {showLoader ? (
        disrupted
          ? <HomejiLoader onIntroComplete={onIntroComplete} message={loadError} />
          : <ContentSkeleton variant="dashboard" label="Đang tải dữ liệu kiểm duyệt…" />
      ) : (
        <>
      <div className="tabs">
        <button type="button" className={`tab ${tab === 'posts' ? 'active' : ''}`} onClick={() => setTab('posts')}>
          Tin chờ duyệt ({pendingPosts.length})
        </button>
        <button type="button" className={`tab ${tab === 'reports' ? 'active' : ''}`} onClick={() => setTab('reports')}>
          Báo cáo <span className="admin-tab-badge">{reports.length}</span>
        </button>
        <button
          type="button"
          className={`tab ${tab === 'verifications' ? 'active' : ''}`}
          onClick={() => setTab('verifications')}
        >
          Xác minh chủ nhà ({verifications.length})
        </button>
        <button
          type="button"
          className={`tab ${tab === 'withdrawals' ? 'active' : ''}`}
          onClick={() => setTab('withdrawals')}
        >
          Rút tiền ({withdrawals.length})
        </button>
        <button type="button" className={`tab ${tab === 'active' ? 'active' : ''}`} onClick={() => setTab('active')}>
          Đang hoạt động ({activeUsers.filter((user) => user.isOnline).length})
        </button>
        <button type="button" className={`tab ${tab === 'maintenance' ? 'active' : ''}`} onClick={() => setTab('maintenance')}>
          Bảo trì
        </button>
      </div>

      {tab === 'maintenance' && (
        <section className="admin-maintenance-card card" aria-labelledby="maintenance-heading">
          <div className="admin-maintenance-intro">
            <span className="admin-maintenance-icon" aria-hidden>⚡</span>
            <div>
              <h2 id="maintenance-heading">Thông báo bảo trì toàn hệ thống</h2>
              <p>Gửi vào hộp thông báo của tất cả tài khoản và hiện ngay cho người đang online.</p>
            </div>
          </div>
          <div className="admin-maintenance-form">
            <label className="form-label" htmlFor="maintenance-title">Tiêu đề</label>
            <input id="maintenance-title" className="form-input" maxLength={200} value={maintenanceTitle} onChange={(event) => setMaintenanceTitle(event.target.value)} />
            <label className="form-label" htmlFor="maintenance-message">Nội dung thông báo</label>
            <textarea id="maintenance-message" className="form-textarea" maxLength={1000} rows={5} placeholder="Ví dụ: Homeji bảo trì từ 23:00 đến 23:30. Bạn vẫn có thể xem tin đã tải trước đó." value={maintenanceMessage} onChange={(event) => setMaintenanceMessage(event.target.value)} />
            <div className="admin-maintenance-schedule">
              <div>
                <label className="form-label" htmlFor="maintenance-start">Bắt đầu dự kiến</label>
                <input id="maintenance-start" className="form-input" type="datetime-local" value={maintenanceStart} onChange={(event) => setMaintenanceStart(event.target.value)} />
              </div>
              <div>
                <label className="form-label" htmlFor="maintenance-end">Kết thúc dự kiến</label>
                <input id="maintenance-end" className="form-input" type="datetime-local" value={maintenanceEnd} onChange={(event) => setMaintenanceEnd(event.target.value)} />
              </div>
            </div>
            <div className="admin-maintenance-footer">
              <small>Thông báo được lưu lại để người offline đọc sau khi đăng nhập.</small>
              <button type="button" className="btn btn-primary" disabled={sendingMaintenance} onClick={() => void handleSendMaintenance()}>
                {sendingMaintenance ? 'Đang gửi…' : 'Gửi đến toàn bộ user'}
              </button>
            </div>
          </div>
        </section>
      )}

      {tab === 'active' && (
        <div className="admin-list admin-presence-list">
          <div className="admin-presence-summary">
            <strong>{activeUsers.filter((user) => user.isOnline).length} người đang hoạt động</strong>
            <span>Tự cập nhật mỗi 30 giây · dựa trên kết nối realtime đang mở</span>
          </div>
          {activeUsers.length === 0 ? (
            <div className="empty-state card">Hiện chưa có người dùng đang kết nối.</div>
          ) : (
            activeUsers.map((user) => (
              <article key={user.userId} className={`card admin-item admin-presence-item${user.isOnline ? ' is-online' : ''}`}>
                <div className="admin-presence-user">
                  <span className="admin-presence-avatar" aria-hidden>
                    {(user.displayName || '?').slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <h3>{user.displayName || 'Người dùng'}</h3>
                    <p>{userRoleLabel[user.role] ?? 'Người dùng'}</p>
                    <small>Kết nối từ: {formatDate(user.lastSeenAt)}</small>
                  </div>
                </div>
                <div className="admin-presence-actions">
                  <span className={`badge ${user.isOnline ? 'badge-green' : 'badge-gray'}`}>
                    {user.isOnline ? 'Đang hoạt động' : 'Đã rời đi'}
                  </span>
                  {user.isOnline && user.userId !== profile?.id && (
                    terminationTargetId === user.userId ? (
                      <div className="admin-terminate-panel">
                        <textarea
                          className="form-textarea"
                          maxLength={300}
                          placeholder="Lý do kết thúc phiên…"
                          value={terminationReasons[user.userId] ?? ''}
                          onChange={(event) => setTerminationReasons((current) => ({ ...current, [user.userId]: event.target.value }))}
                        />
                        <div className="admin-actions">
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setTerminationTargetId(null)}>Hủy</button>
                          <button type="button" className="btn btn-danger btn-sm" disabled={terminatingUserId === user.userId} onClick={() => void handleTerminateSession(user)}>
                            {terminatingUserId === user.userId ? 'Đang kết thúc…' : 'Xác nhận kết thúc'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => setTerminationTargetId(user.userId)}>
                        Kết thúc phiên
                      </button>
                    )
                  )}
                </div>
              </article>
            ))
          )}
        </div>
      )}

      {tab === 'posts' && (
        <div className="admin-list">
          {pendingPosts.length === 0 ? (
            <div className="empty-state card">Không có tin chờ duyệt.</div>
          ) : (
            pendingPosts.map((post) => (
              <article key={post.id} className="card admin-item">
                <div>
                  {post.ownerConsentContact ? (
                    <>
                      <p className="alert alert-warning">
                        <strong>Pass phòng — cần xác minh chủ nhà:</strong>{' '}
                        {post.ownerConsentContact}
                      </p>
                      <label className="form-label" htmlFor={`consent-note-${post.id}`}>
                        Nhật ký xác minh bắt buộc
                      </label>
                      <textarea
                        id={`consent-note-${post.id}`}
                        className="form-textarea"
                        maxLength={500}
                        placeholder="Ví dụ: Đã gọi số trên hợp đồng lúc 14:30; chủ nhà xác nhận cho chuyển hợp đồng đến 01/02/2027."
                        value={consentVerificationNotes[post.id] ?? ''}
                        onChange={(event) => setConsentVerificationNotes((current) => ({
                          ...current,
                          [post.id]: event.target.value,
                        }))}
                      />
                    </>
                  ) : null}
                  <span className="badge badge-green">{rentalPostTypeLabel[post.type]}</span>
                  <h3>{post.title || 'Tin nháp'}</h3>
                  <p>{formatPrice(post.price)}/tháng · {post.area} m² · {post.address}</p>
                  <Link to={mapPostUrl(post.id)}>Xem trên bản đồ</Link>
                </div>
                <div className="admin-actions">
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => void handleApprove(post)}>
                    Duyệt
                  </button>
                  <input
                    className="form-input"
                    placeholder="Lý do từ chối"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => void handleRejectPost(post.id)}>
                    Từ chối
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      )}

      {tab === 'reports' && (
        <>
          <select
            className="form-select"
            style={{ maxWidth: 240, marginBottom: 16 }}
            value={reportStatus ?? ''}
            onChange={(e) => setReportStatus(e.target.value ? Number(e.target.value) as ReportStatus : undefined)}
          >
            <option value="">Tất cả</option>
            {Object.entries(reportStatusLabel).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          <div className="admin-list">
            {reports.length === 0 ? (
              <div className="empty-state card">Không có báo cáo.</div>
            ) : (
              reports.map((r) => (
                <article key={r.id} className="card admin-item admin-report-item">
                  <div className="admin-report-content">
                    <div className="admin-report-badges">
                      <span className="badge badge-gray">Báo cáo {reportTargetLabel[r.targetType].toLowerCase()}</span>
                      <span className="badge badge-blue">{reportStatusLabel[r.status]}</span>
                    </div>
                    <div className="admin-report-target">
                      {r.targetImagePath ? <img src={r.targetImagePath} alt="" loading="lazy" /> : <span className="admin-report-target-placeholder" aria-hidden>⌂</span>}
                      <div>
                        <h3>{r.targetDisplayName || reportTargetLabel[r.targetType]}</h3>
                        <span className="admin-report-target-caption">Nội dung được báo cáo</span>
                      </div>
                    </div>
                    <p className="admin-report-reporter">
                      <strong>Người gửi báo cáo:</strong> {r.reporterDisplayName || 'Không xác định'}
                    </p>
                    <dl className="admin-report-details">
                      <div>
                        <dt>Lý do</dt>
                        <dd>{cleanAdminReportText(r.reason) || 'Không ghi lý do'}</dd>
                      </div>
                      <div>
                        <dt>Chi tiết</dt>
                        <dd>{cleanAdminReportText(r.description) || 'Người báo cáo không nhập thêm chi tiết.'}</dd>
                      </div>
                    </dl>
                    {r.relatedRentalPostId && (
                      r.targetType === ReportTargetType.RentalPost
                      || r.targetType === ReportTargetType.RoommateInvitation
                      || r.targetType === ReportTargetType.RentalReview
                    ) ? (
                      <Link to={mapPostUrl(r.relatedRentalPostId)}>Mở nội dung bị báo cáo</Link>
                    ) : null}
                    {r.resolutionNote ? (
                      <p className="admin-report-resolution"><strong>Kết quả xử lý:</strong> {r.resolutionNote}</p>
                    ) : null}
                    <small>Gửi lúc {formatDate(r.createdAt)}</small>
                  </div>
                  {r.status === ReportStatus.Pending && (
                    <div className="admin-actions admin-report-actions">
                      <textarea
                        className="form-textarea"
                        placeholder="Ghi rõ cách đã kiểm tra hoặc lý do kết luận"
                        value={reportResolutionNotes[r.id] ?? ''}
                        onChange={(e) => setReportResolutionNotes((current) => ({
                          ...current,
                          [r.id]: e.target.value,
                        }))}
                        maxLength={500}
                      />
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => void handleResolveReport(r.id)}>
                        Xác nhận vi phạm
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => void handleRejectReport(r.id)}>
                        Không vi phạm
                      </button>
                    </div>
                  )}
                </article>
              ))
            )}
          </div>
        </>
      )}
      {tab === 'verifications' && (
        <div className="admin-list">
          {verifications.length === 0 ? (
            <div className="empty-state card">Không có yêu cầu xác minh chờ duyệt.</div>
          ) : (
            verifications.map((v) => (
              <article key={v.id} className="card admin-item">
                <div>
                  <span className="badge badge-gray">{landlordVerificationLabel[v.status]}</span>
                  <h3>{v.applicantDisplayName}</h3>
                  <p>{v.applicantNote || 'Không có ghi chú'}</p>
                  <p>
                    <a href={v.documentUrl} target="_blank" rel="noreferrer">
                      Xem giấy tờ
                    </a>
                  </p>
                  <small>{formatDate(v.createdAt)}</small>
                </div>
                <div className="admin-actions">
                  <input
                    className="form-input"
                    placeholder="Ghi chú duyệt"
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      void reviewLandlordVerification(v.id, { approved: true, note: resolutionNote || undefined })
                        .then(() => {
                          setMessage('Đã duyệt xác minh.')
                          void reload()
                        })
                        .catch((err) => setError(getErrorMessage(err, 'Duyệt thất bại')))
                    }}
                  >
                    Duyệt
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => {
                      void reviewLandlordVerification(v.id, { approved: false, note: resolutionNote || undefined })
                        .then(() => {
                          setMessage('Đã từ chối xác minh.')
                          void reload()
                        })
                        .catch((err) => setError(getErrorMessage(err, 'Từ chối thất bại')))
                    }}
                  >
                    Từ chối
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      )}
      {tab === 'withdrawals' && (
        <div className="admin-list">
          {withdrawals.length === 0 ? (
            <div className="empty-state card">Không có yêu cầu rút tiền chờ xử lý.</div>
          ) : (
            withdrawals.map((withdrawal) => (
              <article key={withdrawal.id} className="card admin-item">
                <div>
                  <span className="badge badge-blue">Chờ chuyển khoản</span>
                  <h3>{formatPrice(withdrawal.amount)}</h3>
                  <p><strong>{withdrawal.bankName}</strong> · {withdrawal.accountNumber}</p>
                  <p>Chủ tài khoản: <strong>{withdrawal.accountHolder}</strong></p>
                  <small>User ID: {withdrawal.userId} · {formatDate(withdrawal.createdAt)}</small>
                </div>
                <div className="admin-actions">
                  <input
                    className="form-input"
                    placeholder="Mã giao dịch hoặc lý do từ chối"
                    value={resolutionNote}
                    onChange={(event) => setResolutionNote(event.target.value)}
                    maxLength={300}
                  />
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => void handleCompleteWithdrawal(withdrawal.id)}
                  >
                    Xác nhận đã chuyển
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => void handleRejectWithdrawal(withdrawal.id)}
                  >
                    Từ chối & hoàn tiền
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      )}
        </>
      )}
    </div>
  )
}
