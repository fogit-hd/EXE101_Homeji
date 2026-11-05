/** Cross-component navigation for guest landing (Hero → WindJump / smooth scroll). */
export const GUEST_LANDING_NAV_EVENT = 'homeji:guest-landing-nav'

export type GuestLandingNavDetail = { id: string }

export function navigateGuestLanding(sectionId: string) {
  window.dispatchEvent(
    new CustomEvent<GuestLandingNavDetail>(GUEST_LANDING_NAV_EVENT, {
      detail: { id: sectionId },
    }),
  )
}

/** Hero search hands its keyword to the listing section below it. */
export const GUEST_SEARCH_EVENT = 'homeji:guest-search'

export function searchGuestListings(keyword: string) {
  window.dispatchEvent(new CustomEvent<string>(GUEST_SEARCH_EVENT, { detail: keyword }))
  navigateGuestLanding('listings')
}
