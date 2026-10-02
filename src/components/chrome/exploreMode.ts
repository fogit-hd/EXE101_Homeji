/**
 * Explore / map URL contract.
 *
 * - List (tab Khám phá): `/?section=listings&view=list`
 *   (also recognizes future `/?section=explore` as list)
 * - Map (separate destination, not a primary nav tab): `/?section=listings`
 *   (no view / `view=map`) or `/?post=…` — opened via “Xem trên bản đồ” CTAs
 *
 * Does not rename or remove `listings`.
 */

export type ExploreView = 'list' | 'map'

export const EXPLORE_SECTION = 'explore'
export const LISTINGS_SECTION = 'listings'
export const EXPLORE_VIEW_PARAM = 'view'

/** Default Khám phá entry — list intent via `view=list` (keeps `listings` section). */
export function exploreListUrl(
  search: string | URLSearchParams = '',
): string {
  const next = preserveGatewayParams(search)
  next.set('section', LISTINGS_SECTION)
  next.set(EXPLORE_VIEW_PARAM, 'list')
  next.delete('post')
  return `/?${next.toString()}`
}

/** Map destination — deep links + “Xem trên bản đồ” (not a primary nav tab). */
export function exploreMapUrl(
  search: string | URLSearchParams = '',
): string {
  const next = preserveGatewayParams(search)
  next.set('section', LISTINGS_SECTION)
  next.delete(EXPLORE_VIEW_PARAM)
  return `/?${next.toString()}`
}

export function exploreUrlForView(
  view: ExploreView,
  search: string | URLSearchParams = '',
): string {
  return view === 'list' ? exploreListUrl(search) : exploreMapUrl(search)
}

export function isExploreSurface(pathname: string, search: string): boolean {
  if (pathname !== '/') return false
  const params = new URLSearchParams(search)
  if (params.get('post')) return true
  const section = params.get('section')
  return section === EXPLORE_SECTION || section === LISTINGS_SECTION
}

/**
 * Map mode = peer shell / mount map.
 * `listings` without `view=list` (and `?post=`) stay map for back-compat.
 * `section=explore` defaults to list unless `view=map`.
 */
export function isExploreMapMode(pathname: string, search: string): boolean {
  if (pathname !== '/') return false
  const params = new URLSearchParams(search)
  if (params.get('post')) return true

  const section = params.get('section')
  const view = params.get(EXPLORE_VIEW_PARAM)

  if (section === EXPLORE_SECTION) {
    return view === 'map'
  }
  if (section === LISTINGS_SECTION) {
    return view !== 'list'
  }
  return false
}

export function isExploreListMode(pathname: string, search: string): boolean {
  return isExploreSurface(pathname, search) && !isExploreMapMode(pathname, search)
}

export function parseExploreView(
  pathname: string,
  search: string,
): ExploreView | null {
  if (!isExploreSurface(pathname, search)) return null
  return isExploreMapMode(pathname, search) ? 'map' : 'list'
}

function preserveGatewayParams(
  search: string | URLSearchParams,
): URLSearchParams {
  const incoming =
    typeof search === 'string'
      ? new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
      : new URLSearchParams(search)

  const next = new URLSearchParams()
  for (const [key, value] of incoming.entries()) {
    if (
      key === 'section' ||
      key === 'post' ||
      key === EXPLORE_VIEW_PARAM
    ) {
      continue
    }
    next.set(key, value)
  }
  return next
}
