import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { apiRequest } from '../api/client'
import { UserRole } from '../api/types'
import { useAuth } from '../contexts/AuthContext'
import { trafficPage, trafficSession } from '../lib/websiteTraffic'

const STORAGE_KEY = 'homeji_traffic_session'

export function WebsiteTrafficTracker() {
  const location = useLocation()
  const { isLoading, profile } = useAuth()
  const lastRoute = useRef<string | null>(null)
  const fallbackSession = useRef<{ id: string; lastSeen: number } | null>(null)
  const page = trafficPage(location.pathname, location.search)
  // Ignore map search/filter changes; count room changes without transmitting room IDs.
  const query = new URLSearchParams(location.search)
  const route = `${page}:${location.pathname}:${query.get('post') ?? ''}`

  useEffect(() => {
    const browser = navigator as Navigator & { globalPrivacyControl?: boolean }
    if (isLoading || profile?.role === UserRole.Admin || !page
      || browser.doNotTrack === '1' || browser.globalPrivacyControl || lastRoute.current === route) return
    lastRoute.current = route
    let previous = fallbackSession.current
    try {
      const stored: unknown = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null')
      if (stored && typeof stored === 'object' && 'id' in stored && 'lastSeen' in stored
        && typeof stored.id === 'string' && typeof stored.lastSeen === 'number') {
        previous = { id: stored.id, lastSeen: stored.lastSeen }
      }
    } catch { /* Storage may be unavailable in private browsing. */ }
    const session = trafficSession(previous, Date.now(), () => crypto.randomUUID())
    fallbackSession.current = session
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session)) } catch { /* In-memory fallback. */ }
    void apiRequest('/api/analytics/page-views', {
      auth: false, method: 'POST', body: { eventId: crypto.randomUUID(), sessionId: session.id, page },
    }).catch(() => { /* Measurement must never interrupt the customer's workflow. */ })
  }, [isLoading, page, profile?.role, route])

  return null
}
