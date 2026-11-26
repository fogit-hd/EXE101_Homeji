import assert from 'node:assert/strict'
import test from 'node:test'
import { authSection, authSectionUrl } from '../src/lib/authSections.ts'

test('auth section accepts only the three known sections and defaults to login', () => {
  for (const section of ['login', 'register', 'forgot-password']) assert.equal(authSection('?section=' + section), section)
  for (const search of ['', '?section=unknown', '?section=__proto__', '?section=constructor']) assert.equal(authSection(search), 'login')
})

test('legacy auth links preserve query values and hash while selecting the canonical section', () => {
  assert.equal(authSectionUrl('register', '?ref=friend&section=login', '#form'), '/auth?ref=friend&section=register#form')
  assert.equal(authSectionUrl('forgot-password'), '/auth?section=forgot-password')
  assert.equal(authSectionUrl('login', '?redirect=%2F%3Fsection%3Dsaved'), '/auth?redirect=%2F%3Fsection%3Dsaved&section=login')
})
