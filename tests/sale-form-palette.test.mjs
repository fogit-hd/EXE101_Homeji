import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const css = readFileSync(new URL('../src/pages/MarketplacePage.css', import.meta.url), 'utf8')

const luminance = (channels) => {
  const linear = channels.map(channel => {
    const value = channel / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722
}

test('sale caption palettes meet small-text contrast on their rendered backgrounds', () => {
  for (const [foreground, background] of [
    [[164, 60, 34], [255, 240, 233]],
    [[36, 84, 62], [255, 253, 248]],
    [[82, 99, 88], [215.279925, 234.96006, 223.439925]],
  ]) {
    const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
    assert.ok((values[0] + 0.05) / (values[1] + 0.05) >= 4.5)
  }
})

test('sale type selection and food preset prices use readable text colors', () => {
  assert.match(css, /\.marketplace-type-choice button\.is-active\s*\{[^}]*color: #a43c22;/)
  assert.match(css, /\.food-preset-grid strong\s*\{[^}]*color: #24543e;/)
})

test('fixed seller location uses readable captions and wraps long addresses', () => {
  assert.match(css, /\.seller-location-lock\s*\{[^}]*min-width: 0;[^}]*overflow-wrap: anywhere;/)
  assert.match(css, /\.seller-location-lock span\s*\{[^}]*color: #526358;/)
})
