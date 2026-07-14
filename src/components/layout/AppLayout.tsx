import { useEffect } from 'react'
import { Outlet, useLocation, useNavigationType } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { isMapSectionRedirectPath } from '../../lib/mapDeepLinks'
import { MobileTabBar } from './MobileTabBar'
import { Navbar } from './Navbar'
import './footer.css'

function useRouteViewTransition(pathname: string, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    if (typeof document === 'undefined') return
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => {
        finished: Promise<void>
        skipTransition?: () => void
      }
    }
    if (typeof doc.startViewTransition !== 'function') return

    try {
      const transition = doc.startViewTransition(() => {
        /* React already committed; this just enables the VT snapshot. */
      })
      // Interrupted/skipped transitions reject with AbortError — catch the promise.
      void transition.finished.catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        if (
          err &&
          typeof err === 'object' &&
          'name' in err &&
          (err as { name: string }).name === 'AbortError'
        ) {
          return
        }
      })
    } catch {
      /* ignore unsupported / interrupted transitions */
    }
  }, [pathname, enabled])
}

export function AppLayout() {
  const location = useLocation()
  const navType = useNavigationType()
  const { isAuthenticated } = useAuth()
  // Treat /payments (and other retired shells) as map chrome so payment return
  // URLs never flash Navbar + old page before Navigate to /?section=…
  const isMapHome =
    isAuthenticated &&
    (location.pathname === '/' || isMapSectionRedirectPath(location.pathname))
  const isGuestLanding = location.pathname === '/' && !isAuthenticated
  const isAuthCinema =
    location.pathname === '/login' || location.pathname === '/register'

  // Map home: never run View Transitions — they abort on every map paint/interaction.
  useRouteViewTransition(location.pathname, !isMapHome)

  return (
    <div
      className={`app-shell${isAuthenticated ? ' app-shell--authed' : ''}${isMapHome ? ' app-shell--map' : ''}${isGuestLanding ? ' app-shell--guest-landing' : ''}${isAuthCinema ? ' app-shell--auth-cinema' : ''}`}
    >
      <Navbar />
      <main className={isMapHome ? 'main-map-layout' : 'main-content'}>
        <div
          /* Stable key on map home — remounting Outlet remounts Google Map → GPU flash */
          key={isMapHome ? 'map-home' : location.pathname}
          className={isMapHome ? undefined : 'route-outlet'}
          data-nav={navType}
        >
          <Outlet />
        </div>
      </main>
      {!isMapHome && !isGuestLanding && !isAuthCinema && (
        <footer className="site-footer">
          <div className="container">
            <p>Homeji — Nền tảng tìm phòng trọ & bạn ở ghép</p>
          </div>
        </footer>
      )}
      {!isMapHome ? <MobileTabBar /> : null}
    </div>
  )
}
