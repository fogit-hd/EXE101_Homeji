export const LISTINGS_TIPS_KEY = 'homeji_tips_listings_v1'
let dismissedInSession = false

export function listingsTipsDismissed(
  storage: () => Pick<Storage, 'getItem'> = () => localStorage,
  session: () => Pick<Storage, 'getItem'> = () => sessionStorage,
): boolean {
  if (dismissedInSession) return true
  try { if (storage().getItem(LISTINGS_TIPS_KEY) === '1') return true } catch { /* Try the session cache. */ }
  try { return session().getItem(LISTINGS_TIPS_KEY) === '1' } catch { return false }
}

export function dismissListingsTips(
  storage: () => Pick<Storage, 'setItem'> = () => localStorage,
  session: () => Pick<Storage, 'setItem'> = () => sessionStorage,
) {
  dismissedInSession = true
  try { storage().setItem(LISTINGS_TIPS_KEY, '1') }
  catch {
    try { session().setItem(LISTINGS_TIPS_KEY, '1') } catch { /* Memory keeps dismissal when both stores are unavailable. */ }
  }
}
