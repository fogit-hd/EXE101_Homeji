import assert from 'node:assert/strict'
import { chromium } from 'playwright'

// Run against local Vite preview. The live API and provider return are fixtures.
const preview = process.env.HOMEJI_TEST_BASE_URL || 'http://127.0.0.1:4197'
const origin = 'https://homeji-wallet.test'
const browser = await chromium.launch({ channel: process.env.HOMEJI_TEST_BROWSER || 'msedge', headless: true })
const context = await browser.newContext({ viewport: { width: 1280, height: 960 }, reducedMotion: 'reduce' })

const userId = '11111111-1111-4111-8111-111111111111'
const now = new Date()
const expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString()

function quoteFor(amountVnd) {
  const rate = 25450
  const baseUsd = Number((amountVnd / rate).toFixed(2))
  const bankFeeUsd = Number((baseUsd * 0.025).toFixed(2))
  const gatewayFeeUsd = Number(((baseUsd + bankFeeUsd) * 0.044 + 0.3).toFixed(2))
  const totalFeeUsd = Number((bankFeeUsd + gatewayFeeUsd).toFixed(2))
  const totalUsd = Number((baseUsd + totalFeeUsd).toFixed(2))
  return {
    amountVnd,
    exchangeRateVnd: rate,
    rateSource: 'Vietcombank (Tỷ giá bán USD)',
    rateUpdatedAt: now.toISOString(),
    baseUsd,
    bankFeePercent: 0.025,
    bankFeeUsd,
    gatewayFeePercent: 0.044,
    gatewayFixedFeeUsd: 0.3,
    gatewayFeeUsd,
    totalFeeUsd,
    totalUsd,
  }
}

const payments = new Map([
  ['pay-return-1', {
    id: 'pay-return-1',
    userId,
    method: 4,
    status: 1,
    amount: 99000,
    purpose: 2,
    packageCode: 'PREMIUM_MONTHLY',
    orderCode: 'PPORDERRETURN',
    requestId: 'PAYPALRET1',
    description: 'Homeji Gói Trải Nghiệm 30 ngày',
    paymentUrl: 'https://www.sandbox.paypal.com/checkoutnow?token=PAYPALRET1',
    deeplink: null,
    qrCodeUrl: null,
    qrCode: null,
    qrDataUrl: null,
    externalTransactionId: null,
    providerMessage: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    paidAt: null,
    expiresAt,
    quote: quoteFor(99000),
  }],
])

const createCalls = []
const captureCalls = []
const pageErrors = []
await context.addInitScript((id) => {
  localStorage.setItem('homeji_access_token', 'fixture-session')
  localStorage.setItem('homeji_user_id', id)
  localStorage.setItem('homeji_analytics_consent_v1', 'rejected')
  sessionStorage.setItem('hj-intro-seen', '1')
}, userId)

