import assert from 'node:assert/strict'
import test from 'node:test'
import { currentSubscription } from '../src/lib/currentSubscription.ts'
test('missing subscription is unknown, never falsely Free', () => {
  assert.equal(currentSubscription(null).premium, null)
  assert.notEqual(currentSubscription(null).label, 'Homeji Free')
})
test('premium keeps server package name and normalizes matching code', () => {
  const current = currentSubscription({isPremium:true,packageName:'Homeji Pro Max',packageCode:' premium_yearly ',premiumExpiresAt:'2027-01-01T00:00:00Z'})
  assert.equal(current.label, 'Homeji Pro Max')
  assert.equal(current.code, 'PREMIUM_YEARLY')
  assert.equal(current.premium, true)
})
test('only a successful non-premium response identifies Free', () => {
  assert.equal(currentSubscription({isPremium:false,packageName:null,packageCode:null,premiumExpiresAt:null}).label, 'Homeji Free')
})
