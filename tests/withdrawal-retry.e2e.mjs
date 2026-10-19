import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const { chromium } = createRequire(import.meta.url)(process.env.HOMEJI_PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.HOMEJI_THEME_TEST_URL || 'http://127.0.0.1:5510'
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local fixture only')
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
try {
  const context = await browser.newContext({ reducedMotion: 'reduce' })
  const id = '11111111-1111-4111-8111-111111111111'
  await context.addInitScript(id => { localStorage.setItem('homeji_access_token', 'wallet-fixture'); localStorage.setItem('homeji_user_id', id) }, id)
  const calls = [], errors = []
  let balance = 80000, debits = 0, failRefresh = false
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.origin !== new URL(base).origin) return route.abort()
    const path = url.pathname
    if (path.startsWith('/hubs/')) return route.fulfill({ status: 503, body: '' })
    if (!path.startsWith('/api/')) return route.continue()
    if (path === '/api/profile/me') return route.fulfill({ json: { id, displayName: 'Wallet fixture', role: 1, onboardingCompleted: true } })
    if (path === '/api/subscriptions/me') return route.fulfill({ json: { tier: 1, isPremium: false } })
    if (path === '/api/wallet') return failRefresh ? route.fulfill({ status: 503, json: { title: 'Refresh unavailable' } }) : route.fulfill({ json: { userId: id, balance, totalDeposited: 100000, totalSpent: 20000, totalEarned: 0, isActivated: true, minimumWithdrawalReserve: 20000 } })
    if (path === '/api/wallet/withdrawals' && route.request().method() === 'POST') {
      const data = route.request().postDataJSON(); calls.push(data)
      assert.match(data.requestId, /^[\da-f-]{36}$/)
      if (calls.length === 1) { debits++; balance -= data.amount; return route.abort('failed') }
      assert.equal(data.requestId, calls[0].requestId)
      failRefresh = true
      return route.fulfill({ json: { ...data, id: 'withdrawal-fixture', userId: id, status: 1, createdAt: new Date().toISOString() } })
    }
    if (path === '/api/chatbot/popup-config') return route.fulfill({ json: { enabled: false } })
    if (path === '/api/search-interests') return route.fulfill({ json: { settings: { enabled: false }, suggestions: [], following: [], rooms: [] } })
    return route.fulfill({ json: [] })
  })
  const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message))
  const fill = async () => {
    await page.locator('#wallet-panel-withdraw').waitFor()
    await page.getByLabel('Tên ngân hàng', { exact: true }).fill('Audit Bank')
    await page.getByLabel('Số tài khoản', { exact: true }).fill('123456789')
    await page.getByLabel('Tên chủ tài khoản', { exact: true }).fill('AUDIT USER')
    await page.getByLabel(/^Số tiền muốn rút/).fill('50000')
  }
  await page.goto(base + '/?section=marketplace&market=wallet&wallet=withdraw')
  await fill(); await page.getByRole('button', { name: 'Gửi yêu cầu rút tiền', exact: true }).click()
  await page.locator('#wallet-panel-withdraw [role="alert"]').waitFor()
  await page.reload(); await fill()
  await page.getByRole('button', { name: 'Gửi yêu cầu rút tiền', exact: true }).click()
  await page.getByText('Đã gửi yêu cầu. Số dư cập nhật theo phản hồi của ví, không theo ước tính trên form.', { exact: true }).waitFor()
  assert.equal(calls.length, 2); assert.equal(debits, 1); assert.equal(balance, 30000); assert.deepEqual(errors, [])
  console.log('PASS withdrawal retry: lost response, reload, same requestId, reduced balance, refresh failure after confirmed creation')
} finally { await browser.close() }
