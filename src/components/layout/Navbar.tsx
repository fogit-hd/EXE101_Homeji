import { SellerOrderAlertsSlot } from '../marketplace/SellerOrderAlerts'
import { useState, type ComponentProps } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { UserRole } from '../../api/types'
import { mapSectionUrl } from '../../lib/mapDeepLinks'
import { ThemeSwitch } from '../theme/ThemeSwitch'
import './Navbar.css'

function NavLink({ to, className = '', ...props }: ComponentProps<typeof Link>) {
  const location = useLocation()
  const target = typeof to === 'string' ? to : `${to.pathname ?? location.pathname}${to.search ?? ''}`
  const [pathname, search = ''] = target.split('?')
  const active = pathname === location.pathname && new URLSearchParams(search).get('section') === new URLSearchParams(location.search).get('section')
  return <Link {...props} to={to} className={`${className}${active ? ' active' : ''}`} aria-current={active ? 'page' : undefined} />
}

export function Navbar() {
  const { isAuthenticated, profile, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const isGuestLanding = !isAuthenticated && location.pathname === '/'
  const isMapHome = isAuthenticated && location.pathname === '/'

  // Guest landing + map home: chrome lives in page / omnibox hamburger
  if (isGuestLanding || isMapHome) return null

  const handleLogout = () => {
    setMenuOpen(false)
    logout()
    navigate('/login')
  }

  const closeMenu = () => setMenuOpen(false)

  return (
    <header className="navbar" data-glass-exclude>
      <div className="container navbar-inner">
        <Link to="/" className="navbar-brand" onClick={closeMenu}>
          <img
            src="/brand/homeji-logo2.png"
            alt="Homeji"
            className="navbar-brand__logo"
            width={140}
            height={40}
          />
          <span className="navbar-brand__word">Homeji<span>Ở gần, sống vui.</span></span>
        </Link>

        <nav className="navbar-links navbar-links--desktop" aria-label="Điều hướng chính">
          <NavLink to={isAuthenticated ? '/' : '/explore'}>
            Tìm phòng
          </NavLink>
          {isAuthenticated && (
            <>
              <NavLink to={mapSectionUrl('saved')}>Đã lưu</NavLink>
              <NavLink to={mapSectionUrl('invitations')}>Ở ghép</NavLink>
              <NavLink to={mapSectionUrl('notifications')}>Thông báo</NavLink>
              <NavLink to={mapSectionUrl('payments')}>Thanh toán</NavLink>
              <NavLink to="/referrals">Mời bạn <span className="navbar-gift-dot" aria-hidden="true" /></NavLink>
              {profile?.role === UserRole.Landlord && (
                <NavLink to="/posts/new">Đăng tin</NavLink>
              )}
              {profile?.role === UserRole.Admin && (
                <NavLink to="/admin">Quản trị</NavLink>
              )}
            </>
          )}
        </nav>

        <div className="navbar-actions navbar-actions--desktop">
          {isAuthenticated ? (
            <details className="navbar-account" key={location.key}
              onBlur={event => {
                if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false
              }}
              onKeyDown={event => {
                if (event.key === 'Escape') {
                  event.currentTarget.open = false
                  event.currentTarget.querySelector('summary')?.focus()
                }
              }}>
              <summary className="navbar-profile">
                <span className="navbar-avatar" aria-hidden="true">{(profile?.displayName ?? 'H').trim().split(/\s+/).slice(-1)[0]?.slice(0, 1)}</span>
                <span className="navbar-account__name">{profile?.displayName ?? 'Hồ sơ'}</span><span aria-hidden="true">⌄</span>
              </summary>
              <div className="navbar-account__panel">
                <Link to={mapSectionUrl('profile')}>Hồ sơ của bạn</Link>
                <Link to="/referrals">Mời bạn & voucher</Link>
                <button type="button" onClick={handleLogout}>Đăng xuất</button>
              </div>
            </details>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost">
                Đăng nhập
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Tạo tài khoản
              </Link>
            </>
          )}
        </div>

        {isAuthenticated ? <SellerOrderAlertsSlot /> : null}
        <ThemeSwitch />
        <button
          type="button"
          className={`navbar-menu-btn${menuOpen ? ' is-open' : ''}`}
          aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {menuOpen && (
        <>
          <button
            type="button"
            className="navbar-drawer-backdrop"
            aria-label="Đóng menu"
            onClick={closeMenu}
          />
          <div className="navbar-drawer" role="dialog" aria-modal="true">
            <nav className="navbar-drawer__nav">
              {isAuthenticated ? (
                <>
                  <NavLink to="/" onClick={closeMenu}>
                    Tìm phòng
                  </NavLink>
                  <NavLink to={mapSectionUrl('saved')} onClick={closeMenu}>
                    Đã lưu
                  </NavLink>
                  <NavLink to={mapSectionUrl('invitations')} onClick={closeMenu}>
                    Ở ghép
                  </NavLink>
                  <NavLink to={mapSectionUrl('notifications')} onClick={closeMenu}>
                    Thông báo
                  </NavLink>
                  <NavLink to={mapSectionUrl('payments')} onClick={closeMenu}>
                    Thanh toán
                  </NavLink>
                  <NavLink to="/referrals" onClick={closeMenu}>Mời bạn & voucher</NavLink>
                  {profile?.role === UserRole.Landlord && (
                    <NavLink to="/posts/new" onClick={closeMenu}>
                      Đăng tin
                    </NavLink>
                  )}
                  {profile?.role === UserRole.Admin && (
                    <NavLink to="/admin" onClick={closeMenu}>
                      Quản trị
                    </NavLink>
                  )}
                  <NavLink to={mapSectionUrl('profile')} onClick={closeMenu}>
                    {profile?.displayName ?? 'Hồ sơ'}
                  </NavLink>
                  <button type="button" className="btn btn-secondary" onClick={handleLogout}>
                    Đăng xuất
                  </button>
                </>
              ) : (
                <>
                  <NavLink to="/explore" onClick={closeMenu}>
                    Tìm phòng
                  </NavLink>
                  <Link to="/login" className="btn btn-ghost" onClick={closeMenu}>
                    Đăng nhập
                  </Link>
                  <Link to="/register" className="btn btn-primary" onClick={closeMenu}>
                    Tạo tài khoản
                  </Link>
                </>
              )}
            </nav>
          </div>
        </>
      )}
    </header>
  )
}
