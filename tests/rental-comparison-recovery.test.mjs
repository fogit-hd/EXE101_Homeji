import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

const compileUrl = source => `data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext },
}).outputText).toString('base64')}`
const typesUrl = compileUrl(await readFile(new URL('../src/api/types.ts', import.meta.url), 'utf8'))
const { RentalPostStatus } = await import(typesUrl)
const { recoverRentalComparison } = await import(compileUrl((await readFile(new URL('../src/components/ai/recoverRentalComparison.ts', import.meta.url), 'utf8'))
  .replace('../../api/types', typesUrl)))
class HttpFailure extends Error { constructor(status) { super(`HTTP ${status}`); this.status = status } }
const isNotFound = reason => reason instanceof HttpFailure && reason.status === 404
const active = id => ({ id, status: RentalPostStatus.Active })

test('proven 404 and inactive listings are removed while authorized active listings survive', async () => {
  const calls = []
  const result = await recoverRentalComparison(['active', 'missing', 'archived'], async id => {
    calls.push(id)
    if (id === 'missing') throw new HttpFailure(404)
    return id === 'active' ? active(id) : { id, status: RentalPostStatus.Archived }
  }, isNotFound)
  assert.deepEqual(calls, ['active', 'missing', 'archived'])
  assert.deepEqual(result.posts.map(item => item.post.id), ['active'])
  assert.equal(result.removedCount, 2)
  assert.equal(result.unresolvedCount, 0)
})

test('network, authentication, permission and server failures stay unknown and suppress partial comparison', async () => {
  for (const error of [new TypeError('Failed to fetch'), new HttpFailure(401), new HttpFailure(403), new HttpFailure(429), new HttpFailure(500)]) {
    const result = await recoverRentalComparison(['active', 'unknown'], async id => {
      if (id === 'unknown') throw error
      return active(id)
    }, isNotFound)
    assert.deepEqual(result.posts, [])
    assert.equal(result.removedCount, 0)
    assert.equal(result.unresolvedCount, 1)
  }
})

test('mixed genuine deletion and transient failure do not classify the unknown row as removed', async () => {
  const result = await recoverRentalComparison(['missing', 'timeout', 'active'], async id => {
    if (id === 'missing') throw new HttpFailure(404)
    if (id === 'timeout') throw new Error('timeout')
    return active(id)
  }, isNotFound)
  assert.deepEqual(result, { posts: [], removedCount: 1, unresolvedCount: 1 })
})

test('a later successful retry rebuilds a complete comparison without retaining the earlier unknown state', async () => {
  const failed = await recoverRentalComparison(['one', 'two'], async () => { throw new HttpFailure(503) }, isNotFound)
  assert.equal(failed.unresolvedCount, 2)
  const retried = await recoverRentalComparison(['one', 'two'], async id => active(id), isNotFound)
  assert.deepEqual(retried.posts.map(item => item.post.id), ['one', 'two'])
  assert.equal(retried.unresolvedCount, 0)
  assert.equal(retried.removedCount, 0)
})

test('deferred requests settling out of order retain input identity and do not fail fast', async () => {
  let resolveOne, rejectTwo
  const one = new Promise(resolve => { resolveOne = resolve })
  const two = new Promise((_, reject) => { rejectTwo = reject })
  const recovery = recoverRentalComparison(['one', 'two'], id => id === 'one' ? one : two, isNotFound)
  rejectTwo(new HttpFailure(404))
  resolveOne(active('one'))
  const result = await recovery
  assert.deepEqual(result.posts.map(item => item.post.id), ['one'])
  assert.equal(result.removedCount, 1)
})
