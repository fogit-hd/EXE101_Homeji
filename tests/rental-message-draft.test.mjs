import assert from 'node:assert/strict'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import React, { act } from 'react'
import { JSDOM } from 'jsdom'
import { reactDomModule } from './helpers/react-dom-module.mjs'

const moduleUrl = reactDomModule(fileURLToPath(new URL('../src/lib/rentalMessageDraft.ts', import.meta.url)))
const { createRentalMessageDraftStore, rentalDraftTarget, rentalMessageDraftStore } = await import(moduleUrl)
const { RentalMessageDraftNotice } = await import(reactDomModule(fileURLToPath(new URL('../src/components/map/RentalMessageDraftNotice.tsx', import.meta.url)), {
  '../../lib/rentalMessageDraft': moduleUrl,
  '../../api/client': 'data:text/javascript;base64,' + Buffer.from('export const getStoredSession=()=>({userId:globalThis.__draftSessionUser??"renter"})').toString('base64'),
}))
const target = { userId: 'renter', conversationId: 'conversation-a', postId: 'room-a', recipientId: 'owner-a' }
const conversation = { id: 'conversation-a', subjectType: 1, subjectId: 'room-a', otherParticipantId: 'owner-a', otherParticipantName: 'Chủ phòng A' }

test('handoff is scoped to account, conversation, listing and recipient, and consumed once', () => {
  const store = createRentalMessageDraftStore()
  assert.equal(store.queue(target, 'Điện tính theo kWh hay tháng?\nCọc thế nào?'), true)
  const draft = store.peek(target)
  assert.ok(draft)
  for (const field of ['userId', 'conversationId', 'postId', 'recipientId']) assert.equal(store.peek({ ...target, [field]: 'other' }), null)
  assert.equal(store.take(target, draft.id + 1), null)
  assert.equal(store.take(target, draft.id).body, draft.body)
  assert.equal(store.take(target, draft.id), null)
})

test('expired, oversized, blank and self-addressed drafts cannot be offered or used', () => {
  let now = 10
  const store = createRentalMessageDraftStore(() => now)
  assert.equal(store.queue(target, ' '.repeat(10)), false)
  assert.equal(store.queue(target, 'x'.repeat(2001)), false)
  assert.equal(store.queue({ ...target, recipientId: target.userId }, 'hỏi phí'), false)
  assert.equal(store.queue({ ...target, postId: '' }, 'hỏi phí'), false)
  store.queue(target, 'hỏi phí')
  const id = store.peek(target).id
  now += 10 * 60_000
  assert.equal(store.peek(target), null)
  assert.equal(store.take(target, id), null)
})

test('a new account cannot recover an old draft; clearing identity drops it', () => {
  const store = createRentalMessageDraftStore()
  store.queue(target, 'Câu hỏi riêng của A')
  const second = { ...target, userId: 'renter-b' }
  store.queue(second, 'Câu hỏi của B')
  assert.equal(store.peek(target), null)
  assert.equal(store.peek(second).body, 'Câu hỏi của B')
  store.clearUser(second.userId)
  assert.equal(store.peek(second), null)
})

test('storage is bounded and an older offer cannot consume a replaced draft', () => {
  const store = createRentalMessageDraftStore()
  store.queue(target, 'cũ')
  const old = store.peek(target)
  store.queue(target, 'mới')
  assert.equal(store.take(target, old.id), null)
  assert.equal(store.peek(target).body, 'mới')
  for (let i = 0; i < 5; i++) store.queue({ ...target, conversationId: 'conversation-' + i }, 'hỏi ' + i)
  assert.equal(store.peek(target), null)
})

test('only rental conversations provide a draft target', () => {
  assert.deepEqual(rentalDraftTarget(target.userId, conversation), target)
  assert.equal(rentalDraftTarget(undefined, conversation), null)
  assert.equal(rentalDraftTarget(target.userId, { ...conversation, subjectType: 2 }), null)
})

async function environment() {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'https://fixture.local' })
  const keys = ['window', 'document', 'HTMLElement', 'Node', 'Event', 'MouseEvent']
  const previous = new Map(keys.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
  for (const key of keys) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value: key === 'window' ? dom.window : dom.window[key] })
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  const { createRoot } = await import('react-dom/client')
  const root = createRoot(document.getElementById('root'))
  return { root, async cleanup() { await act(() => root.unmount()); rentalMessageDraftStore.clearUser(target.userId); delete globalThis.__draftSessionUser; dom.window.close(); for (const [key, descriptor] of previous) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key] } } }
}
const click = element => act(() => element.dispatchEvent(new MouseEvent('click', { bubbles: true })))

test('inbox offer never overwrites a draft or sends anything without the user choosing it', async () => {
  const env = await environment()
  let used = []
  try {
    rentalMessageDraftStore.queue(target, 'Nội dung\nđã xem lại')
    await act(() => env.root.render(React.createElement(RentalMessageDraftNotice, { userId: target.userId, conversation, existingDraft: 'Đang soạn', onUse: body => used.push(body) })))
    assert.equal(used.length, 0)
    assert.match(document.body.textContent, /chưa.*gửi/i)
    assert.match(document.body.textContent, /đang soạn nội dung khác/i)
    await click([...document.querySelectorAll('button')].find(node => node.textContent.includes('Thay nội dung')))
    assert.deepEqual(used, ['Nội dung\nđã xem lại'])
    assert.equal(document.querySelector('section'), null)
    await act(() => env.root.render(React.createElement(RentalMessageDraftNotice, { userId: target.userId, conversation, existingDraft: '', onUse: body => used.push(body) })))
    assert.equal(used.length, 1)
  } finally { await env.cleanup() }
})

test('inbox offer disappears for another account/thread and dismissing never applies it', async () => {
  const env = await environment()
  const used = []
  const render = (userId, convo) => act(() => env.root.render(React.createElement(RentalMessageDraftNotice, { userId, conversation: convo, existingDraft: '', onUse: body => used.push(body) })))
  try {
    rentalMessageDraftStore.queue(target, 'Câu hỏi A')
    await render('someone-else', conversation)
    assert.equal(document.querySelector('section'), null)
    await render(target.userId, { ...conversation, subjectId: 'room-b' })
    assert.equal(document.querySelector('section'), null)
    await render(target.userId, conversation)
    assert.ok(document.querySelector('section'))
    await click([...document.querySelectorAll('button')].find(node => node.textContent === 'Bỏ bản nháp'))
    assert.deepEqual(used, [])
    assert.equal(document.querySelector('section'), null)
  } finally { await env.cleanup() }
})

test('session changed outside React cannot put old account text into the composer', async () => {
  const env = await environment()
  const used = []
  try {
    rentalMessageDraftStore.queue(target, 'Câu hỏi riêng')
    await act(() => env.root.render(React.createElement(RentalMessageDraftNotice, { userId: target.userId, conversation, existingDraft: '', onUse: body => used.push(body) })))
    globalThis.__draftSessionUser = 'another-account'
    await click([...document.querySelectorAll('button')].find(node => node.textContent.includes('Dùng bản nháp')))
    assert.deepEqual(used, [])
  } finally { await env.cleanup() }
})
