import assert from 'node:assert/strict'
import { chromium } from 'playwright'

// Run against a local Vite preview. HTTPS, the wallets and PayPal orders are fixtures.
const preview = process.env.HOMEJI_TEST_BASE_URL || 'http://127.0.0.1:4197'
const origin = 'https://homeji-wallet.test'
const sandbox = '/api/payments/paypal-sandbox'
const browser = await chromium.launch({ channel: process.env.HOMEJI_TEST_BROWSER || 'msedge', headless: true })
const context = await browser.newContext()
let enabled = false
let sdkLoads = 0
const orderCalls = []
const captures = []
const pageErrors = []

await context.addInitScript(() => {
  localStorage.setItem('homeji_access_token', 'fixture-session')
  localStorage.setItem('homeji_user_id', 'wallet-test-admin')
  localStorage.setItem('homeji_analytics_consent_v1', 'rejected')
  sessionStorage.setItem('hj-intro-seen', '1')
})

const paypal = `
  window.paypal = {
    Googlepay: () => ({
      config: async () => ({ allowedPaymentMethods: [{type: 'CARD'}], merchantInfo: {} }),
      confirmOrder: async ({ orderId }) => {
        if (orderId !== 'google-pay') throw Error('Wrong Google order')
        return { status: 'PAYER_ACTION_REQUIRED' }
      },
      initiatePayerAction: async () => ({ liabilityShift: 'POSSIBLE' }),
    }),
    Applepay: () => ({
      config: async () => ({isEligible: true, countryCode: 'US', supportedNetworks: ['visa'], merchantCapabilities: ['supports3DS']}),
      validateMerchant: async () => ({ merchantSession: {} }),
      confirmOrder: async ({ orderId }) => { if (orderId !== 'apple-pay') throw Error('Wrong Apple order') },
    }),
  };
`
const google = `window.google = { payments: { api: { PaymentsClient: class {
  constructor(options) { this.authorize = options.paymentDataCallbacks.onPaymentAuthorized }
  async isReadyToPay() { return { result: true } }
  createButton({ onClick }) {
    const button = document.createElement('button');
    button.textContent = 'Google Pay';
    button.onclick = onClick;
    return button;
  }
  async loadPaymentData(request) {
    if (request.transactionInfo.totalPrice !== '1.00') throw Error('Wrong Google total');
    window.googleResult = await this.authorize({ paymentMethodData: {} });
  }
} } } };`
const apple = `window.ApplePaySession = class {
  static supportsVersion = () => true;
  static canMakePayments = () => true;
  static STATUS_SUCCESS = 1;
  static STATUS_FAILURE = 2;
  constructor(_, request) { if (request.total.amount !== '1.00') throw Error('Wrong Apple total') }
  begin() { if (window.cancelApple) this.oncancel(); else this.onvalidatemerchant({ validationURL: 'fixture' }) }
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
    sdkLoads++
    return route.fulfill({ contentType: 'application/javascript', body: paypal })
  }
  if (url.hostname === 'pay.google.com') return route.fulfill({ contentType: 'application/javascript', body: google })
  if (url.hostname === 'applepay.cdn-apple.com') return route.fulfill({ contentType: 'application/javascript', body: apple })
  if (url.origin !== origin) return route.abort()
  if (url.pathname === '/.well-known/apple-developer-merchantid-domain-association') {
    return route.fulfill({ contentType: 'text/plain', body: 'fixture-apple-pay-domain' })
  }
  if (url.pathname === sandbox + '/wallets') {
    return enabled ? route.fulfill({ json: { clientId: 'fixture', googlePay: true, applePay: true } })
      : route.fulfill({ status: 204 })
  }
  const wallet = url.pathname.match(/\/wallets\/(apple-pay|google-pay)\/orders$/)?.[1]
  if (wallet) {
    orderCalls.push(wallet)
    return route.fulfill({ json: { orderId: wallet, ticket: 'ticket-' + wallet } })
  }
  if (url.pathname === sandbox + '/capture') {
    const { ticket } = route.request().postDataJSON()
    captures.push(ticket)
    if (captures.length === 1) return route.fulfill({ status: 503, json: {} })
    return route.fulfill({ json: { status: 'completed', captureId: ticket + '-captured' } })
  }
  if (url.pathname.startsWith('/hubs/')) {
    return route.fulfill({ status: 503, body: '' })
  }
  if (url.pathname === '/api/profile/me') {
    return route.fulfill({ json: { id: 'wallet-test-admin', role: 3, displayName: 'Wallet Admin', onboardingCompleted: true } })
  }
  if (url.pathname === '/api/search-interests') {
    return route.fulfill({ json: { settings: { enabled: false }, suggestions: [], following: [], rooms: [] } })
  }
  if (url.pathname === '/api/subscriptions/me') {
    return route.fulfill({ json: { tier: 1, isPremium: false } })
  }
  if (url.pathname === '/api/wallet') {
    return route.fulfill({ json: { userId: 'wallet-test-admin', balance: 0, isActivated: true } })
  }
  if (url.pathname.includes('/chatbot/')) {
    return route.fulfill({ json: { enabled: false } })
  }
  if (url.pathname.startsWith('/api/')) return route.fulfill({ json: [] })
  const response = await route.fetch({ url: preview + url.pathname + url.search })
  return route.fulfill({ response })
})

try {
  const page = await context.newPage()
  page.setDefaultTimeout(10_000)
  page.on('pageerror', (error) => {
    pageErrors.push(error.message)
    console.error(error.message)
  })
  page.on('console', (message) => { if (message.type() === 'error') console.error(message.text()) })
  await page.goto(origin + '/payments/sandbox')
  try {
    await page.getByRole('button', { name: 'Thanh toán qua PayPal' }).waitFor()
  } catch (error) {
    console.error(page.url(), (await page.locator('body').innerText()).slice(0, 500))
    throw error
  }
  await page.getByText('Đang kiểm tra Google Pay và Apple Pay…').waitFor({ state: 'hidden' })
  assert.equal(sdkLoads, 0)

  enabled = true
  await page.reload()
  await page.getByRole('button', { name: 'Google Pay', exact: true }).click()
  await page.getByRole('button', { name: 'Kiểm tra lại giao dịch ví' }).click()
  await page.getByText(/ticket-google-pay-captured/).waitFor()
  assert.equal(await page.evaluate(() => window.googleResult.transactionState), 'ERROR')
  assert.deepEqual(captures, ['ticket-google-pay', 'ticket-google-pay'])

  await page.evaluate(() => { window.cancelApple = true })
  await page.getByRole('button', { name: 'Apple Pay', exact: true }).click()
  assert.deepEqual(orderCalls, ['google-pay'])

  await page.evaluate(() => { window.cancelApple = false })
  await page.getByRole('button', { name: 'Apple Pay', exact: true }).click()
  await page.getByText(/ticket-apple-pay-captured/).waitFor()
  assert.equal(await page.evaluate(() => window.appleResult), 1)
  assert.deepEqual(orderCalls, ['google-pay', 'apple-pay'])
  assert.deepEqual(pageErrors, [])
  console.log('Wallet SDK fixtures passed: disabled, Google Pay retry, Apple Pay cancel and capture.')
} finally {
  await browser.close()
}
