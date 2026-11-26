import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { THEMES, contrast, mix, token, tokenContrast } from './helpers/theme-tokens.mjs'

const css = readFileSync(new URL('../src/components/map/MapAppointmentsPanel.css', import.meta.url), 'utf8')
const block = selector => css.slice(css.indexOf(`${selector} {`)).split('}')[0]

test('appointment panel keeps its captions and dark-card heading readable', () => {
  assert.match(block('.map-appointments'), /--hj-muted:\s*var\(--text-secondary\);/)
  for (const theme of THEMES) assert.ok(tokenContrast('--text-secondary', '--surface', theme) >= 4.5, `captions in ${theme}`)
  assert.match(block('.map-appointments'), /--hj-accent:\s*var\(--grab-green\);/)
  assert.ok(!css.includes('.map-appointments__eyebrow'))
  assert.match(block('.map-appointments__prep-head h2'), /color:\s*var\(--surface\);/)
  assert.match(block('.map-appointments__cal-day.is-out'), /color:\s*var\(--text-secondary\);/)
})

test('calendar tracks reserve non-overlapping 44px day targets on mobile', () => {
  assert.match(css, /@media \(max-width: 900px\)\s*\{\s*\.map-appointments__layout\s*\{\s*grid-template-columns:\s*minmax\(0, 1fr\);/)
  assert.match(block('.map-appointments__cal-grid'), /grid-template-columns:\s*repeat\(7, minmax\(44px, 1fr\)\);/)
  assert.match(block('.map-appointments__cal-day'), /width:\s*100%;/)
  assert.match(block('.map-appointments__cal-day'), /min-width:\s*44px;/)
  assert.match(block('.map-appointments__cal-day'), /min-height:\s*44px;/)
})

test('appointment notes can wrap long unbroken user content', () => {
  assert.match(block('.map-appointments__tl-meta'), /overflow-wrap:\s*anywhere;/)
})
