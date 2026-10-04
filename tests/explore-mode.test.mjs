import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

const source = await readFile(new URL('../src/components/chrome/exploreMode.ts', import.meta.url), 'utf8')
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext },
}).outputText
const { isExploreMapMode, isExploreListMode, parseExploreView } = await import(
  `data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`
)

test('switching to list with a selected post releases the viewport-locked map layout', () => {
  const params = new URLSearchParams('section=listings&view=split&post=room-123')
  assert.equal(isExploreMapMode('/', `?${params}`), true)
  params.set('view', 'list')
  assert.equal(isExploreMapMode('/', `?${params}`), false)
  assert.equal(isExploreListMode('/', `?${params}`), true)
  assert.equal(parseExploreView('/', `?${params}`), 'list')
  params.set('view', 'map')
  assert.equal(parseExploreView('/', `?${params}`), 'map')
})

test('map deep links and list defaults retain their existing behavior', () => {
  for (const search of ['?post=room-123', '?section=listings', '?section=listings&view=map']) {
    assert.equal(parseExploreView('/', search), 'map')
  }
  for (const search of ['?section=explore', '?section=listings&view=list', '?post=room-123&view=list']) {
    assert.equal(parseExploreView('/', search), 'list')
  }
  assert.equal(parseExploreView('/posts', '?post=room-123&view=list'), null)
})
