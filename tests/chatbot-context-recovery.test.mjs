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
export const getChatbotPopupConfig=async()=>({enabled:true,greeting:'Chào bạn',suggestedPrompts:[]});
export const deleteChatbotConversation=async()=>{};
export const sendChatbotMessage=(body,signal)=>new Promise((resolve,reject)=>globalThis.__chatFixture.requests.push({body,signal,resolve,reject}));
export const useAuth=()=>globalThis.__chatFixture.auth;
export const useAuthModal=()=>({isOpen:false,openAuthModal:()=>{}});
export const useNavigate=()=>()=>{};
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
  const keys = ['window', 'document', 'HTMLElement', 'HTMLInputElement', 'Element', 'Node', 'Event', 'CustomEvent', 'MouseEvent', 'KeyboardEvent']
  const previous = new Map(keys.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
  for (const key of keys) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value: key === 'window' ? dom.window : dom.window[key] })
  dom.window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} })
  dom.window.requestAnimationFrame = callback => { callback(0); return 1 }
  dom.window.cancelAnimationFrame = () => {}
  dom.window.HTMLElement.prototype.scrollIntoView = () => {}
  globalThis.__chatFixture = { auth: { isAuthenticated: true, profile: { id: 'user-a' } }, requests: [] }
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
const button = text => [...document.querySelectorAll('button')].find(element => element.textContent.trim() === text)
const roomA = { postId: 'room-a', title: 'Phòng A' }
const roomB = { postId: 'room-b', title: 'Phòng B' }
const render = (root, props = {}) => act(async () => { root.render(React.createElement(MapChatbot, { openRequestToken: 1, rentalContext: roomA, ...props })) })
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
    const input = document.querySelector('input[aria-label="Nhập tin nhắn cho Homeji"]')
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, 'Phòng này có những phí gì?')
      input.dispatchEvent(new window.Event('input', { bubbles: true }))
    })
    await act(async () => { document.querySelector('.map-chatbot__form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })) })
    assert.equal(input.value, '')
    assert.equal(input.disabled, false)
    await act(() => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, 'Tìm phòng dưới 3 triệu')
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
    const input = document.querySelector('input[aria-label="Nhập tin nhắn cho Homeji"]')
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, 'Phòng này có cọc không?')
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
    const input = document.querySelector('input[aria-label="Nhập tin nhắn cho Homeji"]')
    const close = document.querySelector('.map-chatbot__close')
    input.focus()
    await act(async () => { input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })) })
    assert.equal(document.activeElement, close)
    await act(async () => { close.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })) })
    assert.equal(document.activeElement, input)
    await act(async () => { input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })) })
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