await context.route('**/*', async (route) => {
  const url = new URL(route.request().url())
  if (url.origin !== origin) return route.abort()

  if (url.pathname.startsWith('/hubs/')) {
    return route.fulfill({ status: 503, body: '' })
  }
  if (url.pathname === '/api/profile/me') {
    return route.fulfill({ json: { id: userId, displayName: 'Khách hàng Homeji', role: 1, onboardingCompleted: true } })
  }
  if (url.pathname === '/api/search-interests') {
    return route.fulfill({ json: { settings: { enabled: false }, suggestions: [], following: [], rooms: [] } })
  }
  if (url.pathname === '/api/subscriptions/packages') {
    return route.fulfill({
      json: [{
        code: 'PREMIUM_MONTHLY',
        name: 'Gói Trải Nghiệm',
        tier: 2,
        price: 99000,
        durationDays: 30,
        badge: 'Premium',
        benefits: ['Nhãn Premium'],
      }],
    })
  }
  if (url.pathname === '/api/subscriptions/me') {
    return route.fulfill({ json: { tier: 1, isPremium: false, packageCode: 'free' } })
  }
  if (url.pathname === '/api/wallet') {
    return route.fulfill({
      json: {
        userId,
        balance: 0,
        totalDeposited: 0,
        totalSpent: 0,
        totalEarned: 0,
        isActivated: false,
        minimumTopUp: 100000,
        maximumTopUp: 5000000,
        minimumWithdrawalReserve: 20000,
        updatedAt: null,
      },
    })
  }
  if (url.pathname === '/api/referrals') {
    return route.fulfill({ json: { vouchers: [] } })
  }
  if (url.pathname.includes('/chatbot/')) {
    return route.fulfill({ json: { enabled: false } })
  }
  if (url.pathname === '/api/payments/paypal/quote') {
    const amount = Number(url.searchParams.get('amount') || '99000')
    return route.fulfill({
      json: {
        enabled: true,
        mode: 'live',
        clientId: 'fixture-client',
        googlePay: true,
        applePay: true,
        quote: quoteFor(amount),
      },
    })
  }
  if (url.pathname === '/api/subscriptions/premium/PREMIUM_MONTHLY/paypal/create') {
    throw new Error('Premium PayPal must never create a live order')
  }
  if (url.pathname === '/api/payments/paypal/create') {
    const body = route.request().postDataJSON()
    const quote = quoteFor(body.amount)
    const id = 'pay-wallet-1'
    createCalls.push({ kind: 'wallet', amount: body.amount })
    payments.set(id, {
      id,
      userId,
      method: 4,
      status: 1,
      amount: body.amount,
      purpose: 3,
      packageCode: null,
      orderCode: 'PPWALLET1',
      requestId: 'PPORDWAL1',
      description: body.description,
      paymentUrl: 'https://www.paypal.com/checkoutnow?token=PPORDWAL1',
      deeplink: null,
      qrCodeUrl: null,
      qrCode: null,
      qrDataUrl: null,
      externalTransactionId: null,
      providerMessage: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      paidAt: null,
      expiresAt,
      quote,
    })
    return route.fulfill({
      json: {
        paymentId: id,
        orderCode: 'PPWALLET1',
        payPalOrderId: 'PPORDWAL1',
        amount: body.amount,
        status: 1,
        approvalUrl: 'https://www.paypal.com/checkoutnow?token=PPORDWAL1',
        providerMessage: null,
        quote,
      },
    })
  }

  const walletConfigMatch = url.pathname.match(/^\/api\/payments\/([^/]+)\/paypal\/wallets$/)
  if (walletConfigMatch) {
    const record = payments.get(walletConfigMatch[1])
    return route.fulfill({
      json: {
        enabled: true,
        mode: 'live',
        clientId: 'fixture-client',
        googlePay: true,
        applePay: true,
        quote: record.quote,
      },
    })
  }

  const captureMatch = url.pathname.match(/^\/api\/payments\/([^/]+)\/paypal\/capture$/)
  if (captureMatch) {
    const id = captureMatch[1]
    const body = route.request().postDataJSON()
    captureCalls.push({ id, ...body })
    const record = payments.get(id)
    const updated = {
      ...record,
      status: 2,
      paidAt: now.toISOString(),
      externalTransactionId: `CAP-${id}`,
    }
    payments.set(id, updated)
    return route.fulfill({ json: updated })
  }

  const orderLookupMatch = url.pathname.match(/^\/api\/payments\/orders\/([^/]+)$/)
  if (orderLookupMatch) {
    const found = [...payments.values()].find((p) => p.orderCode === orderLookupMatch[1])
    return found ? route.fulfill({ json: found }) : route.fulfill({ status: 404, json: {} })
  }

  const paymentLookupMatch = url.pathname.match(/^\/api\/payments\/([^/]+)$/)
  if (paymentLookupMatch && payments.has(paymentLookupMatch[1])) {
    return route.fulfill({ json: payments.get(paymentLookupMatch[1]) })
  }

  if (url.pathname.startsWith('/api/')) return route.fulfill({ json: [] })
  const response = await route.fetch({ url: preview + url.pathname + url.search })
  return route.fulfill({ response })
})

