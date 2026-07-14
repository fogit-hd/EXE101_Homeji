import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { mapSectionUrl } from '../../lib/mapDeepLinks'
import './MobileTabBar.css'

type TabItem = {
  to: string
  end?: boolean
  label: string
  icon: string
}

export function MobileTabBar() {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) return null

  const tabs: TabItem[] = [
    { to: '/', end: true, label: 'Tìm phòng', icon: 'search' },
    { to: mapSectionUrl('saved'), label: 'Đã lưu', icon: 'bookmark' },
    { to: mapSectionUrl('invitations'), label: 'Ở ghép', icon: 'users' },
    { to: mapSectionUrl('notifications'), label: 'Thông báo', icon: 'bell' },
    { to: mapSectionUrl('profile'), label: 'Hồ sơ', icon: 'user' },
  ]

  return (
    <nav className="mobile-tabbar" aria-label="Điều hướng chính">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            `mobile-tabbar__item${isActive ? ' is-active' : ''}`
          }
        >
          <TabIcon name={tab.icon} />
          <span className="mobile-tabbar__label">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

function TabIcon({ name }: { name: string }) {
  switch (name) {
    case 'search':
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
          <path
            fill="currentColor"
            d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
          />
        </svg>
      )
    case 'bookmark':
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
          <path
            fill="currentColor"
            d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15-5-2.18L7 18V5h10v13z"
          />
        </svg>
      )
    case 'users':
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
          <path
            fill="currentColor"
            d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"
          />
        </svg>
      )
    case 'bell':
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
          <path
            fill="currentColor"
            d="M12 22c1.1 0 2-.9 2-2h-4a2 2 0 0 0 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"
          />
        </svg>
      )
    case 'user':
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
          <path
            fill="currentColor"
            d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
          />
        </svg>
      )
    default:
      return null
  }
}
