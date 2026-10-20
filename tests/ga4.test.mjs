import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const policySource = await readFile(new URL('../src/lib/analyticsPolicy.ts', import.meta.url), 'utf8')
const gaSource = await readFile(new URL('../src/lib/ga4.ts', import.meta.url), 'utf8')
const publicSource = await readFile(new URL('../src/publicRentalAnalytics.ts', import.meta.url), 'utf8')
function compile(source) {
  return ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
}
function harness({ dnt = '0', gpc = false, ready = true } = {}) {
  const store = new Map(), sessions = new Map(), scripts = new Map(), listeners = new Map()
  const storage = map => ({ getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) })
  const context = vm.createContext({ exports: {}, URL, URLSearchParams, Date, Map, Set, console,
    navigator: { doNotTrack: dnt, globalPrivacyControl: gpc },
    localStorage: storage(store), sessionStorage: storage(sessions),
    Event: class { constructor(type) { this.type = type } },
    location: { origin: 'https://homeji.example', hostname: 'homeji.example' },
    document: { cookie: '', referrer: 'https://www.google.com/search?q=private',
      createElement: () => ({ remove() { scripts.delete(this.id) } }),
      getElementById: id => scripts.get(id), head: { appendChild: script => scripts.set(script.id, script) } },
  })
  context.window = context
  context.dispatchEvent = event => { for (const fn of listeners.get(event.type) ?? []) fn() }
  vm.runInContext(compile(policySource), context)
  const policy = { ...context.exports }
  context.exports = {}
  context.require = () => policy
  const source = gaSource.replaceAll('import.meta.env', JSON.stringify({ VITE_GA4_MEASUREMENT_ID: 'G-TEST123', VITE_GA4_MANUAL_PAGEVIEWS_READY: String(ready) }))
  vm.runInContext(compile(source), context)
  const api = context.exports
  const events = () => (context.dataLayer ?? []).map(args => Array.from(args)).filter(args => args[0] === 'event')
  return { api, policy, context, scripts, events }
}

test('public rental first opt-in records one view and consent UI rerenders do not inflate it', () => {
  let consent = 'unknown'
  const events = [], listeners = new Map()
  const element = () => ({ children: [], setAttribute() {}, replaceChildren() { this.children = [] }, append(...items) { this.children.push(...items) } })
  let panel
  const api = { ga4Configured: true, privacySignalEnabled: () => false,
    readAnalyticsConsent: () => consent, setAnalyticsPage() {},
    trackFunnelEvent: event => events.push(event),
    setAnalyticsConsent(value) { consent = value; listeners.get('homeji:analytics-consent')() },
  }
  const context = vm.createContext({ exports: {}, require: () => api,
    location: { pathname: '/rentals/22222222-2222-4222-8222-222222222221', search: '' },
    document: { createElement: element, body: { append(value) { panel = value } } },
    window: { addEventListener: (name, fn) => listeners.set(name, fn) },
  })
  vm.runInContext(compile(publicSource), context)
  assert.deepEqual(events, [])
  panel.children.find(child => child.textContent === 'Đồng ý thống kê').onclick()
  assert.deepEqual(events, ['rental_view'])
  assert.equal(panel.hidden, true)
  assert.equal(panel.children.length, 0)
  listeners.get('storage')()
  assert.equal(panel.hidden, true)
  api.setAnalyticsConsent('rejected')
  assert.equal(panel.hidden, true)
  api.setAnalyticsConsent('accepted')
  assert.deepEqual(events, ['rental_view'])
})

test('basic consent blocks tag and events until accepted; decline/revoke disables future events', () => {
  const h = harness()
  h.api.setAnalyticsPage('/', '')
  assert.equal(h.scripts.size, 0)
  h.api.setAnalyticsConsent('rejected')
  h.api.setAnalyticsPage('/', '')
  assert.equal(h.scripts.size, 0)
  h.api.setAnalyticsConsent('accepted')
  h.api.setAnalyticsPage('/', '')
  assert.equal(h.scripts.size, 1)
  assert.equal(h.events().length, 1)
  h.api.setAnalyticsConsent('rejected')
  h.api.trackFunnelEvent('rental_saved')
  h.api.setAnalyticsPage('/', '?post=private-room-id')
  assert.equal(h.scripts.size, 0)
  assert.equal(h.events().length, 0)
})

