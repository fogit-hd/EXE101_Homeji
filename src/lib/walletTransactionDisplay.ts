import type { MarketplaceOrder, WalletTransaction } from '../api/types'

const REFUND_TRANSACTION_KIND = 3

export function groupMarketplaceOrderRefunds(
  transactions: WalletTransaction[],
  orders: MarketplaceOrder[],
): WalletTransaction[] {
  const orderGroupById = new Map(orders.map((order) => [
    order.id,
    `${order.buyerId}:${order.sellerId}:${order.createdAt}`,
  ]))
  const refundGroups = new Map<string, WalletTransaction[]>()

  for (const transaction of transactions) {
    if (transaction.kind !== REFUND_TRANSACTION_KIND) continue
    const groupKey = orderGroupById.get(transaction.referenceId)
    if (!groupKey) continue
    const current = refundGroups.get(groupKey) ?? []
    current.push(transaction)
    refundGroups.set(groupKey, current)
  }

  const emittedGroups = new Set<string>()
  return transactions.flatMap((transaction) => {
    const groupKey = transaction.kind === REFUND_TRANSACTION_KIND
      ? orderGroupById.get(transaction.referenceId)
      : undefined
    if (!groupKey) return [transaction]

    const group = refundGroups.get(groupKey) ?? [transaction]
    if (group.length === 1) return [transaction]
    if (emittedGroups.has(groupKey)) return []
    emittedGroups.add(groupKey)

    return [{
      ...transaction,
      id: `marketplace-refund:${groupKey}`,
      amount: group.reduce((total, item) => total + item.amount, 0),
      balanceAfter: Math.max(...group.map((item) => item.balanceAfter)),
      description: `Hoàn tổng đơn chợ Homeji · ${group.length} món`,
    }]
  })
}
