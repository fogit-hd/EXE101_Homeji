import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import React, { act } from 'react'
import { JSDOM } from 'jsdom'
import { reactDomModule } from './helpers/react-dom-module.mjs'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const moduleUrl = source => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64')
const reactUrl = new URL('../node_modules/react/index.js', import.meta.url).href
const fixtureUrl = moduleUrl(`
export const ChatMessageSender={User:1,Assistant:2};
export const ChatbotNavigationActionKind={OpenSection:1,Navigate:2};
export const getChatbotPopupConfig=()=>globalThis.__chatFixture.configPromise??Promise.resolve({enabled:true,greeting:'Chào bạn',suggestedPrompts:[],...globalThis.__chatFixture.config});
export const deleteChatbotConversation=async(id)=>globalThis.__chatFixture.deleted.push(id);
export const sendChatbotMessage=(body,signal)=>new Promise((resolve,reject)=>globalThis.__chatFixture.requests.push({body,signal,resolve,reject}));
export const useAuth=()=>globalThis.__chatFixture.auth;
export const useAuthModal=()=>({isOpen:false,openAuthModal:()=>{}});
export const useNavigate=()=>target=>globalThis.__chatFixture.navigations.push(target);
`)
const overrides = {
  '../../api': fixtureUrl,
  '../../contexts/AuthContext': fixtureUrl,
  '../../contexts/AuthModalContext.logic': fixtureUrl,
  'react-router-dom': fixtureUrl,
  '@lottiefiles/dotlottie-react': moduleUrl('export const DotLottieReact=()=>null'),
  'motion/react': moduleUrl(`import React from '${reactUrl}';export const motion={div:React.forwardRef(({initial,animate,transition,...props},ref)=>React.createElement('div',{...props,ref}))}`),
  '../../lib/errors': moduleUrl('export const getErrorMessage=(error,fallback)=>error.message||fallback'),
  '../../lib/marketplaceNavigation': moduleUrl('export const requestMarketplaceCart=()=>{};export const requestMarketplaceTab=()=>{}'),
  '../../lib/nearbyChatIntent': moduleUrl('export const nearbyChatIntent=()=>null'),
  './ChatbotMessageContent': moduleUrl(`import React from '${reactUrl}';export const ChatbotMessageContent=({content})=>React.createElement('p',null,content)`),
  '../ai/AiSearchReview': moduleUrl('export const AiSearchReview=()=>null'),
  '../ai/RentalContextCard': moduleUrl(`import React from '${reactUrl}';export const RentalContextCard=({data})=>React.createElement('p',null,data.posts.map(item=>item.post.title).join(', '))`),
}
const { MapChatbot } = await import(reactDomModule(path.resolve('src/components/map/MapChatbot.tsx'), overrides))

async function environment() {
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://homeji.test', pretendToBeVisual: true })
  const keys = ['window', 'document', 'HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'navigator', 'Element', 'Node', 'Event', 'CustomEvent', 'MouseEvent', 'KeyboardEvent']
  const previous = new Map(keys.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
  for (const key of keys) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value: key === 'window' ? dom.window : dom.window[key] })
  dom.window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} })
  dom.window.requestAnimationFrame = callback => { callback(0); return 1 }
  dom.window.cancelAnimationFrame = () => {}
  dom.window.HTMLElement.prototype.scrollIntoView = () => {}
  globalThis.__chatFixture = { auth: { isAuthenticated: true, profile: { id: 'user-a' } }, requests: [], deleted: [], navigations: [], copied: [] }
  Object.defineProperty(dom.window.navigator, 'clipboard', { configurable: true, value: { writeText: async text => {
    if (globalThis.__chatFixture.clipboardFailure) throw new Error('Clipboard unavailable')
    globalThis.__chatFixture.copied.push(text)
  } } })
  const { createRoot } = await import('react-dom/client')
  const root = createRoot(document.getElementById('root'))
  return { root, async cleanup() {
    await act(() => root.unmount())
    dom.window.close()
    delete globalThis.__chatFixture
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else delete globalThis[key]
    }
  } }
}
const click = async element => act(async () => { element.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
const visibleLabel = element => {
  const clone = element.cloneNode(true)
  clone.querySelectorAll('[aria-hidden]').forEach(node => node.remove())
  return clone.textContent.trim()
}
const button = text => [...document.querySelectorAll('button')].find(element => element.getAttribute('aria-label') === text || visibleLabel(element) === text)
const composer = () => document.querySelector('[aria-label="Nhập tin nhắn cho Homeji"]')
const typeDraft = async (value, input = composer()) => act(async () => {
  Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value').set.call(input, value)
  input.dispatchEvent(new window.Event('input', { bubbles: true }))
})
const keydown = (element, options) => act(async () => element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...options })))
const focusableIn = panel => [...panel.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])')]
  .filter(element => !element.closest('[hidden]') && element.getAttribute('aria-hidden') !== 'true' && element.getClientRects().length > 0)
