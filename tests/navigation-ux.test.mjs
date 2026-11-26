import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import React, { act } from 'react'
import { JSDOM } from 'jsdom'
import ts from 'typescript'
import { reactDomModule } from './helpers/react-dom-module.mjs'

const moduleUrl = source => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64')
const types = reactDomModule('src/api/types.ts')
const { NotificationType } = await import(types)
const { notificationTargetHref } = await import(reactDomModule('src/lib/notificationTarget.ts', { '../api': types }))
const { mapSectionDeepLink } = await import(reactDomModule('src/lib/mapDeepLinks.ts'))
const { isExploreNavigationActive } = await import(reactDomModule('src/components/chrome/exploreMode.ts'))

test('message and order notifications preserve the referenced entity without query injection', () => {
  for (const type of [NotificationType.NewMessage, NotificationType.DirectMessage]) {
    const url = new URL(notificationTargetHref({ type, relatedEntityId: 'thread&section=profile' }), 'https://homeji.test')
    assert.equal(url.searchParams.get('section'), 'messages')
    assert.equal(url.searchParams.get('conversation'), 'thread&section=profile')
    assert.equal(new URL(notificationTargetHref({ type }), url).searchParams.has('conversation'), false)
  }
  const url = new URL(notificationTargetHref({ type: NotificationType.MarketplaceOrderUpdated, relatedEntityId: 'order-1' }), 'https://homeji.test')
  assert.equal(url.searchParams.get('market'), 'purchases')
  assert.equal(url.searchParams.get('purchase'), 'order-1')
  assert.equal(url.searchParams.get('notificationOrder'), 'order-1')
})

test('roommate section redirect keeps requested tab and search', () => {
  const params = new URL(mapSectionDeepLink('invitations', '?roommateTab=invitations&roommateQuery=Thu%20Duc'), 'https://homeji.test').searchParams
  assert.equal(params.get('roommateTab'), 'invitations')
  assert.equal(params.get('roommateQuery'), 'Thu Duc')
  assert.match(readFileSync('src/App.tsx', 'utf8'), /path="\/roommates" element=\{<ProtectedRoute><MapHomeSectionRedirect section="invitations"/)
})

test('desktop and mobile share the explore matcher for aliases, list and map', () => {
  for (const search of ['?section=explore', '?section=listings&view=list', '?section=listings', '?post=1']) {
    assert.equal(isExploreNavigationActive('/', search), true)
  }
  assert.equal(isExploreNavigationActive('/', '?section=messages'), false)
  assert.equal(isExploreNavigationActive('/login', '?section=explore'), false)
})

test('marketplace Back resolves the default tab and notification ownership focuses either side', async () => {
  const source = ts.transpileModule(readFileSync('src/pages/MarketplacePage.tsx', 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.React },
  }).outputText
  const { resolveMarketplaceDestination } = await import(reactDomModule('src/lib/marketplaceNavigation.ts'))
  const syncStart = source.indexOf('if (previousSearch !==')
  const sync = source.slice(syncStart, source.indexOf('useEffect(', syncStart))
  const run = new Function('previousSearch', 'searchParams', 'destination', 'setPreviousSearch', 'setTab', sync)
  const params = new URLSearchParams('section=marketplace')
  let tab = 'browse'
  run('section=marketplace&market=browse', params, resolveMarketplaceDestination(params), () => {}, next => { tab = next })
  assert.equal(tab, 'food')
  const start = source.indexOf("    const id = searchParams.get('notificationOrder')")
  const ownership = source.slice(start, source.indexOf('}, [orders,', start))
  const route = new Function('searchParams', 'orders', 'myUserId', 'setSearchParams', ownership)
  for (const [user, side, focus] of [['buyer', 'purchases', 'purchase'], ['seller', 'sales', 'sale']]) {
    let destination
    route(new URLSearchParams('market=purchases&purchase=order-1&notificationOrder=order-1'),
      [{ id: 'order-1', buyerId: 'buyer', sellerId: 'seller' }], user,
      (next, options) => { destination = next; assert.equal(options.replace, true) })
    assert.equal(destination.get('market'), side)
    assert.equal(destination.get(focus), 'order-1')
    assert.equal(destination.has('notificationOrder'), false)
  }
  route(new URLSearchParams('notificationOrder=missing'), [], 'buyer', () => assert.fail('wait for orders'))
})

