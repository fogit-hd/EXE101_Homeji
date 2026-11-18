import assert from 'node:assert/strict'
import { chromium } from 'playwright'

// Run against local Vite preview. PayPal, Google Pay, Apple Pay and API responses are fixtures.
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
const walletOrderCalls = []
const captureCalls = []
const pageErrors = []
let appleDomainVerified = false

await context.addInitScript((id) => {
  localStorage.setItem('homeji_access_token', 'fixture-session')
  localStorage.setItem('homeji_user_id', id)
  localStorage.setItem('homeji_analytics_consent_v1', 'rejected')
  sessionStorage.setItem('hj-intro-seen', '1')
}, userId)

const paypalSdk = `
  window.paypal = {
    Googlepay: () => ({
      config: async () => ({ allowedPaymentMethods: [{ type: 'CARD' }], merchantInfo: {} }),
      confirmOrder: async ({ orderId }) => {
        window.__lastGoogleOrder = orderId;
        return { status: 'APPROVED' };
      },
      initiatePayerAction: async () => ({ liabilityShift: 'POSSIBLE' }),
    }),
    Applepay: () => ({
      config: async () => ({ isEligible: true, countryCode: 'US', supportedNetworks: ['visa'], merchantCapabilities: ['supports3DS'] }),
      validateMerchant: async () => ({ merchantSession: {} }),
      confirmOrder: async ({ orderId }) => { window.__lastAppleOrder = orderId; },
    }),
  };
`

const googleSdk = `window.google = { payments: { api: { PaymentsClient: class {
  constructor(options) { this.authorize = options.paymentDataCallbacks.onPaymentAuthorized }
  async isReadyToPay() { return { result: true } }
  createButton({ onClick }) {
    const button = document.createElement('button');
    button.textContent = 'Google Pay';
    button.onclick = onClick;
    return button;
  }
  async loadPaymentData(request) {
    window.__lastGoogleAmount = request.transactionInfo.totalPrice;
    window.googleResult = await this.authorize({ paymentMethodData: {} });
  }
} } } };`

const appleSdk = `window.ApplePaySession = class {
  static supportsVersion = () => true;
  static canMakePayments = () => true;
  static STATUS_SUCCESS = 1;
  static STATUS_FAILURE = 2;
  constructor(_, request) { window.__lastAppleAmount = request.total.amount }
  begin() { this.onvalidatemerchant({ validationURL: 'fixture' }) }
  completeMerchantValidation() { this.onpaymentauthorized({ payment: { token: 'fixture' } }) }
  completePayment(status) { window.appleResult = status }
};
customElements.define('apple-pay-button', class extends HTMLElement {
  connectedCallback() {
    const button = document.createElement('button');
    button.textContent = 'Apple Pay';
    this.append(button);
  }
});`

