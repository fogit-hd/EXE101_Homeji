import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

// Exercise the actual page and its asynchronous event handlers. The adapters
// isolate routing, Maps, authentication and API calls; this is not a DOM test.
const source = await readFile(new URL('../src/pages/EditRentalPostPage.tsx', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText
const deferred = () => {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve() }
const text = node => node == null || typeof node === 'boolean' ? ''
  : Array.isArray(node) ? node.map(text).join('')
    : typeof node === 'object' ? text(node.props?.children) : String(node)

async function editSession() {
  const hooks = [], effects = [], calls = [], navigations = []
  let cursor = 0, load, tree, apiOverrides = {}, geocode = async () => null
  const post = {
    id: 'post-1', ownerRole: 2, type: 1, status: 1,
    title: 'Original title', description: 'Original description',
    price: 2000000, deposit: 0, area: 20, address: 'Original address',
    latitude: 10.85, longitude: 106.8, maxOccupants: 2, availableSlots: 1,
    amenities: ['WIFI'], media: [1, 2, 3].map(id => ({ id: `media-${id}`, path: '/fixture.png' })),
  }
  const api = new Proxy({}, { get: (_, name) => async (...args) => {
    calls.push({ name, args })
    if (apiOverrides[name]) return apiOverrides[name](...args)
    if (name === 'updateRentalPost') return { ...post, ...args[1] }
    return { ...post }
  } })
  const react = {
    useState: initial => {
      const index = cursor++
      if (!(index in hooks)) hooks[index] = typeof initial === 'function' ? initial() : initial
      return [hooks[index], value => { hooks[index] = typeof value === 'function' ? value(hooks[index]) : value }]
    },
    useRef: initial => {
      const index = cursor++
      return hooks[index] ??= { current: initial }
    },
    useCallback: callback => callback,
    useEffect: (callback, dependencies) => {
      const index = cursor++
      const previous = hooks[index]
      if (!previous || !dependencies || dependencies.some((value, i) => !Object.is(value, previous[i]))) {
        hooks[index] = dependencies
        effects.push(callback)
      }
    },
  }
  const components = names => Object.fromEntries(names.map(name => [name, name]))
  const adapters = {
    react,
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }), Fragment: 'fragment' },
    'react-router-dom': { useNavigate: () => url => navigations.push(url), useParams: () => ({ postId: post.id }) },
    '../api': api,
    '../api/types': { MediaType: { Image: 1 }, RentalPostType: { VacantRoom: 1, RoommateShare: 2, RoomTransfer: 3 }, RoomTransferKind: { LeaseAssignment: 1 }, UserRole: { Renter: 1 } },
    '../components/chrome': components(['DeferredMapBlock', 'PageFrame']),
    '../components/HomejiLoader': { HomejiLoader: 'HomejiLoader', usePersistentLoad: callback => { load = callback; return { showLoader: false, disrupted: false } } },
    '../components/toast/PageNotice': components(['PageNotice']),
    '../components/ContentSkeleton': components(['ContentSkeleton']),
    '../components/skeletons/PageSkeletons': components(['PostFormSkeleton']),
    '../components/map/AddressAutocomplete': components(['AddressAutocomplete']),
    '../components/ui/ChoicePicker': components(['ChoicePicker']),
    '../components/map/LocationPickerMap': components(['LocationPickerMap']),
    '../contexts/AuthContext': { useAuth: () => ({ profile: { id: 'owner-1', role: 2 } }) },
    '../contexts/GoogleMapsProvider': { useGoogleMaps: () => ({ isLoaded: true }) },
    '../lib/googleMaps': { geocodeAddress: (...args) => geocode(...args), isValidCoord: (lat, lng) => Number.isFinite(lat) && Number.isFinite(lng) },
    '../lib/errors': { getErrorMessage: error => error.message },
    '../lib/labels': { AMENITY_OPTIONS: ['WIFI', 'KITCHEN'], amenityLabel: value => value, normalizeAmenityCode: value => value, rentalPostTypeLabel: { 1: 'Room' } },
    '../lib/mapDeepLinks': { mapSectionUrl: section => `/?section=${section}` },
    '../components/ai/RentalDraftAssistant': components(['RentalDraftAssistant']),
    '../lib/aiFeatureFlags': { aiFeatureFlags: { draftAssistant: true } },
    '../components/ai/rentalPriceBasis': { rentalPriceBasis: () => 'room' },
    '../lib/rentalMediaQueue': { processRentalMediaQueue: async () => ({ completed: 0, failed: 0 }) },
    '../hooks/useUnsavedChanges': { useUnsavedChanges: () => null },
  }
  const exports = {}
  vm.runInNewContext(compiled, {
    exports, require: name => { assert.ok(name in adapters, `Unexpected dependency ${name}`); return adapters[name] },
    confirm: () => true, document: { getElementById: () => ({ focus() {} }) },
  })
  function entries(node, disabled = false, result = []) {
    if (Array.isArray(node)) { for (const item of node) entries(item, disabled, result); return result }
    if (!node || typeof node !== 'object') return result
    const effectiveDisabled = disabled || Boolean(node.props?.disabled)
    result.push({ node, disabled: effectiveDisabled })
    entries(node.props?.children ?? null, effectiveDisabled, result)
    entries(node.props?.actions ?? null, effectiveDisabled, result)
    return result
  }
  const find = predicate => {
    const entry = entries(tree).find(({ node }) => predicate(node))
    assert.ok(entry, 'Expected element was not rendered')
    return entry
  }
  const render = () => {
    cursor = 0
    tree = exports.EditRentalPostPage()
    while (effects.length) effects.shift()()
    find(node => node.type === 'form').node.props.ref.current = { reportValidity: () => true }
    return tree
  }
  const button = name => find(node => node.type === 'button' && text(node).trim() === name)
  const field = id => find(node => node.props?.id === id)
  const component = name => find(node => node.type === name)
  render(); await load(); render(); calls.length = 0
  return {
    render, calls, navigations, post, button, field, component,
    notices: () => entries(tree).filter(({ node }) => node.type === 'PageNotice').map(({ node }) => node.props.message),
    override: (name, callback) => { apiOverrides = { ...apiOverrides, [name]: callback } },
    geocode: callback => { geocode = callback },
    save: () => find(node => node.type === 'form').node.props.onSubmit({ preventDefault() {} }),
    change: (id, value) => { field(id).node.props.onChange({ target: { value } }); render() },
    count: name => calls.filter(call => call.name === name).length,
  }
}

