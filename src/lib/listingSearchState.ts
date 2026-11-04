/** Search criteria belong to the current tab, independently of navigation URLs. */
export const LISTING_SEARCH_STORAGE_KEY = 'homeji_listing_search_v1'
const SEARCH_FIELDS = new Set([
  'keyword', 'minPrice', 'maxPrice', 'minArea', 'maxArea', 'maxDeposit',
  'minAvailableSlots', 'availableFromBefore', 'amenities', 'excludedAmenities',
  'excludeRoommateShare', 'ids', 'type', 'ownerRole', 'propertyCategory',
  'minLatitude', 'maxLatitude', 'minLongitude', 'maxLongitude', 'latitude', 'longitude', 'radiusKm',
  'searchOnMove', 'placeId', 'placeName', 'district', 'ward', 'school', 'page',
])
export type ListingSearchCriteria = Readonly<Record<string, readonly string[]>>
type SessionStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export function isListingSearchNavigation(params: URLSearchParams, pathname = '/'): boolean {
  if (pathname !== '/' && pathname !== '/explore') return false
  const section = params.get('section')
  return !section || section === 'listings' || section === 'explore' || params.has('source') || params.has('post')
}

export function splitListingNavigation(params: URLSearchParams) {
  const navigation = new URLSearchParams()
  const criteria: Record<string, string[]> = {}
  for (const [key, value] of params) {
    if (!SEARCH_FIELDS.has(key)) { navigation.append(key, value); continue }
    if (value.length > 500 || (criteria[key]?.length ?? 0) >= 30) continue
    ;(criteria[key] ??= []).push(value)
  }
  return { navigation, criteria }
}

export function mergeListingSearch(navigation: URLSearchParams, criteria: ListingSearchCriteria) {
  const merged = new URLSearchParams(navigation)
  for (const [key, values] of Object.entries(criteria)) {
    if (navigation.has(key)) continue // Explicit legacy links take precedence during migration.
    for (const value of values) merged.append(key, value)
  }
  return merged
}

export function createListingSearchStore(storage?: SessionStorage) {
  let state: ListingSearchCriteria = {}
  try {
    const raw = storage?.getItem(LISTING_SEARCH_STORAGE_KEY)
    if (raw && raw.length <= 16_384) {
      const parsed: unknown = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && 'version' in parsed && parsed.version === 1 && 'criteria' in parsed) {
        const params = new URLSearchParams()
        if (parsed.criteria && typeof parsed.criteria === 'object') for (const [key, values] of Object.entries(parsed.criteria)) {
          if (SEARCH_FIELDS.has(key) && Array.isArray(values)) for (const value of values.slice(0, 30)) {
            if (typeof value === 'string' && value.length <= 500) params.append(key, value)
          }
        }
        state = splitListingNavigation(params).criteria
      }
    }
  } catch { /* A disabled or invalid optional session cache must not block search. */ }
  const listeners = new Set<() => void>()
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener) },
    set(criteria: ListingSearchCriteria) {
      const normalized = splitListingNavigation(mergeListingSearch(new URLSearchParams(), criteria)).criteria
      if (JSON.stringify(normalized) === JSON.stringify(state)) return
      state = normalized
      try { storage?.setItem(LISTING_SEARCH_STORAGE_KEY, JSON.stringify({ version: 1, criteria: state })) } catch { /* Continue in memory. */ }
      for (const listener of listeners) listener()
    },
  }
}
