import assert from 'node:assert/strict'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import React, { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { JSDOM } from 'jsdom'
import { reactDomModule } from './helpers/react-dom-module.mjs'
import { THEMES, tokenContrast } from './helpers/theme-tokens.mjs'

const stub = code => 'data:text/javascript;base64,' + Buffer.from(code).toString('base64')
const { PageFrame } = await import(reactDomModule(fileURLToPath(new URL('../src/components/chrome/PageFrame.tsx', import.meta.url))))
const { MessagesInbox } = await import(reactDomModule(fileURLToPath(new URL('../src/components/map/messages/MessagesInbox.tsx', import.meta.url)), {
  '../../skeletons/PageSkeletons': stub('export const ConversationListSkeleton = () => null'),
  '../ChatExtras': stub('export const PremiumBadge = () => null'),
  './MessagePrimitives': stub('export const Avatar = () => null'),
  './MessageFormatting': stub('export const conversationPreview = () => ""; export const relativeTime = () => ""; export const subjectTag = {}'),
  './tabLensMotion': stub('export const createTabLensMotion = () => ({ moveTo() {}, stop() {}, dispose() {} }); export const tabsTrackWidth = () => 0'),
  '../../lib/observeElementResize': stub('export const observeElementResize = () => () => {}'),
}))

test('inbox tabs wrap with arrows, support Home/End, and label the results panel', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' })
  const keys = ['window', 'document', 'HTMLElement', 'Element', 'requestAnimationFrame', 'cancelAnimationFrame', 'IS_REACT_ACT_ENVIRONMENT']
  const previous = keys.map(key => Object.getOwnPropertyDescriptor(globalThis, key))
  for (const key of keys) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value:
    key === 'IS_REACT_ACT_ENVIRONMENT' ? true : key === 'requestAnimationFrame' ? () => 1 : key === 'cancelAnimationFrame' ? () => {} : dom.window[key] })
  dom.window.HTMLElement.prototype.scrollIntoView = () => {}
  const root = createRoot(dom.window.document.getElementById('root'))
  function Harness() {
    const [filter, setFilter] = useState('all')
    return React.createElement(MessagesInbox, {
      isWorkspace: true, isFloatingThread: false, isFloatingInbox: false, threadVisible: false,
      inboxSearchRef: { current: null }, inboxQuery: '', onInboxQueryChange() {}, onInboxFocus() {},
      inboxFilter: filter, onFilterChange: setFilter, unreadTotal: 2, loading: false,
      filteredConversations: [], conversations: [], activeId: null, onOpenThread() {},
    })
  }
  try {
    await act(async () => root.render(React.createElement(Harness)))
    const tabs = [...dom.window.document.querySelectorAll('[role="tab"]')]
    const panel = dom.window.document.querySelector('[role="tabpanel"]')
    const check = index => {
      assert.equal(tabs.filter(tab => tab.tabIndex === 0).length, 1)
      assert.equal(tabs[index].tabIndex, 0)
      assert.equal(tabs[index].getAttribute('aria-selected'), 'true')
      assert.equal(tabs[index].getAttribute('aria-controls'), panel.id)
      assert.equal(panel.getAttribute('aria-labelledby'), tabs[index].id)
    }
    check(0)
    tabs[0].focus()
    for (const [key, expected] of [['ArrowRight', 1], ['ArrowRight', 2], ['ArrowRight', 0], ['ArrowLeft', 2], ['Home', 0], ['End', 2]]) {
      await act(async () => dom.window.document.activeElement.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key, bubbles: true })))
      check(expected)
      assert.equal(dom.window.document.activeElement, tabs[expected])
    }
    await act(async () => tabs[1].click())
    check(1)
  } finally {
    await act(async () => root.unmount())
    dom.window.close()
    keys.forEach((key, index) => previous[index] ? Object.defineProperty(globalThis, key, previous[index]) : delete globalThis[key])
  }
})

test('member focus ring token contrasts with input and elevated surfaces in both themes', () => {
  for (const theme of THEMES) for (const surface of ['--surface', '--surface-input', '--surface-elevated', '--surface-muted']) {
    assert.ok(tokenContrast('--maps-blue', surface, theme) >= 3, `${theme} ${surface}`)
  }
})

test('page chrome retains its style while delegating the h1 to a section with its own title', () => {
  const standalone = new JSDOM(renderToStaticMarkup(React.createElement(PageFrame, { title: 'Tin tìm phòng' }, '')))
  const embedded = new JSDOM(renderToStaticMarkup(React.createElement(PageFrame, { title: 'Chợ Homeji', bleed: true }, React.createElement('h1', null, 'Ví Homeji'))))
  try {
    assert.equal(standalone.window.document.querySelectorAll('h1').length, 1)
    assert.equal(embedded.window.document.querySelectorAll('h1').length, 1)
    assert.equal(embedded.window.document.querySelector('h1').textContent, 'Ví Homeji')
    assert.equal(embedded.window.document.querySelector('p.page-frame__title').textContent, 'Chợ Homeji')
  } finally {
    standalone.window.close()
    embedded.window.close()
  }
})