test('reset success disables resubmission, replaces history, and cancels on unmount', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://homeji.test/#access_token=fixture' })
  globalThis.window = dom.window
  globalThis.document = dom.window.document
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  const timers = new Map()
  let nextTimer = 0
  window.setTimeout = callback => { timers.set(++nextTimer, callback); return nextTimer }
  window.clearTimeout = id => timers.delete(id)
  globalThis.__resetCalls = 0
  globalThis.__resetNavigations = []
  const fixture = moduleUrl(`
    export const resetPassword = async () => { globalThis.__resetCalls++; return { message: 'OK' } };
    export const getStoredSession = () => ({});
    export const useAuth = () => ({});
    export const useNavigate = () => navigate;
    const navigate = (...args) => globalThis.__resetNavigations.push(args);
    export const Link = () => null;
    export const PageNotice = () => null;
  `)
  const { ResetPasswordPage } = await import(reactDomModule('src/pages/ResetPasswordPage.tsx', {
    '../api': fixture, '../contexts/AuthContext': fixture,
    'react-router-dom': fixture, '../components/toast/PageNotice': fixture,
    '../lib/errors': moduleUrl('export const getErrorMessage = (error, fallback) => error?.message || fallback'),
  }))
  const { createRoot } = await import('react-dom/client')
  let root = createRoot(document.getElementById('root'))
  const submit = () => document.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }))
  try {
    await act(async () => root.render(React.createElement(ResetPasswordPage)))
    await act(async () => submit())
    assert.equal(document.querySelector('button').disabled, true)
    await act(async () => submit())
    assert.equal(__resetCalls, 1)
    assert.equal(timers.size, 1)
    await act(async () => root.unmount())
    assert.equal(timers.size, 0)
    assert.equal(__resetNavigations.length, 0)
    root = createRoot(document.getElementById('root'))
    await act(async () => root.render(React.createElement(ResetPasswordPage)))
    await act(async () => submit())
    await act(async () => [...timers.values()][0]())
    assert.deepEqual(__resetNavigations, [['/login', { replace: true }]])
  } finally {
    await act(async () => root.unmount())
    dom.window.close()
    delete globalThis.window
    delete globalThis.document
    delete globalThis.__resetCalls
    delete globalThis.__resetNavigations
  }
})

test('presence responds to reduced motion while entering and exiting', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://homeji.test' })
  globalThis.window = dom.window
  globalThis.document = dom.window.document
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  let reduced = false
  const listeners = new Set()
  window.matchMedia = () => ({
    matches: reduced,
    addEventListener: (_, listener) => listeners.add(listener),
    removeEventListener: (_, listener) => listeners.delete(listener),
  })
  globalThis.__presenceAnimations = []
  const { useMotionPresence } = await import(reactDomModule('src/components/motion/useMotionPresence.ts', {
    'motion/react': moduleUrl(`export function animate(node) {
      node.style.transform = 'translateY(16px)';
      const controls = { stopped: false, stop() { this.stopped = true }, then() {} };
      globalThis.__presenceAnimations.push(controls); return controls;
    }`),
  }))
  const { createRoot } = await import('react-dom/client')
  const root = createRoot(document.getElementById('root'))
  function Surface({ open }) {
    const { present, ref } = useMotionPresence(open)
    return present ? React.createElement('div', { ref, id: 'surface' }) : null
  }
  try {
    await act(async () => root.render(React.createElement(Surface, { open: true })))
    assert.equal(__presenceAnimations.length, 1)
    await act(async () => { reduced = true; listeners.forEach(listener => listener()) })
    assert.equal(__presenceAnimations[0].stopped, true)
    assert.equal(document.getElementById('surface').style.transform, '')
    await act(async () => root.render(React.createElement(Surface, { open: false })))
    assert.equal(document.getElementById('surface'), null)
    await act(async () => root.render(React.createElement(Surface, { open: true })))
    assert.equal(__presenceAnimations.length, 1)
    await act(async () => { reduced = false; listeners.forEach(listener => listener()) })
    await act(async () => root.render(React.createElement(Surface, { open: false })))
    assert.ok(document.getElementById('surface'))
    await act(async () => { reduced = true; listeners.forEach(listener => listener()) })
    assert.equal(document.getElementById('surface'), null)
  } finally {
    await act(async () => root.unmount())
    assert.equal(listeners.size, 0)
    dom.window.close()
    delete globalThis.__presenceAnimations
    delete globalThis.window
    delete globalThis.document
  }
})

