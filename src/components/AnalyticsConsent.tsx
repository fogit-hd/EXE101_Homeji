import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { UserRole } from '../api/types'
import { ga4Configured, privacySignalEnabled, readAnalyticsConsent, setAnalyticsConsent, setAnalyticsPage } from '../lib/ga4'
import './AnalyticsConsent.css'

const OPEN_SETTINGS = 'homeji:analytics-settings'

export function AnalyticsPreferencesButton() {
  if (!ga4Configured) return null
  return <button type="button" className="btn btn-secondary" aria-controls="homeji-analytics-settings" onClick={() => window.dispatchEvent(new Event(OPEN_SETTINGS))}>Tùy chọn thống kê</button>
}

export function AnalyticsConsent() {
  const route = useLocation()
  const { profile, isLoading } = useAuth()
  const [consent, setConsent] = useState(readAnalyticsConsent)
  const [editing, setEditing] = useState(false)
  const panel = useRef<HTMLDivElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const close = () => { setEditing(false); returnFocus.current?.focus(); returnFocus.current = null }
  useEffect(() => {
    const update = () => { setConsent(readAnalyticsConsent()); setEditing(false); returnFocus.current?.focus(); returnFocus.current = null }
    const open = () => { returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setEditing(true) }
    window.addEventListener(OPEN_SETTINGS, open)
    window.addEventListener('homeji:analytics-consent', update)
    window.addEventListener('storage', update)
    return () => {
      window.removeEventListener(OPEN_SETTINGS, open)
      window.removeEventListener('homeji:analytics-consent', update)
      window.removeEventListener('storage', update)
    }
  }, [])
  useEffect(() => { if (editing) panel.current?.focus() }, [editing])
  useEffect(() => {
    setAnalyticsPage(route.pathname, route.search, isLoading || profile?.role === UserRole.Admin)
  }, [route.pathname, route.search, profile?.role, isLoading, consent])
  if (!ga4Configured || (!editing && consent !== 'unknown')) return null
  return <aside className="analytics-choice" aria-label="Lựa chọn thống kê">
    <div ref={panel} id="homeji-analytics-settings" tabIndex={-1} className="analytics-choice__panel" role="region" aria-label="Đồng ý thống kê tùy chọn" onKeyDown={event => { if (editing && event.key === 'Escape') close() }}>
      <strong>Giúp Homeji hiểu trải nghiệm tìm phòng</strong>
      <p>Nếu bạn đồng ý, Homeji dùng Google Analytics để đo nhóm màn hình và thao tác, không gửi email, tin nhắn hay câu tìm kiếm của bạn. Bạn có thể đổi lựa chọn bất cứ lúc nào.</p>
      <Link to="/privacy">Chính sách quyền riêng tư</Link>
      {privacySignalEnabled() ? <p>Trình duyệt đang yêu cầu không theo dõi. Homeji sẽ giữ thống kê Google ở trạng thái tắt.</p> : null}
      <div className="analytics-choice__actions">
        <button type="button" className="btn btn-secondary" onClick={() => setAnalyticsConsent('rejected')}>Từ chối thống kê</button>
        <button type="button" className="btn btn-primary" disabled={privacySignalEnabled()} onClick={() => setAnalyticsConsent('accepted')}>Đồng ý thống kê</button>
        {editing ? <button type="button" className="btn btn-secondary" onClick={close}>Đóng tùy chọn</button> : null}
      </div>
    </div>
  </aside>
}
