import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

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