test('mobile query navigation marks exactly the messages destination current', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://homeji.test' })
  globalThis.window = dom.window
  globalThis.document = dom.window.document
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  const { MobileTabBar } = await import(reactDomModule('src/components/layout/MobileTabBar.tsx', {
    '../../contexts/AuthContext': moduleUrl('export const useAuth = () => ({ isAuthenticated: true })'),
  }))
  const { MemoryRouter } = await import('react-router-dom')
  const { createRoot } = await import('react-dom/client')
  const root = createRoot(document.getElementById('root'))
  try {
    await act(async () => root.render(React.createElement(MemoryRouter, { initialEntries: ['/?section=messages'] }, React.createElement(MobileTabBar))))
    const current = document.querySelectorAll('[aria-current="page"]')
    assert.equal(current.length, 1)
    assert.equal(current[0].getAttribute('href'), '/?section=messages')
  } finally {
    await act(async () => root.unmount())
    dom.window.close()
    delete globalThis.window
    delete globalThis.document
  }
})

test('product dialog uses shared focus lifecycle and returns focus to its opener', async () => {
  const source = readFileSync('src/pages/MarketplacePage.tsx', 'utf8')
  assert.match(source, /useDialogFocus\(Boolean\(detailPost\), productDialogRef\)/)
  assert.match(source, /ref=\{productDialogRef\}\s+className="marketplace-detail-dialog"/)
  const dom = new JSDOM('<button id="opener">Open</button><div id="root"></div>')
  globalThis.window = dom.window
  globalThis.document = dom.window.document
  globalThis.HTMLElement = dom.window.HTMLElement
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  Object.defineProperty(HTMLElement.prototype, 'offsetParent', { get() { return this.parentElement } })
  const { useDialogFocus } = await import(reactDomModule('src/hooks/useDialogFocus.ts'))
  const { createRoot } = await import('react-dom/client')
  const root = createRoot(document.getElementById('root'))
  function Dialog({ open }) {
    const ref = React.useRef(null)
    useDialogFocus(open, ref)
    return open ? React.createElement('section', { ref },
      React.createElement('button', { id: 'first' }, 'Close'),
      React.createElement('button', { id: 'last' }, 'Buy')) : null
  }
  try {
    const opener = document.getElementById('opener')
    opener.focus()
    await act(async () => root.render(React.createElement(Dialog, { open: true })))
    assert.equal(document.activeElement.id, 'first')
    document.getElementById('last').focus()
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }))
    assert.equal(document.activeElement.id, 'first')
    await act(async () => root.render(React.createElement(Dialog, { open: false })))
    assert.equal(document.activeElement, opener)
  } finally {
    await act(async () => root.unmount())
    dom.window.close()
    delete globalThis.window
    delete globalThis.document
    delete globalThis.HTMLElement
  }
})
