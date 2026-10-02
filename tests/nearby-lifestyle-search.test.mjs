import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

const anchorSource = await readFile(new URL('../src/lib/nearbyPanelAnchor.ts', import.meta.url), 'utf8')
const anchorJavascript = ts.transpileModule(anchorSource, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
const { nearbyPanelAnchor } = await import(`data:text/javascript;base64,${Buffer.from(anchorJavascript).toString('base64')}`)

const placeSearchSource = await readFile(
  new URL('../src/lib/placeAutocomplete.ts', import.meta.url),
  'utf8',
)
const omniboxSource = await readFile(
  new URL('../src/components/map/MapOmnibox.tsx', import.meta.url),
  'utf8',
)
const homePageSource = await readFile(
  new URL('../src/pages/HomePage.tsx', import.meta.url),
  'utf8',
)

test('nearby lifestyle search uses Places API New with bounded, distance-ranked results', () => {
  assert.match(placeSearchSource, /export async function searchNearbyPlaces/)
  assert.match(placeSearchSource, /Place\.searchNearby/)
  assert.match(placeSearchSource, /includedPrimaryTypes/)
  assert.match(placeSearchSource, /rankPreference:/)
  assert.match(placeSearchSource, /maxResultCount:/)
  assert.match(placeSearchSource, /NEARBY_CACHE_TTL_MS/)
})

test('omnibox offers useful nearby categories around the rental search anchor', () => {
  assert.match(omniboxSource, /nearbyAnchor/)
  assert.match(omniboxSource, /NEARBY_PLACE_CATEGORY_OPTIONS\.map/)
  assert.match(placeSearchSource, /Ăn uống/)
  assert.match(placeSearchSource, /Cà phê/)
  assert.match(placeSearchSource, /Tạp hóa/)
  assert.match(placeSearchSource, /Y tế/)
  assert.match(omniboxSource, /Gần khu vực đang tìm/)
  assert.match(omniboxSource, /Dữ liệu Google Places/)
})

test('nearby search anchor follows selected rentals and searched map places', () => {
  assert.match(homePageSource, /const nearbyAnchor = useMemo/)
  assert.match(homePageSource, /selectedPost/)
  assert.match(homePageSource, /mapPlaceFocus/)
  assert.match(homePageSource, /nearbyAnchor=\{nearbyAnchor\}/)
})

test('a rental pin immediately supplies its own location, never stale detail data', () => {
  const listing = { id: 'room-a', title: 'Phòng A', latitude: 10.85, longitude: 106.75 }
  assert.deepEqual(nearbyPanelAnchor('room-a', listing, null), {
    contextKey: 'room-a', label: 'Phòng A', lat: 10.85, lng: 106.75,
  })
  assert.equal(nearbyPanelAnchor('room-b', listing, null), null)
  assert.equal(nearbyPanelAnchor(null, listing, null), null)
})

test('native Google place pins need no Homeji rental to suggest nearby places', () => {
  assert.deepEqual(nearbyPanelAnchor(null, null, {
    placeId: 'google-place', name: 'Quán trên Google', location: { lat: 10.86, lng: 106.76 },
  }), { contextKey: 'google-place', label: 'Quán trên Google', lat: 10.86, lng: 106.76 })
})

test('missing and out-of-range locations cannot start a nearby request', () => {
  for (const latitude of [null, NaN, Infinity, 91]) {
    assert.equal(nearbyPanelAnchor('room', { id: 'room', title: 'Room', latitude, longitude: 106 }, null), null)
  }
  assert.equal(nearbyPanelAnchor(null, null, { placeId: 'p', name: 'P', location: null }), null)
})
