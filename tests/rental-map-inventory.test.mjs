import assert from 'node:assert/strict'
import test from 'node:test'
import { reactDomModule } from './helpers/react-dom-module.mjs'
const stub = 'data:text/javascript,export const searchRentalPosts=(...args)=>globalThis.__mapInventorySearch(...args)'
const { searchRentalMapInventory } = await import(reactDomModule('src/lib/rentalMapInventory.ts', { '../api': stub }))

test('older owner pins survive a full first page of imported posts; filters and cancellation are preserved', async () => {
  const calls = [], controller = new AbortController()
  globalThis.__mapInventorySearch = async (params, options) => {
    calls.push({ params, options })
    return params.page === 1 ? Array.from({ length: 100 }, (_, i) => ({ id: 'import-' + i })) : [{ id: 'original-owner-6m' }]
  }
  const posts = await searchRentalMapInventory({ keyword: 'Thủ Đức', minPrice: 1000000, page: 9 }, { signal: controller.signal })
  assert.equal(posts.length, 101)
  assert.equal(posts.at(-1).id, 'original-owner-6m')
  assert.deepEqual(calls.map(call => call.params.page), [1, 2])
  assert.ok(calls.every(call => call.params.pageSize === 100 && call.params.keyword === 'Thủ Đức' && call.params.minPrice === 1000000 && call.options.signal === controller.signal))
})
test('a later-page failure never presents the first page as the complete map', async () => {
  globalThis.__mapInventorySearch = async params => { if (params.page === 2) throw Error('next page failed'); return Array.from({ length: 100 }, (_, i) => ({ id: String(i) })) }
  await assert.rejects(searchRentalMapInventory({}, { signal: new AbortController().signal }), /next page failed/)
})
test('cancelling between pages prevents another request', async () => {
  const controller = new AbortController(); let calls = 0
  globalThis.__mapInventorySearch = async () => { calls++; controller.abort(); return Array.from({ length: 100 }, (_, i) => ({ id: String(i) })) }
  await assert.rejects(searchRentalMapInventory({}, { signal: controller.signal }), error => error.name === 'AbortError')
  assert.equal(calls, 1)
})

test('guest map reads past a thousand posts and stops on the last page', async () => {
  const signal = new AbortController().signal
  globalThis.__mapInventorySearch = async ({ page, pageSize }, options) => {
    assert.equal(options.auth, false)
    return Array.from({ length: page <= 10 ? pageSize : 1 }, (_, index) => ({ id: `${page}:${index}` }))
  }
  const posts = await searchRentalMapInventory({}, { auth: false, signal })
  assert.equal(posts.length, 1001)
  assert.equal(posts.at(-1).id, '11:0')
})

test('a repeated full page is rejected instead of retrying indefinitely', async () => {
  globalThis.__mapInventorySearch = async () => Array.from({ length: 100 }, (_, index) => ({ id: String(index) }))
  await assert.rejects(searchRentalMapInventory({}, { signal: new AbortController().signal }), /trang tin tiếp theo/)
})
