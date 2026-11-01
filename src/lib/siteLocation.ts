import { locateForChat, freshChatbotLocation, type ChatbotLocation } from './chatbotLocation'
let location: ChatbotLocation | null = null
let revision = 0
const listeners = new Set<() => void>()
export const siteLocationSnapshot = () => location
export const subscribeSiteLocation = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
export function setSiteLocation(value: ChatbotLocation | null) { revision++; location = value; listeners.forEach(listener => listener()) }
let requested = false
let pending: Promise<void> | null = null
/** Browser-owned permission prompt, once per tab session. Coordinates stay in memory. */
export function requestSiteLocationOnce(): Promise<void> {
  if (pending) return pending
  if (requested || typeof navigator === 'undefined' || !navigator.geolocation || typeof window === 'undefined' || !window.isSecureContext) return Promise.resolve()
  requested = true
  try { if (sessionStorage.getItem('homeji-location-requested')) return Promise.resolve(); sessionStorage.setItem('homeji-location-requested', '1') } catch { /* In-memory guard also handles restricted storage. */ }
  const startedAtRevision = revision
  pending = (async () => {
    try {
      try { if (navigator.permissions && (await navigator.permissions.query({ name: 'geolocation' })).state === 'denied') return } catch { /* Browsers without permission queries still support native geolocation consent. */ }
      const point = await locateForChat()
      if (revision === startedAtRevision && freshChatbotLocation(point)) setSiteLocation(point)
    } catch { /* Declining location does not block browsing; manual address stays available. */ }
  })().finally(() => { pending = null })
  return pending
}
