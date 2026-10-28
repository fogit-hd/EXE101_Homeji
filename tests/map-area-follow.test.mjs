import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

const shell = await readFile(new URL('../src/components/map/AuthenticatedHomeMapShell.tsx', import.meta.url), 'utf8')
const compile = source => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
const idle = shell.match(/const handleViewportIdle = useCallback\(\s*\(bounds: \{[\s\S]*?\}\) => \{([\s\S]*?)\n    \},/)[1]
const runIdle = new Function('bounds', 'destinationMode', 'isMapMode', 'viewportPaused', 'parseFiltersFromURL', 'searchParams', 'serializeFiltersToQuery', 'setSearchParams', compile(idle))
const bounds = { minLatitude: 11, maxLatitude: 11.1, minLongitude: 107, maxLongitude: 107.1 }

test('amenity camera movement keeps the original search area and does not replace listing pins', () => {
  const params = new URLSearchParams('section=listings&minLatitude=10.79&maxLatitude=10.81')
  let updates = 0
  runIdle(bounds, true, true, true, () => { throw new Error('Paused viewport must not start a new area search') }, params, () => {}, () => updates++)
  assert.equal(updates, 0)
  assert.equal(params.get('minLatitude'), '10.79')
})

test('closing the selection resumes area updates and respects the search-on-move preference', () => {
  for (const searchOnMove of [false, true]) {
    let updated
    const params = new URLSearchParams('section=listings')
    runIdle(bounds, true, true, false, () => ({ searchOnMove, bounds: null }), params,
      query => new URLSearchParams({ minLatitude: String(query.bounds.minLatitude) }), next => { updated = next })
    assert.equal(updated?.get('minLatitude'), searchOnMove ? '11' : undefined)
  }
})

test('return action clears only the amenity highlight and focuses the original anchor', () => {
  const body = shell.match(/const handleReturnToAnchor = useCallback\(\(\) => \{([\s\S]*?)\n  \},/)[1]
  const run = new Function('nearbyAnchor', 'setSharedLocationPin', 'setNearbyFocus', 'MAP_FOCUS_ZOOM', 'setNearbyToken', compile(body))
  let highlight = 'amenity', focus, token = 3
  const anchor = { contextKey: 'original-room', lat: 10.8, lng: 106.78 }
  run(anchor, value => { highlight = value }, value => { focus = value }, 16, fn => { token = fn(token) })
  assert.equal(highlight, null)
  assert.deepEqual(focus, { lat: 10.8, lng: 106.78, zoom: 16 })
  assert.equal(token, 4)
  assert.equal(anchor.contextKey, 'original-room')
})

test('nearby highlight retains its source place pin, while unrelated chat highlights stay independent', () => {
  const body = shell.match(/const selectedPlacePin = useMemo\(\(\) => \{([\s\S]*?)\n  \},/)[1]
  const run = new Function('selectedPost', 'sharedLocationPin', 'nearbyContextKey', 'selectedPlace', compile(body))
  const place = { name: 'Vị trí ban đầu', location: { lat: 10.8, lng: 106.78 } }
  assert.deepEqual(run(null, { sourceContextKey: 'origin' }, 'origin', place), { ...place.location, title: place.name })
  assert.equal(run(null, { conversationId: 'chat' }, 'origin', place), null)
})
