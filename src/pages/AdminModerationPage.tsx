import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  approveRentalPost,
  completeWalletWithdrawal,
  getAdminWalletWithdrawals,
  getAdminLandlordVerifications,
  getAdminReports,
  getPendingRentalPosts,
  rejectRentalPost,
  rejectWalletWithdrawal,
  rejectReport,
  resolveReport,
  reviewLandlordVerification,
  type LandlordVerification,
  type RentalPostSummary,
  type Report,
  type WalletWithdrawal,
} from '../api'
import { LandlordVerificationStatus, ReportStatus, WalletWithdrawalStatus } from '../api/types'
import { HomejiLoader, usePersistentLoad } from '../components/HomejiLoader'
import { ContentSkeleton } from '../components/ContentSkeleton'
import { getErrorMessage } from '../lib/errors'
import { mapPostUrl } from '../lib/mapDeepLinks'
import {
  formatDate,
  formatPrice,
  landlordVerificationLabel,
  reportStatusLabel,
  reportTargetLabel,
  rentalPostTypeLabel,
} from '../lib/labels'

export function AdminModerationPage() {
  const [pendingPosts, setPendingPosts] = useState<RentalPostSummary[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [verifications, setVerifications] = useState<LandlordVerification[]>([])
  const [withdrawals, setWithdrawals] = useState<WalletWithdrawal[]>([])
  const [tab, setTab] = useState<'posts' | 'reports' | 'verifications' | 'withdrawals'>('posts')
  const [reportStatus, setReportStatus] = useState<ReportStatus | undefined>(ReportStatus.Pending)
  const [rejectReason, setRejectReason] = useState('')
  const [resolutionNote, setResolutionNote] = useState('')
  const [consentVerificationNotes, setConsentVerificationNotes] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const loadFn = useCallback(async () => {
    const [posts, reportList, verificationList, withdrawalList] = await Promise.all([
      getPendingRentalPosts(),
      getAdminReports(reportStatus),
      getAdminLandlordVerifications(LandlordVerificationStatus.Pending),
      getAdminWalletWithdrawals(WalletWithdrawalStatus.Pending),
    ])
    setPendingPosts(posts)
    setReports(reportList)
    setVerifications(verificationList)
    setWithdrawals(withdrawalList)
  }, [reportStatus])

  const { showLoader, onIntroComplete, error: loadError, disrupted, reload } = usePersistentLoad(
    loadFn,
    [reportStatus],
  )

  const loadPosts = () => void reload()
  const loadReports = () => void reload()

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
      await resolveReport(reportId, resolutionNote)
      setMessage('Đã xử lý báo cáo.')
      void loadReports()
    } catch (err) {
      setError(getErrorMessage(err, 'Xử lý thất bại'))
    }
  }

  const handleRejectReport = async (reportId: string) => {
    try {
      await rejectReport(reportId, resolutionNote)
      setMessage('Đã từ chối báo cáo.')
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
          Báo cáo
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
      </div>

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
                <article key={r.id} className="card admin-item">
                  <div>
                    <span className="badge badge-gray">{reportTargetLabel[r.targetType]}</span>
                    <span className="badge badge-blue">{reportStatusLabel[r.status]}</span>
                    <p><strong>{r.reason}</strong></p>
                    <p>{r.description}</p>
                    <small>{formatDate(r.createdAt)}</small>
                  </div>
                  {r.status === ReportStatus.Pending && (
                    <div className="admin-actions">
                      <input
                        className="form-input"
                        placeholder="Ghi chú xử lý"
                        value={resolutionNote}
                        onChange={(e) => setResolutionNote(e.target.value)}
                      />
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => void handleResolveReport(r.id)}>
                        Xử lý
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => void handleRejectReport(r.id)}>
                        Từ chối
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
