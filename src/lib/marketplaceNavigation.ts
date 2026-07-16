export type MarketplaceTab = 'food' | 'browse' | 'mine' | 'sell' | 'orders' | 'wallet'

const MARKETPLACE_TAB_STORAGE_KEY = 'homeji:marketplace-tab-request'
const MARKETPLACE_TAB_EVENT = 'homeji:marketplace-tab-request'

function isMarketplaceTab(value: unknown): value is MarketplaceTab {
  return (
    value === 'food' ||
    value === 'browse' ||
    value === 'mine' ||
    value === 'sell' ||
    value === 'orders' ||
    value === 'wallet'
  )
}

export function requestMarketplaceTab(tab: MarketplaceTab) {
  sessionStorage.setItem(MARKETPLACE_TAB_STORAGE_KEY, tab)
  window.dispatchEvent(new CustomEvent(MARKETPLACE_TAB_EVENT, { detail: tab }))
}

export function takeMarketplaceTabRequest(fallback: MarketplaceTab): MarketplaceTab {
  const requested = sessionStorage.getItem(MARKETPLACE_TAB_STORAGE_KEY)
  sessionStorage.removeItem(MARKETPLACE_TAB_STORAGE_KEY)
  return isMarketplaceTab(requested) ? requested : fallback
}

export function subscribeToMarketplaceTabRequests(
  listener: (tab: MarketplaceTab) => void,
): () => void {
  const handleRequest = (event: Event) => {
    const requested = (event as CustomEvent<unknown>).detail
    if (!isMarketplaceTab(requested)) return
    sessionStorage.removeItem(MARKETPLACE_TAB_STORAGE_KEY)
    listener(requested)
  }

  window.addEventListener(MARKETPLACE_TAB_EVENT, handleRequest)
  return () => window.removeEventListener(MARKETPLACE_TAB_EVENT, handleRequest)
}
