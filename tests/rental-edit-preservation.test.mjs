import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

// Execute the actual save handler against a captured API boundary, without HTTP writes.
const source = readFileSync(new URL('../src/pages/EditRentalPostPage.tsx', import.meta.url), 'utf8')
const handler = source.slice(source.indexOf('const persistDraft = async () => {'), source.indexOf('const handleSave ='))

async function captureSave(post, overrides = {}) {
  let request
  const context = {
    postId: 'local-test-only', post, latNum: 10.87, lngNum: 106.8,
    latitude: '10.87', longitude: '106.8', type: 1,
    title: 'Updated title', description: 'Updated description', price: '3500000',
    deposit: '1000000', area: '20', address: 'Existing address', amenities: [],
    availableFrom: '2026-10-05', transferKind: 1, originalLeaseEndsOn: '',
    passFee: '0', transferReason: '', ownerConsentConfirmed: false, ownerConsentContact: '',
    isValidCoord: () => true, normalizeAmenityCode: value => value,
    RentalPostType: { RoomTransfer: 3 }, isRenterShare: false, maxOccupants: '', availableSlots: '',
    updateRentalPost: async (_id, payload) => { request = payload; return { ...post, ...payload } },
    setPost: () => {}, ...overrides,
  }
  const save = new Function(...Object.keys(context), `${handler}; return persistDraft`)(...Object.values(context))
  await save()
  return request
}

test('saving rental edits preserves existing utility prices, occupancy and house rules', async () => {
  const terms = {
    electricityPrice: 3500, waterPrice: 25000, internetPrice: 120000,
    maxOccupants: 4, availableSlots: 2, houseRules: 'Không hút thuốc trong phòng',
  }
  const payload = await captureSave(terms)
  for (const [key, value] of Object.entries(terms)) assert.equal(payload[key], value, key)
  assert.equal(payload.title, 'Updated title')
  assert.equal(payload.price, 3500000)
})

test('legacy rental payloads retain backend-compatible defaults and valid zero charges', async () => {
  const payload = await captureSave({ electricityPrice: 0, internetPrice: 0, houseRules: null })
  assert.equal(payload.electricityPrice, 0)
  assert.equal(payload.waterPrice, 0)
  assert.equal(payload.internetPrice, 0)
  assert.equal(payload.maxOccupants, 1)
  assert.equal(payload.availableSlots, 1)
  assert.equal(payload.houseRules, undefined)
})

 test('renter share saves the edited capacity and slots with per-person cost', async () => {
  const payload = await captureSave({ maxOccupants: 4, availableSlots: 2 }, { isRenterShare: true, maxOccupants: '3', availableSlots: '1', type: 2 });
  assert.equal(payload.maxOccupants, 3);
  assert.equal(payload.availableSlots, 1);
  assert.equal(payload.price, 3500000);
});
test('invalid roommate capacity is rejected before an API write', async () => {
  await assert.rejects(captureSave({}, { isRenterShare: true, maxOccupants: '2', availableSlots: '3' }));
  await assert.rejects(captureSave({}, { isRenterShare: true, maxOccupants: '2.5', availableSlots: '1' }));
});