const roomA = { postId: 'room-a', title: 'Phòng A' }
const roomB = { postId: 'room-b', title: 'Phòng B' }
const render = async (root, props = {}) => {
  await act(async () => root.render(React.createElement(MapChatbot, { openRequestToken: 1, rentalContext: roomA, ...props })))
  if (props.openRequestToken !== 0 && !document.querySelector('[data-homeji-ai-panel="open"]')) {
    await act(async () => window.dispatchEvent(new CustomEvent('homeji-ai:toggle', { detail: { open: true } })))
  }
}
const reply = (request, content = 'Đã lấy dữ liệu phòng A') => ({
  conversationId: 'conversation', userMessage: { id: 'u', sender: 1, content: request.body.message },
  assistantMessage: { id: 'a', sender: 2, content }, actions: [], searchUpdate: null,
  rentalDecision: { posts: [{ post: { id: request.body.rentalContext?.postId, title: 'Dữ liệu A' } }], unavailablePostIds: [], summary: '' },
})

test('room task sends IDs only, retries without duplicating history and keeps reply context when selection changes', async () => {
  const env = await environment()
  try {
    await render(env.root)
    await click(button('Tính tiền tháng'))
    const first = globalThis.__chatFixture.requests[0]
    assert.deepEqual(first.body.rentalContext, { postId: 'room-a', task: 'cost' })
    assert.equal(JSON.stringify(first.body).includes('Phòng A'), false, 'Display title must stay out of provider request context')
    await act(async () => { first.reject(Error('Lỗi mạng')) })
    assert.match(document.body.textContent, /Lỗi mạng/)
    await click(button('Thử lại câu hỏi này'))
    const retry = globalThis.__chatFixture.requests[1]
    await act(async () => { retry.resolve(reply(retry)) })
    assert.equal(document.querySelectorAll('.map-chatbot__msg.is-user').length, 1)
    assert.match(document.body.textContent, /Dữ liệu A/)
    await render(env.root, { rentalContext: roomB })
    assert.equal(document.querySelector('.map-chatbot__context strong').textContent, 'Phòng B')
    assert.match(document.querySelector('.map-chatbot__msg.is-assistant').textContent, /Về phòng: Phòng A/)
  } finally { await env.cleanup() }
})

test('changing room or cancelling aborts the request and ignores its late result', async () => {
  const env = await environment()
  try {
    await render(env.root)
    await click(button('Những điều cần hỏi'))
    const first = globalThis.__chatFixture.requests[0]
    await render(env.root, { rentalContext: roomB })
    assert.equal(first.signal.aborted, true)
    await act(async () => { first.resolve(reply(first, 'Kết quả cũ không được hiện')) })
    assert.doesNotMatch(document.body.textContent, /Kết quả cũ không được hiện/)
    await click(button('Tính tiền tháng'))
    const second = globalThis.__chatFixture.requests[1]
    await click(button('Dừng chờ'))
    assert.equal(second.signal.aborted, true)
    await act(async () => { second.resolve(reply(second, 'Kết quả sau khi dừng')) })
    assert.doesNotMatch(document.body.textContent, /Kết quả sau khi dừng/)
    assert.equal(document.querySelectorAll('.map-chatbot__msg.is-user').length, 2)
  } finally { await env.cleanup() }
})

