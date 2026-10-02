import { useEffect } from 'react'
import { Outlet, useLocation, useNavigationType } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { isExploreMapMode } from '../chrome/exploreMode'
import { isMapSectionRedirectPath } from '../../lib/mapDeepLinks'
import { AppShell } from '../shell/AppShell'
import { Navbar } from './Navbar'
import './footer.css'
import './AppLayout.css'

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
  const isAuthCinema =
    location.pathname === '/login' || location.pathname === '/register'
  const isGuestLanding = location.pathname === '/' && !isAuthenticated
  const isAuthedApp =
    isAuthenticated &&
    !isAuthCinema &&
    (location.pathname === '/' ||
      isMapSectionRedirectPath(location.pathname) ||
      location.pathname.startsWith('/posts') ||
      location.pathname === '/admin')
  /** Peer height for the map destination (not Khám phá list / view=list). */
  const isMapPeer =
    isAuthenticated &&
    isExploreMapMode(location.pathname, location.search)
  /** Messages fills the viewport under the bar; other sections keep document scroll. */
  const isMessagesWorkspace =
    isAuthenticated &&
    location.pathname === '/' &&
    new URLSearchParams(location.search).get('section') === 'messages'

  useRouteViewTransition(location.pathname, !isMapPeer)

  return (
    <div
      className={[
        'app-shell',
        isAuthenticated ? 'app-shell--authed' : '',
        isAuthedApp ? 'app-shell--product' : '',
        isMapPeer ? 'app-shell--map-peer' : '',
        isMessagesWorkspace ? 'app-shell--messages' : '',
        isGuestLanding ? 'app-shell--guest-landing' : '',
        isAuthCinema ? 'app-shell--auth-cinema' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {isAuthedApp ? <AppShell /> : <Navbar />}
      <main className={isAuthedApp ? 'main-content app-main' : 'main-content'}>
        <div
          /* Keep HomePage mounted across hub / map / feature switches on `/`. */
          key={location.pathname === '/' ? 'home-root' : location.pathname}
          className={
            isMapPeer ? 'route-outlet route-outlet--map-peer' : 'route-outlet'
          }
          data-nav={navType}
        >
          <Outlet />
        </div>
      </main>
      {!isAuthedApp && !isGuestLanding && !isAuthCinema && (
        <footer className="site-footer">
          <div className="container">
            <p>Homeji — Nền tảng tìm phòng trọ & bạn ở ghép</p>
          </div>
        </footer>
      )}
    </div>
  )
}
