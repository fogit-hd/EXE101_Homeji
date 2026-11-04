import assert from 'node:assert/strict'
import test from 'node:test'
import {
  AUTH_EXPIRED_EVENT,
  applyIssuedToken,
  clearStoredAuth,
  expireStoredAuth,
  getMemorySession,
  getSessionEpoch,
  hasSessionHint,
  readAuthTokenState,
  setMemorySession,
} from '../src/api/authSession.ts'

function jwtWithExpiry(exp) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${encode({ alg: 'none' })}.${encode({ exp, sub: 'user-1' })}.signature`
}

test('expired token without a cookie session is removed before protected API requests are sent', () => {
  setMemorySession({ accessToken: jwtWithExpiry(1_700_000_000), userId: 'user-1', email: 'user@example.com' })
  const events = new EventTarget()
  let expiredEvents = 0
  events.addEventListener(AUTH_EXPIRED_EVENT, () => { expiredEvents += 1 })

  const result = readAuthTokenState(1_700_000_001_000, events)

  assert.deepEqual(result, { token: null, expired: true })
  assert.equal(getMemorySession(), null)
  assert.equal(expiredEvents, 1)
})

test('valid token remains available for protected API requests', () => {
  const token = jwtWithExpiry(1_700_000_100)
  setMemorySession({ accessToken: token, userId: 'user-1', email: null })

  assert.deepEqual(readAuthTokenState(1_700_000_001_000, new EventTarget()), { token, expired: false })
})

test('parallel unauthorized responses broadcast session expiry only once', () => {
  setMemorySession({ accessToken: 'token', userId: 'user-1', email: null })
  const events = new EventTarget()
  let expiredEvents = 0
  events.addEventListener(AUTH_EXPIRED_EVENT, () => { expiredEvents += 1 })

  expireStoredAuth(events)
  expireStoredAuth(events)

  assert.equal(expiredEvents, 1)
})

test('user id falls back to the token subject for sign-in links that carry none', () => {
  setMemorySession({ accessToken: jwtWithExpiry(1_700_000_100), userId: null, email: null })
  assert.equal(getMemorySession().userId, 'user-1')
})

test('rotation keeps the session epoch so in-flight requests survive', () => {
  setMemorySession({ accessToken: 'first', userId: 'user-1', email: 'a@example.test' })
  const epoch = getSessionEpoch()

  applyIssuedToken('second', 'user-1', null)

  assert.equal(getSessionEpoch(), epoch)
  assert.deepEqual(getMemorySession(), { accessToken: 'second', userId: 'user-1', email: 'a@example.test' })
})

test('a different account or a sign-out starts a new epoch', () => {
  setMemorySession({ accessToken: 'first', userId: 'user-1', email: 'a@example.test' })
  const epoch = getSessionEpoch()

  applyIssuedToken('other', 'user-2', null)
  assert.notEqual(getSessionEpoch(), epoch)
  assert.equal(getMemorySession().email, null)

  const replaced = getSessionEpoch()
  clearStoredAuth()
  assert.notEqual(getSessionEpoch(), replaced)
})

test('session hint is read from cookies without matching other names', () => {
  assert.equal(hasSessionHint('theme=dark; homeji_session_hint=1'), true)
  assert.equal(hasSessionHint('not_homeji_session_hint=1'), false)
  assert.equal(hasSessionHint(''), false)
  assert.equal(hasSessionHint(null), false)
})
