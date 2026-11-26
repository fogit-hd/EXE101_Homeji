import { SiteLocationBootstrap } from './SiteLocationBootstrap'
import { SellerOrderAlertsProvider } from '../marketplace/SellerOrderAlerts'
import { PremiumLaunchOffer } from '../payments/PremiumLaunchOffer'
import { ProfileSetupNotice } from '../auth/ProfileSetupNotice'
import { lazy, Suspense, useEffect, useLayoutEffect, useRef } from 'react'
import { ConfirmDialogHost } from '../ui/ConfirmDialogHost'
import { documentTitleFor } from '../../lib/documentTitle'
import { RouteSkeleton } from '../skeletons/RouteSkeleton'
import { NavigationType, Outlet, useLocation, useNavigationType } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { isExploreMapMode, isExploreSurface } from '../chrome/exploreMode'
import { isMapSectionRedirectPath } from '../../lib/mapDeepLinks'
import { isAdminPath } from '../admin/adminSections'
import { Navbar } from './Navbar'
import { MobileTabBar } from './MobileTabBar'
import { SiteFooter } from './SiteFooter'
import { useDeviceAttribute, useIsMobile } from '../../mobile/useIsMobile'
import '../../mobile/mobile-base.css'
import '../../mobile/screens/mobile-screens.css'
import './footer.css'
import './AppLayout.css'

const MobileHeader = lazy(() => import('../../mobile/MobileHeader').then(module => ({ default: module.MobileHeader })))
const AppShell = lazy(() => import('../shell/AppShell').then(module => ({ default: module.AppShell })))
const VoiceCallProvider = lazy(() => import('../../contexts/VoiceCallContext').then(module => ({ default: module.VoiceCallProvider })))
const SourceRoomDetailsHost = lazy(() => import('../map/listings/SourceRoomDetailsHost').then(module => ({ default: module.SourceRoomDetailsHost })))

