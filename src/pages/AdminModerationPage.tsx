import './pages.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  approveRentalPost,
  completeWalletWithdrawal,
  getAdminActiveUsers,
  getAdminLandlordVerifications,
  getAdminProductAnalytics,
  getAdminReports,
  getAdminWalletWithdrawals,
  getPendingRentalPosts,
  rejectRentalPost,
  rejectReport,
  rejectWalletWithdrawal,
  resolveReport,
  reviewLandlordVerification,
  sendMaintenanceAnnouncement,
  terminateAdminUserSession,
  type AdminActiveUser,
  type AdminProductAnalytics,
  type LandlordVerification,
  type RentalPostSummary,
  type Report,
  type WalletWithdrawal,
} from '../api'
import { LandlordVerificationStatus, ReportStatus, ReportTargetType, WalletWithdrawalStatus } from '../api/types'
import { AdminAnalyticsDashboard } from '../components/admin/AdminAnalyticsDashboard'
import { AdminOperationsSummary } from '../components/admin/AdminOperationsSummary'
import '../components/admin/AdminTaskFocus.css'
import { AdminAssistant } from '../components/ai/AdminAssistant'
import { PageFrame } from '../components/chrome'
import { HomejiLoader } from "../components/HomejiLoader"
import { usePersistentLoad } from "../components/HomejiLoader.logic"
import { AdminAnalyticsSkeleton, AdminSkeleton } from '../components/skeletons/PageSkeletons'
import { PageNotice } from '../components/toast/PageNotice'
import { ChoicePicker } from '../components/ui/ChoicePicker'
import { AdminWorkspaceNav } from '../components/admin/AdminWorkspaceNav'
import { AiListingReviewPanel } from '../components/admin/AiListingReviewPanel'
import './AdminWorkspace.css'
import { useAuth } from '../contexts/AuthContext'
import { aiFeatureFlags } from '../lib/aiFeatureFlags'
import { getErrorMessage } from '../lib/errors'
import {
  formatDate,
  formatPrice,
  landlordVerificationLabel,
  rentalPostTypeLabel,
  reportStatusLabel,
  reportTargetLabel,
  userRoleLabel,
} from '../lib/labels'
import { mapPostUrl } from '../lib/mapDeepLinks'
import { cleanAdminReportText } from "./AdminModerationPage.logic"
import './ProfilePage.css'

