import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { UserRole } from '../api/types'
import { ga4Configured, privacySignalEnabled, readAnalyticsConsent, setAnalyticsConsent, setAnalyticsPage } from '../lib/ga4'
import './AnalyticsConsent.css'

export function AnalyticsConsent() {
  const route = useLocation()
  const { profile, isLoading } = useAuth()
  const [consent, setConsent] = useState(readAnalyticsConsent)
  const [editing, setEditing] = useState(false)
  useEffect(() => {
    const update = () => { setConsent(readAnalyticsConsent()); setEditing(false) }
    window.addEventListener('homeji:analytics-consent', update)
    window.addEventListener('storage', update)
    return () => {
      window.removeEventListener('homeji:analytics-consent', update)
      window.removeEventListener('storage', update)
    }
  }, [])
  useEffect(() => {
    setAnalyticsPage(route.pathname, route.search, isLoading || profile?.role === UserRole.Admin)
  }, [route.pathname, route.search, profile?.role, isLoading, consent])
  if (!ga4Configured) return null
  return <aside className="analytics-choice" aria-label="Lựa chọn thống kê">
    {editing || consent === 'unknown' ? <div className="analytics-choice__panel" role="region" aria-label="Đồng ý thống kê tùy chọn">
      <strong>Giúp Homeji hiểu trải nghiệm tìm phòng</strong>
      <p>Nếu bạn đồng ý, Homeji dùng Google Analytics để đo nhóm màn hình và thao tác, không gửi email, tin nhắn hay câu tìm kiếm của bạn. Bạn có thể đổi lựa chọn bất cứ lúc nào.</p>
      <Link to="/privacy">Chính sách quyền riêng tư</Link>
      {privacySignalEnabled() ? <p>Trình duyệt đang yêu cầu không theo dõi. Homeji sẽ giữ thống kê Google ở trạng thái tắt.</p> : null}
      <div className="analytics-choice__actions">
        <button type="button" className="btn btn-secondary" onClick={() => setAnalyticsConsent('rejected')}>Từ chối thống kê</button>
        <button type="button" className="btn btn-primary" disabled={privacySignalEnabled()} onClick={() => setAnalyticsConsent('accepted')}>Đồng ý thống kê</button>
      </div>
    </div> : <button type="button" className="btn btn-secondary btn-sm analytics-choice__trigger" data-glass-exclude="" onClick={() => setEditing(true)}>Tùy chọn thống kê</button>}
  </aside>
}
