import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { ThemeSwitch } from '../theme/ThemeSwitch'
import { adminSectionInfo, adminSectionPath, adminSections, type AdminSection } from './adminSections'

type Props = {
  section: AdminSection
  counts: Partial<Record<AdminSection, number>>
  children: ReactNode
}

/** The admin's own frame: a navigation rail and a slim top bar, separate from the customer app chrome. */
export function AdminShell({ section, counts, children }: Props) {
  const { profile, logout } = useAuth()
  const navigate = useNavigate()
  const [railOpen, setRailOpen] = useState(false)
  const railId = useId()
  const toggleRef = useRef<HTMLButtonElement>(null)
  const info = adminSectionInfo(section)

  useEffect(() => {
    if (!railOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setRailOpen(false)
      toggleRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [railOpen])

  const signOut = () => {
    logout()
    void navigate('/', { replace: true })
  }

  return <div className={`admin-shell${railOpen ? ' is-rail-open' : ''}`} data-glass-exclude>
    <aside id={railId} className="admin-rail">
      <Link to="/admin" className="admin-rail__brand" onClick={() => setRailOpen(false)}>
        <img src="/brand/homeji-logo2.png" alt="" width={36} height={36} />
        <span><strong>Homeji</strong><small>Quản trị</small></span>
      </Link>
      <nav className="admin-nav" aria-label="Mục quản trị">
        <ul>{adminSections.map((item, index) => <li key={item.id}>
          {index === 0 || item.group !== adminSections[index - 1].group ? <span className="admin-nav__group">{item.group}</span> : null}
          <NavLink to={adminSectionPath(item.id)} end onClick={() => setRailOpen(false)}>
            <span>{item.label}</span>
            {counts[item.id] !== undefined ? <span className={`admin-nav__count${counts[item.id] ? ' has-items' : ''}`}>{counts[item.id]?.toLocaleString('vi-VN')}</span> : null}
          </NavLink>
        </li>)}</ul>
      </nav>
      <div className="admin-rail__account">
        <span className="admin-rail__avatar" aria-hidden>{(profile?.displayName || 'A').slice(0, 1).toUpperCase()}</span>
        <span className="admin-rail__who"><strong>{profile?.displayName || 'Quản trị viên'}</strong><small>Quản trị viên</small></span>
        <button type="button" className="admin-rail__signout" onClick={signOut}>Đăng xuất</button>
      </div>
    </aside>
    <button type="button" className="admin-shell__scrim" aria-label="Đóng danh mục" tabIndex={railOpen ? 0 : -1} onClick={() => setRailOpen(false)} />
    <div className="admin-shell__main">
      <header className="admin-topbar">
        <button ref={toggleRef} type="button" className="admin-nav__toggle" aria-expanded={railOpen} aria-controls={railId} onClick={() => setRailOpen(open => !open)}>
          <span aria-hidden>☰</span><span>Danh mục</span>
        </button>
        <div className="admin-topbar__title">
          <span>Quản trị · {info.group}</span>
          <h1>{info.title}</h1>
        </div>
        <div className="admin-topbar__tools">
          <Link className="admin-topbar__link" to="/?section=listings&view=map">Xem trang tìm phòng ↗</Link>
          <ThemeSwitch />
        </div>
      </header>
      <section className="admin-content" aria-label={info.title}>{children}</section>
    </div>
  </div>
}
