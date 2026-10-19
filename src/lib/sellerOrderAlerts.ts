import { MarketplaceOrderStatus, type MarketplaceOrder } from '../api/types'
import { marketplaceOrderGroupKey } from './marketplaceOrderGroups'

export const SELLER_ORDERS_SNAPSHOT = 'homeji:seller-orders-snapshot'
export const SELLER_ORDERS_CHANGED = 'homeji:seller-orders-changed'
export const NOTIFICATION_RECEIVED = 'homeji:notification-received'
export const NOTIFICATION_CONNECTED = 'homeji:notification-connected'
export const SELLER_ALERT_POLL_MS = 30_000
export const SELLER_REMINDER_MS = 60_000

export type SellerOrderAlert = {
  key: string
  version: string
  status: number
  orders: MarketplaceOrder[]
  title: string
  buyer: string
  quantity: number
  total: number
  pickupAt: string
}

/** Build from authoritative orders, never from unread notification counts. */
export function sellerOrderAlerts(orders: MarketplaceOrder[], ownerId: string): SellerOrderAlert[] {
  const grouped = new Map<string, MarketplaceOrder[]>()
  for (const order of orders) {
    if (order.sellerId !== ownerId || (order.status !== MarketplaceOrderStatus.Requested && order.status !== MarketplaceOrderStatus.Accepted)) continue
    const key = `${marketplaceOrderGroupKey(order)}:${order.status}`
    const group = grouped.get(key) ?? []
    group.push(order)
    grouped.set(key, group)
  }
  return [...grouped.entries()].map(([key, items]) => {
    const first = items[0]
    return {
      key,
      // A stage change re-arms sound; ordinary refreshes never do.
      version: items.map(item => `${item.id}:${item.status}`).sort().join('|'),
      status: first.status,
      orders: items,
      title: items.map(item => `${item.quantity} × ${item.postTitle || 'Sản phẩm'}`).join(', '),
      buyer: first.buyerDisplayName || 'Khách mua',
      quantity: items.reduce((total, item) => total + item.quantity, 0),
      total: items.reduce((total, item) => total + item.agreedPrice, 0),
      pickupAt: first.pickupAt,
    }
  }).sort((a, b) => a.status - b.status || Date.parse(a.pickupAt) - Date.parse(b.pickupAt))
}

export function sellerOrderUrl(orderId?: string) {
  const params = new URLSearchParams({ section: 'marketplace', market: 'sales' })
  if (orderId) params.set('sale', orderId)
  return `/?${params}`
}

export function alertNeedsSound(alert: SellerOrderAlert, acknowledged: Record<string, string>) {
  return acknowledged[alert.key] !== alert.version
}

export function announceSellerOrdersChanged(ownerId: string) {
  window.dispatchEvent(new CustomEvent(SELLER_ORDERS_CHANGED, { detail: { ownerId } }))
}
