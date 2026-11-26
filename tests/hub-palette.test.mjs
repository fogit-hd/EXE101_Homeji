import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { THEMES, mix, token, tokenContrast } from './helpers/theme-tokens.mjs'

const css = readFileSync(new URL('../src/components/hub/AuthenticatedHub.css', import.meta.url), 'utf8')
const luminance = hex => hex.match(/[\da-f]{2}/gi)
  .map(value => Number.parseInt(value, 16) / 255)
  .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0)
const contrast = (first, second) => {
  const [light, dark] = [luminance(first), luminance(second)].sort((a, b) => b - a)
  return (light + 0.05) / (dark + 0.05)
}

test('hub accents remain readable on cards and colored actions in both themes', () => {
  assert.match(css, /--hub-coral:\s*var\(--action-primary\)/)
  assert.match(css, /--hub-leaf:\s*var\(--grab-green\)/)
  for (const theme of THEMES) {
    for (const background of ['--surface', '--surface-muted', '--surface-elevated']) {
      assert.ok(tokenContrast('--grab-green', background, theme) >= 4.5, `leaf on ${background} (${theme})`)
      assert.ok(tokenContrast('--action-on-soft', background, theme) >= 4.5, `coral text on ${background} (${theme})`)
    }
    assert.ok(tokenContrast('--action-on-primary', '--action-primary', theme) >= 4.5, `action text (${theme})`)
  }
})

test('room section captions and links do not inherit the global page palette', () => {
  assert.ok(/\.hub-rooms header p\s*\{[^}]*color:\s*var\(--hub-muted\)/.test(css))
  assert.ok(/\.hub-rooms header a,\s*\.hub-side header a\s*\{[^}]*color:\s*var\(--hub-coral\)/.test(css))
  assert.ok(/\.hub-room__nophoto\s*\{[^}]*color:\s*var\(--hub-muted\)/.test(css))
})
