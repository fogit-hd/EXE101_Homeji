import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'

// Run against a local Vite server. All API traffic uses fixtures; no real payment is created.
const { chromium } = await import(process.env.HOMEJI_PLAYWRIGHT_MODULE || 'playwright')
const baseUrl = process.env.HOMEJI_TEST_BASE_URL || 'http://127.0.0.1:5173'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } })
const now = new Date('2026-10-03T12:00:00Z')
const profile = { id: 'test-user', displayName: 'Minh Anh', role: 1, onboardingCompleted: true, isPremium: true, subscriptionBadge: 'Premium', phone: null, avatarPath: null, sleepHabit: 1, petPreference: 1, smokingPreference: 1, landlordVerificationStatus: 0 }
const packages = [
  { code: 'free', name: 'Homeji Free', tier: 1, price: 0, durationDays: 0, badge: 'Free', benefits: ['Tìm kiếm phòng trọ', 'Lưu phòng yêu thích'] },
  { code: 'premium-30', name: 'Homeji Premium 30 ngày', tier: 2, price: 100000, durationDays: 30, badge: 'Premium', benefits: ['So sánh phòng', 'Thông báo khu vực'] },
  { code: 'premium-90', name: 'Homeji Premium 90 ngày', tier: 2, price: 270000, durationDays: 90, badge: 'Premium', benefits: ['So sánh phòng', 'Thông báo khu vực'] },
]
const subscription = { tier: 2, isPremium: true, packageName: 'Homeji Premium 90 ngày', packageCode: 'premium-90', premiumExpiresAt: '2026-12-30T12:00:00Z' }
const paymentBase = { userId: 'test-user', purpose: 2, packageCode: 'premium-30', description: 'Đăng ký Homeji Premium 30 ngày', amount: 100000, method: 1, paymentUrl: 'https://test-payment.momo.vn/checkout/test', paidAt: null, providerMessage: null, updatedAt: now.toISOString() }
let active = { ...paymentBase, id: 'pending', orderCode: 'MOMO1791028500000', status: 1, createdAt: '2026-10-03T11:55:00Z', expiresAt: '2026-10-03T12:10:00Z' }
const completed = { ...paymentBase, id: 'paid', orderCode: 'MOMO1790938800000', status: 2, createdAt: '2026-10-02T11:00:00Z', paidAt: '2026-10-02T11:02:00Z', expiresAt: '2026-10-02T11:15:00Z' }
const cancelled = { ...paymentBase, id: 'cancelled', method: 2, amount: 500000, orderCode: '9586475166', status: 4, createdAt: '2026-09-28T09:07:00Z', expiresAt: '2026-09-28T09:22:00Z', providerMessage: 'Đơn đã hủy do quá 15 phút chưa thanh toán.' }
let createCalls = 0
let paymentCalls = 0
let profileCalls = 0
let paymentOutage = false
await context.addInitScript(() => {
  document.startViewTransition = undefined
  localStorage.setItem('homeji_access_token', 'fixture-session')
  localStorage.setItem('homeji_user_id', 'test-user')
})
await context.route('**/*', async (route) => {
  const url = new URL(route.request().url())
  if (url.origin !== baseUrl) return route.abort()
  if (!url.pathname.startsWith('/api/') && !url.pathname.startsWith('/hubs/')) return route.continue()
  let body = []
  if (url.pathname === '/api/profile/me') { body = profile; profileCalls++ }
  else if (url.pathname === '/api/subscriptions/packages') body = packages
  else if (url.pathname === '/api/subscriptions/me') body = subscription
  else if (url.pathname === '/api/payments') body = [active, completed, cancelled]
  else if (url.pathname.startsWith('/api/payments/')) {
    paymentCalls++
    if (paymentOutage) return route.fulfill({ status: 503, json: { detail: 'Đang bảo trì thanh toán.' } })
    body = active
  }
  else if (url.pathname.includes('/premium/') && url.pathname.endsWith('/create')) { body = { paymentId: active.id }; createCalls++ }
  else if (url.pathname.includes('/chatbot/config')) body = { enabled: false }
  await route.fulfill({ json: body })
})
const page = await context.newPage()
const pageErrors = []
page.on('pageerror', (error) => pageErrors.push(error.message))
await page.clock.install({ time: now })
await mkdir('output/verification', { recursive: true })
try {
  await page.goto(`${baseUrl}/?section=payments&tab=history`)
  await page.getByRole('heading', { name: 'Giao dịch của bạn' }).waitFor()
  await page.locator('.payment-history__row').first().waitFor()
  await page.clock.runFor(800)
  assert.equal(await page.locator('.payment-history__row').count(), 3)
  assert.match(await page.locator('.payment-history__row').first().innerText(), /Chờ thanh toán/)
  await page.screenshot({ path: 'output/verification/payment-history-desktop.png', fullPage: true })
  await page.getByRole('combobox', { name: 'Lọc trạng thái giao dịch' }).selectOption('4')
  assert.equal(await page.locator('.payment-history__row').count(), 1)
  assert.match(await page.locator('.payment-detail-card').innerText(), /Đơn đã hủy do quá 15 phút/)
  await page.getByRole('combobox', { name: 'Lọc trạng thái giao dịch' }).selectOption('all')
  await page.setViewportSize({ width: 390, height: 844 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'mobile history must not overflow')
  await page.screenshot({ path: 'output/verification/payment-history-mobile.png', fullPage: true })
  await page.getByRole('link', { name: 'Tiếp tục thanh toán' }).click()
  await page.getByRole('heading', { name: 'Chờ bạn hoàn tất thanh toán' }).waitFor()
  assert.match(await page.getByRole('timer').innerText(), /^(10:00|09:5\d)$/)
  await page.screenshot({ path: 'output/verification/payment-wait-mobile.png', fullPage: true })
  await page.reload()
  await page.getByRole('timer').waitFor()
  assert.match(await page.getByRole('timer').innerText(), /^(10:00|09:5\d)$/, 'reload must not reset deadline')
  await page.setViewportSize({ width: 1440, height: 1100 })
  await page.screenshot({ path: 'output/verification/payment-wait-desktop.png', fullPage: true })

  // Redirect query values must never mark an order as paid.
  await page.goto(`${baseUrl}/payments?orderId=${active.orderCode}&resultCode=0`)
  await page.getByRole('heading', { name: 'Chờ bạn hoàn tất thanh toán' }).waitFor()
  assert.match(page.url(), /\/payments\/wait\?orderCode=/)
  const profileCountBeforePaid = profileCalls
  active = { ...active, status: 2, paidAt: now.toISOString() }
  await page.clock.fastForward(6000)
  await page.getByRole('heading', { name: 'Thanh toán thành công!' }).waitFor()
  assert.ok(profileCalls > profileCountBeforePaid, 'confirmed payment refreshes profile')
  await page.screenshot({ path: 'output/verification/payment-success-desktop.png', fullPage: true })
  const finalCalls = paymentCalls
  await page.clock.fastForward(15000)
  assert.equal(paymentCalls, finalCalls, 'polling stops after confirmation')

  active = { ...active, status: 1, createdAt: '2026-10-03T11:00:00Z', expiresAt: '2026-10-03T11:15:00Z', paidAt: null }
  await page.goto(`${baseUrl}/payments/wait?paymentId=${active.id}`)
  await page.getByRole('heading', { name: 'Đã hết thời gian thanh toán' }).waitFor()
  assert.equal(await page.getByRole('link', { name: /Thanh toán qua/ }).count(), 0)
  assert.equal(await page.getByRole('timer').innerText(), '00:00')
  active = { ...active, status: 4 }
  await page.clock.fastForward(6000)
  await page.getByRole('heading', { name: 'Đơn thanh toán đã hủy' }).waitFor()
  await page.screenshot({ path: 'output/verification/payment-cancelled-desktop.png', fullPage: true })

  active = { ...active, status: 1, createdAt: now.toISOString(), expiresAt: '2026-10-03T12:15:00Z' }
  await page.goto(`${baseUrl}/?section=payments`)
  await page.getByRole('button', { name: 'Nâng cấp lên Pro' }).first().click()
  await page.getByRole('button', { name: 'MoMo', exact: true }).click()
  await page.getByRole('heading', { name: 'Chờ bạn hoàn tất thanh toán' }).waitFor()
  assert.equal(createCalls, 1)
  assert.match(page.url(), /\/payments\/wait\?paymentId=/)

  await page.goto(`${baseUrl}/?section=payments`)
  await page.getByRole('button', { name: 'Nâng cấp lên Pro' }).first().click()
  await page.getByRole('button', { name: 'PayOS', exact: true }).click()
  await page.getByRole('heading', { name: 'Chờ bạn hoàn tất thanh toán' }).waitFor()
  assert.equal(createCalls, 2)

  paymentOutage = true
  await page.goto(`${baseUrl}/payments/wait?paymentId=${active.id}`)
  await page.getByRole('heading', { name: 'Chưa tải được giao dịch' }).waitFor()
  paymentOutage = false
  await page.getByRole('button', { name: 'Thử lại', exact: true }).click()
  await page.getByRole('heading', { name: 'Chờ bạn hoàn tất thanh toán' }).waitFor()
  await page.setViewportSize({ width: 320, height: 720 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'waiting page fits 320px')
  await page.goto(`${baseUrl}/payments/wait`)
  await page.getByRole('heading', { name: 'Chưa có đơn thanh toán' }).waitFor()
  assert.deepEqual(pageErrors, [], 'no React/browser runtime errors')
  console.log('PASS: history/filter/mobile, waiting/reload, return URL, polling/success, expiration/cancellation, MoMo/PayOS checkout, errors/retry/missing order')
} finally {
  await browser.close()
}
