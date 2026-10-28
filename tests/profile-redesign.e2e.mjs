import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const base = process.env.HOMEJI_PROFILE_TEST_URL || 'http://127.0.0.1:5595'
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local fixtures only')
const out = new URL('../output/verification/profile-redesign/', import.meta.url)
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const userId = '11111111-1111-4111-8111-111111111111'
let profile = { id: userId, displayName: 'Nguyễn Thanh An', phone: '0901234567', school: 'Đại học Kinh tế - Luật', contactAddress: 'Linh Trung, Thủ Đức', rentalNeed: 'Tìm phòng gần trường, có chỗ để xe.', role: 1, onboardingCompleted: false, isPremium: false, landlordVerificationStatus: 0 }
const results = { checks: [], layouts: [], pageErrors: [] }
await context.addInitScript(({ userId }) => {
  localStorage.setItem('homeji_access_token', 'fixture-session')
  localStorage.setItem('homeji_user_id', userId)
  localStorage.setItem('homeji_email', 'fixture@example.test')
}, { userId })
await context.route('**/*', async route => {
  const url = new URL(route.request().url())
  if (url.origin !== new URL(base).origin) return route.abort()
  if (!url.pathname.startsWith('/api/') && !url.pathname.startsWith('/hubs/')) return route.continue()
  let body = []
  if (url.pathname === '/api/profile/me') {
    if (route.request().method() === 'PUT') profile = { ...profile, ...route.request().postDataJSON() }
    body = profile
  } else if (url.pathname === '/api/subscriptions/me') body = { tier: 1, isPremium: false }
  else if (url.pathname === '/api/chatbot/popup-config') body = { enabled: false }
  else if (url.pathname === '/api/search-interests') body = { settings: { enabled: false }, suggestions: [], following: [], rooms: [] }
  else if (url.pathname.startsWith('/hubs/')) return route.fulfill({ status: 503, body: '' })
  return route.fulfill({ json: body })
})
const page = await context.newPage()
page.on('pageerror', error => results.pageErrors.push(error.message))
try {
  await page.goto(base + '/?section=profile')
  const skip = page.getByRole('button', { name: 'Bỏ qua', exact: true })
  if (await skip.isVisible()) await skip.click()
  await page.locator('.profile-details').waitFor()
  await page.locator('.hj-intro').waitFor({ state: 'detached' })
  assert.match(await page.locator('.profile-facts').innerText(), /Nguyễn Thanh An/)
  assert.equal(await page.getByRole('heading', { name: 'Xác minh chủ nhà', exact: true }).count(), 0)
  results.checks.push('saved account is readable without opening a form; roommate setup stays optional')
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1100 })
    const layout = await page.locator('.profile-account').evaluate(element => ({ width: innerWidth, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth, right: element.getBoundingClientRect().right }))
    assert.ok(layout.scrollWidth <= layout.clientWidth + 1, JSON.stringify(layout))
    assert.ok(layout.right <= width + 1, JSON.stringify(layout))
    results.layouts.push(layout)
    await page.screenshot({ path: fileURLToPath(new URL(`profile-${width}.png`, out)), fullPage: true })
  }
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.locator('.profile-edit-button').first().click()
  await page.getByLabel('Họ tên', { exact: true }).fill('Nguyễn Minh An')
  await page.getByRole('button', { name: 'Lưu thông tin', exact: true }).click()
  await page.locator('.profile-details').waitFor()
  assert.match(await page.locator('.profile-facts').innerText(), /Nguyễn Minh An/)
  results.checks.push('editing and saving basic information returns to the overview with refreshed values')
  await page.getByRole('button', { name: 'Thêm nhu cầu', exact: false }).click()
  await page.getByLabel('Khu vực muốn ở', { exact: true }).waitFor()
  await page.getByRole('button', { name: '← Tổng quan tài khoản', exact: true }).click()
  await page.locator('.profile-details').waitFor()
  results.checks.push('roommate editor and back action open the intended sections')
  profile = { ...profile, role: 2, onboardingCompleted: true, maxBudget: 3500000, preferredArea: 'Gần UEL', sleepHabit: 1, petPreference: 1, smokingPreference: 1 }
  await page.reload()
  await page.getByRole('heading', { name: 'Xác minh chủ nhà', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Xem yêu cầu', exact: false }).click()
  await page.locator('.profile-editor-heading h2').filter({ hasText: 'Xác minh chủ nhà' }).waitFor()
  results.checks.push('landlord verification remains reachable and is hidden for renters')
  await page.getByRole('button', { name: '← Tổng quan tài khoản', exact: true }).click()
  await page.getByRole('switch', { name: 'Chế độ tối', exact: true }).click()
  await page.locator('html[data-theme="dark"]').waitFor()
  await page.getByText('Đã bật giao diện tối', { exact: true }).waitFor()
  await page.screenshot({ path: fileURLToPath(new URL('profile-dark.png', out)), fullPage: true })
  assert.deepEqual(results.pageErrors, [])
  await writeFile(new URL('results.json', out), JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results))
} finally { await browser.close() }
