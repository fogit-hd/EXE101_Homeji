/** Section ids and deep-link helpers for the guest landing. */

export const LANDING_SECTION_IDS = ['hero', 'mission', 'listings', 'map', 'how', 'start'] as const

export type LandingSectionId = (typeof LANDING_SECTION_IDS)[number]

export function initialLandingSection(location: { hash: string; search: string }): string | null {
  const hash = location.hash.replace(/^#/, '')
  if (hash) {
    return (LANDING_SECTION_IDS as readonly string[]).includes(hash) ? hash : null
  }
  const params = new URLSearchParams(location.search)
  const section = params.get('section')
  if (section !== 'listings' && section !== 'explore') return null
  return params.get('view') === 'list' ? 'listings' : 'map'
}

export const LANDING_NAV_EVENT = 'homeji:landing-nav'

export type LandingNavDetail = { id: string }

export function navigateLanding(id: string) {
  window.dispatchEvent(
    new CustomEvent<LandingNavDetail>(LANDING_NAV_EVENT, {
      detail: { id },
    }),
  )
}

export const LANDING_SEARCH_EVENT = 'homeji:landing-search'

export function searchLanding(keyword: string) {
  window.dispatchEvent(new CustomEvent<string>(LANDING_SEARCH_EVENT, { detail: keyword }))
  navigateLanding('map')
}
