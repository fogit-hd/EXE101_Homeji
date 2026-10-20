import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'

// All API/provider traffic is intercepted. No real accounts, payments or Google events are created.
const { chromium } = await import(process.env.HOMEJI_PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.HOMEJI_TEST_BASE_URL || 'http://127.0.0.1:5197'
const browser = await chromium.launch({ executablePath: process.env.HOMEJI_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
const output = 'output/technology-rollout'
await mkdir(output, { recursive: true })
const userA = '11111111-1111-4111-8111-111111111111'
const userB = '11111111-1111-4111-8111-111111111112'
const post = (id, title) => ({ id, title, type: 1, status: 3, price: 3000000, area: 25,
  address: 'Thủ Đức', latitude: 10.85, longitude: 106.8, viewCount: 0, saveCount: 1,
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), media: [], amenities: [], availableSlots: 2, maxOccupants: 2 })
let saved = [post('22222222-2222-4222-8222-222222222221', 'Phòng riêng của tài khoản A')]
let savedRequests = 0
let savedFailureStatus = 0
const tagRequests = []
const errors = []
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' })
await context.addInitScript(({ userA }) => {
  if (!localStorage.getItem('qa-initialized')) {
    localStorage.setItem('homeji_access_token', 'fixture-account-a')
    localStorage.setItem('homeji_user_id', userA)
    localStorage.setItem('qa-initialized', '1')
  }
  sessionStorage.setItem('hj-intro-seen', '1')
}, { userA })
await context.route('**/*', async route => {
  const request = route.request(), url = new URL(request.url())
  if (url.hostname === 'www.googletagmanager.com') {
    tagRequests.push(request.url())
    await route.fulfill({ contentType: 'text/javascript', body: '/* intercepted test tag: never contacts Google */' })
    return
  }
  if (!request.url().startsWith(base)) { await route.abort(); return }
  if (!url.pathname.startsWith('/api/') && !url.pathname.startsWith('/hubs/')) { await route.continue(); return }
  let body = []
  const account = request.headers().authorization?.includes('fixture-account-b') ? userB : userA
  if (url.pathname === '/api/profile/me') body = { id: account, role: 1, displayName: account === userA ? 'Tài khoản A' : 'Tài khoản B', onboardingCompleted: true, isPremium: false }
  else if (url.pathname === '/api/account/login') body = { accessToken: 'fixture-account-b', userId: userB, email: 'fixture-b@example.test', emailConfirmationRequired: false }
  else if (url.pathname === '/api/search-interests') body = { settings: { enabled: false, emailEnabled: false, aiEnabled: false }, following: [], suggestions: [], rooms: [], notice: null }
  else if (url.pathname === '/api/saved-posts') {
    savedRequests++
    if (savedFailureStatus) {
      await route.fulfill({ status: savedFailureStatus, contentType: 'application/json', body: JSON.stringify({ detail: 'Lỗi tải tin QA.' }) })
      return
    }
    body = saved
  }
  else if (url.pathname.startsWith('/api/saved-posts/') && request.method() === 'DELETE') {
    saved = saved.filter(item => !url.pathname.endsWith(item.id))
    await route.fulfill({ status: 204 }); return
  } else if (url.pathname === '/api/chatbot/popup-config') body = { enabled: false, historyStorageEnabled: false, suggestions: [] }
  else if (url.pathname === '/api/subscriptions/me') body = { isPremium: false, tier: 1 }
  else if (url.pathname === '/api/wallet') body = { balance: 0, isActivated: false }
  else if (url.pathname === '/api/analytics/page-views') { await route.fulfill({ status: 204 }); return }
  else if (url.pathname.startsWith('/hubs/')) { await route.fulfill({ status: 503, body: '' }); return }
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
})
const page = await context.newPage()
page.on('pageerror', error => errors.push(error.message))
const eventList = () => page.evaluate(() => (window.dataLayer ?? []).map(args => Array.from(args)).filter(args => args[0] === 'event'))
try {
  await page.goto(`${base}/?section=saved&utm_source=qa_campaign`)
  await page.getByRole('heading', { name: 'Phòng riêng của tài khoản A' }).waitFor({ timeout: 30000 })
  const initialSkip = page.getByRole('button', { name: 'Bỏ qua', exact: true })
  if (await initialSkip.isVisible()) await initialSkip.click()
  await page.locator('.hj-intro').waitFor({ state: 'detached', timeout: 15000 })
  assert.equal(tagRequests.length, 0)
  await page.screenshot({ path: `${output}/consent-before-opt-in.png`, fullPage: true })
  const countBefore = savedRequests
  await page.getByRole('button', { name: 'Đồng ý thống kê', exact: true }).click()
  await page.waitForFunction(() => (window.dataLayer ?? []).some(args => args[0] === 'event' && args[1] === 'page_view'))
  assert.equal(tagRequests.length, 1)
  await page.screenshot({ path: `${output}/saved-consented.png`, fullPage: true })
  await page.getByRole('button', { name: 'Bỏ lưu', exact: true }).click()
  await page.getByText('Chưa có tin nào được lưu', { exact: true }).waitFor()
  assert.ok(savedRequests > countBefore, 'successful unsave invalidates the saved-post query')
  saved = [post('22222222-2222-4222-8222-222222222222', 'Tin mới được lưu từ bản đồ')]
  await page.evaluate(() => window.dispatchEvent(new Event('homeji:saved-posts-changed')))
  await page.getByRole('heading', { name: 'Tin mới được lưu từ bản đồ' }).waitFor()
  savedFailureStatus = 503
  const beforeFailure = savedRequests
  await page.evaluate(() => window.dispatchEvent(new Event('homeji:saved-posts-changed')))
  await page.getByRole('button', { name: 'Thử tải lại', exact: true }).waitFor({ timeout: 10000 })
  assert.equal(savedRequests - beforeFailure, 2, 'server failure retries at most once')
  assert.equal(await page.getByRole('heading', { name: 'Tin mới được lưu từ bản đồ' }).count(), 1)
  savedFailureStatus = 403
  const beforeForbidden = savedRequests
  await page.getByRole('button', { name: 'Thử tải lại', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('.grid-posts') === null)
  assert.equal(savedRequests - beforeForbidden, 1, 'authorization failure does not retry or display cached rows')
  savedFailureStatus = 0
  await page.getByRole('button', { name: 'Thử tải lại', exact: true }).click()
  await page.getByRole('heading', { name: 'Tin mới được lưu từ bản đồ' }).waitFor()
  assert.equal(await page.locator('.analytics-choice').count(), 0, 'Consent choice removes the floating UI')
  await page.goto(base + '/privacy')
  await page.getByRole('button', { name: 'Tùy chọn thống kê', exact: true }).click()
  await page.getByRole('button', { name: 'Từ chối thống kê', exact: true }).click()
  assert.equal(await page.evaluate(() => localStorage.getItem('homeji_analytics_consent_v1')), 'rejected')
  await page.goto(base + '/?section=saved')
  await page.screenshot({ path: `${output}/saved-withdrawn.png`, fullPage: true })

  // Exercise the real module in a browser, retaining consent gating and data minimization.
  await page.evaluate(async () => {
    const ga = await import('/src/lib/ga4.ts')
    ga.setAnalyticsConsent('accepted'); ga.setAnalyticsPage('/', '?section=saved')
    ga.trackFunnelEvent('rental_search', { search_mode: 'ai', email: 'SECRET@example.com', prompt: 'PRIVATE_PROMPT' })
    ga.trackFunnelEvent('rental_saved'); ga.trackFunnelEvent('viewing_requested')
    ga.setAnalyticsPage('/reset-password', '?access_token=PRIVATE_TOKEN')
    ga.trackFunnelEvent('viewing_requested')
  })
  const events = await eventList()
  assert.ok(events.some(event => event[1] === 'viewing_requested' && event[2].search_mode === 'ai'))
  assert.ok(!JSON.stringify(events).includes('PRIVATE'))
  assert.ok(!JSON.stringify(events).includes('SECRET'))

  saved = [post('33333333-3333-4333-8333-333333333333', 'Phòng riêng của tài khoản B')]
  await page.getByRole('button', { name: 'Menu tài khoản', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Đăng xuất', exact: true }).click()
  await page.locator('#auth-email').fill('fixture-b@example.test')
  await page.locator('#auth-password').fill('FixtureOnly123!')
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await page.waitForFunction(() => localStorage.getItem('homeji_user_id') === '11111111-1111-4111-8111-111111111112')
  await page.waitForURL(url => url.pathname === '/' && !url.searchParams.has('section'))
  await page.getByText(/Chào.*Tài khoản B/).waitFor({ timeout: 10000 })
  // Same-document navigation proves a QueryClient switch, rather than merely clearing memory on reload.
  await page.evaluate(() => {
    history.pushState({}, '', '/?section=saved')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  await page.getByRole('heading', { name: 'Phòng riêng của tài khoản B' }).waitFor({ timeout: 30000 })
  const skipIntro = page.getByRole('button', { name: 'Bỏ qua', exact: true })
  if (await skipIntro.isVisible()) await skipIntro.click()
  await page.locator('.hj-intro').waitFor({ state: 'detached', timeout: 15000 }).catch(() => {})
  assert.equal(await page.getByRole('heading', { name: 'Phòng riêng của tài khoản A' }).count(), 0)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${output}/saved-mobile-account-b.png`, fullPage: true })
  assert.equal(errors.length, 0, `Unexpected browser errors: ${errors.join('; ')}`)
  console.log(JSON.stringify({ result: 'PASS', savedRequests, interceptedTagRequests: tagRequests.length, tested: ['basic consent', 'withdrawal', 'saved query invalidation', 'bounded retry', '403 hides cached rows', 'live logout/login account cache isolation', 'GA payload redaction', 'AI follow-through'], screenshots: output }))
} catch (error) {
  await page.screenshot({ path: `${output}/failure.png`, fullPage: true }).catch(() => {})
  console.error(JSON.stringify({ errors, savedRequests, text: (await page.locator('body').innerText()).slice(0, 2500) }))
  throw error
} finally { await browser.close() }
