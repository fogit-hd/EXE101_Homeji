import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

async function loadModule(path, removeImports = false) {
  let source = await readFile(new URL(path, import.meta.url), 'utf8')
  if (path.endsWith('shortlistCommute.ts')) {
    const areaSource = await readFile(new URL('../src/lib/homejiServiceArea.ts', import.meta.url), 'utf8')
    const areaJs = ts.transpileModule(areaSource, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
    source = source.replace("import { isInHomejiServiceArea } from './homejiServiceArea'", '')
    source = areaJs.replaceAll('export ', '') + '\n' + source
  }
  if (removeImports) source = source.replace(/^import [^\r\n]*\r?\n/gm, '')
  const javascript = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
  return import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`)
}
const { calculateRentalCost } = await loadModule('../src/lib/rentalCost.ts')
const { readCommuteItem, calculateShortlistCommute } = await loadModule('../src/lib/shortlistCommute.ts', true)
const { parseFiltersFromURL, serializeFiltersToQuery, listingQueryToSearchParams, nonBoundsSignature } = await loadModule('../src/components/map/listings/listingAdapters.ts', true)

test('a resolved school destination survives normalization and searches by coordinates with existing filters', () => {
  const incoming = new URLSearchParams('section=listings&view=map&placeId=school-campus&placeName=Đại+học+FPT&maxPrice=4000000&amenities=KITCHEN&searchOnMove=0&page=3')
  const bounds = { minLatitude: 10.8, maxLatitude: 10.84, minLongitude: 106.78, maxLongitude: 106.82 }
  const selected = serializeFiltersToQuery({ ...parseFiltersFromURL(incoming), bounds, searchOnMove: true, page: 1 }, incoming)
  const normalized = serializeFiltersToQuery(parseFiltersFromURL(selected), selected)
  assert.equal(normalized.get('placeId'), 'school-campus')
  assert.equal(normalized.get('placeName'), 'Đại học FPT')
  assert.deepEqual(listingQueryToSearchParams(parseFiltersFromURL(normalized)), {
    page: 1, pageSize: 20, maxPrice: 4000000, amenities: ['KITCHEN'], ...bounds,
  })
  assert.equal(normalized.toString(), selected.toString())
})

test('AI exclusions, capacity and selected IDs survive URL reload and round trip', () => {
  const id = '22222222-2222-4222-8222-222222222221'
  const incoming = new URLSearchParams(`section=listings&maxPrice=4000000&amenities=KITCHEN&excludedAmenities=AIR_CONDITIONER&excludeRoommateShare=true&minAvailableSlots=2&ids=${id}`)
  const query = parseFiltersFromURL(incoming)
  const reloaded = parseFiltersFromURL(serializeFiltersToQuery(query, incoming))
  assert.deepEqual(listingQueryToSearchParams(reloaded), { page: 1, pageSize: 20, maxPrice: 4000000, amenities: ['KITCHEN'], excludedAmenities: ['AIR_CONDITIONER'], excludeRoommateShare: true, minAvailableSlots: 2, ids: [id] })
  assert.notEqual(nonBoundsSignature(query), nonBoundsSignature({ ...query, minAvailableSlots: 1 }))
  const empty = parseFiltersFromURL(new URLSearchParams('ids=00000000-0000-0000-0000-000000000000'))
  assert.deepEqual(listingQueryToSearchParams(empty).ids, ['00000000-0000-0000-0000-000000000000'])
})
const scenario = () => ({ rent: 3000000, occupants: 2,
  electricity: { rate: 4000, unit: 'usage', usage: 80 },
  water: { rate: 100000, unit: 'person', usage: null },
  internet: 100000, otherMonthly: 50000, deposit: 3000000, initialFees: 200000 })

test('monthly usage and per-person fees remain separate from deposit', () => {
  const result = calculateRentalCost(scenario())
  assert.equal(result.monthly, 3670000)
  assert.equal(result.initial, 6200000)
  assert.equal(result.parts.electricity, 320000)
  assert.equal(result.parts.water, 200000)
})

test('unknown units and blank fees cannot turn into zero or an official total', () => {
  const input = scenario()
  input.water.unit = 'unknown'
  input.internet = null
  const result = calculateRentalCost(input)
  assert.equal(result.monthly, null)
  assert.equal(result.knownMonthly, 3370000)
  assert.deepEqual(result.unknown, ['water', 'internet'])
})

test('an explicitly confirmed zero is distinct from missing data', () => {
  const input = scenario()
  input.water = { unit: 'monthly', rate: 0, usage: null }
  input.deposit = 0
  input.initialFees = 0
  const result = calculateRentalCost(input)
  assert.equal(result.parts.water, 0)
  assert.equal(result.initial, 3000000)
})

test('invalid occupants, rates and usage do not produce a plausible estimate', () => {
  for (const occupants of [0, -1, 1.5, 21, NaN]) assert.throws(() => calculateRentalCost({ ...scenario(), occupants }))
  for (const rate of [-1, Infinity, NaN, 1000000001]) {
    const input = scenario()
    input.electricity.rate = rate
    assert.equal(calculateRentalCost(input).monthly, null)
  }
  const input = scenario()
  input.electricity.usage = null
  assert.equal(calculateRentalCost(input).monthly, null)
})

test('partial matrix failures remain unknown and keep post identity', () => {
  for (const item of [undefined, { condition: 'ROUTE_NOT_FOUND' }, { condition: 'ROUTE_EXISTS', error: new Error('quota') },
    { condition: 'ROUTE_EXISTS', durationMillis: 0, distanceMeters: 10 },
    { condition: 'ROUTE_EXISTS', durationMillis: Infinity, distanceMeters: 10 }]) {
    const result = readCommuteItem('room-2', item, 'DRIVING', 'departure', 'calculated')
    assert.equal(result.postId, 'room-2')
    assert.equal(result.durationMillis, null)
    assert.equal(result.distanceMeters, null)
    assert.equal(result.mode, 'DRIVING')
    assert.ok(result.error)
  }
})

test('successful matrix records preserve source units, mode and timestamps', () => {
  assert.deepEqual(readCommuteItem('room-1', { condition: 'ROUTE_EXISTS', durationMillis: 1200000, distanceMeters: 6000 }, 'TRANSIT', 'departure', 'calculated'), {
    postId: 'room-1', durationMillis: 1200000, distanceMeters: 6000, error: null, mode: 'TRANSIT', departureAt: 'departure', calculatedAt: 'calculated',
  })
})

test('Routes request uses at most ten origins and one explicit destination, preserving partial failures', async () => {
  const origins = [{ id: 'one', latitude: 10.8, longitude: 106.8 }, { id: 'two', latitude: 10.81, longitude: 106.81 }]
  const destination = { lat: 10.82, lng: 106.82 }
  const departure = new Date(Date.now() + 3600000)
  let request
  const load = async () => ({ RouteMatrix: { computeRouteMatrix: async value => {
    request = value
    return { matrix: { rows: [{ items: [{ condition: 'ROUTE_EXISTS', durationMillis: 1200000, distanceMeters: 6000 }] }, { items: [{ condition: 'ROUTE_NOT_FOUND' }] }] } }
  } } })
  const result = await calculateShortlistCommute(origins, destination, 'DRIVING', departure, load)
  assert.deepEqual(request.origins, origins.map(item => ({ lat: item.latitude, lng: item.longitude })))
  assert.deepEqual(request.destinations, [destination])
  assert.equal(request.departureTime, departure)
  assert.equal(request.routingPreference, 'TRAFFIC_AWARE')
  assert.equal(result[0].postId, 'one'); assert.equal(result[0].durationMillis, 1200000)
  assert.equal(result[1].postId, 'two'); assert.equal(result[1].durationMillis, null)
  await calculateShortlistCommute(origins, destination, 'WALKING', departure, load)
  assert.equal(request.departureTime, undefined); assert.equal(request.routingPreference, undefined)
  await calculateShortlistCommute(origins, destination, 'TRANSIT', departure, load)
  assert.equal(request.departureTime, departure); assert.equal(request.routingPreference, undefined)
})

test('invalid route selections fail before any Maps request', async () => {
  const origin = { id: 'one', latitude: 10.8, longitude: 106.8 }
  const destination = { lat: 10.82, lng: 106.82 }, departure = new Date(Date.now() + 3600000)
  let calls = 0
  const load = async () => { calls++; throw new Error('must not call') }
  for (const origins of [[], [origin, origin], Array.from({ length: 11 }, (_, i) => ({ ...origin, id: String(i) })), [{ ...origin, latitude: 0 }]])
    await assert.rejects(calculateShortlistCommute(origins, destination, 'DRIVING', departure, load))
  await assert.rejects(calculateShortlistCommute([origin], { lat: NaN, lng: 106 }, 'DRIVING', departure, load))
  await assert.rejects(calculateShortlistCommute([origin], destination, 'TWO_WHEELER', departure, load))
  await assert.rejects(calculateShortlistCommute([origin], destination, 'DRIVING', new Date(Date.now() - 120000), load))
  assert.equal(calls, 0)
})
