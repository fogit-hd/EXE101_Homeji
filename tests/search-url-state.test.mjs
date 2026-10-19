import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

const source = await readFile(new URL('../src/contexts/SearchContext.tsx', import.meta.url), 'utf8')
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText

// Execute the real provider with deterministic hooks and router/storage adapters.
// This isolates URL/draft transitions without fetching Google Places or mounting a browser.
function searchSession(initialUrl) {
  const states = []
  let cursor = 0
  let changed = false
  let location
  const move = url => { location = new URL(url, 'https://homeji.test') }
  move(initialUrl)
  const react = {
    createContext: () => ({ Provider: 'provider' }),
    useState: initial => {
      const index = cursor++
      if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial
      return [states[index], value => {
        const next = typeof value === 'function' ? value(states[index]) : value
        if (!Object.is(states[index], next)) { states[index] = next; changed = true }
      }]
    },
    useRef: initial => ({ current: initial }),
    useMemo: factory => factory(),
    useCallback: callback => callback,
    useEffect: () => {},
  }
  const storage = new Map()
  const exports = {}
  const adapters = {
    react,
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }) },
    'react-router-dom': { useLocation: () => location, useNavigate: () => move },
    '../lib/placeAutocomplete': {},
    './GoogleMapsProvider': { useGoogleMaps: () => ({ isLoaded: false }) },
    '../lib/searchQuery': { isUsefulSearchQuery: value => value.trim().length >= 2 },
    '../lib/localPlaceSearch': { relevantRecentLocations: items => items },
    '../lib/ga4': { trackFunnelEvent: () => {} },
  }
  vm.runInNewContext(javascript, {
    exports,
    require: name => {
      assert.ok(name in adapters, `Unexpected dependency: ${name}`)
      return adapters[name]
    },
    URLSearchParams,
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
  })
  const render = () => {
    let value
    for (let attempt = 0; attempt < 10; attempt++) {
      cursor = 0; changed = false
      value = exports.SearchProvider({ children: null }).props.value
      if (!changed) return value
    }
    throw new Error('Provider state did not settle')
  }
  return { render, move, url: () => `${location.pathname}${location.search}` }
}

for (const [context, start, parameter] of [
  ['housing', '/?section=listings&view=list', 'keyword'],
  ['roommate', '/?section=invitations&roommateTab=rooms', 'roommateQuery'],
  ['marketplace', '/?section=marketplace&market=browse', 'q'],
]) {
  test(`${context}: submit, Back without query, and Forward synchronize the input`, () => {
    const session = searchSession(start)
    session.render().setQuery('UEL')
    session.render().submit()
    const submitted = session.url()
    assert.equal(new URL(submitted, 'https://homeji.test').searchParams.get(parameter), 'UEL')
    assert.equal(session.render().query, 'UEL')
    session.move(start)
    assert.equal(session.render().query, '')
    session.move(submitted)
    assert.equal(session.render().query, 'UEL')
    session.render().clear()
    assert.equal(session.render().query, '')
    assert.equal(new URL(session.url(), 'https://homeji.test').searchParams.has(parameter), false)
  })
}

test('context switches preserve unsubmitted drafts and explicit URL queries override them', () => {
  const session = searchSession('/?section=listings&view=list')
  session.render().setQuery('Lê Văn Việt')
  session.move('/?section=invitations&roommateTab=rooms')
  session.render().setQuery('UEL')
  session.move('/?section=marketplace&market=browse')
  session.render().setQuery('Bàn học')
  session.move('/?section=listings&view=list')
  assert.equal(session.render().query, 'Lê Văn Việt')
  session.move('/?section=invitations&roommateTab=rooms')
  assert.equal(session.render().query, 'UEL')
  session.move('/?section=marketplace&market=browse')
  assert.equal(session.render().query, 'Bàn học')
  session.move('/?section=listings&view=list&keyword=FPT')
  assert.equal(session.render().query, 'FPT')
})

test('selected map places retain their name and follow Back and Forward', () => {
  const start = '/?section=listings&view=map'
  const session = searchSession(start)
  session.render().submit('UEL')
  const keywordUrl = session.url()
  session.render().pickSuggestion({ id: 'campus-uel', title: 'Đại học UEL', subtitle: 'Thủ Đức' })
  const placeUrl = session.url()
  assert.equal(session.render().query, 'Đại học UEL')
  session.move(keywordUrl)
  assert.equal(session.render().query, 'UEL')
  session.move(placeUrl)
  assert.equal(session.render().query, 'Đại học UEL')
  session.move(start)
  assert.equal(session.render().query, '')
  session.move(placeUrl)
  assert.equal(session.render().query, 'Đại học UEL')
  session.render().clear()
  assert.equal(session.render().query, '')
  assert.equal(new URL(session.url(), 'https://homeji.test').searchParams.has('placeId'), false)
})

for (const [context, start, updates] of [
  ['housing', '/?section=listings&view=list', [
    '/?section=listings&view=list&minPrice=1000000',
    '/?section=listings&view=map',
    '/?section=listings&view=map&minLat=10.7&maxLat=10.9',
    '/?section=listings&view=list&minPrice=2000000',
  ]],
  ['roommate', '/?section=invitations&roommateTab=rooms', [
    '/?section=invitations&roommateTab=rooms&page=2',
    '/?section=invitations&roommateTab=people',
    '/?section=invitations&roommateTab=rooms&maxPrice=3000000',
  ]],
  ['marketplace', '/?section=marketplace&market=browse', [
    '/?section=marketplace&market=browse&page=2',
    '/?section=marketplace&market=browse&category=furniture',
  ]],
]) {
  test(`${context}: URL changes without a query preserve unsubmitted drafts`, () => {
    const session = searchSession(start)
    session.render().setQuery('Chưa tìm')
    for (const url of updates) {
      session.move(url)
      // Housing list/map are separate contexts, so returning to list restores its draft.
      if (session.render().context === context) assert.equal(session.render().query, 'Chưa tìm', url)
      else if (session.render().context === 'map') {
        session.render().setQuery('Bản nháp bản đồ')
        session.move(`${url}&zoom=17`)
        assert.equal(session.render().query, 'Bản nháp bản đồ')
      }
    }
    session.move(start)
    assert.equal(session.render().query, 'Chưa tìm')
  })
}
