import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const css = readFileSync(new URL('../src/components/map/MapAppointmentsPanel.css', import.meta.url), 'utf8')
const block = selector => css.slice(css.indexOf(`${selector} {`)).split('}')[0]

test('appointment panel keeps its captions and dark-card heading readable', () => {
  assert.match(block('.map-appointments'), /--hj-muted:\s*#526358;/)
  assert.match(block('.map-appointments'), /--hj-accent:\s*#a43c22;/)
  assert.match(block('.map-appointments__eyebrow'), /color:\s*var\(--hj-accent\)/)
  assert.match(block('.map-appointments__prep-head h2'), /color:\s*#fff;/)
  assert.match(block('.map-appointments__cal-day.is-out'), /color:\s*#aeb9b2;/)
})

test('calendar tracks may shrink below their intrinsic day widths on mobile', () => {
  assert.match(css, /@media \(max-width: 900px\)\s*\{\s*\.map-appointments__layout\s*\{\s*grid-template-columns:\s*minmax\(0, 1fr\);/)
  assert.match(block('.map-appointments__cal-grid'), /grid-template-columns:\s*repeat\(7, minmax\(0, 1fr\)\);/)
  assert.match(block('.map-appointments__cal-day'), /width:\s*100%;/)
  assert.match(block('.map-appointments__cal-day'), /min-width:\s*0;/)
})

test('appointment notes can wrap long unbroken user content', () => {
  assert.match(block('.map-appointments__tl-meta'), /overflow-wrap:\s*anywhere;/)
})
