export type SearchMode = 'filter' | 'ai'
export type AnalyticsConsent = 'accepted' | 'rejected' | 'unknown'

const sections: Record<string, string> = {
  listings: 'rental-map', marketplace: 'marketplace', saved: 'saved-rentals',
  wanted: 'wanted-rentals', appointments: 'appointments', invitations: 'roommates', payments: 'checkout',
}
export function analyticsScreen(pathname: string, search: string): string | null {
  const query = new URLSearchParams(search)
  if (pathname === '/') {
    if (query.has('post')) return 'rental-detail'
    const section = query.get('section')
    return section ? sections[section] ?? null : 'rental-map'
  }
  if (/^\/rentals\/[0-9a-f-]{36}$/i.test(pathname)) return 'rental-public'
  const routes: Record<string, string> = {
    '/explore': 'explore', '/login': 'login', '/register': 'register', '/verify-email': 'verify-email',
    '/marketplace': 'marketplace', '/saved': 'saved-rentals', '/privacy': 'privacy', '/terms': 'terms',
    '/payments': 'checkout', '/payments/wait': 'checkout',
  }
  return routes[pathname] ?? null
}

export function safeAnalyticsLocation(origin: string, screen: string, search = ''): string {
  const url = new URL(`/analytics/${screen}`, origin)
  const input = new URLSearchParams(search)
  // Campaign codes are controlled slugs; free text and click/account identifiers never pass through.
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign']) {
    const value = input.get(key)
    if (value && /^[a-z0-9_-]{1,64}$/i.test(value)) url.searchParams.set(key, value)
  }
  return url.href
}

export function resultCountBucket(count: number): string {
  return count === 0 ? '0' : count <= 5 ? '1-5' : count <= 20 ? '6-20' : '21+'
}

export type FunnelEvent = 'login' | 'sign_up' | 'rental_search' | 'rental_view' | 'rental_saved'
  | 'viewing_requested' | 'view_item_list' | 'view_item' | 'add_to_cart' | 'begin_checkout'
export function safeFunnelParameters(input: Record<string, unknown>): Record<string, string> {
  const safe: Record<string, string> = {}
  if (input.search_mode === 'filter' || input.search_mode === 'ai') safe.search_mode = input.search_mode
  if (['0', '1-5', '6-20', '21+'].includes(String(input.result_count_bucket))) safe.result_count_bucket = String(input.result_count_bucket)
  if (input.item_category === 'marketplace' || input.item_category === 'premium') safe.item_category = input.item_category
  return safe
}
