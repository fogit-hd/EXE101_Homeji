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
