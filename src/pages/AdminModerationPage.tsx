import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  approveRentalPost,
  getAdminReports,
  getPendingRentalPosts,
  rejectRentalPost,
  rejectReport,
  resolveReport,
  type RentalPostSummary,
  type Report,
} from '../api'
import { ReportStatus } from '../api/types'
import { HomejiLoader, usePersistentLoad } from '../components/HomejiLoader'
import { getErrorMessage } from '../lib/errors'
import {
  formatDate,
  formatPrice,
  reportStatusLabel,
  reportTargetLabel,
  rentalPostTypeLabel,
} from '../lib/labels'

export function AdminModerationPage() {
  const [pendingPosts, setPendingPosts] = useState<RentalPostSummary[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [tab, setTab] = useState<'posts' | 'reports'>('posts')
  const [reportStatus, setReportStatus] = useState<ReportStatus | undefined>(ReportStatus.Pending)
  const [rejectReason, setRejectReason] = useState('')
  const [resolutionNote, setResolutionNote] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const loadFn = useCallback(async () => {
    const [posts, reportList] = await Promise.all([
      getPendingRentalPosts(),
      getAdminReports(reportStatus),
    ])
    setPendingPosts(posts)
    setReports(reportList)
  }, [reportStatus])

  const { showLoader, onIntroComplete, error: loadError, disrupted, reload } = usePersistentLoad(
    loadFn,
    [reportStatus],
  )

  const loadPosts = () => void reload()
  const loadReports = () => void reload()

  const handleApprove = async (postId: string) => {
    try {
      await approveRentalPost(postId)
      setMessage('Đã duyệt tin đăng.')
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

  return (
    <div className="container page">
      <h1 className="page-title">Quản trị</h1>
      <p className="page-subtitle">Kiểm duyệt tin đăng và xử lý báo cáo</p>

      {(error || (loadError && !disrupted)) && (
        <div className="alert alert-error">{error || loadError}</div>
      )}
      {message && <div className="alert alert-success">{message}</div>}

      {showLoader ? (
        <HomejiLoader
          onIntroComplete={onIntroComplete}
          message={disrupted ? loadError : undefined}
        />
      ) : (
        <>
      <div className="tabs">
        <button type="button" className={`tab ${tab === 'posts' ? 'active' : ''}`} onClick={() => setTab('posts')}>
          Tin chờ duyệt ({pendingPosts.length})
        </button>
        <button type="button" className={`tab ${tab === 'reports' ? 'active' : ''}`} onClick={() => setTab('reports')}>
          Báo cáo
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
                  <span className="badge badge-green">{rentalPostTypeLabel[post.type]}</span>
                  <h3>{post.title || 'Tin nháp'}</h3>
                  <p>{formatPrice(post.price)}/tháng · {post.area} m² · {post.address}</p>
                  <Link to={`/posts/${post.id}`}>Xem chi tiết</Link>
                </div>
                <div className="admin-actions">
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => void handleApprove(post.id)}>
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
        </>
      )}
    </div>
  )
}
