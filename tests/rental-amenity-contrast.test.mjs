import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('selected rental amenities use readable text against their mint fill', () => {
  const css = readFileSync(new URL('../src/ui-consistency.css', import.meta.url), 'utf8')
  assert.ok(/\.rental-edit-form \.amenity-chip\.active\s*\{[^}]*color: #24543e;/.test(css))
  const luminance = channels => channels.map(value => value / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
    .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0)
  const foreground = luminance([36, 84, 62])
  const background = luminance([219.3, 244.080135, 230.360115])
  assert.ok((background + 0.05) / (foreground + 0.05) >= 4.5)
})