test('DNT/GPC and incomplete manual-history configuration block analytics despite consent', () => {
  for (const options of [{ dnt: '1' }, { gpc: true }, { ready: false }]) {
    const h = harness(options)
    h.api.setAnalyticsConsent('accepted')
    h.api.setAnalyticsPage('/', '')
    assert.equal(h.scripts.size, 0)
    assert.equal(h.events().length, 0)
  }
})

test('semantic pageviews ignore map filters, track room changes and suppress sensitive screens', () => {
  const h = harness()
  h.api.setAnalyticsConsent('accepted')
  h.api.setAnalyticsPage('/', '?utm_source=facebook&utm_campaign=october')
  h.api.setAnalyticsPage('/', '?lat=10.8&keyword=private-email@example.com')
  h.api.setAnalyticsPage('/', '?post=room-one&access_token=SECRET')
  h.api.setAnalyticsPage('/', '?post=room-one&zoom=17')
  h.api.setAnalyticsPage('/', '?post=room-two')
  assert.equal(h.events().filter(args => args[1] === 'page_view').length, 3)
  const serialized = JSON.stringify(h.context.dataLayer)
  for (const secret of ['SECRET', 'private-email', 'room-one', 'room-two', 'search?q=']) assert.ok(!serialized.includes(secret))
  assert.ok(serialized.includes('utm_source=facebook'))
  for (const path of ['/auth/callback', '/reset-password', '/admin', '/receipts']) {
    h.api.setAnalyticsPage(path, '?token=SECRET')
    h.api.trackFunnelEvent('rental_saved')
  }
  h.api.setAnalyticsPage('/', '?section=messages')
  h.api.trackFunnelEvent('rental_saved')
  assert.equal(h.events().length, 3)
})

test('funnel payload discards free text and retains search mode through saving and appointment', () => {
  const h = harness()
  h.api.setAnalyticsConsent('accepted'); h.api.setAnalyticsPage('/', '')
  h.api.trackFunnelEvent('rental_search', { search_mode: 'ai', result_count_bucket: '1-5', email: 'private@example.com', prompt: 'secret' })
  h.api.trackFunnelEvent('rental_saved')
  h.api.trackFunnelEvent('viewing_requested')
  assert.equal(h.events().at(-1)[2].search_mode, 'ai')
  assert.ok(!JSON.stringify(h.events()).includes('private@example'))
  assert.ok(!JSON.stringify(h.events()).includes('secret'))
})

test('purchase requires completed Premium from API, rejects topups/pending and deduplicates reloads', () => {
  const h = harness()
  h.api.setAnalyticsConsent('accepted'); h.api.setAnalyticsPage('/', '?section=payments&success=true')
  const payment = { id: '00000000-0000-0000-0000-000000000001', status: 1, purpose: 2, amount: 100000, paidAt: new Date().toISOString() }
  h.api.trackVerifiedPremiumPurchase(payment)
  h.api.trackVerifiedPremiumPurchase({ ...payment, status: 2, purpose: 3 })
  h.api.trackVerifiedPremiumPurchase({ ...payment, status: 2, paidAt: '2020-01-01T00:00:00Z' })
  assert.equal(h.events().filter(args => args[1] === 'purchase').length, 0)
  h.api.trackVerifiedPremiumPurchase({ ...payment, status: 2 })
  h.api.trackVerifiedPremiumPurchase({ ...payment, status: 2 })
  assert.equal(h.events().filter(args => args[1] === 'purchase').length, 1)
  assert.equal(h.events().at(-1)[2].currency, 'VND')
})

test('marketplace emits one gross checkout purchase for multiple server-confirmed lines', () => {
  const h = harness()
  h.api.setAnalyticsConsent('accepted'); h.api.setAnalyticsPage('/', '?section=marketplace')
  const checkoutId = '00000000-0000-0000-0000-000000000003'
  const orders = [1, 2].map(n => ({ id: `00000000-0000-0000-0000-00000000000${n}`, checkoutId, agreedPrice: n * 30000 }))
  h.api.trackVerifiedMarketplacePurchase(orders)
  h.api.trackVerifiedMarketplacePurchase(orders)
  const purchases = h.events().filter(args => args[1] === 'purchase')
  assert.equal(purchases.length, 1)
  assert.equal(purchases[0][2].value, 90000)
  assert.equal(purchases[0][2].items.length, 2)
})
