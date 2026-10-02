import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

const source = await readFile(new URL('../src/lib/websiteTraffic.ts', import.meta.url), 'utf8')
const javascript = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
const { trafficPage, trafficSession } = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`)

test('page categorization strips search terms, account IDs and room IDs', () => {
  assert.equal(trafficPage('/', '?post=private-room-id&search=private-address'), 'rental-detail')
  assert.equal(trafficPage('/', '?section=marketplace&email=private'), 'marketplace')
  assert.equal(trafficPage('/posts/private-id/edit', '?token=secret'), 'edit-post')
  assert.equal(trafficPage('/admin', ''), null)
  assert.equal(trafficPage('/admin/reports', ''), null)
  assert.equal(trafficPage('/', '?section=unknown-secret'), 'other')
})

test('session remains stable within 30 minutes and renews at timeout', () => {
  const id = '00000000-0000-0000-0000-000000000001'
  const newId = () => '00000000-0000-0000-0000-000000000002'
  assert.equal(trafficSession({ id, lastSeen: 100 }, 101, newId).id, id)
  assert.equal(trafficSession({ id, lastSeen: 100 }, 100 + 30 * 60_000, newId).id, newId())
  assert.equal(trafficSession({ id: 'invalid', lastSeen: 100 }, 101, newId).id, newId())
  assert.equal(trafficSession({ id, lastSeen: 100 }, 99, newId).id, newId())
})