await context.route('**/*', async (route) => {
  const url = new URL(route.request().url())
  if (url.href.startsWith('https://www.paypal.com/sdk/js?')) {
    return route.fulfill({ contentType: 'application/javascript', body: paypalSdk })
  }
  if (url.hostname === 'pay.google.com') {
    return route.fulfill({ contentType: 'application/javascript', body: googleSdk })
  }
  if (url.hostname === 'applepay.cdn-apple.com') {
    return route.fulfill({ contentType: 'application/javascript', body: appleSdk })
  }
  if (url.origin !== origin) return route.abort()

  if (url.pathname === '/.well-known/apple-developer-merchantid-domain-association') {
    return appleDomainVerified
      ? route.fulfill({ contentType: 'text/plain', body: 'fixture-apple-pay-domain' })
      : route.fulfill({ status: 404, contentType: 'text/plain', body: 'Not Found' })
  }

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
    const quote = quoteFor(99000)
    const id = 'pay-premium-1'
    createCalls.push({ kind: 'premium', amount: 99000 })
    payments.set(id, {
      id,
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
      quote,
    })
    return route.fulfill({
      json: {
        paymentId: id,
        orderCode: 'PPPREMIUM1',
        payPalOrderId: 'PPORDPREM1',
        amount: 99000,
        status: 1,
        approvalUrl: 'https://www.paypal.com/checkoutnow?token=PPORDPREM1',
        providerMessage: null,
        quote,
      },
    })
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

  const walletOrderMatch = url.pathname.match(/^\/api\/payments\/([^/]+)\/paypal\/wallets\/(google-pay|apple-pay)\/orders$/)
  if (walletOrderMatch) {
    const [, id, wallet] = walletOrderMatch
    const record = payments.get(id)
    walletOrderCalls.push({ id, wallet })
    return route.fulfill({
      json: {
        orderId: `ORDER-${id}-${wallet}`,
        totalUsd: record.quote.totalUsd.toFixed(2),
        ticket: `ticket-${id}-${wallet}`,
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

  // 1. Premium subscription checkout with live USD quote + Google Pay on /payments/wait
  await page.goto(origin + '/?section=payments')
  await page.getByRole('link', { name: 'Nạp tiền vào ví', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Mua bằng PayPal · Google Pay · Apple Pay', exact: true }).first().waitFor()
  await page.getByRole('button', { name: 'Chọn gói', exact: true }).click()
  await page.getByRole('button', { name: 'PayPal · Google Pay · Apple Pay', exact: true }).click()

  const confirmDialog = page.getByRole('dialog', { name: 'Xác nhận mua gói Premium' })
  await confirmDialog.waitFor()
  await confirmDialog.getByText(/Vietcombank \(Tỷ giá bán USD\)/).waitFor()
  await confirmDialog.getByText('4,47 USD', { exact: true }).first().waitFor()
  assert.equal(createCalls.length, 0)

  await confirmDialog.getByRole('button', { name: /Xác nhận thanh toán 4,47 USD/ }).click()
  await page.waitForURL(/\/payments\/wait\?paymentId=pay-premium-1/)
  await page.getByText('4,47 USD', { exact: true }).first().waitFor()
  await page.getByText(/Apple Pay chưa được xác thực tên miền/).waitFor()
  assert.equal(await page.getByRole('button', { name: 'Apple Pay', exact: true }).count(), 0)
  const paypalLink = page.getByRole('link', { name: /Thanh toán qua PayPal/ })
  assert.equal(await paypalLink.getAttribute('target'), null)
  assert.equal(await paypalLink.getAttribute('href'), 'https://www.paypal.com/checkoutnow?token=PPORDPREM1')
  await page.getByRole('button', { name: 'Google Pay', exact: true }).click()
  await page.getByRole('heading', { name: 'Thanh toán thành công', exact: true }).waitFor()
  assert.equal(await page.evaluate(() => window.__lastGoogleAmount), '4.47')
  assert.equal(await page.evaluate(() => window.googleResult.transactionState), 'SUCCESS')

  // 2. Wallet top-up with live USD quote + Apple Pay on /payments/wait (when domain association exists)
  appleDomainVerified = true
  await page.goto(origin + '/?section=marketplace&market=wallet&wallet=deposit')
  await page.getByRole('button', { name: /PayPal · Google Pay · Apple Pay/ }).click()
  await page.getByText('8,71 USD', { exact: true }).first().waitFor()
  await page.getByRole('button', { name: /Tiếp tục · 8,71 USD/ }).click()
  await page.waitForURL(/\/payments\/wait\?paymentId=pay-wallet-1/)
  await page.getByRole('button', { name: 'Apple Pay', exact: true }).click()
  await page.getByRole('heading', { name: 'Thanh toán thành công', exact: true }).waitFor()
  assert.equal(await page.evaluate(() => window.__lastAppleAmount), '8.71')
  assert.equal(await page.evaluate(() => window.appleResult), 1)
  assert.equal(await page.getByRole('link', { name: 'Về ví Homeji', exact: true }).getAttribute('href'), '/?section=marketplace&market=wallet')

  // 3. PayPal redirect return auto-capture
  await page.goto(origin + '/payments/wait?orderCode=PPORDERRETURN&provider=paypal&token=PAYPALRET1')
  await page.getByRole('heading', { name: 'Thanh toán thành công', exact: true }).waitFor()
  assert.equal(captureCalls.at(-1).payPalOrderId, 'PAYPALRET1')

  assert.deepEqual(createCalls, [
    { kind: 'premium', amount: 99000 },
    { kind: 'wallet', amount: 200000 },
  ])
  assert.deepEqual(walletOrderCalls, [
    { id: 'pay-premium-1', wallet: 'google-pay' },
    { id: 'pay-wallet-1', wallet: 'apple-pay' },
  ])
  assert.deepEqual(pageErrors, [])
  console.log('Real PayPal/Google Pay/Apple Pay flow passed: Premium quote+Google Pay, Wallet top-up quote+Apple Pay, and redirect return capture.')
} finally {
  await browser.close()
}
