import { Suspense, useId, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { HomejiAiButton } from '../components/chrome/HomejiAiButton'
import { SellerOrderAlertsSlot } from '../components/marketplace/SellerOrderAlerts'
import { ContextualSearch } from '../components/shell/ContextualSearch'
import { NotificationsSkeleton } from '../components/skeletons/PageSkeletons'
import { NotificationsPage } from '../pages/deferredPages'
import { notificationTargetHref } from '../lib/notificationTarget'
import { MobileAccountSheet, MobileAvatar } from './MobileAccountSheet'
import { initialsOf } from './initials'
import { MobileSheet } from './MobileSheet'
import { mobilePageTitle } from './mobilePageTitle'
import { useUnreadCounts } from './useUnreadCounts'
import '../components/shell/shell.css'
import './mobile-header.css'

/** Phone header: logo, where you are, and four actions. Navigation lives in the bottom tab bar. */
export function MobileHeader() {
  const { profile, isAuthenticated } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const routeKey = `${location.pathname}${location.search}`
  const { unreadNotifications, refreshKey, applyReadChange } = useUnreadCounts(isAuthenticated, routeKey)
  const [sheet, setSheet] = useState<'none' | 'account' | 'notifications'>('none')
  const [sheetRoute, setSheetRoute] = useState(routeKey)
  if (sheetRoute !== routeKey) {
    setSheetRoute(routeKey)
    setSheet('none')
  }
  const notifyHeadingId = useId()
  const title = mobilePageTitle(location.pathname, location.search)
  const isHome = title === 'Homeji'
  const displayName = profile?.displayName?.trim() || 'Tài khoản'
  const bellLabel = unreadNotifications > 0 ? `Thông báo, ${unreadNotifications} chưa đọc` : 'Thông báo'

  return (
    <header className="m-header">
      {/* Home shows the brand; elsewhere the tab bar already leads home, so the title gets the room. */}
      {isHome ? (
        <Link to="/" className="m-header__logo" aria-label="Homeji — Trang chủ" title="Homeji — Trang chủ">
          <img src="/brand/homeji-logo2.png" alt="" width={32} height={32} />
        </Link>
      ) : null}
      <p className={`m-header__title${isHome ? ' m-header__title--brand' : ''}`}>{title}</p>
      <div className="m-header__actions">
        <ContextualSearch />
        <HomejiAiButton />
        <SellerOrderAlertsSlot />
        <button
          type="button"
          className={`m-header__icon${unreadNotifications > 0 ? ' is-hot' : ''}`}
          aria-label={bellLabel}
          title={bellLabel}
          aria-haspopup="dialog"
          aria-expanded={sheet === 'notifications'}
          onClick={() => setSheet('notifications')}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16zM10 20.5a2 2 0 0 0 4 0" />
          </svg>
          {unreadNotifications > 0 ? (
            <span className="m-header__badge" aria-hidden="true">{unreadNotifications > 99 ? '99+' : unreadNotifications}</span>
          ) : null}
        </button>
        <button
          type="button"
          className="m-header__avatar"
          aria-label="Tài khoản và menu"
          title="Tài khoản và menu"
          aria-haspopup="dialog"
          aria-expanded={sheet === 'account'}
          onClick={() => setSheet('account')}
        >
          <MobileAvatar key={`${profile?.id ?? 'account'}:${profile?.avatarPath ?? ''}`} src={profile?.avatarPath} initials={initialsOf(displayName)} />
        </button>
      </div>

      <MobileSheet open={sheet === 'notifications'} onClose={() => setSheet('none')} title="Thông báo" hideTitle labelledBy={notifyHeadingId} size="full" className="m-notify-sheet">
        <Suspense fallback={<NotificationsSkeleton tabs={false} />}>
          <NotificationsPage
            surface="popup"
            headingId={notifyHeadingId}
            refreshKey={refreshKey}
            onOpenRelated={(notification) => {
              const href = notificationTargetHref(notification)
              if (!href) return
              setSheet('none')
              navigate(href)
            }}
            onReadStateChange={applyReadChange}
          />
        </Suspense>
      </MobileSheet>
      <MobileAccountSheet open={sheet === 'account'} onClose={() => setSheet('none')} />
    </header>
  )
}
