import type { MarketplaceOrder } from '../api/types'

type OrderIdentity = Pick<MarketplaceOrder, 'buyerId' | 'sellerId' | 'createdAt' | 'checkoutId'>

export function marketplaceOrderGroupKey(order: OrderIdentity): string {
  const checkout = order.checkoutId?.trim()
  // Older API versions did not include checkoutId; retain their cart display.
  const identity = checkout && checkout !== '00000000-0000-0000-0000-000000000000'
    ? checkout : `legacy:${order.createdAt}`
  return `${order.buyerId}:${order.sellerId}:${identity}`
}
