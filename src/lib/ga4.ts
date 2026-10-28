import { analyticsScreen, safeAnalyticsLocation, safeFunnelParameters, type AnalyticsConsent, type FunnelEvent, type SearchMode } from './analyticsPolicy'

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
    [key: `ga-disable-${string}`]: boolean | undefined
  }
}
type AnalyticsWindow = Window
const CONSENT_KEY = 'homeji_analytics_consent_v1'
const id = String(import.meta.env.VITE_GA4_MEASUREMENT_ID ?? '').trim()
export const ga4Configured = /^G-[A-Z0-9]+$/.test(id)
  && import.meta.env.VITE_GA4_MANUAL_PAGEVIEWS_READY === 'true'
let memoryConsent: AnalyticsConsent = 'unknown'
let initialized = false
let allowed = false
let currentLocation = ''
let previousLocation = ''
let currentScreen: string | null = null
let lastRoute: string | null = null
let searchMode: SearchMode = 'filter'
const purchaseIds = new Set<string>()

export function resetAnalyticsSearchMode() { searchMode = 'filter' }

export function privacySignalEnabled(): boolean {
  return navigator.doNotTrack === '1' || Boolean((navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl)
}
export function readAnalyticsConsent(): AnalyticsConsent {
  if (privacySignalEnabled()) return 'rejected'
  try {
    const value = localStorage.getItem(CONSENT_KEY)
    if (value === 'accepted' || value === 'rejected') return value
  } catch { /* Consent can still be applied in memory when storage is unavailable. */ }
  return memoryConsent
}
function canSend(): boolean {
  return ga4Configured && allowed && readAnalyticsConsent() === 'accepted' && currentScreen !== null
}
function command(...args: unknown[]) {
  try { (window as AnalyticsWindow).gtag?.(...args) } catch { /* Measurement must never interrupt the customer. */ }
}

export function setAnalyticsConsent(consent: 'accepted' | 'rejected') {
  memoryConsent = privacySignalEnabled() ? 'rejected' : consent
  try { localStorage.setItem(CONSENT_KEY, memoryConsent) } catch { /* Use in-memory consent. */ }
  if (memoryConsent !== 'accepted') {
    allowed = false
    lastRoute = null
    ;(window as AnalyticsWindow)[`ga-disable-${id}`] = true
    document.getElementById('homeji-ga4-tag')?.remove()
    ;(window as AnalyticsWindow).dataLayer?.splice(0)
    initialized = false
    for (const cookie of document.cookie.split(';')) {
      const name = cookie.split('=')[0].trim()
      if (name !== '_ga' && name !== `_ga_${id.slice(2)}`) continue
      const hostParts = location.hostname.split('.')
      const domains = ['', ...hostParts.map((_, index) => hostParts.slice(index).join('.')).filter(host => host.includes('.'))]
      for (const domain of domains) {
        document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax${domain ? `; Domain=${domain}` : ''}`
      }
    }
  }
  window.dispatchEvent(new Event('homeji:analytics-consent'))
}

export function setAnalyticsPage(pathname: string, search: string, internal = false) {
  currentScreen = internal ? null : analyticsScreen(pathname, search)
  allowed = currentScreen !== null && readAnalyticsConsent() === 'accepted'
  ;(window as AnalyticsWindow)[`ga-disable-${id}`] = !allowed
  if (!canSend() || !currentScreen) {
    if (!currentScreen) lastRoute = null
    return
  }
  const safeLocation = safeAnalyticsLocation(location.origin, currentScreen, search)
  // A room id is used only locally to distinguish two detail views, never in a payload.
  const route = `${currentScreen}:${new URLSearchParams(search).get('post') ?? ''}:${pathname.startsWith('/rentals/') ? pathname : ''}`
  if (lastRoute === route) return
  if (!currentLocation && document.referrer) {
    try { previousLocation = new URL(document.referrer).origin + '/' } catch { previousLocation = '' }
  } else previousLocation = currentLocation
  currentLocation = safeLocation
  const analyticsWindow = window as AnalyticsWindow
  analyticsWindow.dataLayer ??= []
  // gtag's queue expects an Arguments object, as in Google's installation snippet.
  // eslint-disable-next-line prefer-rest-params -- Google tag consumes Arguments, not nested arrays.
  analyticsWindow.gtag ??= function () { analyticsWindow.dataLayer!.push(arguments) }
  command('set', { page_location: safeLocation, page_referrer: previousLocation, page_title: `Homeji | ${currentScreen}` })
  if (!initialized) {
    command('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' })
    command('js', new Date())
    command('config', id, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false,
      page_location: safeLocation, page_referrer: previousLocation, page_title: `Homeji | ${currentScreen}`,
      ...(import.meta.env.VITE_GA4_DEBUG === 'true' ? { debug_mode: true } : {}) })
    initialized = true
  }
  if (!document.getElementById('homeji-ga4-tag')) {
    const script = document.createElement('script')
    script.id = 'homeji-ga4-tag'
    script.async = true
    script.referrerPolicy = 'origin'
    script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`
    document.head.appendChild(script)
  }
  command('event', 'page_view', { page_location: safeLocation, page_referrer: previousLocation, page_title: `Homeji | ${currentScreen}` })
  lastRoute = route
}

export function trackFunnelEvent(event: FunnelEvent, parameters: Record<string, unknown> = {}) {
  if (!canSend() || !initialized) return
  if (event === 'rental_search' && (parameters.search_mode === 'ai' || parameters.search_mode === 'filter')) searchMode = parameters.search_mode
  command('event', event, { search_mode: searchMode, ...safeFunnelParameters(parameters) })
}

export function trackVerifiedPremiumPurchase(payment: { id: string; status: number; purpose?: number; amount: number; paidAt?: string | null }) {
  // Called only with the authenticated API response; redirect params never establish success.
  if (!canSend() || !initialized || payment.status !== 2 || payment.purpose !== 2
    || !/^[0-9a-f-]{36}$/i.test(payment.id) || !Number.isFinite(payment.amount) || payment.amount <= 0) return
  const paidAt = Date.parse(payment.paidAt ?? '')
  // Do not turn opening an old completed payment into revenue attributed to today's visit.
  if (!Number.isFinite(paidAt) || paidAt > Date.now() + 60_000 || Date.now() - paidAt > 30 * 60_000) return
  const transactionId = `premium_${payment.id}`
  try {
    if (sessionStorage.getItem(`homeji_ga4_${transactionId}`)) return
  } catch { /* In-memory idempotency is retained below. */ }
  if (purchaseIds.has(transactionId)) return
  command('event', 'purchase', { transaction_id: transactionId, value: payment.amount, currency: 'VND',
    items: [{ item_id: 'homeji-premium', item_name: 'Homeji Premium', item_category: 'premium', price: payment.amount, quantity: 1 }] })
  purchaseIds.add(transactionId)
  try { sessionStorage.setItem(`homeji_ga4_${transactionId}`, '1') } catch { /* No storage requirement. */ }
}

type PaidOrder = { id: string; checkoutId?: string; agreedPrice: number; buyerPaidAmount?: number; refundedAt?: string | null }
export function trackVerifiedMarketplacePurchase(orders: PaidOrder[]) {
  // Only call after the create-order API commits the wallet debit, never on a cart click.
  if (!canSend() || !initialized || orders.length === 0) return
  const groups = new Map<string, PaidOrder[]>()
  for (const order of orders) {
    const checkout = order.checkoutId || order.id
    groups.set(checkout, [...(groups.get(checkout) ?? []), order])
  }
  for (const [checkout, lines] of groups) {
    if (!/^[0-9a-f-]{36}$/i.test(checkout) || lines.some(line => !Number.isFinite(line.buyerPaidAmount ?? line.agreedPrice) || (line.buyerPaidAmount ?? line.agreedPrice) <= 0)) continue
    const transactionId = `marketplace_${checkout}`
    if (purchaseIds.has(transactionId)) continue
    try { if (sessionStorage.getItem(`homeji_ga4_${transactionId}`)) continue } catch { /* In-memory fallback. */ }
    command('event', 'purchase', { transaction_id: transactionId, currency: 'VND',
      value: lines.reduce((sum, line) => sum + (line.buyerPaidAmount ?? line.agreedPrice), 0),
      items: lines.map(line => ({ item_id: `order_${line.id}`, item_name: 'Đơn hàng Homeji', item_category: 'marketplace', price: line.buyerPaidAmount ?? line.agreedPrice, quantity: 1 })) })
    purchaseIds.add(transactionId)
    try { sessionStorage.setItem(`homeji_ga4_${transactionId}`, '1') } catch { /* In-memory fallback. */ }
  }
}


