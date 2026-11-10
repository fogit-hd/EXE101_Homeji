import { useCallback, useEffect, useRef, useState } from 'react'
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
} from '../../api'
import { getAiReviews, type AiReviewDashboard } from '../../api/aiReviews'
import { LandlordVerificationStatus, ReportStatus, WalletWithdrawalStatus } from '../../api/types'
import { usePersistentLoad } from '../HomejiLoader.logic'
import { confirmDialog } from '../ui/confirmDialog'
import { getErrorMessage } from '../../lib/errors'
import type { AdminQueue, AdminSection } from './adminSections'

type Notes = Record<string, string>
/** `data` is absent when the status could not be read. */
export type AiReviewProbe = { data?: AiReviewDashboard; observedAt: number }
type TaskTarget ={ kind: AdminQueue; id: string; afterRevision: number; from: AdminSection }

const withoutKey = (notes: Notes, key: string) => {
  const next = { ...notes }
  delete next[key]
  return next
}

/**
 * Owns every admin queue, its drafts and its decisions. It lives above the section views so a
 * half-written note survives moving between sections, and so the sidebar counts and the home
 * screen read the same lists the queues show.
 */
export function useAdminWorkspace(section: AdminSection, openSection: (section: AdminSection) => void) {
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
  const [reportStatus, setReportStatus] = useState<ReportStatus | undefined>(ReportStatus.Pending)
  const [rejectReasons, setRejectReasons] = useState<Notes>({})
  const [withdrawalNotes, setWithdrawalNotes] = useState<Notes>({})
  const [verificationNotes, setVerificationNotes] = useState<Notes>({})
  const [reportResolutionNotes, setReportResolutionNotes] = useState<Notes>({})
  const [consentVerificationNotes, setConsentVerificationNotes] = useState<Notes>({})
  const [query, setQuery] = useState('')
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const actionLock = useRef(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [taskNotice, setTaskNotice] = useState('')
  const [terminationTargetId, setTerminationTargetId] = useState<string | null>(null)
  const [terminationReasons, setTerminationReasons] = useState<Notes>({})
  const [terminatingUserId, setTerminatingUserId] = useState<string | null>(null)
  const [maintenanceTitle, setMaintenanceTitle] = useState('Bảo trì hệ thống Homeji')
  const [maintenanceMessage, setMaintenanceMessage] = useState('')
  const [maintenanceStart, setMaintenanceStart] = useState('')
  const [maintenanceEnd, setMaintenanceEnd] = useState('')
  const [sendingMaintenance, setSendingMaintenance] = useState(false)
  const [queueSnapshot, setQueueSnapshot] = useState<{ revision: number; reportStatus: ReportStatus | undefined }>({ revision: 0, reportStatus: ReportStatus.Pending })
  const taskFocusRef = useRef<TaskTarget | null>(null)
  const [aiReview, setAiReview] = useState<AiReviewProbe | null>(null)

  // A search term or a notice belongs to the section it was typed in, whichever way the admin left it.
  const [shownSection, setShownSection] = useState(section)
  if (shownSection !== section) {
    setShownSection(section)
    setQuery('')
    setTaskNotice('')
    setError('')
    setMessage('')
  }

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

  const { showLoader, onIntroComplete, error: loadError, disrupted, reload } = usePersistentLoad(loadFn, [reportStatus])

  /** Opens a queue on one exact item, after a fresh load so a stale row is never focused. */
  const openTask = (kind: AdminQueue, id: string) => {
    taskFocusRef.current = { kind, id, afterRevision: queueSnapshot.revision + 1, from: section }
    setQuery('')
    setTaskNotice('')
    if (kind === 'reports') setReportStatus(ReportStatus.Pending)
    openSection(kind)
    void reload()
  }

  useEffect(() => {
    const target = taskFocusRef.current
    if (!target) return
    if (section !== target.kind) {
      // Still on the screen the task was opened from: the route change has not landed yet.
      if (section !== target.from) taskFocusRef.current = null
      return
    }
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
  }, [section, showLoader, queueSnapshot])

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

  // AI-flagged listings are human work too, so the shell and the home screen count them with the queues.
  useEffect(() => {
    let cancelled = false
    void getAiReviews()
      .then(data => { if (!cancelled) setAiReview({ data, observedAt: Date.now() }) })
      .catch(() => { if (!cancelled) setAiReview({ observedAt: Date.now() }) })
    return () => { cancelled = true }
  }, [queueSnapshot.revision])

  const changeAnalyticsDays =(days: number) => {
    if (analyticsLoading || days === analyticsDays) return
    setAnalyticsLoading(true)
    setAnalyticsDays(days)
  }
  const retryAnalytics = () => {
    setAnalyticsLoading(true)
    setAnalyticsAttempt(attempt => attempt + 1)
  }

  const loadActiveUsers = useCallback(async () => {
    try {
      setActiveUsers(await getAdminActiveUsers())
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể cập nhật người đang hoạt động'))
    }
  }, [])

  useEffect(() => {
    if (section !== 'active') return
    const timer = window.setInterval(() => void loadActiveUsers(), 30_000)
    return () => window.clearInterval(timer)
  }, [loadActiveUsers, section])

  const terminateSession = async (user: AdminActiveUser) => {
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
      setTerminationReasons(current => ({ ...current, [user.userId]: '' }))
      await loadActiveUsers()
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể kết thúc phiên đăng nhập'))
    } finally {
      setTerminatingUserId(null)
    }
  }

  const sendMaintenance = async () => {
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
      setMessage(`Đã công bố banner bảo trì và gửi thông báo đến ${result.recipientCount.toLocaleString('vi-VN')} tài khoản.`)
      setMaintenanceMessage('')
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể gửi thông báo bảo trì'))
    } finally {
      setSendingMaintenance(false)
    }
  }

  const approvePost = async (post: RentalPostSummary) => {
    const consentNote = consentVerificationNotes[post.id]?.trim()
    if (post.ownerConsentContact && !consentNote) {
      setError('Vui lòng ghi lại cách đã xác minh sự đồng ý của chủ nhà trước khi duyệt tin nhượng phòng.')
      return
    }
    try {
      await approveRentalPost(post.id, post.ownerConsentContact ? consentNote : undefined)
      setMessage('Đã duyệt tin đăng.')
      setConsentVerificationNotes(current => withoutKey(current, post.id))
      await reload()
    } catch (err) {
      setError(getErrorMessage(err, 'Chưa duyệt được tin. Vui lòng thử lại.'))
    }
  }

  const rejectPost = async (postId: string) => {
    try {
      await rejectRentalPost(postId, rejectReasons[postId] ?? '')
      setMessage('Đã từ chối tin đăng.')
      setRejectReasons(current => ({ ...current, [postId]: '' }))
      await reload()
    } catch (err) {
      setError(getErrorMessage(err, 'Chưa từ chối được tin. Vui lòng thử lại.'))
    }
  }

  const confirmReportViolation = async (reportId: string) => {
    try {
      await resolveReport(reportId, reportResolutionNotes[reportId]?.trim() || undefined)
      setMessage('Đã xác nhận vi phạm và lưu kết quả xử lý.')
      setReportResolutionNotes(current => withoutKey(current, reportId))
      await reload()
    } catch (err) {
      setError(getErrorMessage(err, 'Chưa xử lý được. Vui lòng thử lại.'))
    }
  }

  const dismissReport = async (reportId: string) => {
    try {
      await rejectReport(reportId, reportResolutionNotes[reportId]?.trim() || undefined)
      setMessage('Đã kết luận nội dung không vi phạm.')
      setReportResolutionNotes(current => withoutKey(current, reportId))
      await reload()
    } catch (err) {
      setError(getErrorMessage(err, 'Chưa thực hiện được. Vui lòng thử lại.'))
    }
  }

  const completeWithdrawal = async (id: string) => {
    const resolutionNote = withdrawalNotes[id]?.trim() ?? ''
    if (!resolutionNote) {
      setError('Vui lòng nhập mã giao dịch chuyển khoản trước khi xác nhận.')
      return
    }
    if (!await confirmDialog({ title: 'Xác nhận đã chuyển tiền?', message: 'Chỉ xác nhận khi tiền đã tới đúng tài khoản của người dùng.', confirmLabel: 'Đã chuyển tiền', danger: true })) return
    try {
      await completeWalletWithdrawal(id, resolutionNote)
      setMessage('Đã xác nhận chuyển khoản thành công.')
      setWithdrawalNotes(current => ({ ...current, [id]: '' }))
      await reload()
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể hoàn tất yêu cầu rút tiền.'))
    }
  }

  const rejectWithdrawal = async (id: string) => {
    const resolutionNote = withdrawalNotes[id]?.trim() ?? ''
    if (!resolutionNote) {
      setError('Vui lòng nhập lý do từ chối để người dùng đối soát.')
      return
    }
    if (!await confirmDialog({ title: 'Từ chối yêu cầu rút tiền?', message: 'Toàn bộ số tiền sẽ được hoàn về ví của người dùng.', confirmLabel: 'Từ chối và hoàn tiền', danger: true })) return
    try {
      await rejectWalletWithdrawal(id, resolutionNote)
      setMessage('Đã từ chối và hoàn tiền vào ví người dùng.')
      setWithdrawalNotes(current => ({ ...current, [id]: '' }))
      await reload()
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể từ chối yêu cầu rút tiền.'))
    }
  }

  const reviewVerification = async (id: string, approved: boolean) => {
    try {
      await reviewLandlordVerification(id, { approved, note: verificationNotes[id]?.trim() || undefined })
      setMessage(approved ? 'Đã duyệt xác minh.' : 'Đã từ chối xác minh.')
      setVerificationNotes(current => ({ ...current, [id]: '' }))
      await reload()
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể lưu kết quả xác minh.'))
    }
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

  const term = query.trim().toLocaleLowerCase('vi-VN')
  const matches = (...values: (string | null | undefined)[]) => !term
    || values.some(value => value?.toLocaleLowerCase('vi-VN').includes(term))
  const onlineCount = activeUsers.filter(user => user.isOnline).length

  // A malformed payload counts as unread rather than as zero work.
  const aiAttention = aiReview?.data?.settings ? aiReview.data.needsReview + aiReview.data.blocked : null

  return {
    aiReview, aiAttention,
    pendingPosts, reports, verifications, withdrawals, activeUsers, onlineCount,
    visiblePosts: pendingPosts.filter(post => matches(post.title, post.address)),
    visibleReports: reports.filter(report => matches(report.targetDisplayName, report.reporterDisplayName, report.reason, report.description)),
    visibleVerifications: verifications.filter(item => matches(item.applicantDisplayName, item.applicantNote)),
    visibleWithdrawals: withdrawals.filter(item => matches(item.accountHolder, item.accountNumber, item.bankName, item.userId)),
    visibleUsers: activeUsers.filter(user => matches(user.displayName)),
    counts: { posts: pendingPosts.length, reports: reports.length, verifications: verifications.length, withdrawals: withdrawals.length, active: onlineCount },
    showLoader, onIntroComplete, loadError, disrupted, reload,
    analytics, analyticsDays, analyticsLoading, analyticsError, changeAnalyticsDays, retryAnalytics,
    reportStatus, setReportStatus,
    query, setQuery, pendingAction, runAction,
    error, message, taskNotice,
    rejectReasons, setRejectReasons, consentVerificationNotes, setConsentVerificationNotes,
    reportResolutionNotes, setReportResolutionNotes, verificationNotes, setVerificationNotes,
    withdrawalNotes, setWithdrawalNotes,
    terminationTargetId, setTerminationTargetId, terminationReasons, setTerminationReasons, terminatingUserId,
    maintenanceTitle, setMaintenanceTitle, maintenanceMessage, setMaintenanceMessage,
    maintenanceStart, setMaintenanceStart, maintenanceEnd, setMaintenanceEnd, sendingMaintenance,
    openTask, approvePost, rejectPost, confirmReportViolation, dismissReport,
    completeWithdrawal, rejectWithdrawal, reviewVerification, terminateSession, sendMaintenance,
  }
}

export type AdminWorkspace = ReturnType<typeof useAdminWorkspace>
