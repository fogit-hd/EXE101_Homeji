import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'

const { chromium } = createRequire(import.meta.url)(process.env.HOMEJI_PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.HOMEJI_GLASS_TEST_URL || 'http://127.0.0.1:5493'
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local fixtures only')
const out = new URL('../output/verification/liquid-glass/', import.meta.url)
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
const userId = '11111111-1111-4111-8111-111111111111'
const profile = { id: userId, displayName: 'Nguyễn Văn An', role: 1, onboardingCompleted: true, isPremium: false, sleepHabit: 0, petPreference: 0, smokingPreference: 0 }
const result = { checks: [], pageErrors: [], requests: [] }
await context.addInitScript(({ userId }) => {
  localStorage.setItem('homeji_access_token', 'local-glass-fixture')
  localStorage.setItem('homeji_user_id', userId)
}, { userId })
await context.route('**/*', async route => {
  const url = new URL(route.request().url())
  if (url.origin !== new URL(base).origin) return route.abort()
  if (!url.pathname.startsWith('/api/') && !url.pathname.startsWith('/hubs/')) return route.continue()
  result.requests.push({ path: url.pathname, query: url.search, method: route.request().method() })
  if (url.pathname.startsWith('/hubs/')) return route.fulfill({ status: 503, body: '' })
  let body = []
  if (url.pathname === '/api/profile/me') body = profile
  else if (url.pathname === '/api/subscriptions/packages') body = [{ code: 'free', name: 'Homeji Free', tier: 1, price: 0, durationDays: 0, badge: 'Free', benefits: [] }]
  else if (url.pathname === '/api/subscriptions/me') body = { tier: 1, isPremium: false, packageCode: 'free', packageName: 'Homeji Free' }
  else if (url.pathname === '/api/wallet') body = { userId, balance: 350000, totalDeposited: 350000, totalSpent: 0, totalEarned: 0, isActivated: true }
  else if (url.pathname === '/api/chatbot/popup-config') body = { enabled: false }
  else if (url.pathname === '/api/payments') body = [{ id: 'payment-fixture', method: 2, purpose: 1, amount: 99000, status: 4, createdAt: '2026-10-18T00:00:00Z', orderCode: 'FIXTURE' }]
  return route.fulfill({ json: body })
})
const page = await context.newPage()
page.on('pageerror', error => result.pageErrors.push(error.message))
const panel = name => page.getByRole('dialog', { name, exact: true })
async function open(name) {
  const control = page.getByRole('combobox', { name, exact: true })
  await control.waitFor()
  const skip = page.locator('.brand-intro__skip')
  if (await skip.isVisible().catch(() => false)) await skip.click()
  await control.click()
  await panel(name).waitFor()
  return control
}
try {
  await page.goto(base + '/?section=profile')
  const school = await open('Trường học')
  await panel('Trường học').getByRole('combobox').fill('fpt')
  const schoolOption = panel('Trường học').getByRole('option').first()
  const schoolText = await schoolOption.innerText()
  await schoolOption.click()
  assert.match(await school.innerText(), new RegExp(schoolText))
  await open('Trường học')
  await page.screenshot({ path: new URL('app-profile-desktop.png', out).pathname.slice(1), animations: 'disabled' })
  await page.keyboard.press('Escape')
  result.checks.push('Profile school picker changes actual form state')

  await page.getByRole('button', { name: 'Menu tài khoản', exact: true }).click()
  await page.getByRole('menu').waitFor()
  const accountGlass = await page.locator('.hj-account__menu').evaluate(element => ({ background: getComputedStyle(element).backgroundColor, backdrop: getComputedStyle(element).backdropFilter }))
  assert.match(accountGlass.background, /rgba/)
  assert.match(accountGlass.backdrop, /blur/)
  await page.screenshot({ path: new URL('app-account-glass.png', out).pathname.slice(1), animations: 'disabled' })
  await page.getByRole('button', { name: 'Menu tài khoản', exact: true }).click()
  result.checks.push('Account menu shares the glass material')
  const accountTrigger = page.getByRole('button', { name: 'Menu tài khoản', exact: true })
  await accountTrigger.focus()
  await accountTrigger.press('ArrowDown')
  const menuItems = page.getByRole('menu').getByRole('menuitem')
  await menuItems.first().waitFor()
  await page.waitForFunction(() => document.activeElement?.matches('[role="menuitem"]'))
  assert.equal(await menuItems.first().evaluate(e => e === document.activeElement), true)
  await page.keyboard.press('End')
  assert.equal(await menuItems.last().evaluate(e => e === document.activeElement), true)
  await page.keyboard.press('Home')
  assert.equal(await menuItems.first().evaluate(e => e === document.activeElement), true)
  await page.keyboard.press('Escape')
  assert.equal(await accountTrigger.evaluate(e => e === document.activeElement), true)
  await accountTrigger.press('ArrowUp')
  await page.waitForFunction(() => document.activeElement?.matches('[role="menuitem"]'))
  assert.equal(await menuItems.last().evaluate(e => e === document.activeElement), true)
  await page.keyboard.press('Escape')
  result.checks.push('Account keyboard opening, Home/End, Escape and focus restoration')

  await page.goto(base + '/?section=activities')
  await open('Lọc loại')
  const activityOption = panel('Lọc loại').getByRole('option').nth(1)
  const activityText = await activityOption.innerText()
  const request = page.waitForRequest(request => new URL(request.url()).pathname === '/api/activities' && new URL(request.url()).searchParams.has('type'))
  await activityOption.click()
  await request
  assert.match(await page.getByRole('combobox', { name: 'Lọc loại', exact: true }).innerText(), new RegExp(activityText))
  result.checks.push('Activity filter still sends its numeric API query')

  await page.goto(base + '/?section=payments&tab=history')
  await open('Lọc trạng thái giao dịch')
  await panel('Lọc trạng thái giao dịch').getByRole('option', { name: 'Đã hủy', exact: true }).click()
  assert.match(await page.getByRole('combobox', { name: 'Lọc trạng thái giao dịch', exact: true }).innerText(), /Đã hủy/)
  result.checks.push('Payment history filter retains its status selection')

  await page.goto(base + '/?section=profile')
  await page.locator('.choice-picker__trigger').first().waitFor()
  await page.setViewportSize({ width: 320, height: 740 })
  const marketControl = page.locator('.choice-picker__trigger').first()
  await marketControl.click()
  await page.locator('.choice-picker__panel').waitFor()
  const rect = await page.locator('.choice-picker__panel').boundingBox()
  assert.ok(rect.x >= 0 && rect.x + rect.width <= 321)
  assert.equal(await page.locator('.choice-picker__panel').getAttribute('data-placement'), 'sheet')
  await page.screenshot({ path: new URL('app-marketplace-mobile.png', out).pathname.slice(1), animations: 'disabled' })
  await page.keyboard.press('Escape')
  result.checks.push('Release profile uses a viewport-bounded mobile choice sheet')
  assert.equal(result.pageErrors.length, 0, result.pageErrors.join('\n'))
  await writeFile(new URL('app-results.json', out), JSON.stringify(result, null, 2))
  console.log(JSON.stringify({ checks: result.checks, pageErrors: result.pageErrors }, null, 2))
} finally { await browser.close() }
