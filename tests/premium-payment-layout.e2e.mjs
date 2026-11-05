import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'

const base = process.env.HOMEJI_TEST_BASE_URL || 'http://127.0.0.1:5556'
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local payment fixtures only')
const out = 'output/verification/premium-payment-layout'
await mkdir(out, { recursive: true })
await writeFile(out + '/index.html', '<html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
await writeFile(out + '/scene.tsx', `import React from'react';import{createRoot}from'react-dom/client';import{MemoryRouter}from'react-router-dom';import{PaymentPage}from'/src/pages/PaymentPage.tsx';import{ToastProvider}from'/src/components/toast/ToastProvider.tsx';import'/src/index.css';import'/src/product-ui.css';import'/src/liquid-glass.css';createRoot(document.getElementById('root')).render(<MemoryRouter><ToastProvider><PaymentPage embedded/></ToastProvider></MemoryRouter>);`)
const browser = await chromium.launch({ headless: true, channel: 'msedge' })
const errors = []; let paymentWrites = 0
let page
try {
  page = await browser.newPage({ reducedMotion: 'reduce' })
  await page.addInitScript(() => { localStorage.setItem('homeji_access_token', 'fixture-session'); localStorage.setItem('homeji_user_id', 'me') })
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') console.error(message.text()) })
  page.on('requestfailed', request => console.error('Failed fixture request: ' + new URL(request.url()).pathname))
  await page.route('**/src/contexts/AuthContext.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: 'const refreshProfile=async()=>{};export const useAuth=()=>({isAuthenticated:true,needsProfileSetup:false,refreshProfile,profile:{id:"me"}})' }))
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname
    if (!path.startsWith('/api/')) return route.continue()
    if (route.request().method() !== 'GET') paymentWrites++
    const json = path === '/api/subscriptions/packages' ? [{ code: 'premium-year', name: 'Premium 365 ngày', tier: 2, price: 780000, durationDays: 365, benefits: [] }]
      : path === '/api/subscriptions/me' ? { tier: 1, isPremium: false, packageCode: 'free' }
      : path === '/api/wallet' ? { balance: 14897329 }
      : path === '/api/referrals' ? { vouchers: [] } : []
    return route.fulfill({ json })
  })
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto(base + '/' + out + '/index.html')
    await page.getByRole('button', { name: 'Chọn gói', exact: true }).click()
    const methods = page.getByRole('group', { name: 'Chọn hình thức thanh toán' })
    await methods.getByText(/Chưa có voucher phù hợp/).waitFor()
    const voucher = methods.locator('.pay-voucher-panel')
    const picker = voucher.locator('.voucher-picker')
    const copyBox = await voucher.locator('.pay-voucher-panel__copy').boundingBox()
    const pickerBox = await picker.boundingBox()
    assert.ok(pickerBox.y >= copyBox.y + copyBox.height - 1, 'voucher selector should follow the explanation vertically')
    const wallet = methods.locator('.pay-wallet-card')
    const balance = await wallet.locator('.pay-wallet-card__balance').boundingBox()
    const button = methods.getByRole('button', { name: /Thanh toán bằng ví/ })
    const buttonBox = await button.boundingBox()
    assert.ok(buttonBox.y >= balance.y + balance.height - 1, 'wallet action should follow the balance vertically')
    assert.ok(buttonBox.width >= (await wallet.boundingBox()).width - 30, 'wallet button should fill its card')
    for (const selector of ['.voucher-picker select', '.pay-wallet-card__balance strong', '.pay-wallet-method small']) {
      assert.ok(await methods.locator(selector).evaluate(el => el.scrollWidth <= el.clientWidth), `${selector} should fit at ${width}`)
    }
    assert.equal(await methods.locator('.pay-wallet-card__balance strong').evaluate(el => getComputedStyle(el).whiteSpace), 'nowrap')
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `page overflow at ${width}`)
    await methods.scrollIntoViewIfNeeded()
    await page.screenshot({ path: out + '/payment-' + width + '.png' })
    await button.click()
    const dialog = page.getByRole('dialog', { name: 'Xác nhận mua gói Premium' })
    await dialog.waitFor()
    await dialog.getByRole('button', { name: 'Quay lại', exact: true }).click()
    await methods.getByRole('button', { name: 'Đóng lựa chọn', exact: true }).click()
    await methods.waitFor({ state: 'detached' })
  }
  assert.equal(paymentWrites, 0, 'layout and opening/cancelling confirmation must not create a payment')
  assert.deepEqual(errors, [])
  console.log('PASS full-width voucher and wallet, readable amounts, two external methods, accessible cancel/confirmation, no payment writes at 320–1440 px')
} catch (error) {
  console.error(JSON.stringify({ errors, body: (await page.locator('body').innerText()).slice(0,1500) }))
  throw error
} finally { await browser.close() }
