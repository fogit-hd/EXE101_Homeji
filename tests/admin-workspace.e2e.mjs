// All API and hub traffic is intercepted. No real moderation or financial writes.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.HOMEJI_PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.HOMEJI_TEST_BASE_URL || 'http://127.0.0.1:5518'
assert.ok(['127.0.0.1', 'localhost', 'homeji.onrender.com'].includes(new URL(base).hostname))
const out = process.env.HOMEJI_QA_OUTPUT || 'output/verification/admin-workspace'
await mkdir(out, { recursive: true })
const user = '11111111-1111-4111-8111-111111111111', stamp = '2026-10-23T03:00:00Z'
const posts = [1, 2].map(i => ({ id: `post-${i}`, title: i === 1 ? 'Studio có ban công tại Linh Trung' : 'Căn hộ hai phòng ngủ gần Đại học Quốc gia', type: 1, status: 1, price: 3500000, area: 32, address: 'Linh Trung, Thủ Đức', ownerId: user, createdAt: stamp }))
const reports = [1, 2].map(i => ({ id: `report-${i}`, targetId: `post-${i}`, targetDisplayName: posts[i - 1].title, reporterDisplayName: 'Nguyễn Minh Anh', targetType: 1, relatedRentalPostId: `post-${i}`, reason: 'Thông tin giá không chính xác', description: 'Giá trên tin chưa bao gồm phụ phí được yêu cầu khi liên hệ.', status: 1, createdAt: stamp }))
const verifications = [1, 2].map(i => ({ id: `verification-${i}`, applicantDisplayName: `Chủ nhà ${i}`, applicantNote: 'Đã đính kèm giấy tờ cần đối chiếu.', documentUrl: '#fixture-document', status: 1, createdAt: stamp }))
const withdrawals = [1, 2].map(i => ({ id: `withdrawal-${i}`, userId: user, amount: i * 500000, bankName: 'Vietcombank', accountNumber: `000123456${i}`, accountHolder: `NGUYEN VAN ${i === 1 ? 'AN' : 'BINH'}`, status: 1, createdAt: stamp }))
const price = { activeListings: 12, medianMonthlyPrice: 3500000, averagePricePerSquareMeter: 120000, priceBasis: 'room_month', priceSampleCount: 12, excludedPriceCount: 0, priceAreaSampleCount: 12 }
const analytics = { generatedAt: stamp, periodDays: 30, kpis: { ...price, totalUsers: 1482, newUsers: 84, newListings: 5, searches: 2460, listingViews: 5120, saves: 318, viewingRequests: 76, saveToViewRate: 6.2, viewingRequestToSaveRate: 23.9 },
  trend: Array.from({ length: 7 }, (_, i) => ({ date: `2026-10-${17 + i}`, newUsers: 10, newListings: 1, searches: 80 + i * 12, listingViews: 120 + i * 20, saves: 16 + i, viewingRequests: 4 + i })),
  areas: [{ ...price, areaName: 'Linh Trung', latitude: 10.85, longitude: 106.8, totalViews: 200, totalSaves: 30, viewingRequests: 8, saveRate: 15, demandIndex: 110, priceSignal: 'hold', recommendation: 'Giữ giá và tiếp tục theo dõi tương tác.', confidence: 'high' }] }
