import { MarketplaceOrderStatus, type Notification } from '../api/types'
import { marketplaceOrderStatusLabel } from './labels'

export type NotificationDayGroup = 'Hôm nay' | 'Hôm qua' | 'Trước đó'

export function notificationDayGroup(createdAt: string, now: number): NotificationDayGroup {
  const date = new Date(createdAt), today = new Date(now)
  if (!Number.isFinite(date.getTime())) return 'Trước đó'
  if (date.toDateString() === today.toDateString()) return 'Hôm nay'
  today.setDate(today.getDate() - 1)
  return date.toDateString() === today.toDateString() ? 'Hôm qua' : 'Trước đó'
}

/** Older server events contain enum names. Translate only an explicit status phrase. */
export function notificationDisplayMessage(message: string): string {
  return message.replace(/(trạng thái\s+)([A-Za-z]+)/gi, (original, prefix: string, status: string) => {
    if (!Object.prototype.hasOwnProperty.call(MarketplaceOrderStatus, status)) return original
    const value = MarketplaceOrderStatus[status as keyof typeof MarketplaceOrderStatus]
    return `${prefix}${marketplaceOrderStatusLabel[value]}`
  })
}

export function notificationGroups(items: Notification[], now: number) {
  const groups = new Map<NotificationDayGroup, Notification[]>()
  for (const item of items) {
    const key = notificationDayGroup(item.createdAt, now)
    const group = groups.get(key) ?? []
    group.push(item)
    groups.set(key, group)
  }
  return (['Hôm nay', 'Hôm qua', 'Trước đó'] as const)
    .flatMap(label => groups.has(label) ? [{ label, items: groups.get(label)! }] : [])
}
