import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

const home = await readFile(new URL('../src/pages/HomePage.tsx', import.meta.url), 'utf8')
const map = await readFile(new URL('../src/components/map/RentalMap.tsx', import.meta.url), 'utf8')
const compile = source => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
const selectBody = home.match(/const handleSelectPost = useCallback\(\(postId: string\) => \{([\s\S]*?)\n  \}, /)[1]
const clearBody = home.match(/const handleClearSelection = useCallback\(\(\) => \{([\s\S]*?)\n  \}, /)[1]
const cancelBody = home.match(/const cancelLocationFocus = useCallback\(\(\) => \{([\s\S]*?)\n  \}, /)?.[1] ?? ''
const cameraStart = map.indexOf('    if (focus) {', map.indexOf('const scheduleLayerFit'))
assert.ok(cameraStart >= 0)
const cameraBody = compile(map.slice(cameraStart, map.indexOf('    // One overview fit', cameraStart)))
const runCamera = new Function('focus', 'focusToken', 'focusAppliedRef', 'camera', 'MAP_FOCUS_ZOOM', 'navigationRequest', 'selectedPlacePin', 'isValidCoord', 'selectAppliedRef', 'selectedPost', cameraBody)

function selectionHarness(body) {
  const focusRef = { current: { lat: 10.8, lng: 106.7, zoom: 16 } }
  const locationRequest = { current: 7 }
  let token = 4, selectedId = null, locating = true
  const setToken = fn => { token = fn(token) }
  const cancel = new Function('mapFocusRef', 'setMapFocusToken', 'locateRequestRef', 'setLocating', compile(cancelBody))
  new Function('postId', 'setSelectedPostId', 'setMapFocusToken', 'cancelLocationFocus', 'urlPostId', 'setSearchParams', compile(body))(
    'room', value => { selectedId = typeof value === 'function' ? value(selectedId) : value }, setToken,
    () => cancel(focusRef, setToken, locationRequest, value => { locating = value }),
    null, () => {},
  )
  return { focus: focusRef.current, token, selectedId, locationRequest: locationRequest.current, locating }
}

test('rental selection centers the chosen pin instead of replaying device-location focus', () => {
  const state = selectionHarness(selectBody)
  let movement
  runCamera(state.focus, state.token, { current: 'focus:10.8,106.7,16:4' }, { schedule: (key, target) => { movement = { key, ...target } } },
    16, null, null, () => true, { current: '' }, { id: state.selectedId, latitude: 10.9, longitude: 106.8 })
  assert.deepEqual(movement.center, { lat: 10.9, lng: 106.8 })
  assert.equal(state.locationRequest, 8, 'a pending geolocation response must no longer own the camera')
  assert.equal(state.locating, false)
})

test('native Google selection clears old focus and supersedes a pending location request', () => {
  const state = selectionHarness(clearBody)
  assert.equal(state.focus, null)
  assert.equal(state.locationRequest, 8)
  let movement
  runCamera(state.focus, state.token, { current: '' }, { schedule: (_, target) => { movement = target } },
    16, null, { lat: 10.86, lng: 106.76 }, () => true, { current: '' }, null)
  assert.deepEqual(movement.center, { lat: 10.86, lng: 106.76 })
})

test('an explicit location button focus is still honored', () => {
  let movement
  runCamera({ lat: 10.8, lng: 106.7, zoom: 16 }, 9, { current: '' }, { schedule: (_, target) => { movement = target } },
    16, null, null, () => true, { current: '' }, null)
  assert.deepEqual(movement.center, { lat: 10.8, lng: 106.7 })
})
