import assert from 'node:assert/strict'
import test from 'node:test'
import {
  AUTH_EXPIRED_EVENT,
  expireStoredAuth,
  readAuthTokenState,
} from '../src/api/authSession.ts'

function jwtWithExpiry(exp) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${encode({ alg: 'none' })}.${encode({ exp })}.signature`
}

function createStorage(entries) {
  const values = new Map(Object.entries(entries))
  return {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => values.delete(key),
    has: (key) => values.has(key),
  }
}

test('expired JWT is removed before protected API requests are sent', () => {
  const storage = createStorage({
    homeji_access_token: jwtWithExpiry(1_700_000_000),
    homeji_user_id: 'user-1',
    homeji_email: 'user@example.com',
  })
  const events = new EventTarget()
  let expiredEvents = 0
  events.addEventListener(AUTH_EXPIRED_EVENT, () => { expiredEvents += 1 })

  const result = readAuthTokenState(1_700_000_001_000, storage, events)

  assert.deepEqual(result, { token: null, expired: true })
  assert.equal(storage.has('homeji_access_token'), false)
  assert.equal(storage.has('homeji_user_id'), false)
  assert.equal(storage.has('homeji_email'), false)
  assert.equal(expiredEvents, 1)
})

test('valid JWT remains available for protected API requests', () => {
  const token = jwtWithExpiry(1_700_000_100)
  const storage = createStorage({ homeji_access_token: token })

  assert.deepEqual(
    readAuthTokenState(1_700_000_001_000, storage, new EventTarget()),
    { token, expired: false },
  )
})

test('parallel unauthorized responses broadcast session expiry only once', () => {
  const storage = createStorage({ homeji_access_token: 'token' })
  const events = new EventTarget()
  let expiredEvents = 0
  events.addEventListener(AUTH_EXPIRED_EVENT, () => { expiredEvents += 1 })

  expireStoredAuth(storage, events)
  expireStoredAuth(storage, events)

  assert.equal(expiredEvents, 1)
})
