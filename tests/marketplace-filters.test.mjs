import assert from 'node:assert/strict'
import test from 'node:test'
import { filterCatalog } from '../src/lib/marketplaceFilters.ts'
const posts = [
  { title: 'Cơm nhà', description: 'Gà', category: 'Cơm nhà', listingType: 2, status: 1, price: 35000 },
  { title: 'Bàn học', description: 'Gỗ', category: 'Nội thất', listingType: 1, status: 2, price: 200000 },
  { title: 'Tủ lạnh', description: '', category: 'Điện tử', listingType: 1, status: 1, price: 900000 },
]
const empty = { keyword: '', category: '', kind: '', status: '', price: '', sort: 'default' }
test('own inventory filters combine kind, state and category without hiding sold posts', () => {
  assert.deepEqual(filterCatalog(posts, {...empty, kind:'1', status:'2', category:'Nội thất'}).map(p=>p.title), ['Bàn học'])
  assert.equal(filterCatalog(posts, {...empty, kind:'2', category:'Điện tử'}).length, 0)
})
test('price ranges, search and sorting are deterministic and preserve original data', () => {
  assert.equal(filterCatalog(posts, {...empty, price:'under100'})[0].title, 'Cơm nhà')
  assert.equal(filterCatalog(posts, {...empty, price:'100to500'})[0].title, 'Bàn học')
  assert.equal(filterCatalog(posts, {...empty, keyword:'gÀ'})[0].title, 'Cơm nhà')
  assert.equal(filterCatalog(posts, {...empty, sort:'priceDesc'})[0].title, 'Tủ lạnh')
  assert.equal(posts[0].title, 'Cơm nhà')
})

test('Mới nhất sorts by creation date even when the API orders by distance', () => {
  const nearbyOrdered = [
    {...posts[0], createdAt:'2026-01-01T00:00:00Z',distanceKm:0.1},
    {...posts[2], createdAt:'2026-10-01T00:00:00Z',distanceKm:3},
  ]
  assert.equal(filterCatalog(nearbyOrdered, empty)[0].title, 'Tủ lạnh')
  assert.equal(filterCatalog(nearbyOrdered, {...empty,sort:'nearby'})[0].title, 'Cơm nhà')
  assert.equal(nearbyOrdered[0].title, 'Cơm nhà')
})
