import assert from 'node:assert/strict'
import test from 'node:test'
import { profileReturnTo, profileSetupUrl } from '../src/lib/profileSetup.ts'

test('profile setup restores the exact task without replaying a payment', () => {
  const target = '/?section=marketplace&market=wallet&wallet=deposit'
  const url = new URL(profileSetupUrl(target), 'https://homeji.test')
  assert.equal(url.searchParams.get('section'), 'profile')
  assert.equal(url.searchParams.get('profileTab'), 'basic')
  assert.equal(profileReturnTo(url.searchParams.get('returnTo')), target)
})
test('return links cannot leave Homeji or loop back into profile setup', () => {
  for (const target of ['https://evil.test', '//evil.test', '/\\evil.test', '/\nevil.test', '/profile', '/?section=profile', 'javascript:alert(1)'])
    assert.equal(profileReturnTo(target), null, target)
})