try {
  const page = await context.newPage()
  page.setDefaultTimeout(10_000)
  page.on('pageerror', (error) => pageErrors.push(error.message))

  // PayPal is unavailable for new Premium purchases; an existing live order can still settle.
  await page.goto(origin + '/?section=payments')
  const comingSoon = page.getByRole('button', { name: 'PayPal · Sẽ có mặt sớm', exact: true }).first()
  await comingSoon.waitFor()
  assert.equal(await comingSoon.isDisabled(), true)
  assert.equal(createCalls.length, 0)
  payments.set('pay-premium-1', {
    id: 'pay-premium-1',
    userId,
    method: 4,
    status: 1,
    amount: 99000,
    purpose: 2,
    packageCode: 'PREMIUM_MONTHLY',
    orderCode: 'PPPREMIUM1',
    requestId: 'PPORDPREM1',
    description: 'Homeji Gói Trải Nghiệm 30 ngay',
    paymentUrl: 'https://www.paypal.com/checkoutnow?token=PPORDPREM1',
    deeplink: null,
    qrCodeUrl: null,
    qrCode: null,
    qrDataUrl: null,
    externalTransactionId: null,
    providerMessage: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    paidAt: null,
    expiresAt,
    quote: quoteFor(99000),
  })
  await page.goto(origin + '/payments/wait?paymentId=pay-premium-1')
  await page.getByText('4,47 USD', { exact: true }).first().waitFor()
  const paypalLink = page.getByRole('link', { name: /Thanh toán qua PayPal/ })
  assert.equal(await paypalLink.getAttribute('href'), 'https://www.paypal.com/checkoutnow?token=PPORDPREM1')
  await page.goto(origin + '/payments/wait?orderCode=PPPREMIUM1&provider=paypal&token=PPORDPREM1')
  await page.getByRole('heading', { name: 'Thanh toán thành công', exact: true }).waitFor()
  assert.equal(captureCalls.at(-1).payPalOrderId, 'PPORDPREM1')

  // Wallet top-up still creates a live PayPal web order.
  await page.goto(origin + '/?section=marketplace&market=wallet&wallet=deposit')
  await page.getByRole('button', { name: /PayPal · Thẻ quốc tế/ }).click()
  await page.getByText('8,71 USD', { exact: true }).first().waitFor()
  await page.getByRole('button', { name: /Tiếp tục · 8,71 USD/ }).click()
  await page.waitForURL(/\/payments\/wait\?paymentId=pay-wallet-1/)
  assert.equal(await page.getByRole('link', { name: /Thanh toán qua PayPal/ }).getAttribute('href'),
    'https://www.paypal.com/checkoutnow?token=PPORDWAL1')
  await page.goto(origin + '/payments/wait?orderCode=PPWALLET1&provider=paypal&token=PPORDWAL1')
  await page.getByRole('heading', { name: 'Thanh toán thành công', exact: true }).waitFor()
  assert.equal(await page.getByRole('link', { name: 'Về ví Homeji', exact: true }).getAttribute('href'), '/?section=marketplace&market=wallet')

  // 3. PayPal redirect return auto-capture
  await page.goto(origin + '/payments/wait?orderCode=PPORDERRETURN&provider=paypal&token=PAYPALRET1')
  await page.getByRole('heading', { name: 'Thanh toán thành công', exact: true }).waitFor()
  assert.equal(captureCalls.at(-1).payPalOrderId, 'PAYPALRET1')

  assert.deepEqual(createCalls, [
    { kind: 'wallet', amount: 200000 },
  ])
  assert.deepEqual(pageErrors, [])
  console.log('PASS PayPal coming soon on Premium, existing live settlement and live wallet top-up checkout')
} finally {
  await browser.close()
}
