import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const css = readFileSync(new URL('../src/components/hub/AuthenticatedHub.css', import.meta.url), 'utf8')
const luminance = hex => hex.match(/[\da-f]{2}/gi)
  .map(value => Number.parseInt(value, 16) / 255)
  .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0)
const contrast = (first, second) => {
  const [light, dark] = [luminance(first), luminance(second)].sort((a, b) => b - a)
  return (light + 0.05) / (dark + 0.05)
}

test('hub accents remain readable on cream cards and colored actions', () => {
  const coral = css.match(/--hub-coral:\s*(#[\da-f]{6})/i)[1]
  const leaf = css.match(/--hub-leaf:\s*(#[\da-f]{6})/i)[1]
  for (const background of ['#f3ebdd', '#fffdf8', '#e4f0e8']) {
    assert.ok(contrast(coral, background) >= 4.5, `coral against ${background}`)
    assert.ok(contrast(leaf, background) >= 4.5, `leaf against ${background}`)
  }
  assert.ok(contrast('#ffffff', coral) >= 4.5, 'white action text')
})

test('room section captions and links do not inherit the global page palette', () => {
  assert.ok(/\.hub-rooms header p\s*\{[^}]*color:\s*var\(--hub-muted\)/.test(css))
  assert.ok(/\.hub-rooms header > a\s*\{[^}]*color:\s*var\(--hub-coral\)/.test(css))
  assert.ok(/\.hub-rooms \.hub-photo\s*\{[^}]*color:\s*var\(--hub-muted\)/.test(css))
})
