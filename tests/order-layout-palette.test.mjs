import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const css = readFileSync(new URL('../src/pages/MarketplacePage.css', import.meta.url), 'utf8')
const rule = selector => css.slice(css.indexOf(`${selector} {`)).split('}')[0]

test('order grids constrain intrinsic progress and item widths', () => {
  for (const selector of ['.marketplace-orders-dashboard', '.marketplace-purchase-sources']) {
    assert.ok(/grid-template-columns: minmax\(0, 1fr\);/.test(rule(selector)), selector)
  }
  assert.ok(/\.marketplace-purchase-source\s*\{[^}]*min-width: 0;/.test(css))
})

test('order statuses, progress and totals use readable colors', () => {
  assert.ok(/background: #24543e;/.test(rule('.marketplace-store-avatar')))
  assert.ok(/color: #24543e !important;/.test(rule('.marketplace-order-status-pill')))
  assert.ok(/background: #24543e;/.test(rule('.marketplace-order-progress .is-done span')))
  assert.ok(/color: #24543e;/.test(rule('.marketplace-order-eta > span')))
  assert.ok(/color: #24543e;/.test(rule('.marketplace-order-seller-total strong')))
  assert.ok(/color: #a43c22;/.test(rule('.marketplace-workspace .marketplace-status-filter > button.is-active')))
})
