import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')
const app = await read('src/App.tsx')
const shell = await read('src/components/map/AuthenticatedHomeMapShell.tsx')
const search = await read('src/contexts/SearchContext.tsx')
const home = await read('src/pages/HomePage.tsx')
const compile = source => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText

test('new providers coexist with traffic and legal routes', () => {
  for (const provider of ['GoogleOAuthRoot', 'SearchProvider', 'ToastProvider', 'WebsiteTrafficTracker']) {
    assert.ok(app.includes(`<${provider}`))
  }
  assert.match(app, /path="\/privacy"/)
  assert.match(app, /path="\/terms"/)
})

test('new listings and room modal coexist with automatic Google nearby discovery', () => {
  for (const component of ['MapListingsWorkspace', 'RoomDetailModal', 'MapNearbyPanel']) {
    assert.ok(shell.includes(`<${component}`))
  }
  assert.match(shell, /onSelectPlace=\{handleSelectPlace\}/)
  assert.match(shell, /nearbyDismissedKey !== nearbyContextKey/)
  assert.match(shell, /nearbyAnchor\.contextKey === nearbyContextKey/)
  assert.match(home, /<FeatureWorkspace section=\{activeSection\}/)
  assert.match(home, /<AuthenticatedHub/)
})

test('actual new header place pick routes to its Google ID without losing area filters', () => {
  const body = search.match(/const pickSuggestion = useCallback\(\(item: SearchSuggestion\) => \{([\s\S]*?)\n  \}, /)[1]
  let href, queries
  new Function('item', 'location', 'navigate', 'setQueryByContext', compile(body))(
    { id: 'google-place', title: 'Quán cà phê', subtitle: 'Thủ Đức' },
    { search: '?section=listings&view=list&district=quan-9&post=old-room&keyword=old&page=3' },
    value => { href = value }, value => { queries = value({ food: 'cơm' }) },
  )
  const url = new URL(href, 'https://homeji.example')
  assert.equal(url.searchParams.get('placeId'), 'google-place')
  assert.equal(url.searchParams.get('view'), 'map')
  assert.equal(url.searchParams.get('district'), 'quan-9')
  assert.equal(url.searchParams.has('post'), false)
  assert.equal(url.searchParams.has('keyword'), false)
  assert.equal(url.searchParams.has('page'), false)
  assert.deepEqual(queries, { food: 'cơm', map: 'Quán cà phê' })
})

test('a requested Google focus cannot be overwritten by a later listing overview fit', () => {
  assert.match(home, /if \(!searchParams\.get\('placeId'\) && exploreFitKey\.current !== fitKey\)/)
  assert.match(home, /cancelLocationFocus\(\)/)
})