const browser = await chromium.launch({ headless: true, executablePath: process.env.HOMEJI_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
let empty = false, failAnalytics = false, failDecision = false, decisionDelay = 0
const mutations = [], errors = [], requestedPeriods = []
await context.addInitScript(user => {
  localStorage.setItem('homeji_access_token', 'admin-ui-fixture-only'); localStorage.setItem('homeji_user_id', user)
  localStorage.setItem('homeji_theme', sessionStorage.getItem('admin-test-theme') || 'light')
  localStorage.setItem('homeji_analytics_consent_v1', 'rejected'); sessionStorage.setItem('hj-intro-seen', '1')
}, user)
await context.route('**/*', async route => {
  const request = route.request(), u = new URL(request.url())
  if (u.pathname.startsWith('/hubs/')) return route.fulfill({ status: 503, body: '' })
  if (!u.pathname.startsWith('/api/')) return u.origin === new URL(base).origin ? route.continue() : route.abort()
  let json = []
  if (request.method() !== 'GET') {
    if (!u.pathname.startsWith('/api/admin/')) return route.fulfill({ json: {} })
    mutations.push({ path: u.pathname, body: request.postDataJSON() })
    if (decisionDelay) await new Promise(resolve => setTimeout(resolve, decisionDelay))
    return route.fulfill({ status: failDecision ? 400 : 200, json: failDecision ? { detail: 'Chưa lưu được kết quả kiểm thử. Vui lòng thử lại.' } : {} })
  }
  if (u.pathname === '/api/profile/me') json = { id: user, displayName: 'Quản trị Homeji', role: 3, onboardingCompleted: true, isPremium: false }
  else if (u.pathname === '/api/subscriptions/me') json = { tier: 1, isPremium: false }
  else if (u.pathname === '/api/chatbot/popup-config') json = { enabled: false }
  else if (u.pathname === '/api/wallet') json = { userId: user, balance: 0, isActivated: true }
  else if (u.pathname === '/api/search-interests') json = { settings: { enabled: false }, suggestions: [], following: [], rooms: [] }
  else if (u.pathname === '/api/admin/moderation/rental-posts/pending') json = empty ? [] : posts
  else if (u.pathname === '/api/admin/moderation/reports') json = empty ? [] : reports
  else if (u.pathname === '/api/admin/landlord-verifications') json = empty ? [] : verifications
  else if (u.pathname === '/api/admin/wallet-withdrawals') json = empty ? [] : withdrawals
  else if (u.pathname === '/api/admin/moderation/active-users') json = empty ? [] : [{ userId: user, displayName: 'Quản trị Homeji', role: 3, isOnline: true, lastSeenAt: stamp }]
  else if (u.pathname === '/api/rental-assistant/admin-summary') json = { calculatedAt: stamp, summary: 'Có 2 tin phòng và 2 báo cáo cần kiểm tra.', tasks: [{ kind: 'reports', id: reports[1].id, label: 'Kiểm tra báo cáo thứ hai' }] }
  else if (u.pathname === '/api/admin/analytics/product') {
    requestedPeriods.push(Number(u.searchParams.get('days')))
    if (failAnalytics) return route.fulfill({ status: 400, json: { detail: 'Báo cáo sản phẩm chưa tải được.' } })
    json = { ...analytics, periodDays: Number(u.searchParams.get('days')) }
  } else if (u.pathname === '/api/admin/analytics/traffic') json = { generatedAt: stamp, periodDays: 30, trackingStartedAt: null, pageViews: 0, sessions: 0, activeSessions: 0, trend: [], topPages: [] }
  return route.fulfill({ json })
})
const page = await context.newPage()
page.on('pageerror', error => errors.push(error.message))
async function ready() { await page.locator('.admin-nav').waitFor(); await page.locator('.admin-queues__grid').waitFor(); await page.locator('.admin-analytics__kpis').waitFor() }
async function openSection(name) {
  const nav = page.getByRole('navigation', { name: 'Mục quản trị' })
  const toggle = nav.locator('.admin-nav__toggle')
  if (await toggle.isVisible() && await toggle.getAttribute('aria-expanded') === 'false') await toggle.click()
  await nav.locator('ul').getByRole('button', { name }).click()
  await page.evaluate(() => window.scrollTo(0, 0))
}
async function capture(name) {
  await page.waitForTimeout(200)
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${name}: document overflow`)
  assert.equal(await page.locator('.admin-layout [data-glass-control]').count(), 0)
  await page.screenshot({ path: `${out}/${name}.png` })
}
try {
  await page.goto(base + '/admin'); await ready()
  for (const width of [1440, 900, 390, 320]) for (const theme of ['light', 'dark']) {
    await page.setViewportSize({ width, height: 1000 })
    await page.evaluate(theme => { document.documentElement.dataset.theme = theme; localStorage.setItem('homeji_theme', theme); sessionStorage.setItem('admin-test-theme', theme) }, theme)
    await openSection('Tổng quan'); await capture(`overview-${theme}-${width}`)
    if (width === 1440 || width === 320) {
      await page.locator('.admin-analytics__primary-grid').screenshot({ path: `${out}/analytics-${theme}-${width}.png` })
      const chart = page.locator('.admin-trend-chart svg')
      assert.ok(await chart.evaluate(svg => Math.abs(svg.viewBox.baseVal.width - svg.getBoundingClientRect().width) < 2), 'Chart labels must not shrink with a fixed desktop viewBox')
      await page.getByText('Cơ sở đánh giá & giới hạn', { exact: true }).click()
      await page.getByText(/Chỉ số cầu so mức quan tâm/).waitFor()
    }
    assert.equal(await page.locator('.admin-nav button[aria-current="page"]').count(), 1)
    assert.equal(await page.locator('.admin-queues__grid button').count(), 4)
    for (const [key, name] of [['posts', 'Tin chờ duyệt'], ['reports', 'Báo cáo'], ['verifications', 'Xác minh chủ nhà'], ['withdrawals', 'Rút tiền'], ['active', 'Đang hoạt động'], ['maintenance', 'Bảo trì']]) {
      await openSection(name)
      if (key !== 'maintenance') await page.locator('.admin-item').first().waitFor()
      await capture(`${key}-${theme}-${width}`)
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 }); await openSection('Tin chờ duyệt')
  const postNote = page.getByLabel('Lý do từ chối: ' + posts[0].title, { exact: true })
  await postNote.fill('Thiếu thông tin liên hệ')
  assert.equal(await page.getByLabel('Lý do từ chối: ' + posts[1].title, { exact: true }).inputValue(), '')
  await page.getByLabel('Tìm trong danh sách', { exact: true }).fill('Đại học'); assert.equal(await page.locator('.admin-item').count(), 1)
  await page.getByLabel('Tìm trong danh sách', { exact: true }).fill('khôngkhớp'); await page.getByText(/Không tìm thấy mục phù hợp/).waitFor()
  await page.getByRole('button', { name: 'Xóa tìm kiếm' }).click(); assert.equal(await page.locator('.admin-item').count(), 2)
  failDecision = true; decisionDelay = 750
  await page.locator('.admin-item').first().getByRole('button', { name: 'Từ chối', exact: true }).evaluate(button => { button.click(); button.click() })
  await page.getByText('Chưa lưu được kết quả kiểm thử. Vui lòng thử lại.').waitFor()
  assert.equal(mutations.length, 1); assert.equal(mutations[0].body.reason, 'Thiếu thông tin liên hệ'); assert.equal(await postNote.inputValue(), 'Thiếu thông tin liên hệ')
  failDecision = false
  await page.locator('.admin-item').first().getByRole('button', { name: 'Từ chối', exact: true }).click()
  await page.getByText('Đã từ chối tin đăng.', { exact: true }).waitFor(); await page.locator('.admin-item').first().waitFor(); assert.equal(mutations.length, 2)
  await openSection('Rút tiền')
  const note = page.getByLabel('Mã giao dịch hoặc lý do từ chối: NGUYEN VAN AN', { exact: true })
  await note.fill('BANK-TEST-001'); assert.equal(await page.getByLabel('Mã giao dịch hoặc lý do từ chối: NGUYEN VAN BINH', { exact: true }).inputValue(), '')
  await openSection('Xác minh chủ nhà'); assert.equal(await page.getByLabel('Ghi chú duyệt: Chủ nhà 1', { exact: true }).inputValue(), '')
  await page.getByLabel('Ghi chú duyệt: Chủ nhà 1', { exact: true }).fill('Đã đối chiếu giấy tờ')
  await openSection('Rút tiền'); assert.equal(await note.inputValue(), 'BANK-TEST-001')
  page.once('dialog', dialog => dialog.dismiss())
  await page.locator('.admin-item').first().getByRole('button', { name: 'Xác nhận đã chuyển' }).click()
  assert.equal(mutations.length, 2, 'Cancelling confirmation must not send a withdrawal decision')
  await openSection('Tổng quan'); await page.getByRole('button', { name: '7 ngày', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('.admin-analytics')?.getAttribute('aria-busy') === 'false'); assert.ok(requestedPeriods.includes(7))
  await page.getByRole('button', { name: 'Hôm nay có gì cần xử lý?' }).click()
  await page.getByRole('button', { name: 'Mở báo cáo: Kiểm tra báo cáo thứ hai' }).click()
  await page.waitForFunction(() => document.activeElement?.id === 'admin-reports-report-2')
  empty = true; failAnalytics = true
  await page.reload(); await page.getByRole('button', { name: 'Thử lại', exact: true }).waitFor(); await page.locator('.admin-queues__grid').waitFor()
  await capture('error-empty-dark-1440'); assert.deepEqual(await page.locator('.admin-queues__grid strong').allTextContents(), ['0', '0', '0', '0'])
  failAnalytics = false; await page.getByRole('button', { name: 'Thử lại', exact: true }).click(); await ready()
  await openSection('Tin chờ duyệt'); await page.getByText('Không có tin chờ duyệt.', { exact: true }).waitFor()
  await openSection('Tổng quan')
  const navButton = page.getByRole('navigation', { name: 'Mục quản trị' }).getByRole('button', { name: 'Báo cáo' })
  await navButton.focus(); await page.keyboard.press('Enter'); assert.equal(await navButton.getAttribute('aria-current'), 'page')
  assert.deepEqual(errors, [])
  console.log('PASS: Admin desktop/mobile light/dark, all sections, search, isolated notes, duplicate lock, error retry, empty state, confirmation cancellation and exact assistant task focus. API writes were intercepted fixtures.')
} finally { await browser.close() }
