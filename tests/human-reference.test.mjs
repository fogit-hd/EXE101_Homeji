import assert from 'node:assert/strict'
import test from 'node:test'
import { humanReference } from '../src/lib/humanReference.ts'

test('raw ids become short HJ codes; human codes stay as they are', () => {
  const short = humanReference('123fa130-3bdc-4be8-8a90-2c04bdcb5833')
  assert.match(short, /^HJ-[0-9A-Z]+$/)
  assert.ok(short.length < 32)
  assert.equal(humanReference('123fa1303bdc4be88a902c04bdcb5833'), short)
  assert.equal(humanReference('HJ-123fa1303bdc4be88a902c04bdcb5833'), short)
  assert.equal(humanReference('ORD-2026-0042'), 'ORD-2026-0042')
  assert.equal(humanReference(null), '')
})
