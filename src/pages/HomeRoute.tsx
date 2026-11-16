import { lazy, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { markHomeReady } from '../lib/introGate'

/*
 * "/" is two different pages: guests get the landing, members the map home. Each is its own chunk,
 * so a guest never downloads the map home, and above all never loads its stylesheets (map, hub,
 * omnibox, listings…): every rule on the page is matched against every element on each restyle, and
 * the landing restyles the whole page on a theme change.
 */
const LandingPage = lazy(() => import('../features/landing-hx/LandingPage').then(module => ({ default: module.LandingPage })))
const MemberHome = lazy(() => import('./HomePage').then(module => ({ default: module.HomePage })))

export function HomeRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  // The brand intro waits for the home page to settle; the landing has no data to wait for.
  useEffect(() => {
    if (!isLoading && !isAuthenticated) markHomeReady()
  }, [isLoading, isAuthenticated])
  return isAuthenticated ? <MemberHome /> : <LandingPage />
}
