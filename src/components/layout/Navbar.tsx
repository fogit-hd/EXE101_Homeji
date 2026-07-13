import { useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { UserRole } from '../../api/types'
import './Navbar.css'

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
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="navbar-brand" onClick={closeMenu}>
          <img
            src="/brand/homeji-logo.png"
            alt="Homeji"
            className="navbar-brand__logo"
            width={140}
            height={40}
          />
        </Link>

        <nav className="navbar-links navbar-links--desktop">
          <NavLink to={isAuthenticated ? '/' : '/explore'} end={isAuthenticated}>
            Tìm phòng
          </NavLink>
          {isAuthenticated && (
            <>
              <NavLink to="/saved">Đã lưu</NavLink>
              <NavLink to="/invitations">Ở ghép</NavLink>
              <NavLink to="/notifications">Thông báo</NavLink>
              <NavLink to="/payments">Thanh toán</NavLink>
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
            <>
              <NavLink to="/profile" className="navbar-profile">
                {profile?.displayName ?? 'Hồ sơ'}
              </NavLink>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleLogout}>
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost">
                Đăng nhập
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Bắt đầu ngay
              </Link>
            </>
          )}
        </div>

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
                  <NavLink to="/" end onClick={closeMenu}>
                    Tìm phòng
                  </NavLink>
                  <NavLink to="/saved" onClick={closeMenu}>
                    Đã lưu
                  </NavLink>
                  <NavLink to="/invitations" onClick={closeMenu}>
                    Ở ghép
                  </NavLink>
                  <NavLink to="/notifications" onClick={closeMenu}>
                    Thông báo
                  </NavLink>
                  <NavLink to="/payments" onClick={closeMenu}>
                    Thanh toán
                  </NavLink>
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
                  <NavLink to="/profile" onClick={closeMenu}>
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
                    Bắt đầu ngay
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
