import './pages.css'
import './ProfilePage.css'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { AdminAnalyticsDashboard } from '../components/admin/AdminAnalyticsDashboard'
import { AdminExportsPanel } from '../components/admin/AdminExportsPanel'
import { AdminHome } from '../components/admin/AdminHome'
import { AdminPremiumPricingPanel } from '../components/admin/AdminPremiumPricingPanel'
import { AdminPostsQueue, AdminReportsQueue, AdminVerificationsQueue, AdminWithdrawalsQueue } from '../components/admin/AdminQueueViews'
import { AdminRegistrationsPanel } from '../components/admin/AdminRegistrationsPanel'
import { AdminShell } from '../components/admin/AdminShell'
import { AdminMaintenancePanel, AdminPresencePanel } from '../components/admin/AdminSystemViews'
import { AiListingReviewPanel } from '../components/admin/AiListingReviewPanel'
import { adminSectionFromSlug, adminSectionInfo, adminSectionPath, type AdminSection } from '../components/admin/adminSections'
import { useAdminWorkspace, type AdminWorkspace } from '../components/admin/useAdminWorkspace'
import '../components/admin/AdminTaskFocus.css'
import { HomejiLoader } from '../components/HomejiLoader'
import { AdminAnalyticsSkeleton, AdminSkeleton } from '../components/skeletons/PageSkeletons'
import { PageNotice } from '../components/toast/PageNotice'
import './AdminWorkspace.css'

/** Sections that list queue items the admin can search within. */
const searchable: Partial<Record<AdminSection, keyof AdminWorkspace['counts']>> = {
  posts: 'posts', reports: 'reports', verifications: 'verifications', withdrawals: 'withdrawals', active: 'active',
}
/** Sections drawn from the shared queue load; the rest fetch their own data. */
const queueBacked: AdminSection[] = ['posts', 'reports', 'verifications', 'withdrawals', 'active', 'maintenance']
/** Sections that bring their own heading. */
const selfTitled: AdminSection[] = ['home', 'analytics', 'aiReviews', 'pricing']

export function AdminModerationPage() {
  const { section: slug } = useParams()
  const section = adminSectionFromSlug(slug)
  return section ? <AdminWorkspaceView section={section} /> : <Navigate to="/admin" replace />
}

function AdminWorkspaceView({ section }: { section: AdminSection }) {
  const navigate = useNavigate()
  const ws = useAdminWorkspace(section, next => { void navigate(adminSectionPath(next)) })
  const info = adminSectionInfo(section)
  const searchKey = searchable[section]
  const visibleCount = searchKey ? {
    posts: ws.visiblePosts.length, reports: ws.visibleReports.length, verifications: ws.visibleVerifications.length,
    withdrawals: ws.visibleWithdrawals.length, active: ws.visibleUsers.length,
  }[searchKey] : 0
  const usesQueues = queueBacked.includes(section)

  return <div className="account-surface admin-workspace">
    <AdminShell section={section} counts={ws.showLoader || ws.loadError ? {} : ws.counts}>
      {!selfTitled.includes(section) ? <header className="admin-section-heading">
        <div><span className="admin-section-kicker">{info.group}</span><h2>{info.title}</h2><p>{info.description}</p></div>
        {usesQueues ? <button type="button" className="btn btn-secondary btn-sm" disabled={ws.showLoader || ws.pendingAction !== null} onClick={() => void ws.reload()}>Làm mới</button> : null}
      </header> : null}
      {searchKey ? <div className="admin-queue-tools"><label htmlFor="admin-queue-search">Tìm trong danh sách</label>
        <div className="admin-queue-search"><input id="admin-queue-search" type="search" className="form-input" placeholder={section === 'withdrawals' ? 'Tên, ngân hàng hoặc số tài khoản…' : 'Nhập tên hoặc nội dung…'} value={ws.query} onChange={event => ws.setQuery(event.target.value)} />
          {ws.query ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => ws.setQuery('')}>Xóa tìm kiếm</button> : null}</div>
        {!ws.showLoader && !ws.loadError ? <small role="status">{visibleCount} mục trong danh sách{ws.query ? ' khớp tìm kiếm' : ''}</small> : null}
      </div> : null}
      <PageNotice message={ws.error || (ws.loadError && !ws.disrupted ? ws.loadError : '')} tone="error" />
      <PageNotice message={ws.message} tone="success" />
      {ws.taskNotice ? <p role="status">{ws.taskNotice}</p> : null}
      {ws.pendingAction ? <p className="admin-saving" role="status">Đang lưu kết quả xử lý…</p> : null}

      {section === 'home' ? <AdminHome ws={ws} /> : null}
      {section === 'analytics' ? <>
        {ws.analyticsError ? <div className="admin-load-error" role="alert"><strong>Chưa cập nhật được báo cáo sản phẩm</strong><p>{ws.analyticsError}</p>
          <button type="button" className="btn btn-secondary" disabled={ws.analyticsLoading} onClick={ws.retryAnalytics}>{ws.analyticsLoading ? 'Đang tải lại…' : 'Thử lại'}</button>
        </div> : null}
        {ws.analytics && (!ws.analyticsError || ws.analytics.periodDays === ws.analyticsDays)
          ? <AdminAnalyticsDashboard data={ws.analytics} days={ws.analytics.periodDays} loading={ws.analyticsLoading} onDaysChange={ws.changeAnalyticsDays} />
          : ws.analyticsLoading ? <AdminAnalyticsSkeleton /> : null}
      </> : null}
      {section === 'aiReviews' ? <AiListingReviewPanel /> : null}
      {section === 'registrations' ? <AdminRegistrationsPanel /> : null}
      {section === 'pricing' ? <AdminPremiumPricingPanel /> : null}
      {section === 'exports' ? <AdminExportsPanel /> : null}
      {usesQueues ? ws.showLoader ? (
        ws.disrupted ? <HomejiLoader onIntroComplete={ws.onIntroComplete} message={ws.loadError} /> : <AdminSkeleton withHeader={false} />
      ) : <>
        {section === 'posts' ? <AdminPostsQueue ws={ws} /> : null}
        {section === 'reports' ? <AdminReportsQueue ws={ws} /> : null}
        {section === 'verifications' ? <AdminVerificationsQueue ws={ws} /> : null}
        {section === 'withdrawals' ? <AdminWithdrawalsQueue ws={ws} /> : null}
        {section === 'active' ? <AdminPresencePanel ws={ws} /> : null}
        {section === 'maintenance' ? <AdminMaintenancePanel ws={ws} /> : null}
      </> : null}
    </AdminShell>
  </div>
}
