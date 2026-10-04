import assert from 'node:assert/strict'
import test from 'node:test'
import { createCoalescedLoad } from '../src/lib/coalescedLoad.ts'

test('a changed filter during loading runs the latest query before resolving', async () => {
  let filter = 'food'
  let release
  const held = new Promise(resolve => { release = resolve })
  const queries = []
  let visibleResult
  const load = createCoalescedLoad(async () => {
    const query = filter
    queries.push(query)
    if (queries.length === 1) await held
    visibleResult = query
  })
  const first = load()
  filter = 'goods'
  const second = load()
  filter = 'goods-sold'
  const third = load()
  release()
  await Promise.all([first, second, third])
  assert.deepEqual(queries, ['food', 'goods-sold'])
  assert.equal(visibleResult, filter)
})

test('a failed request does not lock subsequent retries', async () => {
  let attempts = 0
  const load = createCoalescedLoad(async () => {
    if (++attempts === 1) throw new Error('offline')
  })
  await assert.rejects(load(), /offline/)
  await load()
  assert.equal(attempts, 2)
})

test('an obsolete failure cannot discard a queued latest filter', async () => {
  let release
  const held = new Promise(resolve => { release = resolve })
  let attempts = 0
  const load = createCoalescedLoad(async () => {
    if (++attempts === 1) {
      await held
      throw new Error('old query failed')
    }
  })
  const first = load()
  const latest = load()
  release()
  await Promise.all([first, latest])
  assert.equal(attempts, 2)
})

test('a failure in the latest query is reported to all waiting callers', async () => {
  let release
  const held = new Promise(resolve => { release = resolve })
  let attempts = 0
  const load = createCoalescedLoad(async () => {
    if (++attempts === 1) await held
    else throw new Error('latest query failed')
  })
  const first = load()
  const latest = load()
  release()
  const results = await Promise.allSettled([first, latest])
  assert.ok(results.every(result => result.status === 'rejected' && result.reason.message === 'latest query failed'))
})
