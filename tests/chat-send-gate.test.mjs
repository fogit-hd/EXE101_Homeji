import assert from 'node:assert/strict'
import test from 'node:test'
import { createKeyedAsyncActionGate } from '../src/lib/asyncActionGate.ts'
test('only duplicate operations are locked; another thread or operation runs independently', async () => {
  const gate = createKeyedAsyncActionGate(); let release; let duplicates = 0; const events = []
  const first = gate('a:images', async () => { events.push('upload'); await new Promise(resolve => { release = resolve }) })
  await gate('a:images', async () => { duplicates++ })
  await gate('a:text', async () => { events.push('text A') })
  await gate('b:text', async () => { events.push('text B') })
  assert.equal(duplicates, 0); assert.deepEqual(events, ['upload', 'text A', 'text B'])
  release(); await first; await gate('a:images', async () => { events.push('retry') }); assert.equal(events.at(-1), 'retry')
})
test('failure releases only its own operation lock', async () => {
  const gate = createKeyedAsyncActionGate()
  await assert.rejects(gate('a:images', async () => { throw new Error('fixture') }))
  let retried = false; await gate('a:images', async () => { retried = true }); assert.equal(retried, true)
})
