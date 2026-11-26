import assert from 'node:assert/strict'
import test from 'node:test'
import { agentAccessSnapshot } from '../src/lib/agentAccessSnapshot.ts'

const exhausted = { canUse: false, isPremium: false, freeWeeklyLimit: 1, freeWeeklyRemaining: 0, hasActiveFreeSession: false }

test('authoritative Premium access discards an expired subscription snapshot on renewal', () => {
  const old = { ...agentAccessSnapshot(exhausted), premiumExpiresAt: 1 }
  const renewed = { ...old, ...agentAccessSnapshot({ ...exhausted, isPremium: true, canUse: true }) }
  assert.equal(renewed.isPremium, true)
  assert.equal(renewed.canUse, true)
  assert.equal(renewed.premiumExpiresAt, null)
})

test('server quota and reset are preserved without inventing Premium access', () => {
  const snapshot = agentAccessSnapshot({ ...exhausted, nextFreeResetAt: '2026-12-01T00:00:00Z' })
  assert.equal(snapshot.isPremium, false)
  assert.equal(snapshot.canUse, false)
  assert.equal(snapshot.nextFreeResetAt, '2026-12-01T00:00:00Z')
  assert.equal(agentAccessSnapshot(exhausted).nextFreeResetAt, null)
})
