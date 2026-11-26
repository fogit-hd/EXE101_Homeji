import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserRole } from '../api'
import { useAuth } from '../contexts/AuthContext'
import { ThemeSwitch } from '../components/theme/ThemeSwitch'
import { AccountWalletLink } from '../components/shell/AccountWalletLink'
import { navigationGroups, REFERRALS_NAV, type NavIconName } from '../components/shell/navigation'
import { ShellIcon } from '../components/shell/ShellIcons'
import { mapSectionUrl } from '../lib/mapDeepLinks'
import { MobileSheet } from './MobileSheet'
import { initialsOf } from './initials'
import './mobile-account.css'

type Item = { id: string; label: string; href: string; icon: NavIconName }

/** Home and Tìm phòng sit in the tab bar, so the sheet does not repeat them. */
const IN_TAB_BAR = new Set(['home', 'explore', 'roommates', 'messages'])

export function MobileAvatar({ src, initials }: { src?: string | null; initials: string }) {
  const [failed, setFailed] = useState(false)
  return src && !failed
    ? <img className="m-avatar" src={src} alt="" onError={() => setFailed(true)} />
    : <span className="m-avatar m-avatar--initials" aria-hidden="true">{initials}</span>
}

/** Everything the desktop "Danh mục" and account menus hold, as one phone sheet. */
export function MobileAccountSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, logout } = useAuth()
  const navigate = useNavigate()
  const themeRow = useRef<HTMLDivElement>(null)
  const displayName = profile?.displayName?.trim() || 'Tài khoản'
  const isAdmin = profile?.role === UserRole.Admin

  const groups: { label: string; items: Item[] }[] = [
    { label: 'Nhà ở', items: navigationGroups.find((g) => g.id === 'housing')?.items.filter((i) => !IN_TAB_BAR.has(i.id)) ?? [] },
    { label: 'Chợ Homeji', items: navigationGroups.find((g) => g.id === 'market')?.items ?? [] },
    {
      label: 'Tài khoản',
      items: [
        ...(isAdmin ? [{ id: 'admin', label: 'Quản trị', href: '/admin', icon: 'shield' as const }] : []),
        { id: 'subscription', label: 'Gói Premium', href: mapSectionUrl('payments'), icon: 'card' },
        { id: 'wanted', label: 'Tin tìm phòng', href: mapSectionUrl('wanted'), icon: 'megaphone' },
        { id: 'activities', label: 'Nhật ký hoạt động', href: mapSectionUrl('activities'), icon: 'activity' },
        { id: 'referrals', label: REFERRALS_NAV.label, href: REFERRALS_NAV.href, icon: REFERRALS_NAV.icon },
        { id: 'help', label: 'Trợ giúp', href: mapSectionUrl('help'), icon: 'search' },
      ],
    },
  ]

  return (
    <MobileSheet open={open} onClose={onClose} title="Tài khoản" size="full" className="m-account-sheet">
      <Link to={mapSectionUrl('profile')} className="m-account__head" onClick={onClose}>
        <MobileAvatar key={`sheet:${profile?.id ?? 'account'}:${profile?.avatarPath ?? ''}`} src={profile?.avatarPath} initials={initialsOf(displayName)} />
        <span className="m-account__who">
          <strong>{displayName}</strong>
          <small>{isAdmin ? 'Quản trị viên' : 'Xem và sửa hồ sơ'}</small>
        </span>
        <svg className="m-account__chev" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="m9 6 6 6-6 6" />
        </svg>
      </Link>

      <AccountWalletLink active={open} ownerId={profile?.id} onNavigate={onClose} itemRole="none" className="m-account__wallet" />

      {groups.map((group) => (
        <section key={group.label} className="m-account__group" aria-label={group.label}>
          <h3>{group.label}</h3>
          <ul>
            {group.items.map((item) => (
              <li key={item.id}>
                <Link to={item.href} className="m-account__item" onClick={onClose}>
                  <ShellIcon name={item.icon} />
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {/* The whole row toggles: tapping the words works like tapping the switch. */}
      <div
        ref={themeRow}
        className="m-account__theme"
        onClick={(event) => {
          if ((event.target as HTMLElement).closest('.theme-switch')) return
          themeRow.current?.querySelector<HTMLButtonElement>('.theme-switch')?.click()
        }}
      >
        <span aria-hidden="true">Giao diện tối</span>
        <ThemeSwitch />
      </div>

      <button
        type="button"
        className="m-account__logout"
        onClick={() => {
          onClose()
          logout()
          navigate('/login')
        }}
      >
        Đăng xuất
      </button>

      <nav className="m-account__legal" aria-label="Thông tin Homeji">
        <Link to="/privacy" onClick={onClose}>Quyền riêng tư</Link>
        <Link to="/terms" onClick={onClose}>Điều khoản</Link>
      </nav>
    </MobileSheet>
  )
}