test('pending save disables editable fields and a failed save unlocks without losing the draft', async () => {
  const session = await editSession(), pending = deferred()
  session.change('rental-title', 'My unsaved title')
  session.override('updateRentalPost', () => pending.promise)
  const request = session.save()
  session.render()
  assert.equal(session.field('rental-title').disabled, true)
  assert.equal(session.button('KITCHEN').disabled, true)
  assert.equal(session.component('AddressAutocomplete').disabled, true)
  pending.reject(new Error('Save rejected'))
  await request
  session.render()
  assert.equal(session.field('rental-title').disabled, false)
  assert.equal(session.field('rental-title').node.props.value, 'My unsaved title')
  assert.deepEqual(session.navigations, [])
})

test('two save events before rerender issue only one PUT', async () => {
  const session = await editSession(), pending = deferred()
  session.override('updateRentalPost', () => pending.promise)
  const first = session.save(), second = session.save()
  assert.equal(session.count('updateRentalPost'), 1)
  pending.resolve(session.post)
  await Promise.all([first, second])
})

test('submit stays locked through PUT and POST, then unlocks on POST failure', async () => {
  const session = await editSession(), put = deferred(), submit = deferred()
  session.override('updateRentalPost', () => put.promise)
  session.override('submitRentalPost', () => submit.promise)
  session.button('Lưu & gửi duyệt').node.props.onClick()
  session.render()
  assert.equal(session.field('rental-title').disabled, true)
  put.resolve(session.post)
  await flush(); session.render()
  assert.equal(session.count('submitRentalPost'), 1)
  assert.equal(session.field('rental-title').disabled, true)
  session.button('Lưu trữ').node.props.onClick()
  assert.equal(session.count('archiveRentalPost'), 0)
  submit.reject(new Error('Submit rejected'))
  await flush(); session.render()
  assert.equal(session.field('rental-title').disabled, false)
  assert.deepEqual(session.navigations, [])
})

