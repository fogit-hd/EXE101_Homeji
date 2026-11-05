import test from 'node:test'
import assert from 'node:assert/strict'
import { canClaimReferral, groupVouchers, referralPanel } from '../src/lib/referralView.ts'

const base = { isLoading: false, isAuthenticated: true, needsProfileSetup: false, hasData: true, hasError: false, hasCode: false }
const summary = { code: null, successfulInvites: 0, remainingPairs: 5, received: false, vouchers: [] }
const voucher = { id: 'a', purpose: 'food', rate: 0.05, maximumDiscount: 10000, minimumSpend: 100000, expiresAt: '2099-01-01T00:00:00Z', used: false }
const now = Date.parse('2026-11-05T00:00:00Z')

test('the invite panel follows account state before showing share actions', () => {
  assert.equal(referralPanel({ ...base, isLoading: true }), 'loading')
  assert.equal(referralPanel({ ...base, isAuthenticated: false, hasData: false }), 'guest')
  assert.equal(referralPanel({ ...base, needsProfileSetup: true }), 'setup')
  assert.equal(referralPanel({ ...base, hasData: false }), 'loading')
  assert.equal(referralPanel({ ...base, hasData: false, hasError: true }), 'error')
  assert.equal(referralPanel(base), 'create')
  assert.equal(referralPanel({ ...base, hasCode: true }), 'share')
})

test('claiming is offered only when the backend would accept it', () => {
  assert.equal(canClaimReferral(summary), true)
  assert.equal(canClaimReferral({ ...summary, received: true }), false)
  assert.equal(canClaimReferral({ ...summary, successfulInvites: 1 }), false, 'inviters who were rewarded cannot claim a signup gift')
  assert.equal(canClaimReferral({ ...summary, remainingPairs: 0 }), false)
  assert.equal(canClaimReferral(null), false)
})

test('identical vouchers collapse and usable ones come first', () => {
  const groups = groupVouchers([
    { ...voucher, id: 'used', used: true },
    { ...voucher, id: 'expired', expiresAt: '2026-01-01T00:00:00Z' },
    { ...voucher, id: 'food-1' },
    { ...voucher, id: 'food-2' },
    { ...voucher, id: 'vip', purpose: 'vip', rate: 0.2, maximumDiscount: 20000, minimumSpend: 50000 },
  ], now)
  assert.deepEqual(groups.map(group => [group.voucher.purpose, group.state, group.count]), [
    ['food', 'usable', 2],
    ['vip', 'usable', 1],
    ['food', 'used', 1],
    ['food', 'expired', 1],
  ])
})
