import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
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
    { to: '/saved', label: 'Đã lưu', icon: 'bookmark' },
    { to: '/invitations', label: 'Ở ghép', icon: 'users' },
    { to: '/notifications', label: 'Thông báo', icon: 'bell' },
    { to: '/profile', label: 'Hồ sơ', icon: 'user' },
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
  const common = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }

  switch (name) {
    case 'search':
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
      )
    case 'bookmark':
      return (
        <svg {...common}>
          <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-3.5L6 20V5a1 1 0 0 1 1-1z" />
        </svg>
      )
    case 'users':
      return (
        <svg {...common}>
          <path d="M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1" />
          <circle cx="9.5" cy="8" r="3" />
          <path d="M20 19v-1a3.5 3.5 0 0 0-2.5-3.35" />
          <path d="M16.5 5.1a3 3 0 0 1 0 5.8" />
        </svg>
      )
    case 'bell':
      return (
        <svg {...common}>
          <path d="M6 9a6 6 0 0 1 12 0c0 7 3 7 3 7H3s3 0 3-7" />
          <path d="M10 19a2 2 0 0 0 4 0" />
        </svg>
      )
    case 'user':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 19a7 7 0 0 1 14 0" />
        </svg>
      )
    default:
      return null
  }
}
