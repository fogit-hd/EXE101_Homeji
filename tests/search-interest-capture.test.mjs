import assert from 'node:assert/strict'
import test from 'node:test'
import { interestFromSearch, interestSession } from '../src/lib/searchInterestCapture.ts'

test('captures housing intent and hard filters without location tracking', () => {
  const c = interestFromSearch('?section=listings&keyword=Long+Thạnh+Mỹ&maxPrice=4000000&amenities=WIFI,AIR_CONDITIONER&excludedAmenities=PET_FRIENDLY&minAvailableSlots=2')
  assert.equal(c.area, 'Long Thạnh Mỹ'); assert.equal(c.maxPrice, 4000000)
  assert.deepEqual(c.amenities, ['WIFI', 'AIR_CONDITIONER']); assert.equal(c.occupants, 2)
  assert.equal(c.latitude, undefined)
})
test('ignores map movement, viewed posts, marketplace and unrelated sections', () => {
  for (const q of ['?section=listings&minLatitude=10', '?section=marketplace&keyword=Thủ+Đức', '?section=listings&catalog=market&keyword=Thủ+Đức', '?section=listings&keyword=Thủ+Đức&post=id']) assert.equal(interestFromSearch(q), null)
})
test('session survives reloads, expires after inactivity and is account scoped', () => {
  const data = new Map(); const storage = { getItem: k => data.get(k) ?? null, setItem: (k,v) => data.set(k,v) }
  let count=0; const uuid=()=>String(++count)
  assert.equal(interestSession(storage,'a',1000,uuid),'1')
  assert.equal(interestSession(storage,'a',2000,uuid),'1')
  assert.equal(interestSession(storage,'b',2000,uuid),'2')
  assert.equal(interestSession(storage,'a',2000+31*60*1000,uuid),'3')
})
test('rejects malformed and excessively long area names', () => {
  assert.equal(interestFromSearch('?section=listings&keyword=a'),null)
  assert.equal(interestFromSearch('?section=listings&keyword='+ 'a'.repeat(161)),null)
})
