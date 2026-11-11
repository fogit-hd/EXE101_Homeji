import { SiteLocationBootstrap } from './SiteLocationBootstrap'
import { SellerOrderAlertsProvider } from '../marketplace/SellerOrderAlerts'
import { PremiumLaunchOffer } from '../payments/PremiumLaunchOffer'
import { SourceRoomDetailsHost } from '../map/listings/SourceRoomDetailsHost'
import { ProfileSetupNotice } from '../auth/ProfileSetupNotice'
import { lazy, Suspense, useEffect, useLayoutEffect, useRef } from 'react'
import { ConfirmDialogHost } from '../ui/ConfirmDialogHost'
import { documentTitleFor } from '../../lib/documentTitle'
import { RouteSkeleton } from '../skeletons/RouteSkeleton'
import { Outlet, useLocation, useNavigationType } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { isExploreMapMode } from '../chrome/exploreMode'
import { isMapSectionRedirectPath } from '../../lib/mapDeepLinks'
import { isAdminPath } from '../admin/adminSections'
import { Navbar } from './Navbar'
import { MobileTabBar } from './MobileTabBar'
import { SiteFooter } from './SiteFooter'
import './footer.css'
import './AppLayout.css'

const AppShell = lazy(() => import('../shell/AppShell').then(module => ({ default: module.AppShell })))
const VoiceCallProvider = lazy(() => import('../../contexts/VoiceCallContext').then(module => ({ default: module.VoiceCallProvider })))

export function AppLayout() {
  const location = useLocation()
  const navType = useNavigationType()
  const { isAuthenticated, needsProfileSetup } = useAuth()
  const isProfile = location.pathname === '/profile' || new URLSearchParams(location.search).get('section') === 'profile'
  const isAuthCinema =
    location.pathname === '/login' || location.pathname === '/register'
  const isGuestLanding = location.pathname === '/' && !isAuthenticated
  /** The admin workspace brings its own rail and top bar instead of the customer chrome. */
  const isAdminWorkspace = isAuthenticated && isAdminPath(location.pathname)
  const isAuthedApp =
    isAuthenticated &&
    !isAuthCinema &&
    (location.pathname === '/' ||
      isMapSectionRedirectPath(location.pathname) ||
      location.pathname === '/payments/wait' ||
      location.pathname.startsWith('/posts'))
  /** Peer height for the map destination (not Khám phá list / view=list). */
  const isMapPeer =
    isAuthenticated &&
    isExploreMapMode(location.pathname, location.search)
  /** Messages fills the viewport under the bar; other sections keep document scroll. */
  const isMessagesWorkspace =
    isAuthenticated &&
    location.pathname === '/' &&
    new URLSearchParams(location.search).get('section') === 'messages'

  useEffect(() => { document.title = documentTitleFor(location.pathname, location.search) }, [location.pathname, location.search])

  const outletRef = useRef<HTMLDivElement>(null)
  // Camera bounds, filters and message IDs must not replay the page transition.
  const destination = `${isAdminWorkspace ? '/admin' : location.pathname}:${new URLSearchParams(location.search).get('section') ?? 'home'}`
  useLayoutEffect(() => {
    if (isMapPeer || !outletRef.current) return
    // Opacity only: transforming this ancestor breaks sticky and fixed descendants.
    const element = outletRef.current
    if (typeof element.animate === 'function') {
      const controls = element.animate(
        [{ opacity: 0 }, { opacity: 1 }],
        { duration: 380, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
      )
      return () => controls.cancel()
    }
  }, [destination, isMapPeer])

  const content = (
    <SellerOrderAlertsProvider enabled={isAuthenticated && !needsProfileSetup && !isAuthCinema}>
      <div
        className={[
          'app-shell',
          isAuthenticated ? 'app-shell--authed' : '',
          isAuthedApp ? 'app-shell--product' : '',
          isMapPeer ? 'app-shell--map-peer' : '',
          isMessagesWorkspace ? 'app-shell--messages' : '',
          isGuestLanding ? 'app-shell--guest-landing' : '',
          isAuthCinema ? 'app-shell--auth-cinema' : '',
          isAdminWorkspace ? 'app-shell--admin' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {isAdminWorkspace ? null : isAuthedApp ? <Suspense fallback={<div aria-hidden="true" style={{ height: 76 }} />}><AppShell /></Suspense> : <Navbar />}
        <SiteLocationBootstrap enabled={!isAuthCinema} />
        {!isAuthCinema && !isAdminWorkspace ? <PremiumLaunchOffer /> : null}
        <SourceRoomDetailsHost />
        <ConfirmDialogHost />
        <main className={isAuthedApp ? 'main-content app-main' : 'main-content'}>
          {isAuthenticated && needsProfileSetup && !isProfile && !isAuthCinema ? <ProfileSetupNotice /> : null}
          <div
            ref={outletRef}
            /* Keep HomePage mounted across hub / map / feature switches on `/`. */
            key={location.pathname === '/' ? 'home-root' : isAdminWorkspace ? 'admin-root' : location.pathname}
            className={
              isMapPeer ? 'route-outlet route-outlet--map-peer' : 'route-outlet'
            }
            data-nav={navType}
          >
            <Suspense fallback={<RouteSkeleton />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
        {isAdminWorkspace || isAuthCinema ? null : <MobileTabBar />}
        {isAdminWorkspace ? null : <SiteFooter compact={isMapPeer || isMessagesWorkspace} />}
      </div>
    </SellerOrderAlertsProvider>
  )

  if (!isAuthenticated) {
    return content
  }

  return (
    <Suspense fallback={content}>
      <VoiceCallProvider>{content}</VoiceCallProvider>
    </Suspense>
  )
}
