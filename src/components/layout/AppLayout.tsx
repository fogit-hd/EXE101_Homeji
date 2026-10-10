import { useLayoutEffect, useRef } from 'react'
import { Outlet, useLocation, useNavigationType } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { isExploreMapMode } from '../chrome/exploreMode'
import { isMapSectionRedirectPath } from '../../lib/mapDeepLinks'
import { AppShell } from '../shell/AppShell'
import { Navbar } from './Navbar'
import { SiteFooter } from './SiteFooter'
import './footer.css'
import './AppLayout.css'

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
      location.pathname === '/payments/wait' ||
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

  const outletRef = useRef<HTMLDivElement>(null)
  // Camera bounds, filters and message IDs must not replay the page transition.
  const destination = `${location.pathname}:${new URLSearchParams(location.search).get('section') ?? 'home'}`
  useLayoutEffect(() => {
    const node = outletRef.current
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (isMapPeer || reduced.matches || !node?.animate) return
    // Opacity only: transforming this ancestor breaks sticky and fixed descendants.
    const animation = node.animate([{ opacity: .3 }, { opacity: 1 }], {
      duration: 240, easing: 'cubic-bezier(.16,1,.3,1)',
    })
    const cancel = () => { if (reduced.matches) animation.cancel() }
    reduced.addEventListener('change', cancel)
    return () => { animation.cancel(); reduced.removeEventListener('change', cancel) }
  }, [destination, isMapPeer])

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
          ref={outletRef}
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
      <SiteFooter compact={isMapPeer || isMessagesWorkspace} />
    </div>
  )
}
