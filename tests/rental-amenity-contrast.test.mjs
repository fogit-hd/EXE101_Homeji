import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { declaration, contrastColors } from './helpers/theme-colors.mjs'

test('selected rental amenities use readable text against their mint fill', () => {
  const css = readFileSync(new URL('../src/ui-consistency.css', import.meta.url), 'utf8')
  const chipCss = readFileSync(new URL('../src/pages/HomePage.css', import.meta.url), 'utf8')
  assert.ok(contrastColors(declaration(css, '.rental-edit-form .amenity-chip.active', 'color'),
    declaration(chipCss, '.amenity-chip.active', 'background')) >= 4.5)
})