export function AppLayout() {
  const location = useLocation()
  const navType = useNavigationType()
  const { isAuthenticated, needsProfileSetup } = useAuth()
  /** Phones get their own header and tab bar; desktop keeps the full shell. */
  const isMobile = useIsMobile()
  useDeviceAttribute(isMobile)
  const isProfile = location.pathname === '/profile' || new URLSearchParams(location.search).get('section') === 'profile'
  const isAuthCinema =
    location.pathname.replace(/\/+$/, '') === '/auth' || location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/forgot-password'
  const isGuestLanding = location.pathname === '/' && !isAuthenticated
  const isListingsPage = isExploreSurface(location.pathname, location.search)
  const MainTag = isGuestLanding ? 'div' : 'main'
  /** The admin workspace brings its own rail and top bar instead of the customer chrome. */
  const isAdminWorkspace = isAuthenticated && isAdminPath(location.pathname)
  const isAuthedApp =
    isAuthenticated &&
    !isAuthCinema &&
    (location.pathname === '/' ||
      isMapSectionRedirectPath(location.pathname) ||
      location.pathname === '/payments/wait' ||
      // Account pages opened from the account menu keep the member header, not the public bar.
      location.pathname === '/referrals' ||
      location.pathname === '/receipts' ||
      // On phones the legal pages open from the account sheet, so they keep the app header and tab bar.
      (isMobile && (location.pathname === '/privacy' || location.pathname === '/terms')) ||
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
    if (isAuthCinema || isMapPeer || isListingsPage || !outletRef.current) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    // Opacity only: transforming this ancestor breaks sticky and fixed descendants.
    const element = outletRef.current
    if (typeof element.animate === 'function') {
      const controls = element.animate(
        [{ opacity: 0 }, { opacity: 1 }],
        { duration: 380, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
      )
      return () => controls.cancel()
    }
  }, [destination, isMapPeer, isListingsPage, isAuthCinema])

  // Destination changes behave like page loads: a new destination opens at its top and moves
  // keyboard/screen-reader focus to its heading; Back/Forward return to where the reader was.
  const scrollPositions = useRef(new Map<string, number>())
  const lastScrollY = useRef(0)
  const locationKey = useRef(location.key)
  useEffect(() => {
    const onScroll = () => { lastScrollY.current = window.scrollY }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  const firstDestination = useRef(true)
  useLayoutEffect(() => {
    if (locationKey.current !== location.key) {
      // The listener's value predates this render's DOM changes, so it is the true position on leave.
      scrollPositions.current.set(locationKey.current, lastScrollY.current)
      locationKey.current = location.key
    }
  }, [location.key])
  useLayoutEffect(() => {
    if (firstDestination.current) { firstDestination.current = false; return }
    if (isAuthCinema) return
    const isPop = navType === NavigationType.Pop
    const saved = isPop ? scrollPositions.current.get(location.key) : undefined
    window.scrollTo({ top: saved ?? 0, left: 0, behavior: 'instant' })
    lastScrollY.current = saved ?? 0
    if (isPop) return
    let frame = window.requestAnimationFrame(() => {
      frame = window.requestAnimationFrame(() => {
        const outlet = outletRef.current
        if (!outlet || outlet.contains(document.activeElement)) return
        const heading = outlet.querySelector<HTMLElement>('h1') ?? outlet
        if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1')
        heading.focus({ preventScroll: true })
      })
    })
    return () => window.cancelAnimationFrame(frame)
    // Only destination changes count; camera, filter and thread params do not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination])

  const content = (
    <SellerOrderAlertsProvider enabled={isAuthenticated && !needsProfileSetup && !isAuthCinema}>
      <div
        className={[
          'app-shell',
          isAuthenticated ? 'app-shell--authed' : '',
          isAuthedApp ? 'app-shell--product' : '',
          isMapPeer ? 'app-shell--map-peer' : '',
          isListingsPage ? 'app-shell--listings' : '',
          isMessagesWorkspace ? 'app-shell--messages' : '',
          isGuestLanding ? 'app-shell--guest-landing' : '',
          isAuthCinema ? 'app-shell--auth-cinema' : '',
          isAdminWorkspace ? 'app-shell--admin' : '',
          isMobile ? 'app-shell--mobile' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {isAuthedApp ? <a className="skip-link" href="#main-content">Bỏ qua tới nội dung chính</a> : null}
        {isAdminWorkspace || isGuestLanding ? null : isAuthedApp ? isMobile ? <Suspense fallback={<div aria-hidden="true" className="m-header-placeholder" />}><MobileHeader /></Suspense> : <Suspense fallback={<div aria-hidden="true" style={{ height: 76 }} />}><AppShell /></Suspense> : <Navbar />}
        <SiteLocationBootstrap enabled={!isAuthCinema} />
        {!isAuthCinema && !isAdminWorkspace && !isGuestLanding ? <PremiumLaunchOffer /> : null}
        {(new URLSearchParams(location.search).has('source') || new URLSearchParams(location.search).has('room')) ? (
          <Suspense fallback={null}>
            <SourceRoomDetailsHost />
          </Suspense>
        ) : null}
        <ConfirmDialogHost />
        {/* The guest landing brings its own <main>; avoid nesting two. */}
        <MainTag id={isAuthedApp ? 'main-content' : undefined} tabIndex={isAuthedApp ? -1 : undefined} className={isAuthedApp ? 'main-content app-main' : 'main-content'}>
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
        </MainTag>
        {isAdminWorkspace || isAuthCinema || isGuestLanding || !isMobile ? null : <MobileTabBar />}
        {/* Chat fills the screen like an app; legal links stay on every other page. Signed-in phones
            reach them from the account sheet instead, like an app's settings. */}
        {isAdminWorkspace || isGuestLanding || isMessagesWorkspace || isListingsPage || (isAuthedApp && isMobile) ? null : <SiteFooter compact={isMapPeer} />}
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
