import test from 'node:test'
import assert from 'node:assert/strict'
import { createListingSearchStore, splitListingNavigation, mergeListingSearch, isListingSearchNavigation, LISTING_SEARCH_STORAGE_KEY } from '../src/lib/listingSearchState.ts'

test('criteria migration is limited to housing navigation, leaving feature and payment links intact', () => {
  assert.equal(isListingSearchNavigation(new URLSearchParams('section=listings')), true)
  assert.equal(isListingSearchNavigation(new URLSearchParams('source=room')), true)
  for (const section of ['marketplace', 'payments', 'invitations', 'profile']) assert.equal(isListingSearchNavigation(new URLSearchParams('section=' + section)), false)
  assert.equal(isListingSearchNavigation(new URLSearchParams('page=2&minPrice=1000000'), '/marketplace'), false)
  assert.equal(isListingSearchNavigation(new URLSearchParams('code=auth'), '/auth/callback'), false)
})

test('search criteria are split from navigation and payment return fields', () => {
  const { navigation, criteria } = splitListingNavigation(new URLSearchParams('section=listings&view=map&catalog=apartments&source=room&minLatitude=10.75&maxLatitude=10.85&minLongitude=106.67&maxLongitude=106.96&maxPrice=3000000&amenities=AC&amenities=WATER_HEATER&paymentId=pay&orderCode=order'))
  assert.equal(navigation.toString(), 'section=listings&view=map&catalog=apartments&source=room&paymentId=pay&orderCode=order')
  assert.deepEqual(criteria.amenities, ['AC', 'WATER_HEATER'])
  assert.deepEqual(criteria.minLatitude, ['10.75'])
  assert.deepEqual(criteria.maxPrice, ['3000000'])
})

test('tab state survives reload and explicit reset removes old criteria', () => {
  const data = new Map()
  const storage = { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) }
  const store = createListingSearchStore(storage)
  store.set({ keyword: ['Lê Văn Việt'], maxPrice: ['3000000'] })
  assert.deepEqual(createListingSearchStore(storage).getSnapshot(), store.getSnapshot())
  store.set({})
  assert.deepEqual(createListingSearchStore(storage).getSnapshot(), {})
})

test('separate tabs and memory-only sessions have isolated criteria', () => {
  const a = createListingSearchStore(), b = createListingSearchStore()
  a.set({ minLatitude: ['10.8'] })
  assert.deepEqual(b.getSnapshot(), {})
  const unavailable = createListingSearchStore({ getItem() { throw Error('blocked') }, setItem() { throw Error('blocked') }, removeItem() {} })
  unavailable.set({ keyword: ['Lê Văn Việt'] })
  assert.deepEqual(unavailable.getSnapshot().keyword, ['Lê Văn Việt'])
})

test('invalid, oversized and unknown stored fields do not become search state', () => {
  for (const raw of ['{broken', 'x'.repeat(16385), '{"version":2,"criteria":{"keyword":["bad"]}}']) {
    assert.deepEqual(createListingSearchStore({ getItem: () => raw, setItem() {}, removeItem() {} }).getSnapshot(), {})
  }
  const raw = JSON.stringify({ version: 1, criteria: { source: ['private-id'], accessToken: ['never'], maxPrice: ['3000000'], keyword: [null, 42, 'valid'] } })
  const store = createListingSearchStore({ getItem: key => { assert.equal(key, LISTING_SEARCH_STORAGE_KEY); return raw }, setItem() {}, removeItem() {} })
  assert.deepEqual(store.getSnapshot(), { maxPrice: ['3000000'], keyword: ['valid'] })
})

test('legacy criteria override saved fields without overwriting unrelated criteria', () => {
  const merged = mergeListingSearch(new URLSearchParams('section=listings&maxPrice=2000000'), { maxPrice: ['4000000'], amenities: ['AC'] })
  assert.equal(merged.get('maxPrice'), '2000000')
  assert.deepEqual(merged.getAll('amenities'), ['AC'])
})

test('subscribers receive changed snapshots once and unsubscribe cleanly', () => {
  const store = createListingSearchStore()
  let notifications = 0
  const unsubscribe = store.subscribe(() => notifications++)
  store.set({ keyword: ['a'] }); store.set({ keyword: ['a'] })
  assert.equal(notifications, 1)
  unsubscribe(); store.set({ keyword: ['b'] })
  assert.equal(notifications, 1)
})
