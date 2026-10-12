import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import test from 'node:test'
import ts from 'typescript'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'

const require = createRequire(import.meta.url)
const compileUrl = source => `data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.React },
}).outputText).toString('base64')}`
const typesUrl = compileUrl(await readFile(new URL('../src/api/types.ts', import.meta.url), 'utf8'))
const basisUrl = compileUrl((await readFile(new URL('../src/components/ai/rentalPriceBasis.ts', import.meta.url), 'utf8')).replace('../../api/types', typesUrl))
const bindings = `
  import React from '${pathToFileURL(require.resolve('react')).href}';
  import { Link } from '${pathToFileURL(require.resolve('react-router-dom')).href}';
  import { rentalPriceBasis, rentalPriceLabel } from '${basisUrl}';
  const aiFeatureFlags = { commute: false };
  const formatPrice = value => 'VND:' + value;
  const formatListingRent = value => Number.isFinite(value) && value > 0 ? formatPrice(value) : 'Chưa có thông tin';
  const formatListingArea = value => value > 0 ? value + ' m²' : 'Chưa có thông tin';
  const amenityLabel = String;
  const mapPostUrl = id => '/?post=' + id;
`
const source = (await readFile(new URL('../src/components/ai/RentalDecisionResults.tsx', import.meta.url), 'utf8')).replace(/^import .*\r?\n/gm, '')
const { RentalDecisionResults } = await import(compileUrl(bindings + source))
const item = (type = 1, ownerRole = 2) => ({
  post: { id: `${type}-${ownerRole}`, type, ownerRole, title: 'Tin thử', price: 1500000, area: 25, amenities: [], deposit: 1000000 },
  cost: { knownMonthlySubtotal: 1900000, estimatedMonthlyTotal: 1900000, initialPayment: 2500000, unknown: [], questions: [], updatedAt: '2026-10-12T00:00:00Z' },
  commute: null,
})
const render = posts => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(RentalDecisionResults, {
  data: { posts, unavailablePostIds: [], summary: 'BACKEND_DIFFERENCE' }, budgetCeiling: 2000000,
})))

test('roommate per-person prices never inherit whole-room totals from an older backend', () => {
  const html = render([item(2, 1)])
  assert.match(html, /Chi phí dự kiến\/người\/tháng/)
  assert.match(html, /VND:1500000/)
  assert.doesNotMatch(html, /VND:1900000|VND:2500000|trong trần/)
})

test('unknown author metadata and conflicting server cost units cannot confirm a group total', () => {
  for (const candidate of [item(2, null), { ...item(), cost: { ...item().cost, priceBasis: 'person' } }]) {
    const html = render([candidate])
    assert.doesNotMatch(html, /VND:1900000|VND:2500000|trong trần/)
    assert.match(html, /cần xác nhận/)
  }
})

test('verified whole-room price retains totals and budget comparison for old and new response shapes', () => {
  for (const priceBasis of [undefined, 'room']) {
    const candidate = item()
    candidate.cost.priceBasis = priceBasis
    const html = render([candidate])
    assert.match(html, /Tiền thuê cả phòng\/tháng/)
    assert.match(html, /VND:1900000/)
    assert.match(html, /trong trần theo kịch bản/)
  }
})

test('missing rent preserves known fee subtotal but never confirms total or initial payment', () => {
  const candidate = item()
  candidate.post.price = 0
  const html = render([candidate])
  assert.match(html, /chỉ các khoản đã biết; chưa có tiền thuê/)
  assert.doesNotMatch(html, /VND:2500000|trong trần|BACKEND_DIFFERENCE/)
})

test('mixed price units suppress unsafe legacy difference summary', () => {
  const html = render([item(), item(2, 1)])
  assert.doesNotMatch(html, /BACKEND_DIFFERENCE/)
  assert.match(html, /không được so chênh lệch trực tiếp/)
  assert.doesNotMatch(html, /Đường đi|Google Maps/)
})

test('null or invalid aggregate values stay unknown instead of becoming zero currency', () => {
  for (const amount of [null, NaN, Infinity, -1]) {
    const candidate = item()
    candidate.cost.knownMonthlySubtotal = amount
    candidate.cost.estimatedMonthlyTotal = amount
    candidate.cost.initialPayment = amount
    assert.doesNotMatch(render([candidate]), /VND:null|VND:NaN|VND:Infinity|VND:-1|trong trần/)
  }
})
