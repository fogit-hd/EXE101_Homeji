import assert from 'node:assert/strict'
import test from 'node:test'
import { formatPaymentCountdown, paymentDeadline, paymentSecondsLeft, safeCheckoutUrl } from '../src/lib/paymentLifecycle.ts'

const createdAt = '2026-10-03T00:00:00Z'
const start = Date.parse(createdAt)

test('legacy orders expire 15 minutes after creation, even after reloading', () => {
  assert.equal(paymentDeadline({ createdAt }), start + 900_000)
  assert.equal(paymentSecondsLeft({ createdAt }, start + 840_000), 60)
  assert.equal(paymentSecondsLeft({ createdAt }, start + 900_000), 0)
  assert.equal(paymentSecondsLeft({ createdAt }, start + 3_600_000), 0)
})

test('server deadline wins over client fallback and supports timezone offsets', () => {
  const payment = { createdAt, expiresAt: '2026-10-03T07:10:00+07:00' }
  assert.equal(paymentSecondsLeft(payment, start), 600)
  assert.equal(paymentSecondsLeft({ createdAt: '2026-10-03T07:00:00+07:00' }, start), 900)
})

test('invalid dates do not produce an unbounded countdown', () => {
  assert.equal(paymentDeadline({ createdAt: 'invalid' }), null)
  assert.equal(paymentSecondsLeft({ createdAt, expiresAt: 'invalid' }, start), null)
  assert.equal(formatPaymentCountdown(900), '15:00')
  assert.equal(formatPaymentCountdown(65), '01:05')
  assert.equal(formatPaymentCountdown(0), '00:00')
})

test('checkout rejects executable URLs, plain HTTP and embedded credentials', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,test', 'http://pay.test', 'https://user:secret@pay.test', '/relative', null]) {
    assert.equal(safeCheckoutUrl(url), null)
  }
  assert.equal(safeCheckoutUrl('https://pay.payos.vn/test'), 'https://pay.payos.vn/test')
})
