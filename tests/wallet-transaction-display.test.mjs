import assert from 'node:assert/strict'
import test from 'node:test'
import { groupMarketplaceOrderRefunds } from '../src/lib/walletTransactionDisplay.ts'
import { marketplaceOrderGroupKey } from '../src/lib/marketplaceOrderGroups.ts'

test('independent checkouts at the same timestamp never merge orders or refunds', () => {
  const base = { buyerId: 'buyer', sellerId: 'seller', createdAt: '2026-10-09T00:00:00Z' }
  const first = { ...base, id: 'one', checkoutId: 'checkout-one' }
  const second = { ...base, id: 'two', checkoutId: 'checkout-two' }
  assert.notEqual(marketplaceOrderGroupKey(first), marketplaceOrderGroupKey(second))
  const refunds = [first, second].map((order, index) => ({ id: `refund-${index}`, kind: 3, referenceId: order.id, amount: 30000, balanceAfter: 200000, description: 'Hoàn tiền', createdAt: base.createdAt }))
  assert.equal(groupMarketplaceOrderRefunds(refunds, [first, second]).length, 2)
})

test('one checkout stays together despite timestamp differences between its lines', () => {
  const first = { id: 'one', buyerId: 'buyer', sellerId: 'seller', checkoutId: 'checkout-one', createdAt: '2026-10-09T00:00:00Z' }
  const second = { ...first, id: 'two', createdAt: '2026-10-09T00:00:01Z' }
  assert.equal(marketplaceOrderGroupKey(first), marketplaceOrderGroupKey(second))
  const refunds = [first, second].map((order, index) => ({ id: `refund-${index}`, kind: 3, referenceId: order.id, amount: 30000, balanceAfter: 200000, description: 'Hoàn tiền', createdAt: order.createdAt }))
  assert.equal(groupMarketplaceOrderRefunds(refunds, [first, second])[0].amount, 60000)
})

test('legacy per-line marketplace refunds display as one checkout refund', () => {
  const createdAt = '2026-07-16T14:30:00Z'
  const orderBase = { buyerId: 'buyer', sellerId: 'seller', createdAt }
  const orders = [
    { ...orderBase, id: 'order-1' },
    { ...orderBase, id: 'order-2' },
    { ...orderBase, id: 'order-3' },
  ]
  const transactions = [
    { id: 'refund-1', kind: 3, amount: 32_000, balanceAfter: 1_965_000, referenceId: 'order-1', description: 'Hoàn tiền đơn chợ Homeji', createdAt },
    { id: 'refund-2', kind: 3, amount: 25_000, balanceAfter: 1_933_000, referenceId: 'order-2', description: 'Hoàn tiền đơn chợ Homeji', createdAt },
    { id: 'refund-3', kind: 3, amount: 35_000, balanceAfter: 2_000_000, referenceId: 'order-3', description: 'Hoàn tiền đơn chợ Homeji', createdAt },
  ]

  const result = groupMarketplaceOrderRefunds(transactions, orders)

  assert.equal(result.length, 1)
  assert.equal(result[0].amount, 92_000)
  assert.equal(result[0].balanceAfter, 2_000_000)
  assert.equal(result[0].description, 'Hoàn tổng đơn chợ Homeji · 3 món')
})
