import { useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { resolveMarketplaceDestination } from '../../lib/marketplaceNavigation'
import type { MapAppSection } from "../map/MapAppPanel.logic"

import { ScreenPending } from '../ScreenPending'
import { isExploreSurface } from '../chrome/exploreMode'
import { AuthSkeleton } from './AuthSkeleton'
import {
  ActivitiesSkeleton, AdminSkeleton, AppointmentsSkeleton, HubSkeleton,
  InvitationsSkeleton, LegalSkeleton, ListingsSkeleton, MarketplaceSkeleton, MessagesSkeleton,
  MyPostsSkeleton, NotificationsSkeleton, PaymentWaitSkeleton, PaymentsSkeleton, PostFormSkeleton,
  ProfileSkeleton, SavedSkeleton, WantedSkeleton,
} from './PageSkeletons'
import { authSkeletonMode } from './authSkeletonMode'
import { Sk, SkCard, SkHeader, SkScreen } from './Skeleton'

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
    case 'help': return <SkScreen name="help" label="Đang tải trợ giúp…">
      {head && <SkHeader titleWidth={180} />}
      <Sk h={48} />
      {[0, 1, 2].map(group => <SkCard key={group}><Sk w="40%" h={24} /><Sk h={48} /><Sk h={48} /></SkCard>)}
    </SkScreen>
    case 'myPosts': return <MyPostsSkeleton withHeader={head} />
    default: return <HubSkeleton />
  }
}

const REDIRECT_SECTIONS: Record<string, MapAppSection> = {
  '/my-posts': 'myPosts', '/marketplace': 'marketplace', '/wanted': 'wanted', '/activities': 'activities',
  '/saved': 'saved', '/profile': 'profile', '/notifications': 'notifications', '/invitations': 'invitations',
  '/payments': 'payments',
}
const SECTIONS = new Set<string>(['listings', 'saved', 'invitations', 'messages', 'appointments', 'payments', 'profile', 'marketplace', 'wanted', 'activities', 'myPosts', 'help'])

/** Skeleton for whatever page the URL points at — used while the app/page chunk boots on reload. */
export function RouteSkeleton() {
  const { pathname, search } = useLocation()
  const { isAuthenticated } = useAuth()
  const params = new URLSearchParams(search)
  const authMode = authSkeletonMode(pathname, search)

  let body
  let variant = ''
  if (authMode) {
    body = <AuthSkeleton mode={authMode} unified={['/auth', '/login', '/register', '/forgot-password'].includes(pathname)} />
    variant = ' sk-route--auth'
  } else if (pathname === '/privacy' || pathname === '/terms') {
    body = <LegalSkeleton />
  } else if (!isAuthenticated) {
    // The guest landing loads under its own intro (LandingIntro, mounted in App); other guest pages stay quiet.
    return pathname === '/' ? null : <ScreenPending />
  } else if (pathname === '/posts/new' || /^\/posts\/[^/]+\/edit$/.test(pathname)) {
    body = <PostFormSkeleton />
  } else if (pathname === '/payments/wait') {
    body = <PaymentWaitSkeleton />
  } else if (pathname === '/admin' || pathname.startsWith('/admin/')) {
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
