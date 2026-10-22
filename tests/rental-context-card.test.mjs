import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { reactDomModule } from './helpers/react-dom-module.mjs'

const reactUrl = new URL('../node_modules/react/index.js', import.meta.url).href
const router = 'data:text/javascript;base64,' + Buffer.from(`import React from '${reactUrl}';export const Link=({to,children,...props})=>React.createElement('a',{...props,href:to},children)`).toString('base64')
const links = 'data:text/javascript;base64,' + Buffer.from('export const mapPostUrl=id=>"/?post="+encodeURIComponent(id)').toString('base64')
const { RentalContextCard } = await import(reactDomModule(path.resolve('src/components/ai/RentalContextCard.tsx'), { 'react-router-dom': router, '../../lib/mapDeepLinks': links }))
const item = {
  post: { id: 'room-a', title: 'Phòng A', type: 1, ownerRole: 2, price: 3_000_000, deposit: 0, address: 'Private address', ownerPhone: 'Private phone' },
  cost: { priceBasis: 'room', knownMonthlySubtotal: 3_000_000, estimatedMonthlyTotal: 88_888_888, initialPayment: 99_999_999,
    unknown: ['Đơn vị phí điện'], questions: ['Điện tính theo đơn vị nào?'], sourceType: 'listing', updatedAt: '2026-10-21T00:00:00Z' },
}
const render = row => renderToStaticMarkup(React.createElement(RentalContextCard, { data: { posts: [row], unavailablePostIds: [], summary: '' } }))

test('single room card exposes sourced partial costs and collapsed questions without a wide comparison table', () => {
  const html = render(item)
  assert.match(html, /3\.000\.000/)
  assert.match(html, /Tiền thuê cả phòng\/tháng/)
  assert.match(html, /Cọc theo tin<\/dt><dd>Chưa xác nhận/)
  assert.match(html, /Phần chi phí đã biết/)
  assert.match(html, /Theo tin chủ đăng/)
  assert.match(html, /21\/10\/2026/)
  assert.match(html, /<details><summary>Khoản thiếu và câu hỏi/)
  assert.match(html, /Điện tính theo đơn vị nào/)
  assert.match(html, /href="\/?[^\"]*post=room-a/)
  assert.doesNotMatch(html, /<table|88\.888\.888|99\.999\.999|Private address|Private phone/)
})

test('per-person or unknown rental units cannot become a room monthly subtotal', () => {
  const html = render({ ...item, post: { ...item.post, type: 2, ownerRole: 1 }, cost: { ...item.cost, knownMonthlySubtotal: 12_345_678 } })
  assert.match(html, /Chi phí dự kiến\/người\/tháng/)
  assert.match(html, /Cần xác nhận đơn vị và phạm vi chi phí/)
  assert.doesNotMatch(html, /12\.345\.678/)
})

test('missing rent, deposit and source dates remain unknown rather than free or verified', () => {
  const html = render({ ...item, post: { ...item.post, price: 0 }, cost: { ...item.cost, knownMonthlySubtotal: null, updatedAt: 'not a date' } })
  assert.match(html, /Tiền thuê chưa được xác nhận/)
  assert.match(html, /chưa có ngày cập nhật/)
  assert.doesNotMatch(html, /Invalid Date|miễn phí/)
})

test('complete scenario totals remain labelled as estimates and each selected room is named', () => {
  const html = render({ ...item, cost: { ...item.cost, unknown: [], questions: [], estimatedMonthlyTotal: 3_500_000 } })
  assert.match(html, /<h4>Phòng A<\/h4>/)
  assert.match(html, /Tổng tháng theo kịch bản/)
  assert.match(html, /3\.500\.000/)
  assert.match(html, /Ước tính theo tin đăng và kịch bản bạn nhập/)
})
