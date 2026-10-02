export type MarketplaceTab =
  | 'food'
  | 'browse'
  | 'purchases'
  | 'mine'
  | 'sell'
  | 'sales'
  | 'wallet'

export type MarketplacePrimary = 'food' | 'goods' | 'shop' | 'wallet'

const MARKETPLACE_TABS: readonly MarketplaceTab[] = [
  'food',
  'browse',
  'purchases',
  'mine',
  'sell',
  'sales',
  'wallet',
]

const SELL_SIDE = new Set(['sell', 'selling', 'sales', 'seller', 'ban'])
const BUY_SIDE = new Set(['buy', 'buying', 'buyer', 'purchases', 'mua'])

const MARKETPLACE_TAB_STORAGE_KEY = 'homeji:marketplace-tab-request'
const MARKETPLACE_TAB_EVENT = 'homeji:marketplace-tab-request'
const MARKETPLACE_CART_STORAGE_KEY = 'homeji:marketplace-cart-request'
const MARKETPLACE_CART_EVENT = 'homeji:marketplace-cart-request'

export function isMarketplaceTab(value: unknown): value is MarketplaceTab {
  return typeof value === 'string' && (MARKETPLACE_TABS as readonly string[]).includes(value)
}

export function primaryOf(tab: MarketplaceTab): MarketplacePrimary {
  if (tab === 'browse' || tab === 'purchases') return 'goods'
  if (tab === 'mine' || tab === 'sell' || tab === 'sales') return 'shop'
  if (tab === 'wallet') return 'wallet'
  return 'food'
}

function orderSide(params: URLSearchParams): 'sales' | 'purchases' | null {
  const raw = `${params.get('order') ?? params.get('side') ?? params.get('role') ?? ''}`
    .trim()
    .toLowerCase()
  if (!raw) return null
  if (SELL_SIDE.has(raw)) return 'sales'
  if (BUY_SIDE.has(raw)) return 'purchases'
  return null
}

/**
 * Leaf tab encoded by the marketplace query.
 * `tab` is null when the URL does not name a market screen.
 * `legacy` is true when `market=orders` or a buy/sell side param still needs a canonical rewrite.
 */
export function resolveMarketplaceDestination(params: URLSearchParams): {
  tab: MarketplaceTab | null
  legacy: boolean
} {
  const market = params.get('market')
  const side = orderSide(params)
  if (market === 'orders') {
    return { tab: side === 'sales' ? 'sales' : 'purchases', legacy: true }
  }
  if (market === 'purchases' || market === 'sales') {
    return { tab: market, legacy: side != null }
  }
  if (isMarketplaceTab(market)) {
    return { tab: market, legacy: side != null }
  }
  if (!market && params.get('wallet')) return { tab: 'wallet', legacy: false }
  return { tab: null, legacy: false }
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

export function requestMarketplaceCart() {
  sessionStorage.setItem(MARKETPLACE_CART_STORAGE_KEY, 'open')
  window.dispatchEvent(new Event(MARKETPLACE_CART_EVENT))
}

export function takeMarketplaceCartRequest(): boolean {
  const requested = sessionStorage.getItem(MARKETPLACE_CART_STORAGE_KEY) === 'open'
  sessionStorage.removeItem(MARKETPLACE_CART_STORAGE_KEY)
  return requested
}

export function subscribeToMarketplaceCartRequests(listener: () => void): () => void {
  const handleRequest = () => {
    sessionStorage.removeItem(MARKETPLACE_CART_STORAGE_KEY)
    listener()
  }

  window.addEventListener(MARKETPLACE_CART_EVENT, handleRequest)
  return () => window.removeEventListener(MARKETPLACE_CART_EVENT, handleRequest)
}
