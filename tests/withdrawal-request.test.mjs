import assert from 'node:assert/strict'
import test from 'node:test'
import { withdrawalAttempt } from '../src/lib/withdrawalRequest.ts'

const input = { amount: 50000, bankName: 'Bank', accountNumber: '123456789', accountHolder: 'TEST USER' }
function store() { const values = new Map(); return { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k), values } }
test('uncertain retry and reload retain ID; confirmed success permits a new withdrawal', async () => {
  const storage = store()
  const first = await withdrawalAttempt('user-a', input, storage)
  assert.equal(first.reused, false)
  const retry = await withdrawalAttempt('user-a', { ...input, bankName: ' Bank ', accountHolder: 'test user' }, storage)
  assert.equal(retry.requestId, first.requestId)
  assert.equal(retry.reused, true)
  assert.notEqual((await withdrawalAttempt('user-b', input, storage)).requestId, first.requestId)
  assert.notEqual((await withdrawalAttempt('user-a', { ...input, amount: 60000 }, storage)).requestId, first.requestId)
  assert.ok([...storage.values.keys()].every(key => !key.includes(input.accountNumber)))
  retry.complete()
  assert.notEqual((await withdrawalAttempt('user-a', input, storage)).requestId, first.requestId)
})
test('unavailable durable storage prevents sending an unsafe request', async () => {
  await assert.rejects(withdrawalAttempt('a', input, { getItem() { throw new Error('blocked') } }), /blocked/)
})
