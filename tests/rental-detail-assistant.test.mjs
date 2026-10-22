import test from 'node:test'
import assert from 'node:assert/strict'
import React, { act } from 'react'
import { JSDOM } from 'jsdom'
import { reactDomModule } from './helpers/react-dom-module.mjs'

const { buildRentalOwnerDraft, rentalOwnerQuestions, normalizeRentalOwnerDraft, RENTAL_OWNER_DRAFT_MAX_LENGTH } = await import(reactDomModule('src/lib/rentalOwnerQuestions.ts'))
const { RentalDetailAssistant } = await import(reactDomModule('src/components/ai/RentalDetailAssistant.tsx'))
const room = (extra = {}) => ({ id: 'room-a', type: 1, ownerRole: 2, title: 'Phòng có cửa sổ', price: 3000000, deposit: 0,
  electricityPrice: 4000, waterPrice: 0, internetPrice: 0, houseRules: '', updatedAt: '2026-10-21T08:00:00Z',
  ownerPhone: '0909999999', address: 'ĐỊA CHỈ RIÊNG TƯ', description: 'NỘI DUNG RIÊNG TƯ', ...extra })

test('owner draft asks availability and unclear fees without leaking unrelated private fields or inventing totals', () => {
  const draft = buildRentalOwnerDraft(room(), 'room')
  assert.match(draft, /Phòng có cửa sổ/)
  assert.match(draft, /hiện còn phòng hoặc chỗ ở không/)
  assert.match(draft, /Điện ghi 4\.000 đồng trên tin: tính theo kWh, theo người hay cả phòng mỗi tháng/)
  assert.match(draft, /Nước tính theo m³.*đơn giá là bao nhiêu/)
  assert.match(draft, /Internet đã gồm trong giá chưa/)
  assert.match(draft, /Cần cọc bao nhiêu/)
  assert.match(draft, /phí giữ xe, vệ sinh, dịch vụ hoặc phí ban đầu/)
  assert.doesNotMatch(draft, /0909999999|ĐỊA CHỈ RIÊNG TƯ|NỘI DUNG RIÊNG TƯ|miễn phí|Tổng chi phí/)
  assert.equal(new Set(rentalOwnerQuestions(room(), 'room')).size, rentalOwnerQuestions(room(), 'room').length)
})

test('per-person and unknown price bases prompt the right clarification; positive deposit stays separate', () => {
  assert.match(buildRentalOwnerDraft(room(), 'person'), /Chi phí dự kiến mỗi người đã gồm những khoản nào/)
  assert.match(buildRentalOwnerDraft(room(), 'unknown'), /theo người hay cả phòng mỗi tháng/)
  const draft = buildRentalOwnerDraft(room({ deposit: 3000000, internetPrice: 100000, houseRules: 'Có nội quy' }), 'room')
  assert.match(draft, /Tiền cọc ghi 3\.000\.000 đồng trên tin/)
  assert.match(draft, /Internet ghi 100\.000 đồng trên tin.*theo người hay cả phòng/)
  assert.doesNotMatch(draft, /Nội quy về/)
  for (const price of [0, -1, NaN, Infinity]) assert.match(buildRentalOwnerDraft(room({ price }), 'room'), /hiện tại là bao nhiêu/)
})

test('untrusted title and edited drafts remain bounded, preserve line breaks, and strip control characters', () => {
  const draft = buildRentalOwnerDraft(room({ title: 'A\n\u0000'.repeat(10000) }), 'room')
  assert.ok(draft.length <= RENTAL_OWNER_DRAFT_MAX_LENGTH)
  assert.match(draft, /đơn giá là bao nhiêu/)
  assert.doesNotMatch(draft, /\u0000/)
  assert.equal(normalizeRentalOwnerDraft('  câu hỏi\n\u0000tiếp theo  '), 'câu hỏi\ntiếp theo')
  assert.equal(normalizeRentalOwnerDraft('x'.repeat(3000)).length, 2000)
})

async function environment() {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' })
  const keys = ['window', 'document', 'IS_REACT_ACT_ENVIRONMENT']
  const previous = new Map(keys.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true })
  const { createRoot } = await import('react-dom/client')
  const root = createRoot(document.getElementById('root'))
  return { root, dom, async cleanup() {
    await act(() => root.unmount()); dom.window.close()
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else delete globalThis[key]
    }
  } }
}
const findButton = text => [...document.querySelectorAll('button')].find(button => button.textContent === text)

test('detail starts compact, opens an editable draft, and only hands off after the explicit message action', async () => {
  const env = await environment(), handoffs = []
  try {
    await act(() => env.root.render(React.createElement(RentalDetailAssistant, { post: room(), onPrepareMessage: draft => handoffs.push(draft) })))
    assert.equal(document.querySelector('textarea'), null)
    assert.match(document.body.textContent, /Tiền thuê cả phòng\/tháng/)
    assert.match(document.body.textContent, /Tiền cọc · khoản riêngChưa xác nhận/)
    assert.equal(document.querySelector('.rental-detail-assistant__fees').open, false)
    assert.equal(document.querySelector('.rental-cost').open, false)
    await act(() => findButton('Soạn câu hỏi cho người đăng').click())
    const textarea = document.querySelector('textarea')
    assert.ok(textarea)
    assert.equal(textarea.maxLength, 2000)
    assert.equal(handoffs.length, 0)
    // Use the native setter so React sees a real user edit rather than its value tracker.
    await act(() => {
      Object.getOwnPropertyDescriptor(env.dom.window.HTMLTextAreaElement.prototype, 'value').set.call(textarea, 'Mình đã sửa câu hỏi cho phù hợp.')
      textarea.dispatchEvent(new env.dom.window.Event('input', { bubbles: true }))
      textarea.dispatchEvent(new env.dom.window.Event('change', { bubbles: true }))
    })
    await act(() => findButton('Mở tin nhắn với bản nháp').click())
    assert.deepEqual(handoffs, ['Mình đã sửa câu hỏi cho phù hợp.'])
  } finally { await env.cleanup() }
})

test('person/unknown prices never show a whole-room calculator, blocked messaging cannot hand off, switching listing resets the draft', async () => {
  const env = await environment(), handoffs = []
  const render = post => env.root.render(React.createElement(RentalDetailAssistant, { post, canMessage: false, onPrepareMessage: draft => handoffs.push(draft) }))
  try {
    await act(() => render(room({ type: 2, ownerRole: 1 })))
    assert.match(document.body.textContent, /Chi phí dự kiến\/người\/tháng/)
    assert.equal(document.querySelector('.rental-cost'), null)
    await act(() => findButton('Soạn câu hỏi cho người đăng').click())
    assert.equal(findButton('Mở tin nhắn với bản nháp').disabled, true)
    await act(() => findButton('Mở tin nhắn với bản nháp').click())
    assert.equal(handoffs.length, 0)
    await act(() => render(room({ id: 'room-b', type: 2, ownerRole: undefined, price: 0 })))
    assert.equal(document.querySelector('textarea'), null)
    assert.match(document.body.textContent, /chưa rõ đơn vị/)
    assert.match(document.body.textContent, /Chưa có thông tin/)
    assert.equal(document.querySelector('.rental-cost'), null)
  } finally { await env.cleanup() }
})
