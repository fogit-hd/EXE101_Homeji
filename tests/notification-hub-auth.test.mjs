import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createNotificationHubRetryPolicy,
  NotificationHubAuthenticationError,
  requireNotificationHubAccessToken,
} from '../src/hooks/notificationHubRetryPolicy.ts'

test('notification hub never turns a missing session into an empty bearer token', () => {
  assert.throws(
    () => requireNotificationHubAccessToken(() => null),
    NotificationHubAuthenticationError,
  )
})

test('notification hub stops reconnecting as soon as the session is unavailable', () => {
  const policy = createNotificationHubRetryPolicy({
    getAccessToken: () => null,
    onUnauthorized: () => assert.fail('local expiry already handled by session reader'),
  })

  assert.equal(policy.nextRetryDelayInMilliseconds({
    previousRetryCount: 0,
    elapsedMilliseconds: 0,
    retryReason: new Error('WebSocket closed with status code: 1006'),
  }), null)
})

test('notification hub turns the first 401 into logout and never retries it', () => {
  let unauthorizedCount = 0
  const policy = createNotificationHubRetryPolicy({
    getAccessToken: () => 'still-present-but-rejected',
    onUnauthorized: () => { unauthorizedCount += 1 },
  })

  assert.equal(policy.nextRetryDelayInMilliseconds({
    previousRetryCount: 1,
    elapsedMilliseconds: 2_000,
    retryReason: new Error("Failed to complete negotiation: Status code '401'"),
  }), null)
  assert.equal(unauthorizedCount, 1)
})

test('notification hub retains bounded reconnect delays for transient failures', () => {
  const policy = createNotificationHubRetryPolicy({
    getAccessToken: () => 'valid-token',
    onUnauthorized: () => assert.fail('transient failure must not log the user out'),
  })

  assert.equal(policy.nextRetryDelayInMilliseconds({
    previousRetryCount: 0,
    elapsedMilliseconds: 0,
    retryReason: new Error('WebSocket closed with status code: 1006'),
  }), 0)
  assert.equal(policy.nextRetryDelayInMilliseconds({
    previousRetryCount: 4,
    elapsedMilliseconds: 17_000,
    retryReason: new Error('Network temporarily unavailable'),
  }), 30_000)
})
