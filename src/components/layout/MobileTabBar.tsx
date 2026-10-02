import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { exploreListUrl, isExploreListMode } from '../chrome/exploreMode'
import { mapSectionUrl } from '../../lib/mapDeepLinks'
import './MobileTabBar.css'

/**
 * Optional mobile bottom tabs (same 5 primary destinations as AppChrome).
 * AppChrome already renders the live bottom bar; this module stays for reuse /
 * tests and must stay in sync with PRIMARY in AppChrome.
 * Map is a separate destination (`/?section=listings`), not a primary tab.
 */
type TabItem = {
  id: string
  to: string
  end?: boolean
  label: string
  icon: string
  matchSection?: string
}

const TABS: TabItem[] = [
  { id: 'hub', to: '/', end: true, label: 'Trang chủ', icon: 'hub' },
  {
    id: 'explore',
    to: exploreListUrl(),
    label: 'Khám phá',
    icon: 'explore',
  },
  {
    id: 'market',
    to: mapSectionUrl('marketplace'),
    label: 'Chợ đồ',
    icon: 'market',
    matchSection: 'marketplace',
  },
  {
    id: 'invite',
    to: mapSectionUrl('invitations'),
    label: 'Ở ghép',
    icon: 'invite',
    matchSection: 'invitations',
  },
  {
    id: 'messages',
    to: mapSectionUrl('messages'),
    label: 'Tin nhắn',
    icon: 'messages',
    matchSection: 'messages',
  },
]

function isTabActive(tab: TabItem, pathname: string, search: string): boolean {
  const section = new URLSearchParams(search).get('section')
  const post = new URLSearchParams(search).get('post')
  if (tab.id === 'hub') return pathname === '/' && !section && !post
  if (tab.id === 'explore') return isExploreListMode(pathname, search)
  if (tab.matchSection) return pathname === '/' && section === tab.matchSection
  return false
}

export function MobileTabBar() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) return null

  return (
    <nav className="mobile-tabbar" aria-label="Điều hướng chính">
      {TABS.map((tab) => {
        const active = isTabActive(tab, location.pathname, location.search)
        return (
          <NavLink
            key={tab.id}
            to={tab.to}
            end={tab.end}
            className={`mobile-tabbar__item${active ? ' is-active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <TabIcon name={tab.icon} />
            <span>{tab.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}

function TabIcon({ name }: { name: string }) {
  const common = {
    viewBox: '0 0 24 24',
    width: 22,
    height: 22,
    'aria-hidden': true as const,
  }
  switch (name) {
    case 'hub':
      return (
        <svg {...common}>
          <path
            fill="currentColor"
            d="M12 3 4 9v12h6v-6h4v6h6V9l-8-6zm0 2.2 6 4.5V19h-2v-6H8v6H6v-9.3l6-4.5z"
          />
        </svg>
      )
    case 'explore':
      return (
        <svg {...common}>
          <path fill="currentColor" d="M4 6h16v2H4V6zm0 5h10v2H4v-2zm0 5h16v2H4v-2z" />
        </svg>
      )
    case 'invite':
      return (
        <svg {...common}>
          <path
            fill="currentColor"
            d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"
          />
        </svg>
      )
    case 'market':
      return (
        <svg {...common}>
          <path
            fill="currentColor"
            d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM7.2 14h9.9c.7 0 1.4-.4 1.7-1l3.3-6.1c.2-.4 0-.9-.5-.9H6.2L5.3 4H2v2h2l3.6 7.6L6.2 16c-.2.3-.2.7 0 1 .2.3.6.5 1 .5h12v-2H7.4l.8-1.5z"
          />
        </svg>
      )
    case 'messages':
      return (
        <svg {...common}>
          <path
            fill="currentColor"
            d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z"
          />
        </svg>
      )
    default:
      return null
  }
}