test('typing while pending stays editable and cancellation does not replace the new draft', async () => {
  const env = await environment()
  try {
    await render(env.root)
    const input = composer()
    await act(async () => {
      Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value').set.call(input, 'Phòng này có những phí gì?')
      input.dispatchEvent(new window.Event('input', { bubbles: true }))
    })
    await act(async () => { document.querySelector('.map-chatbot__form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })) })
    assert.equal(input.value, '')
    assert.equal(input.disabled, false)
    await act(() => {
      Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value').set.call(input, 'Tìm phòng dưới 3 triệu')
      input.dispatchEvent(new window.Event('input', { bubbles: true }))
    })
    await click(button('Dừng chờ'))
    assert.equal(input.value, 'Tìm phòng dưới 3 triệu')
    await act(() => document.querySelector('.map-chatbot__form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
    assert.equal(globalThis.__chatFixture.requests[1].body.rentalContext, undefined, 'An explicit new search must not inherit selected-room context')
  } finally { await env.cleanup() }
})

test('a failed typed question is restored when the user has not started another draft', async () => {
  const env = await environment()
  try {
    await render(env.root)
    const input = composer()
    await act(async () => {
      Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value').set.call(input, 'Phòng này có cọc không?')
      input.dispatchEvent(new window.Event('input', { bubbles: true }))
    })
    await act(async () => { document.querySelector('.map-chatbot__form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })) })
    const pending = globalThis.__chatFixture.requests[0]
    await act(async () => { pending.reject(Error('Mất kết nối')) })
    assert.equal(input.value, 'Phòng này có cọc không?')
    assert.match(document.querySelector('.map-chatbot__msg.is-user').textContent, /Phòng này có cọc không/)
  } finally { await env.cleanup() }
})

test('unmount aborts an in-flight chat request', async () => {
  const env = await environment()
  await render(env.root)
  await click(button('Tính tiền tháng'))
  const pending = globalThis.__chatFixture.requests[0]
  await env.cleanup()
  assert.equal(pending.signal.aborted, true)
})

test('assistant over a room modal wraps Tab and returns focus to its opener after Escape', async () => {
  const env = await environment()
  try {
    const modal = document.createElement('div')
    modal.className = 'room-detail'
    modal.setAttribute('aria-modal', 'true')
    const opener = document.createElement('button')
    modal.append(opener)
    document.body.append(modal)
    window.HTMLElement.prototype.getClientRects = () => [{ width: 100, height: 40 }]
    await render(env.root, { openRequestToken: 0 })
    opener.focus()
    await act(async () => { window.dispatchEvent(new CustomEvent('homeji-ai:toggle', { detail: { anchor: null, open: true } })) })
    const input = composer()
    const panel = document.querySelector('[data-homeji-ai-panel="open"]')
    const focusable = focusableIn(panel)
    assert.ok(focusable.length > 2)
    const first = focusable[0], last = focusable.at(-1)
    last.focus()
    await keydown(last, { key: 'Tab' })
    assert.equal(document.activeElement, first)
    await keydown(first, { key: 'Tab', shiftKey: true })
    assert.equal(document.activeElement, last)
    await keydown(input, { key: 'Escape' })
    assert.equal(document.querySelector('[data-homeji-ai-panel="open"]'), null)
    assert.equal(document.activeElement, opener)
    assert.equal(modal.isConnected, true)
  } finally { await env.cleanup() }
})

test('an old backend without grounded room data cannot present general text or global results as room facts', async () => {
  const env = await environment()
  try {
    await render(env.root)
    await click(button('Tính tiền tháng'))
    const pending = globalThis.__chatFixture.requests[0]
    const oldReply = { ...reply(pending, 'Tổng chi phí chắc chắn là 3 triệu'), rentalDecision: undefined,
      searchUpdate: { posts: [], criteria: {} } }
    await act(async () => { pending.resolve(oldReply) })
    assert.doesNotMatch(document.body.textContent, /Tổng chi phí chắc chắn là 3 triệu/)
    assert.match(document.body.textContent, /chưa nhận được dữ liệu của phòng đang chọn/)
    assert.equal(document.querySelectorAll('.map-chatbot__decision').length, 0)
    assert.equal(document.querySelectorAll('.map-chatbot__msg.is-user').length, 1)
  } finally { await env.cleanup() }
})

test('nested selection cleanup restores the underlying room and account changes re-register safely', async () => {
  const env = await environment()
  try {
    const contextOverrides = {
      './AuthContext': fixtureUrl,
      './AuthModalContext.logic': fixtureUrl,
      'react-router-dom': fixtureUrl,
      '../components/map/MapChatbot': moduleUrl(`import React from '${reactUrl}';export function MapChatbot(props){globalThis.__chatFixture.chatProps=props;return React.createElement('div',null,props.rentalContext?.title||'No context')}`),
      '../lib/rentalMessageDraft': moduleUrl('export const rentalMessageDraftStore={clearUser:id=>(globalThis.__chatFixture.cleared??=[]).push(id)}'),
    }
    const contextModule = reactDomModule(path.resolve('src/contexts/rental-assistant-context.tsx'), contextOverrides)
    const { useRentalAssistantSelection } = await import(contextModule)
    const { ChatbotProvider } = await import(reactDomModule(path.resolve('src/contexts/ChatbotContext.tsx'), contextOverrides))
    function Surface({ room }) { useRentalAssistantSelection(room); return null }
    const show = async (base, nested) => act(async () => env.root.render(React.createElement(ChatbotProvider, null,
      base ? React.createElement(Surface, { key: 'base', room: roomA }) : null,
      nested ? React.createElement(Surface, { key: 'nested', room: roomB }) : null)))
    await show(true, true)
    assert.equal(globalThis.__chatFixture.chatProps.rentalContext.postId, 'room-b')
    await show(false, true)
    assert.equal(globalThis.__chatFixture.chatProps.rentalContext.postId, 'room-b', 'Old cleanup must not remove the newer selection')
    await show(true, false)
    assert.equal(globalThis.__chatFixture.chatProps.rentalContext.postId, 'room-a')
    await show(true, true)
    await show(true, false)
    assert.equal(globalThis.__chatFixture.chatProps.rentalContext.postId, 'room-a', 'Closing a nested modal restores the map room')
    globalThis.__chatFixture.auth = { isAuthenticated: true, profile: { id: 'user-b' } }
    await show(true, false)
    assert.equal(globalThis.__chatFixture.chatProps.rentalContext.postId, 'room-a')
    assert.ok(globalThis.__chatFixture.cleared.includes('user-a'))
    await show(false, false)
    assert.equal(globalThis.__chatFixture.chatProps.rentalContext, null)
  } finally { await env.cleanup() }
})


test('multiline composer preserves Shift+Enter and IME input, then sends one explicit Enter request', async () => {
  const env = await environment()
  try {
    await render(env.root)
    const input = composer()
    assert.equal(input.tagName, 'TEXTAREA')
    assert.equal(input.rows, 2)
    assert.equal(input.maxLength, 1000)
    await typeDraft('Tìm phòng dưới 3 triệu\nGần trường và có bếp')
    await keydown(input, { key: 'Enter', shiftKey: true })
    await keydown(input, { key: 'Enter', isComposing: true })
    await keydown(input, { key: 'Enter', keyCode: 229 })
    assert.equal(globalThis.__chatFixture.requests.length, 0, 'Newline or composing must not submit')
    assert.equal(input.value, 'Tìm phòng dưới 3 triệu\nGần trường và có bếp')
    await keydown(input, { key: 'Enter' })
    assert.equal(globalThis.__chatFixture.requests.length, 1)
    assert.equal(globalThis.__chatFixture.requests[0].body.message, 'Tìm phòng dưới 3 triệu\nGần trường và có bếp')
    assert.equal(globalThis.__chatFixture.requests[0].body.rentalContext, undefined)
    assert.equal(button('Cuộc trò chuyện mới').disabled, true)
  } finally { await env.cleanup() }
})

test('expanding and shrinking preserves the draft, room and messages, and expanded focus wraps', async () => {
  const env = await environment()
  try {
    window.HTMLElement.prototype.getClientRects = () => [{ width: 100, height: 40 }]
    await render(env.root)
    await click(button('Tính tiền tháng'))
    const request = globalThis.__chatFixture.requests[0]
    await act(async () => request.resolve(reply(request)))
    await typeDraft('Câu hỏi đang soạn\nChưa gửi')
    await click(button('Mở rộng cuộc trò chuyện'))
    const shrink = button('Thu gọn cuộc trò chuyện')
    assert.equal(shrink.getAttribute('aria-pressed'), 'true')
    const panel = document.querySelector('[data-homeji-ai-panel="open"]')
    assert.equal(panel.getAttribute('aria-modal'), 'true')
    const nodes = focusableIn(panel)
    nodes.at(-1).focus()
    await keydown(nodes.at(-1), { key: 'Tab' })
    assert.equal(document.activeElement, nodes[0])
    await keydown(nodes[0], { key: 'Tab', shiftKey: true })
    assert.equal(document.activeElement, nodes.at(-1))
    await click(shrink)
    assert.equal(button('Mở rộng cuộc trò chuyện').getAttribute('aria-pressed'), 'false')
    assert.equal(composer().value, 'Câu hỏi đang soạn\nChưa gửi')
    assert.equal(document.querySelectorAll('.map-chatbot__msg.is-user').length, 1)
    assert.match(document.querySelector('.map-chatbot__context').textContent, /Phòng A/)
    assert.equal(globalThis.__chatFixture.requests.length, 1, 'Layout changes must not send a message')
  } finally { await env.cleanup() }
})

test('tools open real sections without making an assistant request', async () => {
  const env = await environment()
  try {
    const opened = []
    const entries = [['Tìm phòng', 'listings'], ['Phòng đã lưu', 'saved'], ['Tin nhắn', 'messages'], ['Chợ Homeji', 'marketplace'], ['Lịch xem phòng', 'appointments']]
    for (const [index, [label, section]] of entries.entries()) {
      await render(env.root, { openRequestToken: index + 1, onOpenSection: value => opened.push(value) })
      const tools = button('Công cụ')
      if (tools.getAttribute('aria-expanded') !== 'true') await click(tools)
      assert.equal(tools.getAttribute('aria-expanded'), 'true')
      await click(button(label))
      assert.equal(opened.at(-1), section)
      assert.equal(document.querySelector('[data-homeji-ai-panel="open"]'), null)
    }
    assert.deepEqual(opened, entries.map(([, section]) => section))
    assert.equal(globalThis.__chatFixture.requests.length, 0)
  } finally { await env.cleanup() }
})

test('new conversation requires confirmation, clears local criteria and draft, and keeps the selected room', async () => {
  const env = await environment()
  try {
    await render(env.root)
    await typeDraft('Tìm phòng dưới 3 triệu')
    await keydown(composer(), { key: 'Enter' })
    const first = globalThis.__chatFixture.requests[0]
    await act(async () => first.resolve({ ...reply(first, 'Đã tìm phòng'), rentalDecision: null, searchUpdate: { posts: [], criteria: { maxPrice: 3000000 } } }))
    await typeDraft('Bản nháp chưa gửi')
    await click(button('Cuộc trò chuyện mới'))
    assert.equal(document.querySelectorAll('.map-chatbot__msg.is-user').length, 1, 'Opening confirmation must not clear the session')
    assert.equal(composer().value, 'Bản nháp chưa gửi')
    await click(button('Giữ cuộc trò chuyện'))
    assert.equal(button('Bắt đầu cuộc trò chuyện mới'), undefined)
    assert.equal(composer().value, 'Bản nháp chưa gửi')
    await click(button('Cuộc trò chuyện mới'))
    await click(button('Bắt đầu cuộc trò chuyện mới'))
    assert.equal(document.querySelectorAll('.map-chatbot__msg.is-user').length, 0)
    assert.equal(composer().value, '')
    assert.match(document.querySelector('.map-chatbot__context').textContent, /Phòng A/)
    assert.deepEqual(globalThis.__chatFixture.deleted, [], 'Starting a local session must never delete saved history')
    await typeDraft('Tìm phòng có bếp')
    await keydown(composer(), { key: 'Enter' })
    const next = globalThis.__chatFixture.requests[1]
    assert.equal(next.body.previousCriteria, undefined)
    assert.equal(next.body.conversationId, undefined)
  } finally { await env.cleanup() }
})

test('new conversation leaves saved server history intact and drops its active conversation ID', async () => {
  const env = await environment()
  try {
    globalThis.__chatFixture.config = { historyStorageEnabled: true }
    await render(env.root)
    const consent = document.querySelector('.map-chatbot__privacy input[type="checkbox"]')
    await click(consent)
    await click(button('Tính tiền tháng'))
    const first = globalThis.__chatFixture.requests[0]
    assert.equal(first.body.saveHistory, true)
    await act(async () => first.resolve(reply(first)))
    await click(button('Cuộc trò chuyện mới'))
    await click(button('Bắt đầu cuộc trò chuyện mới'))
    assert.deepEqual(globalThis.__chatFixture.deleted, [])
    await click(button('Tính tiền tháng'))
    const next = globalThis.__chatFixture.requests[1]
    assert.equal(next.body.saveHistory, true, 'Resetting local state must not silently revoke or grant consent')
    assert.equal(next.body.conversationId, undefined)
    assert.deepEqual(next.body.rentalContext, { postId: 'room-a', task: 'cost' })
  } finally { await env.cleanup() }
})

test('copy answer reports clipboard success and failure without sending again', async () => {
  const env = await environment()
  try {
    await render(env.root)
    await click(button('Tính tiền tháng'))
    const request = globalThis.__chatFixture.requests[0]
    await act(async () => request.resolve(reply(request, 'Nội dung cần sao chép')))
    await click(button('Sao chép câu trả lời'))
    assert.deepEqual(globalThis.__chatFixture.copied, ['Nội dung cần sao chép'])
    assert.match([...document.querySelectorAll('[role="status"]')].map(node => node.textContent).join(' '), /Đã sao chép/)
    globalThis.__chatFixture.clipboardFailure = true
    await click(button('Sao chép câu trả lời'))
    assert.match([...document.querySelectorAll('[role="status"], [role="alert"]')].map(node => node.textContent).join(' '), /không thể|chưa thể|chưa sao chép|không sao chép/i)
    assert.equal(globalThis.__chatFixture.requests.length, 1)
  } finally { await env.cleanup() }
})


test('starter cards and suggested prompts prepare an editable draft without calling the assistant', async () => {
  const env = await environment()
  try {
    globalThis.__chatFixture.config = { suggestedPrompts: ['Tìm phòng có bếp ở Thủ Đức'] }
    await render(env.root, { rentalContext: null })
    const cards = [...document.querySelectorAll('.homeji-assistant__starters button')]
    assert.equal(cards.length, 4)
    for (const card of cards) {
      await click(card)
      assert.ok(composer().value.length > 0)
      assert.equal(document.activeElement, composer())
      assert.equal(globalThis.__chatFixture.requests.length, 0)
    }
    await click(button('Tìm phòng có bếp ở Thủ Đức'))
    assert.equal(composer().value, 'Tìm phòng có bếp ở Thủ Đức')
    await typeDraft('Tìm phòng có bếp ở Thủ Đức, dưới 4 triệu')
    assert.equal(composer().value, 'Tìm phòng có bếp ở Thủ Đức, dưới 4 triệu')
    assert.equal(globalThis.__chatFixture.requests.length, 0)
  } finally { await env.cleanup() }
})


test('follow-up prepares a room-specific editable draft without claiming hidden conversation memory', async () => {
  const env = await environment()
  try {
    await render(env.root)
    await click(button('Tính tiền tháng'))
    const request = globalThis.__chatFixture.requests[0]
    await act(async () => request.resolve(reply(request)))
    await click(button('Hỏi tiếp'))
    assert.match(composer().value, /phòng này/)
    assert.equal(globalThis.__chatFixture.requests.length, 1)
    await typeDraft(composer().value + 'điện được tính theo đơn vị nào?')
    await keydown(composer(), { key: 'Enter' })
    assert.deepEqual(globalThis.__chatFixture.requests[1].body.rentalContext, { postId: 'room-a', task: undefined })
  } finally { await env.cleanup() }
})


test('mobile expanded panel follows the available visual viewport without losing an unsent draft', async () => {
  const env = await environment()
  try {
    const viewport = Object.assign(new window.EventTarget(), { width: 390, height: 600, offsetTop: 0 })
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport })
    window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} })
    await render(env.root)
    await typeDraft('Câu hỏi còn đang soạn')
    await click(button('Mở rộng cuộc trò chuyện'))
    const panel = document.querySelector('[data-homeji-ai-panel="open"]')
    assert.equal(parseFloat(panel.style.width), 390)
    assert.equal(parseFloat(panel.style.height), 600)
    await act(async () => {
      viewport.height = 320
      viewport.offsetTop = 180
      viewport.dispatchEvent(new Event('resize'))
    })
    assert.equal(parseFloat(panel.style.top), 180)
    assert.equal(parseFloat(panel.style.height), 320)
    assert.equal(composer().value, 'Câu hỏi còn đang soạn')
    assert.equal(globalThis.__chatFixture.requests.length, 0)
  } finally { await env.cleanup() }
})

test('following an old room answer reopens that room instead of sending against the newly selected room', async () => {
  const env = await environment()
  try {
    await render(env.root)
    await click(button('Tính tiền tháng'))
    const request = globalThis.__chatFixture.requests[0]
    await act(async () => request.resolve(reply(request)))
    await render(env.root, { rentalContext: roomB })
    assert.equal(button('Hỏi tiếp'), undefined)
    await click(button('Mở lại phòng để hỏi tiếp'))
    assert.deepEqual(globalThis.__chatFixture.navigations, ['/?post=room-a'])
    assert.equal(globalThis.__chatFixture.requests.length, 1)
    assert.equal(composer().value, '')
  } finally { await env.cleanup() }
})

test('expanded modal isolates background containing hidden dialogs and restores its prior inert state', async () => {
  const env = await environment()
  try {
    const background = document.createElement('main')
    background.innerHTML = '<aside role="dialog" aria-hidden="true"></aside><button>Background</button>'
    const alreadyInert = document.createElement('section')
    alreadyInert.setAttribute('inert', '')
    document.body.append(background, alreadyInert)
    await render(env.root)
    await click(button('Mở rộng cuộc trò chuyện'))
    assert.equal(background.hasAttribute('inert'), true)
    assert.equal(alreadyInert.hasAttribute('inert'), true)
    await click(button('Đóng Homeji'))
    assert.equal(background.hasAttribute('inert'), false)
    assert.equal(alreadyInert.hasAttribute('inert'), true)
  } finally { await env.cleanup() }
})

test('a deferred disabled configuration releases mobile modal locks and published visibility', async () => {
  const env = await environment()
  try {
    let resolveConfig
    globalThis.__chatFixture.configPromise = new Promise(resolve => { resolveConfig = resolve })
    window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} })
    document.body.style.overflow = 'scroll'
    const background = document.createElement('main')
    document.body.append(background)
    const states = []
    await render(env.root, { onOpenChange: open => states.push(open) })
    await click(button('Mở rộng cuộc trò chuyện'))
    assert.equal(document.body.style.overflow, 'hidden')
    assert.equal(background.hasAttribute('inert'), true)
    await act(async () => resolveConfig({ enabled: false, suggestedPrompts: [] }))
    assert.equal(document.querySelector('[data-homeji-ai-panel="open"]'), null)
    assert.equal(background.hasAttribute('inert'), false)
    assert.equal(document.body.style.overflow, 'scroll')
    assert.equal(states.at(-1), false)
  } finally { await env.cleanup() }
})
