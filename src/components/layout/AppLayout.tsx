import { useEffect } from 'react'
import { Outlet, useLocation, useNavigationType } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { MobileTabBar } from './MobileTabBar'
import { Navbar } from './Navbar'
import './footer.css'

function useRouteViewTransition(pathname: string) {
  useEffect(() => {
    if (typeof document === 'undefined') return
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => { finished: Promise<void> }
    }
    if (typeof doc.startViewTransition !== 'function') return
    // Trigger a lightweight transition when the path changes (CSS handles visuals).
    try {
      doc.startViewTransition(() => {
        /* React already committed; this just enables the VT snapshot. */
      })
    } catch {
      /* ignore unsupported / interrupted transitions */
    }
  }, [pathname])
}

export function AppLayout() {
  const location = useLocation()
  const navType = useNavigationType()
  const { isAuthenticated } = useAuth()
  const isMapHome = location.pathname === '/' && isAuthenticated

  useRouteViewTransition(location.pathname)

  return (
    <div className={`app-shell${isAuthenticated ? ' app-shell--authed' : ''}${isMapHome ? ' app-shell--map' : ''}`}>
      <Navbar />
      <main className={isMapHome ? 'main-map-layout' : 'main-content'}>
        <div
          key={location.pathname}
          className={isMapHome ? undefined : 'route-outlet'}
          data-nav={navType}
        >
          <Outlet />
        </div>
      </main>
      {!isMapHome && (
        <footer className="site-footer">
          <div className="container">
            <p>Homeji — Nền tảng tìm phòng trọ & bạn ở ghép</p>
          </div>
        </footer>
      )}
      <MobileTabBar />
    </div>
  )
}
