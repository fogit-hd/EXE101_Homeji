import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

const source = await readFile(new URL('../src/components/landing/landingSections.ts', import.meta.url), 'utf8')
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext },
}).outputText
const { initialLandingSection } = await import(
  `data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`
)

test('initialLandingSection maps hash, search, and empty location', () => {
  assert.equal(initialLandingSection({ hash: '#map', search: '' }), 'map')
  assert.equal(initialLandingSection({ hash: '#unknown', search: '' }), null)
  assert.equal(initialLandingSection({ hash: '', search: '?section=listings&view=list' }), 'listings')
  assert.equal(initialLandingSection({ hash: '', search: '?section=listings' }), 'map')
  assert.equal(initialLandingSection({ hash: '', search: '?section=explore' }), 'map')
  assert.equal(initialLandingSection({ hash: '', search: '' }), null)
})