export function AdminModerationPage() {
  const { profile } = useAuth()
  const [pendingPosts, setPendingPosts] = useState<RentalPostSummary[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [verifications, setVerifications] = useState<LandlordVerification[]>([])
  const [withdrawals, setWithdrawals] = useState<WalletWithdrawal[]>([])
  const [activeUsers, setActiveUsers] = useState<AdminActiveUser[]>([])
  const [analytics, setAnalytics] = useState<AdminProductAnalytics | null>(null)
  const [analyticsDays, setAnalyticsDays] = useState(30)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [analyticsError, setAnalyticsError] = useState('')
  const [analyticsAttempt, setAnalyticsAttempt] = useState(0)
  const [tab, setTab] = useState<'overview' | 'posts' | 'reports' | 'verifications' | 'withdrawals' | 'active' | 'maintenance' | 'aiReviews'>('overview')
  const [reportStatus, setReportStatus] = useState<ReportStatus | undefined>(ReportStatus.Pending)
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({})
  const [withdrawalNotes, setWithdrawalNotes] = useState<Record<string, string>>({})
  const [verificationNotes, setVerificationNotes] = useState<Record<string, string>>({})
  const [query, setQuery] = useState('')
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const actionLock = useRef(false)
  const [reportResolutionNotes, setReportResolutionNotes] = useState<Record<string, string>>({})
  const [consentVerificationNotes, setConsentVerificationNotes] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [taskNotice, setTaskNotice] = useState('')
  const [terminationTargetId, setTerminationTargetId] = useState<string | null>(null)
  const [terminationReasons, setTerminationReasons] = useState<Record<string, string>>({})
  const [terminatingUserId, setTerminatingUserId] = useState<string | null>(null)
  const [maintenanceTitle, setMaintenanceTitle] = useState('Bảo trì hệ thống Homeji')
  const [maintenanceMessage, setMaintenanceMessage] = useState('')
  const [maintenanceStart, setMaintenanceStart] = useState('')
  const [maintenanceEnd, setMaintenanceEnd] = useState('')
  const [sendingMaintenance, setSendingMaintenance] = useState(false)
  const [queueSnapshot, setQueueSnapshot] = useState<{ revision: number; reportStatus: ReportStatus | undefined }>({ revision: 0, reportStatus: ReportStatus.Pending })
  const taskFocusRef = useRef<{ kind: 'posts' | 'reports'; id: string; afterRevision: number } | null>(null)

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
    setQueueSnapshot(current => ({ revision: current.revision + 1, reportStatus }))
  }, [reportStatus])

  const { showLoader, onIntroComplete, error: loadError, disrupted, reload } = usePersistentLoad(
    loadFn,
    [reportStatus],
  )

  const openAssistantTask = (kind: 'posts' | 'reports', id: string) => {
    setTaskNotice('')
    taskFocusRef.current = { kind, id, afterRevision: queueSnapshot.revision + 1 }
    setTab(kind)
    setQuery('')
    if (kind === 'reports') setReportStatus(ReportStatus.Pending)
    void reload()
  }
  useEffect(() => {
    const target = taskFocusRef.current
    if (!target) return
    if (tab !== target.kind) { taskFocusRef.current = null; return }
    if (showLoader || queueSnapshot.revision < target.afterRevision
      || (target.kind === 'reports' && queueSnapshot.reportStatus !== ReportStatus.Pending)) return
    taskFocusRef.current = null
    const row = document.getElementById(`admin-${target.kind}-${target.id}`)
    if (row) {
      row.focus({ preventScroll: true })
      row.scrollIntoView({ block: 'center', behavior: 'instant' })
    } else {
      setTaskNotice('Mục này không còn trong hàng chờ mới nhất. Danh sách đã được cập nhật để bạn tiếp tục kiểm tra.')
    }
  }, [tab, showLoader, queueSnapshot])
  useEffect(() => {
    let cancelled = false
    void getAdminProductAnalytics(analyticsDays)
      .then((result) => {
        if (!cancelled) {
          setAnalytics(result)
          setAnalyticsError('')
        }
      })
      .catch((err) => {
        if (!cancelled) setAnalyticsError(getErrorMessage(err, 'Không thể tải dữ liệu điều hành sản phẩm'))
      })
      .finally(() => {
        if (!cancelled) setAnalyticsLoading(false)
      })
    return () => { cancelled = true }
  }, [analyticsDays, analyticsAttempt])

  const handleAnalyticsDaysChange = (days: number) => {
    if (analyticsLoading || days === analyticsDays) return
    setAnalyticsLoading(true)
    setAnalyticsDays(days)
  }
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
      await reload()
    } catch (err) {
      setError(getErrorMessage(err, 'Duyệt thất bại'))
    }
  }

  const handleRejectPost = async (postId: string) => {
    try {
      await rejectRentalPost(postId, rejectReasons[postId] ?? '')
      setMessage('Đã từ chối tin đăng.')
      setRejectReasons(current => ({ ...current, [postId]: '' }))
      await reload()
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
      await reload()
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
      await reload()
    } catch (err) {
      setError(getErrorMessage(err, 'Thao tác thất bại'))
    }
  }

  const handleCompleteWithdrawal = async (id: string) => {
    const resolutionNote = withdrawalNotes[id]?.trim() ?? ''
    if (!resolutionNote.trim()) {
      setError('Vui lòng nhập mã giao dịch chuyển khoản trước khi xác nhận.')
      return
    }
    if (!window.confirm('Xác nhận tiền đã được chuyển tới đúng tài khoản người dùng?')) return
    try {
      await completeWalletWithdrawal(id, resolutionNote || undefined)
      setMessage('Đã xác nhận chuyển khoản thành công.')
      setWithdrawalNotes(current => ({ ...current, [id]: '' }))
      await reload()
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể hoàn tất yêu cầu rút tiền.'))
    }
  }

  const handleRejectWithdrawal = async (id: string) => {
    const resolutionNote = withdrawalNotes[id]?.trim() ?? ''
    if (!resolutionNote.trim()) {
      setError('Vui lòng nhập lý do từ chối để người dùng đối soát.')
      return
    }
    if (!window.confirm('Từ chối yêu cầu này và hoàn toàn bộ số tiền về ví?')) return
    try {
      await rejectWalletWithdrawal(id, resolutionNote || undefined)
      setMessage('Đã từ chối và hoàn tiền vào ví người dùng.')
      setWithdrawalNotes(current => ({ ...current, [id]: '' }))
      await reload()
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể từ chối yêu cầu rút tiền.'))
    }
  }

  const selectTab = (next: typeof tab) => {
    setTab(next)
    setQuery('')
    setTaskNotice('')
  }
  // Lock synchronously so rapid clicks cannot submit the same decision twice.
  const runAction = async (key: string, action: () => Promise<void>) => {
    if (actionLock.current) return
    actionLock.current = true
    setPendingAction(key)
    setError('')
    setMessage('')
    try { await action() }
    finally { actionLock.current = false; setPendingAction(null) }
  }
  const handleReviewVerification = async (id: string, approved: boolean) => {
    try {
      await reviewLandlordVerification(id, { approved, note: verificationNotes[id]?.trim() || undefined })
      setMessage(approved ? 'Đã duyệt xác minh.' : 'Đã từ chối xác minh.')
      setVerificationNotes(current => ({ ...current, [id]: '' }))
      await reload()
    } catch (err) { setError(getErrorMessage(err, 'Không thể lưu kết quả xác minh.')) }
  }
  const counts = { posts: pendingPosts.length, reports: reports.length, verifications: verifications.length,
    withdrawals: withdrawals.length, active: activeUsers.filter(user => user.isOnline).length }
  const sectionInfo = {
    aiReviews: ['AI kiểm tra tin', 'Kiểm tra lần lượt, giới hạn lượt gọi và xem lại kết quả.'],
    overview: ['Tổng quan sản phẩm', 'Hàng chờ, hoạt động và thị trường.'],
    posts: ['Tin chờ duyệt', 'Kiểm tra thông tin và sự đồng ý của chủ nhà trước khi duyệt.'],
    reports: ['Báo cáo', 'Đọc nội dung bị báo cáo, ghi lại kết quả kiểm tra rồi đưa ra kết luận.'],
    verifications: ['Xác minh chủ nhà', 'Đối chiếu giấy tờ và lưu ghi chú cho từng hồ sơ.'],
    withdrawals: ['Yêu cầu rút tiền', 'Đối chiếu người nhận và mã chuyển khoản trước khi xác nhận.'],
    active: ['Người đang hoạt động', 'Theo dõi kết nối và quản lý phiên đăng nhập.'],
    maintenance: ['Bảo trì', 'Soạn nội dung và thời gian dự kiến để thông báo cho người dùng.'],
  }
  const matches = (...values: (string | null | undefined)[]) => !query.trim()
    || values.some(value => value?.toLocaleLowerCase('vi-VN').includes(query.trim().toLocaleLowerCase('vi-VN')))
  const visiblePosts = pendingPosts.filter(post => matches(post.title, post.address))
  const visibleReports = reports.filter(report => matches(report.targetDisplayName, report.reporterDisplayName, report.reason, report.description))
  const visibleVerifications = verifications.filter(item => matches(item.applicantDisplayName, item.applicantNote))
  const visibleWithdrawals = withdrawals.filter(item => matches(item.accountHolder, item.accountNumber, item.bankName, item.userId))
  const visibleUsers = activeUsers.filter(user => matches(user.displayName))
  const visibleCounts = { posts: visiblePosts.length, reports: visibleReports.length, verifications: visibleVerifications.length,
    withdrawals: visibleWithdrawals.length, active: visibleUsers.length }
  const searchable = tab !== 'overview' && tab !== 'maintenance' && tab !== 'aiReviews'

  return (
    <PageFrame title="Điều hành Homeji" eyebrow="HOMEJI / ADMIN" lead="Nắm tình hình. Xử lý đúng việc."
      actions={<Link className="btn btn-secondary" to="/?section=listings&view=map">Xem trang tìm phòng ↗</Link>}
      className="account-surface admin-workspace">
      <div className="admin-layout" data-glass-exclude>
      <AdminWorkspaceNav selected={tab} counts={showLoader || loadError ? {} : counts} onSelect={selectTab} />
      <section className="admin-content" aria-label={sectionInfo[tab][0]}>
      {tab !== 'overview' && tab !== 'aiReviews' ? <header className="admin-section-heading">
        <div><span className="admin-section-kicker">Quản lý</span><h2>{sectionInfo[tab][0]}</h2><p>{sectionInfo[tab][1]}</p></div>
        <button type="button" className="btn btn-secondary btn-sm" disabled={showLoader || pendingAction !== null} onClick={() => void reload()}>Làm mới</button>
      </header> : null}
      {searchable ? <div className="admin-queue-tools"><label htmlFor="admin-queue-search">Tìm trong danh sách</label>
        <div className="admin-queue-search"><input id="admin-queue-search" type="search" className="form-input" placeholder={tab === 'withdrawals' ? 'Tên, ngân hàng hoặc số tài khoản…' : 'Nhập tên hoặc nội dung…'} value={query} onChange={event => setQuery(event.target.value)} />
        {query ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => setQuery('')}>Xóa tìm kiếm</button> : null}</div>
        {!showLoader && !loadError ? <small role="status">{visibleCounts[tab]} mục trong danh sách{query ? ' khớp tìm kiếm' : ''}</small> : null}
      </div> : null}
      <PageNotice message={error || (loadError && !disrupted ? loadError : '')} tone="error" />
      <PageNotice message={message} tone="success" />
      {taskNotice ? <p role="status">{taskNotice}</p> : null}
      {pendingAction ? <p className="admin-saving" role="status">Đang lưu kết quả xử lý…</p> : null}

      {tab === 'overview' ? (
        <>
          <AdminOperationsSummary counts={counts} reportLabel={reportStatus === undefined ? 'Tất cả trạng thái' : reportStatusLabel[reportStatus]}
            loading={showLoader} error={loadError || ''} onOpen={selectTab} />
          {loadError && !showLoader ? <button type="button" className="btn btn-secondary" onClick={() => void reload()}>Tải lại hàng chờ</button> : null}
          {aiFeatureFlags.adminSummary ? <AdminAssistant onOpen={openAssistantTask} onRefreshQueues={reload} /> : null}
          {analyticsError ? <div className="admin-load-error" role="alert"><strong>Chưa cập nhật được báo cáo sản phẩm</strong><p>{analyticsError}</p>
            <button type="button" className="btn btn-secondary" disabled={analyticsLoading} onClick={() => { setAnalyticsLoading(true); setAnalyticsAttempt((n) => n + 1) }}>{analyticsLoading ? 'Đang tải lại…' : 'Thử lại'}</button>
          </div> : null}
          {analytics && (!analyticsError || analytics.periodDays === analyticsDays) ? <AdminAnalyticsDashboard data={analytics} days={analytics.periodDays} loading={analyticsLoading} onDaysChange={handleAnalyticsDaysChange} /> : analyticsLoading ? <AdminAnalyticsSkeleton /> : null}
        </>
      ) : null}

      {tab === 'aiReviews' ? <AiListingReviewPanel /> : null}
      {tab !== 'overview' && tab !== 'aiReviews' && (showLoader ? (
        disrupted
          ? <HomejiLoader onIntroComplete={onIntroComplete} message={loadError} />
          : <AdminSkeleton withHeader={false} />
      ) : (
        <>

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
                {sendingMaintenance ? 'Đang gửi…' : 'Gửi thông báo cho tất cả tài khoản'}
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
          {visibleUsers.length === 0 ? (
            <div className="empty-state card">{query ? 'Không tìm thấy mục phù hợp. Thử từ khóa khác hoặc xóa tìm kiếm.' : 'Hiện chưa có người dùng đang kết nối.'}</div>
          ) : (
            visibleUsers.map((user) => (
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
                          aria-label={`Lý do kết thúc phiên: ${user.displayName}`}
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
          {visiblePosts.length === 0 ? (
            <div className="empty-state card">{query ? 'Không tìm thấy mục phù hợp. Thử từ khóa khác hoặc xóa tìm kiếm.' : 'Không có tin chờ duyệt.'}</div>
          ) : (
            visiblePosts.map((post) => (
              <article key={post.id} id={`admin-posts-${post.id}`} tabIndex={-1} className="card admin-item admin-task-target" aria-label={post.title || 'Tin chờ duyệt'}>
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
                        disabled={pendingAction !== null}
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
                  <Link to={mapPostUrl(post.id)} className="btn btn-ghost btn-sm">
                    Xem trên bản đồ
                  </Link>
                </div>
                <div className="admin-actions">
                  <button type="button" className="btn btn-primary btn-sm" disabled={pendingAction !== null} onClick={() => void runAction(post.id, () => handleApprove(post))}>
                    Duyệt
                  </button>
                  <label className="admin-review-label" htmlFor={`reject-${post.id}`}>Lý do nếu từ chối</label>
                  <input id={`reject-${post.id}`}
                    disabled={pendingAction !== null}
                    className="form-input"
                    placeholder="Lý do từ chối"
                    aria-label={`Lý do từ chối: ${post.title}`}
                    value={rejectReasons[post.id] ?? ''}
                    onChange={(e) => setRejectReasons(current => ({ ...current, [post.id]: e.target.value }))}
                  />
                  <button type="button" className="btn btn-danger btn-sm" disabled={pendingAction !== null} onClick={() => void runAction(post.id, () => handleRejectPost(post.id))}>
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
          <ChoicePicker
            disableGlass
            aria-label="Trạng thái báo cáo"
            className="form-select"
            style={{ maxWidth: 240, marginBottom: 16 }}
            value={reportStatus ?? ''}
            onChange={(e) => setReportStatus(e.target.value ? Number(e.target.value) as ReportStatus : undefined)}
          >
            <option value="">Tất cả</option>
            {Object.entries(reportStatusLabel).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </ChoicePicker>

          <div className="admin-list">
            {visibleReports.length === 0 ? (
              <div className="empty-state card">{query ? 'Không tìm thấy mục phù hợp. Thử từ khóa khác hoặc xóa tìm kiếm.' : 'Không có báo cáo.'}</div>
            ) : (
              visibleReports.map((r) => (
                <article key={r.id} id={`admin-reports-${r.id}`} tabIndex={-1} className="card admin-item admin-report-item admin-task-target" aria-label={`Báo cáo: ${r.targetDisplayName || 'Nội dung cần kiểm tra'}`}>
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
                      <label className="admin-review-label" htmlFor={`report-note-${r.id}`}>Kết quả kiểm tra</label>
                      <textarea id={`report-note-${r.id}`}
                        disabled={pendingAction !== null}
                        className="form-textarea"
                        aria-label={`Kết quả kiểm tra: ${r.targetDisplayName || 'Báo cáo'}`}
                        placeholder="Ghi rõ cách đã kiểm tra hoặc lý do kết luận"
                        value={reportResolutionNotes[r.id] ?? ''}
                        onChange={(e) => setReportResolutionNotes((current) => ({
                          ...current,
                          [r.id]: e.target.value,
                        }))}
                        maxLength={500}
                      />
                      <button type="button" className="btn btn-primary btn-sm" disabled={pendingAction !== null} onClick={() => void runAction(r.id, () => handleResolveReport(r.id))}>
                        Xác nhận vi phạm
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm" disabled={pendingAction !== null} onClick={() => void runAction(r.id, () => handleRejectReport(r.id))}>
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
          {visibleVerifications.length === 0 ? (
            <div className="empty-state card">{query ? 'Không tìm thấy mục phù hợp. Thử từ khóa khác hoặc xóa tìm kiếm.' : 'Không có yêu cầu xác minh chờ duyệt.'}</div>
          ) : (
            visibleVerifications.map((v) => (
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
                  <label className="admin-review-label" htmlFor={`verification-note-${v.id}`}>Ghi chú xử lý</label>
                  <input id={`verification-note-${v.id}`}
                    disabled={pendingAction !== null}
                    className="form-input"
                    placeholder="Ghi chú duyệt"
                    aria-label={`Ghi chú duyệt: ${v.applicantDisplayName}`}
                    value={verificationNotes[v.id] ?? ''}
                    onChange={(e) => setVerificationNotes(current => ({ ...current, [v.id]: e.target.value }))}
                  />
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={pendingAction !== null}
                    onClick={() => void runAction(v.id, () => handleReviewVerification(v.id, true))}
                  >
                    Duyệt
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    disabled={pendingAction !== null}
                    onClick={() => void runAction(v.id, () => handleReviewVerification(v.id, false))}
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
          {visibleWithdrawals.length === 0 ? (
            <div className="empty-state card">{query ? 'Không tìm thấy mục phù hợp. Thử từ khóa khác hoặc xóa tìm kiếm.' : 'Không có yêu cầu rút tiền chờ xử lý.'}</div>
          ) : (
            visibleWithdrawals.map((withdrawal) => (
              <article key={withdrawal.id} className="card admin-item">
                <div>
                  <span className="badge badge-blue">Chờ chuyển khoản</span>
                  <h3>{formatPrice(withdrawal.amount)}</h3>
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
                    disabled={pendingAction !== null}
                    className="form-input"
                    placeholder="Mã giao dịch hoặc lý do từ chối"
                    aria-label={`Mã giao dịch hoặc lý do từ chối: ${withdrawal.accountHolder}`}
                    value={withdrawalNotes[withdrawal.id] ?? ''}
                    onChange={(event) => setWithdrawalNotes(current => ({ ...current, [withdrawal.id]: event.target.value }))}
                    maxLength={300}
                  />
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={pendingAction !== null} onClick={() => void runAction(withdrawal.id, () => handleCompleteWithdrawal(withdrawal.id))}
                  >
                    Xác nhận đã chuyển
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    disabled={pendingAction !== null} onClick={() => void runAction(withdrawal.id, () => handleRejectWithdrawal(withdrawal.id))}
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
      ))}
      </section>
      </div>
    </PageFrame>
  )
}