for (const operation of ['archiveRentalPost', 'deleteRentalPostMedia']) {
  test(`${operation} blocks competing save and duplicate mutation until rejection`, async () => {
    const session = await editSession(), pending = deferred()
    session.override(operation, () => pending.promise)
    const control = operation === 'archiveRentalPost' ? session.button('Lưu trữ')
      : session.button('Xóa')
    control.node.props.onClick()
    control.node.props.onClick()
    await session.save()
    assert.equal(session.count(operation), 1)
    assert.equal(session.count('updateRentalPost'), 0)
    session.render()
    assert.equal(session.field('rental-title').disabled, true)
    pending.reject(new Error('Mutation rejected'))
    await flush(); session.render()
    assert.equal(session.field('rental-title').disabled, false)
    assert.deepEqual(session.navigations, [])
  })
}

test('late geocode cannot replace a newer typed address', async () => {
  const session = await editSession(), pending = deferred()
  session.geocode(() => pending.promise)
  session.button('Lấy tọa độ từ địa chỉ').node.props.onClick()
  session.component('AddressAutocomplete').node.props.onChange('Newer address')
  session.render()
  pending.resolve({ formattedAddress: 'Old geocode result', lat: 10.9, lng: 106.9 })
  await flush(); session.render()
  assert.equal(session.component('AddressAutocomplete').node.props.value, 'Newer address')
})

test('geocode started before a mutation cannot overwrite the saved location after it completes', async () => {
  const session = await editSession(), pending = deferred()
  session.geocode(() => pending.promise)
  session.button('Lấy tọa độ từ địa chỉ').node.props.onClick()
  await session.save()
  session.render()
  pending.resolve({ formattedAddress: 'Old geocode result', lat: 10.9, lng: 106.9 })
  await flush(); session.render()
  assert.equal(session.component('AddressAutocomplete').node.props.value, 'Original address')
})

test('map callbacks cannot mutate the location while save is pending', async () => {
  const session = await editSession(), pending = deferred()
  session.override('updateRentalPost', () => pending.promise)
  const request = session.save()
  session.render()
  session.component('LocationPickerMap').node.props.onLocationChange?.(11, 107)
  session.render()
  pending.resolve(session.post)
  await request
  session.render()
  await session.save()
  const lastPut = session.calls.filter(call => call.name === 'updateRentalPost').at(-1)
  assert.equal(lastPut.args[1].latitude, session.post.latitude)
  assert.equal(lastPut.args[1].longitude, session.post.longitude)
})

test('editing an address invalidates old coordinates until a valid place is selected', async () => {
  const session = await editSession()
  session.component('AddressAutocomplete').node.props.onChange('New typed address')
  session.render()
  await session.save()
  session.render()
  assert.equal(session.count('updateRentalPost'), 0)
  assert.ok(session.notices().includes('Chọn địa chỉ hoặc vị trí hợp lệ trước khi lưu.'))
  session.component('AddressAutocomplete').node.props.onPlaceSelect({ address: 'New resolved address', lat: 10.88, lng: 106.82 })
  session.render()
  await session.save()
  session.render()
  assert.equal(session.count('updateRentalPost'), 1)
  const payload = session.calls.find(call => call.name === 'updateRentalPost').args[1]
  assert.equal(payload.address, 'New resolved address')
  assert.equal(payload.latitude, 10.88)
  assert.equal(payload.longitude, 106.82)
})

