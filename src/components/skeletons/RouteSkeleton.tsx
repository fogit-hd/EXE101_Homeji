import { useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { resolveMarketplaceDestination } from '../../lib/marketplaceNavigation'
import type { MapAppSection } from '../map/MapAppPanel'
import { ScreenPending } from '../ScreenPending'
import { isExploreSurface } from '../chrome/exploreMode'
import {
  ActivitiesSkeleton, AdminSkeleton, AppointmentsSkeleton, HubSkeleton,
  InvitationsSkeleton, LegalSkeleton, ListingsSkeleton, MarketplaceSkeleton, MessagesSkeleton,
  MyPostsSkeleton, NotificationsSkeleton, PaymentWaitSkeleton, PaymentsSkeleton, PostFormSkeleton,
  ProfileSkeleton, SavedSkeleton, WantedSkeleton,
} from './PageSkeletons'
import { AuthSkeleton } from './AuthSkeleton'
import { authSkeletonMode } from './authSkeletonMode'

/** Sections whose page draws its own header (FeatureWorkspace hides the frame title). */
const OWN_HEADER = new Set<MapAppSection>(['messages', 'appointments', 'payments', 'profile', 'marketplace'])

/** Skeleton for one workspace section. `withFrameHeader` = also draw the frame title. */
export function SectionSkeleton({ section, withFrameHeader = false }: { section: MapAppSection; withFrameHeader?: boolean }) {
  const location = useLocation()
  const head = withFrameHeader || OWN_HEADER.has(section)
  switch (section) {
    case 'listings': return <ListingsSkeleton />
    case 'saved': return <SavedSkeleton withHeader={head} />
    case 'invitations': return <InvitationsSkeleton withHeader={head} />
    case 'notifications': return <NotificationsSkeleton withHeader={head} />
    case 'messages': return <MessagesSkeleton />
    case 'appointments': return <AppointmentsSkeleton withHeader={head} />
    case 'payments': return <PaymentsSkeleton withHeader={head} />
    case 'profile': return <ProfileSkeleton withHeader={head} />
    case 'marketplace': {
      const tab = resolveMarketplaceDestination(new URLSearchParams(location.search)).tab ?? 'food'
      return <MarketplaceSkeleton tab={tab} withHeader={head} />
    }
    case 'wanted': return <WantedSkeleton withHeader={head} />
    case 'activities': return <ActivitiesSkeleton withHeader={head} />
    case 'myPosts': return <MyPostsSkeleton withHeader={head} />
    default: return <HubSkeleton />
  }
}

const REDIRECT_SECTIONS: Record<string, MapAppSection> = {
  '/my-posts': 'myPosts', '/marketplace': 'marketplace', '/wanted': 'wanted', '/activities': 'activities',
  '/saved': 'saved', '/profile': 'profile', '/notifications': 'notifications', '/invitations': 'invitations',
  '/payments': 'payments',
}
const SECTIONS = new Set<string>(['listings', 'saved', 'invitations', 'messages', 'appointments', 'payments', 'profile', 'marketplace', 'wanted', 'activities', 'myPosts'])

/** Skeleton for whatever page the URL points at — used while the app/page chunk boots on reload. */
export function RouteSkeleton() {
  const { pathname, search } = useLocation()
  const { isAuthenticated } = useAuth()
  const params = new URLSearchParams(search)
  const authMode = authSkeletonMode(pathname)

  let body
  let variant = ''
  if (authMode) {
    body = <AuthSkeleton mode={authMode} />
    variant = ' sk-route--auth'
  } else if (pathname === '/privacy' || pathname === '/terms') {
    body = <LegalSkeleton />
  } else if (!isAuthenticated) {
    // Guest landing keeps its brand intro; no product skeleton here.
    return <ScreenPending />
  } else if (pathname === '/posts/new' || /^\/posts\/[^/]+\/edit$/.test(pathname)) {
    body = <PostFormSkeleton />
  } else if (pathname === '/payments/wait') {
    body = <PaymentWaitSkeleton />
  } else if (pathname === '/admin') {
    body = <AdminSkeleton />
  } else if (REDIRECT_SECTIONS[pathname]) {
    const s = REDIRECT_SECTIONS[pathname]
    body = s === 'notifications' ? <HubSkeleton /> : <SectionSkeleton section={s} withFrameHeader />
  } else if (pathname === '/explore' || isExploreSurface(pathname, search)) {
    body = <ListingsSkeleton />
    variant = ' sk-route--wide'
  } else {
    const s = params.get('section')
    if (s && SECTIONS.has(s)) {
      body = <SectionSkeleton section={s as MapAppSection} withFrameHeader />
      if (s === 'messages') variant = ' sk-route--fill'
      if (s === 'listings') variant = ' sk-route--wide'
    } else {
      body = <HubSkeleton />
    }
  }
  return <div className={`sk-route${variant}`}>{body}</div>
}
