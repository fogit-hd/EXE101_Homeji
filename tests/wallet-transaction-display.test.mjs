import assert from 'node:assert/strict'
import test from 'node:test'
import { groupMarketplaceOrderRefunds } from '../src/lib/walletTransactionDisplay.ts'

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
