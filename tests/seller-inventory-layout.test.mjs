import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const css = readFileSync(new URL('../src/pages/MarketplacePage.css', import.meta.url), 'utf8')
const lastMobile = css.slice(css.lastIndexOf('@media (max-width: 720px)'))

test('seller inventory status is readable on its mint background', () => {
  assert.ok(/\.marketplace-card--mine \.marketplace-card__status,\s*\.marketplace-card--mine \.marketplace-card__badge\s*\{[^}]*color: #24543e;/.test(css))
})

test('seller inventory reserves room for text on narrow screens', () => {
  assert.ok(/\.marketplace-card--mine \.marketplace-card__main\s*\{[^}]*grid-template-columns: 72px minmax\(0, 1fr\);/.test(lastMobile))
  assert.ok(/\.marketplace-card--mine \.marketplace-card__thumb--empty\s*\{[^}]*width: 72px;[^}]*height: 72px;/.test(lastMobile))
})

test('mobile catalog filter labels stay above their controls', () => {
  assert.ok(/\.marketplace-toolbar__field\s*\{[^}]*flex-direction: column;[^}]*align-items: stretch;/.test(lastMobile))
})

test('very narrow filters use full-width controls to keep selected values readable', () => {
  assert.ok(/@media \(max-width: 480px\)\s*\{\s*\.marketplace-toolbar \.marketplace-toolbar__field\s*\{[^}]*flex-basis: 100%;/.test(css))
})
