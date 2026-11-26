import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test("message page heading stands without a decorative eyebrow", async () => {
  const css=readFileSync(new URL('../src/components/map/MapMessagesPanel.css',import.meta.url),'utf8')
  assert.ok(!css.includes('.map-messages__eyebrow'))
})
