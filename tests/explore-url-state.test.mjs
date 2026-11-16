import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

const source = await readFile(
  new URL('../src/components/landing/explore/exploreUrlState.ts', import.meta.url),
  'utf8',
)
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText

const {
  EXPLORE_QUERY_PARAM,
  EXPLORE_RADIUS_PARAM,
  readExploreUrlState,
  writeExploreUrlState,
} = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`)

test('explore URL uses eq/er (not marketplace q) and preserves other params', () => {
  assert.equal(EXPLORE_QUERY_PARAM, 'eq')
  assert.equal(EXPLORE_RADIUS_PARAM, 'er')

  const incoming = new URLSearchParams('section=listings&view=list&foo=1')
  const written = writeExploreUrlState(incoming, { query: 'Nông Lâm', radiusKm: 2 })
  assert.equal(written.get('eq'), 'Nông Lâm')
  assert.equal(written.get('er'), '2')
  assert.equal(written.get('section'), 'listings')
  assert.equal(written.get('view'), 'list')
  assert.equal(written.get('foo'), '1')
  assert.equal(written.get('q'), null)

  const read = readExploreUrlState(written)
  assert.equal(read.query, 'Nông Lâm')
  assert.equal(read.radiusKm, 2)

  const cleared = writeExploreUrlState(written, { query: '', radiusKm: null })
  assert.equal(cleared.get('eq'), null)
  assert.equal(cleared.get('er'), null)
  assert.equal(cleared.get('foo'), '1')
})

test('parseExploreRadius falls back to 2 for invalid values', () => {
  assert.equal(readExploreUrlState(new URLSearchParams('er=9')).radiusKm, 2)
  assert.equal(readExploreUrlState(new URLSearchParams('er=1')).radiusKm, 1)
})
