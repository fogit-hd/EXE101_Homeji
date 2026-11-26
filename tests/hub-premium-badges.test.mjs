import assert from 'node:assert/strict'
import test from 'node:test'
import { showHubPremiumBadges } from '../src/lib/hubPremiumBadges.ts'

test('hub badges distinguish Premium only in a mixed rendered list', () => {
  assert.equal(showHubPremiumBadges([]), false)
  assert.equal(showHubPremiumBadges([{ isOwnerPremium: true }]), false)
  assert.equal(showHubPremiumBadges([{ isOwnerPremium: true }, { isOwnerPremium: true }]), false)
  assert.equal(showHubPremiumBadges([{ isOwnerPremium: false }, {}]), false)
  assert.equal(showHubPremiumBadges([{ isOwnerPremium: true }, { isOwnerPremium: false }]), true)
  assert.equal(showHubPremiumBadges([{ isOwnerPremium: true }, {}]), true)
})
