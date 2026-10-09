import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('message page eyebrow uses a readable accent against the cream page', () => {
  const css = readFileSync(new URL('../src/components/map/MapMessagesPanel.css', import.meta.url), 'utf8')
  assert.ok(/\.map-messages__eyebrow\s*\{[^}]*color:\s*#a43c22;/.test(css))
})
