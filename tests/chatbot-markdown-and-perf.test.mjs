import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import React, { act } from 'react'
import { JSDOM } from 'jsdom'
import { reactDomModule } from './helpers/react-dom-module.mjs'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const { ChatbotMessageContent } = await import(
  reactDomModule(path.resolve('src/components/map/ChatbotMessageContent.tsx'))
)
const { AgentGoalBar } = await import(
  reactDomModule(path.resolve('src/components/ai/AgentGoalBar.tsx'))
)
const { AgentModeSwitch } = await import(
  reactDomModule(path.resolve('src/components/ai/AgentModeSwitch.tsx'), {
    '../../api': 'data:text/javascript;base64,' + Buffer.from('export const getMySubscription = async () => ({ isPremium: false })').toString('base64'),
  })
)

function mountDom(fn) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://homeji.test', pretendToBeVisual: true })
  const keys = ['window', 'document', 'HTMLElement', 'navigator', 'Element', 'Node', 'Event', 'MouseEvent', 'KeyboardEvent']
  const prev = new Map(keys.map(k => [k, Object.getOwnPropertyDescriptor(globalThis, k)]))
  for (const k of keys) {
    Object.defineProperty(globalThis, k, { configurable: true, writable: true, value: k === 'window' ? dom.window : dom.window[k] })
  }
  return fn(dom).finally(() => {
    dom.window.close()
    for (const [k, d] of prev) {
      if (d) Object.defineProperty(globalThis, k, d)
      else delete globalThis[k]
    }
  })
}

test('ChatbotMessageContent, AgentGoalBar and AgentModeSwitch are wrapped with React.memo', () => {
  const memoSymbol = Symbol.for('react.memo')
  assert.equal(ChatbotMessageContent.$$typeof, memoSymbol)
  assert.equal(AgentGoalBar.$$typeof, memoSymbol)
  assert.equal(AgentModeSwitch.$$typeof, memoSymbol)
})

test('ChatbotMessageContent renders h4 markdown heading, safe italics without math collision, and trims trailing punctuation from bare URLs', async () => {
  await mountDom(async () => {
    const { createRoot } = await import('react-dom/client')
    const root = createRoot(document.getElementById('root'))
    const sample = [
      '#### Mục tiêu chi tiết',
      '',
      'Ưu tiên *gần ĐH FPT* và giữ **ngân sách rõ ràng** (`3tr/tháng`).',
      'Công thức 2 * 3 = 6 hoặc 3*4*5 không biến thành chữ nghiêng.',
      'Xem chi tiết tại https://homeji.vn/rooms?id=12.',
      'Hoặc trong ngoặc (https://homeji.vn/map).',
      'Không tạo link từ javascript:alert(1).',
    ].join('\n')

    await act(async () => {
      root.render(React.createElement(ChatbotMessageContent, { content: sample }))
    })

    const h5 = document.querySelector('h5')
    assert.ok(h5)
    assert.equal(h5.textContent, 'Mục tiêu chi tiết')

    const ems = [...document.querySelectorAll('em')].map(el => el.textContent)
    assert.deepEqual(ems, ['gần ĐH FPT'])

    const strong = document.querySelector('strong')
    assert.equal(strong?.textContent, 'ngân sách rõ ràng')

    const code = document.querySelector('code')
    assert.equal(code?.textContent, '3tr/tháng')

    const links = [...document.querySelectorAll('a')].map(a => a.getAttribute('href'))
    assert.deepEqual(links, ['https://homeji.vn/rooms?id=12', 'https://homeji.vn/map'])
    assert.match(document.body.textContent, /https:\/\/homeji\.vn\/rooms\?id=12\./)
    assert.match(document.body.textContent, /\(https:\/\/homeji\.vn\/map\)\./)
    assert.doesNotMatch(links.join(' '), /javascript:/i)

    await act(async () => root.unmount())
  })
})
