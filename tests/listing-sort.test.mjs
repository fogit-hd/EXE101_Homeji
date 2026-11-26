import assert from 'node:assert/strict'
import test from 'node:test'
import { sortListings } from '../src/components/map/listings/listingSort.ts'

const rooms = [
  { id: 'a', price: 2_500_000, area: 20 },
  { id: 'b', price: 0, area: 30 },
  { id: 'c', price: 1_000_000, area: null },
  { id: 'd', price: 2_500_000, area: 25 },
  { id: 'e', price: 1_200_000, area: 18 },
]
const ids = (sort) => sortListings(rooms, sort, (room) => room).map((room) => room.id).join('')

test('price sorts put rooms without a price last and keep ties in order', () => {
  assert.equal(ids('priceAsc'), 'ceadb')
  assert.equal(ids('priceDesc'), 'adecb')
})

test('area sort puts rooms without an area last', () => {
  assert.equal(ids('areaDesc'), 'bdaec')
})

test('default keeps the given order without mutating the input', () => {
  assert.equal(ids('default'), 'abcde')
  assert.equal(rooms.map((room) => room.id).join(''), 'abcde')
})
