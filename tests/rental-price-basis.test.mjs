import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { MemoryRouter } from 'react-router-dom'

const compileUrl = source => `data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText).toString('base64')}`
const typesUrl = compileUrl(await readFile(new URL('../src/api/types.ts', import.meta.url), 'utf8'))
const { RentalPostType, UserRole } = await import(typesUrl)
const source = await readFile(new URL('../src/components/ai/rentalPriceBasis.ts', import.meta.url), 'utf8')
const { rentalPriceBasis, rentalPriceLabel, isLowestComparablePrice } = await import(compileUrl(source.replace('../../api/types', typesUrl)))
const room = price => ({ type: RentalPostType.VacantRoom, ownerRole: UserRole.Landlord, price })
const person = price => ({ type: RentalPostType.RoommateShare, ownerRole: UserRole.Renter, price })

test('room and individual roommate prices retain distinct units and source values', () => {
  const wholeRoom = room(3_000_000), shared = person(1_500_000)
  assert.equal(rentalPriceBasis(wholeRoom), 'room')
  assert.equal(rentalPriceBasis(shared), 'person')
  assert.equal(rentalPriceLabel('person'), 'Chi phí dự kiến/người/tháng')
  assert.equal(rentalPriceLabel('room'), 'Tiền thuê cả phòng/tháng')
  assert.equal(shared.price, 1_500_000)
})

test('a lower per-person amount never wins against whole-room prices', () => {
  const posts = [room(3_000_000), room(4_000_000), person(1_500_000)]
  assert.equal(isLowestComparablePrice(posts[0], posts), true)
  assert.equal(isLowestComparablePrice(posts[1], posts), false)
  assert.equal(isLowestComparablePrice(posts[2], posts), false)
})

test('comparisons rank only within each unit and preserve tied minima', () => {
  const posts = [room(3_000_000), person(1_500_000), person(2_000_000), person(1_500_000)]
  assert.equal(isLowestComparablePrice(posts[0], posts), false)
  assert.equal(isLowestComparablePrice(posts[1], posts), true)
  assert.equal(isLowestComparablePrice(posts[2], posts), false)
  assert.equal(isLowestComparablePrice(posts[3], posts), true)
})

test('missing, null or unsupported roommate author roles stay unknown; landlord legacy remains whole-room', () => {
  for (const ownerRole of [undefined, null, 999, UserRole.Admin]) {
    const legacy = { type: RentalPostType.RoommateShare, price: 1_000_000, ownerRole }
    assert.equal(rentalPriceBasis(legacy), 'unknown')
    assert.equal(isLowestComparablePrice(legacy, [legacy, person(2_000_000)]), false)
  }
  assert.match(rentalPriceLabel('unknown'), /chưa rõ đơn vị/)
  assert.equal(rentalPriceBasis({ type: RentalPostType.RoommateShare, ownerRole: UserRole.Landlord }), 'room')
})

test('missing or invalid price never becomes a cheapest recommendation', () => {
  for (const price of [0, -1, NaN, Infinity]) {
    const invalid = room(price)
    assert.equal(isLowestComparablePrice(invalid, [invalid, room(3_000_000)]), false)
    assert.equal(isLowestComparablePrice(room(3_000_000), [invalid, room(3_000_000)]), false)
  }
})

// Render the real review branches; only network/map/calculator children and presentation formatting are isolated.
const require = createRequire(import.meta.url)
const reviewSource = (await readFile(new URL('../src/components/ai/AiSearchReview.tsx', import.meta.url), 'utf8'))
  .replace(/^import .*\r?\n/gm, '')
const reviewJs = ts.transpileModule(reviewSource, { compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.React } }).outputText
const bindings = `
import React, { useState } from '${pathToFileURL(require.resolve('react')).href}';
import { Link } from '${pathToFileURL(require.resolve('react-router-dom')).href}';
import { RentalPostType } from '${typesUrl}';
import { rentalPriceBasis, rentalPriceLabel } from '${compileUrl(source.replace('../../api/types', typesUrl))}';
const aiFeatureFlags = { commute: false };
const amenityLabel = value => value;
const formatPrice = value => String(value);
const ShortlistCommutePlanner = () => null;
const RentalCostCalculator = () => React.createElement('span', null, 'WHOLE_ROOM_CALCULATOR');
`
const { AiSearchReview } = await import(`data:text/javascript;base64,${Buffer.from(bindings + reviewJs).toString('base64')}`)
const renderReview = post => renderToStaticMarkup(createElement(MemoryRouter, null,
  createElement(AiSearchReview, { result: { criteria: { budgetBasis: 'total', unknown: ['feeUnits'] },
    posts: [{ post: { id: 'one', title: 'Tin thử', address: 'Linh Trung', area: 20, ...post }, reasons: [] }] }, onApply() {} })))

test('real AI review renders source units and never offers whole-room calculator for individual/unknown prices', () => {
  const individual = renderReview(person(1_500_000))
  assert.match(individual, /Chi phí dự kiến\/người\/tháng/)
  assert.doesNotMatch(individual, /WHOLE_ROOM_CALCULATOR/)
  const unknown = renderReview({ type: RentalPostType.RoommateShare, price: 1_500_000 })
  assert.match(unknown, /chưa rõ đơn vị/)
  assert.match(unknown, /trước khi áp dụng ngân sách/)
  assert.doesNotMatch(unknown, /Xác nhận · áp dụng lên bản đồ|WHOLE_ROOM_CALCULATOR/)
  assert.match(renderReview(room(3_000_000)), /WHOLE_ROOM_CALCULATOR/)
})
