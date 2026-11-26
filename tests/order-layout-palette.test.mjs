import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { THEMES, contrast, mix, token, tokenContrast } from './helpers/theme-tokens.mjs'

const css = readFileSync(new URL('../src/pages/MarketplacePage.css', import.meta.url), 'utf8')
const rule = selector => css.slice(css.indexOf(`${selector} {`)).split('}')[0]

test('order grids constrain intrinsic progress and item widths', () => {
  for (const selector of ['.marketplace-orders-dashboard', '.marketplace-purchase-sources']) {
    assert.ok(/grid-template-columns: minmax\(0, 1fr\);/.test(rule(selector)), selector)
  }
  assert.ok(/\.marketplace-purchase-source\s*\{[^}]*min-width: 0;/.test(css))
})

test('order statuses, progress and totals use readable colors', () => {
  assert.ok(/background: var\(--grab-green\);[^}]*color: var\(--surface-elevated\);/.test(rule('.marketplace-store-avatar')))
  assert.ok(/color: var\(--text-primary\);/.test(rule('.marketplace-order-group__header .marketplace-order-status-pill')))
  assert.ok(/background: var\(--success\);/.test(rule('.marketplace-order-progress .is-done span')))
  assert.ok(/color: var\(--text-primary\);/.test(rule('.marketplace-order-eta > span')))
  assert.ok(/color: var\(--text-primary\);/.test(rule('.marketplace-order-seller-total strong')))
  for (const theme of THEMES) {
    assert.ok(tokenContrast('--surface-elevated', '--grab-green', theme) >= 4.5, `avatar initials (${theme})`)
    assert.ok(tokenContrast('--surface-elevated', '--success', theme) >= 3, `progress tick (${theme})`)
  }
  assert.ok(/color: var\(--action-on-soft\);/.test(rule('.marketplace-workspace .marketplace-status-filter > button.is-active')))
})