async function addressSession({ pick = true } = {}) {
  const addressSource = await readFile(new URL('../src/components/map/AddressAutocomplete.tsx', import.meta.url), 'utf8')
  const addressCode = ts.transpileModule(addressSource, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const hooks = [], effects = [], timers = [], changes = [], selections = []
  const pending = deferred()
  let cursor = 0, tree
  const props = { value: 'Original address', disabled: false,
    onChange: value => changes.push(value), onPlaceSelect: value => selections.push(value) }
  const react = {
    useState: initial => {
      const index = cursor++
      if (!(index in hooks)) hooks[index] = initial
      return [hooks[index], value => { hooks[index] = typeof value === 'function' ? value(hooks[index]) : value }]
    },
    useRef: initial => { const index = cursor++; return hooks[index] ??= { current: initial } },
    useId: () => 'address-list',
    useEffect: (callback, dependencies) => {
      const index = cursor++, previous = hooks[index]
      if (!previous || !dependencies || dependencies.some((value, i) => !Object.is(value, previous.dependencies?.[i]))) {
        effects.push(() => {
          previous?.cleanup?.()
          hooks[index] = { dependencies, cleanup: callback() }
        })
      }
    },
  }
  const adapters = {
    react,
    'react/jsx-runtime': { jsx: (type, properties) => ({ type, props: properties }), jsxs: (type, properties) => ({ type, props: properties }) },
    '../../contexts/GoogleMapsProvider': { useGoogleMaps: () => ({ apiKey: 'fixture', isLoaded: true }) },
    '../../lib/placeAutocomplete': { fetchPlacePredictions: async () => [{ placeId: 'place-1', title: 'Old selected place' }], resolvePlaceCoordinates: () => pending.promise },
    '../../lib/useDismissOnOutside': { useDismissOnOutside() {} },
    './AddressAutocomplete.css': {},
  }
  const exports = {}
  vm.runInNewContext(addressCode, {
    exports, require: name => { assert.ok(name in adapters, `Unexpected dependency ${name}`); return adapters[name] },
    window: { setTimeout: callback => { timers.push(callback); return timers.length }, clearTimeout() {} },
  })
  const flatten = node => !node || typeof node !== 'object' ? []
    : Array.isArray(node) ? node.flatMap(flatten) : [node, ...flatten(node.props?.children)]
  const render = () => {
    cursor = 0
    tree = exports.AddressAutocomplete(props)
    while (effects.length) effects.shift()()
  }
  render()
  while (timers.length) timers.shift()()
  await flush(); render()
  flatten(tree).find(node => node.type === 'input').props.onFocus()
  render()
  const option = flatten(tree).find(node => node.type === 'button' && node.props.role === 'option')
  assert.ok(option, 'The real autocomplete must offer the fixture prediction')
  if (pick) { option.props.onClick(); render() }
  return { props, render, pending, changes, selections,
    input: () => flatten(tree).find(node => node.type === 'input'),
    options: () => flatten(tree).filter(node => node.type === 'button' && node.props.role === 'option'),
    unmount: () => { for (const hook of hooks) hook?.cleanup?.() } }
}

test('autocomplete applies a current selected place normally', async () => {
  const session = await addressSession()
  session.pending.resolve({ address: 'Selected address', lat: 10.9, lng: 106.9 })
  await flush()
  assert.deepEqual(session.changes, ['Selected address'])
  assert.equal(session.selections.length, 1)
})

test('autocomplete discards pending place resolution even after disabled becomes false again', async () => {
  const session = await addressSession()
  session.props.disabled = true; session.render()
  session.props.disabled = false; session.render()
  session.pending.resolve({ address: 'Stale selected address', lat: 10.9, lng: 106.9 })
  await flush()
  assert.deepEqual(session.changes, [])
  assert.deepEqual(session.selections, [])
})

test('autocomplete discards a selected place when the parent address changes while resolving', async () => {
  const session = await addressSession()
  session.props.value = 'New parent address'; session.render()
  session.pending.resolve({ address: 'Stale selected address', lat: 10.9, lng: 106.9 })
  await flush()
  assert.deepEqual(session.changes, [])
  assert.deepEqual(session.selections, [])
})

test('autocomplete does not update its parent after unmount', async () => {
  const session = await addressSession()
  session.unmount()
  session.pending.resolve({ address: 'Stale selected address', lat: 10.9, lng: 106.9 })
  await flush()
  assert.deepEqual(session.changes, [])
  assert.deepEqual(session.selections, [])
})

test('typing an ordinary address keeps suggestions open across controlled parent rerenders', async () => {
  const session = await addressSession({ pick: false })
  for (const address of ['Lê Văn', 'Lê Văn Việt']) {
    session.input().props.onChange({ target: { value: address } })
    session.props.value = session.changes.at(-1)
    // React repeats the render when selectionScope updates during rendering.
    session.render(); session.render()
    assert.equal(session.input().props.value, address)
    assert.equal(session.input().props['aria-expanded'], true)
    assert.equal(session.options().length, 1)
    assert.equal(session.input().props.disabled, false)
  }
})

test('place provider failure releases resolving so the user can enter an address manually', async () => {
  const session = await addressSession()
  assert.equal(session.input().props.disabled, true)
  session.pending.reject(new Error('Optional provider unavailable'))
  await flush(); session.render()
  assert.equal(session.input().props.disabled, false)
  session.input().props.onChange({ target: { value: 'Manual address' } })
  session.props.value = session.changes.at(-1)
  session.render(); session.render()
  assert.equal(session.input().props.value, 'Manual address')
  assert.deepEqual(session.selections, [])
})
