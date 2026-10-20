import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'

const { chromium } = createRequire(import.meta.url)(process.env.HOMEJI_PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.HOMEJI_TEST_BASE_URL || 'http://127.0.0.1:5511'
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local fixture only')
const out = 'output/verification/glass-search'
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ headless: true, executablePath: process.env.HOMEJI_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'light', reducedMotion: 'reduce' })
const id = '11111111-1111-4111-8111-111111111111'
await context.addInitScript(id => { localStorage.setItem('homeji_access_token', 'search-style-fixture'); localStorage.setItem('homeji_user_id', id) }, id)
await context.route('**/*', route => {
  const url = new URL(route.request().url())
  if (url.origin !== new URL(base).origin) return route.abort()
  if (url.pathname.startsWith('/hubs/')) return route.fulfill({ status: 503, body: '' })
  if (!url.pathname.startsWith('/api/')) return route.continue()
  let json = []
  if (url.pathname === '/api/profile/me') json = { id, displayName: 'Nguyễn Văn An', role: 1, onboardingCompleted: true }
  if (url.pathname === '/api/wallet') json = { userId: id, balance: 350000, isActivated: true }
  if (url.pathname === '/api/subscriptions/me') json = { tier: 1, isPremium: false, packageCode: 'free' }
  if (url.pathname === '/api/chatbot/popup-config') json = { enabled: false }
  if (url.pathname === '/api/search-interests') json = { settings: { enabled: false }, suggestions: [], following: [], rooms: [] }
  return route.fulfill({ json })
})
const page = await context.newPage()
const errors = []
page.on('pageerror', e => errors.push(e.message))
async function ready() {
  await page.locator('.hj-header').waitFor()
  const skip = page.getByRole('button', { name: 'Bỏ qua', exact: true })
  await skip.waitFor({ state: 'visible', timeout: 4000 }).catch(() => {})
  if (await skip.isVisible()) await skip.click()
  await page.locator('.hj-intro').waitFor({ state: 'hidden' })
}
async function audit(shell) {
  await shell.locator('input').waitFor()
  await page.waitForFunction(e => e.style.getPropertyValue('--glass-lens-filter').includes('url('), await shell.elementHandle())
  assert.match(await shell.evaluate(e => getComputedStyle(e).backdropFilter), /url\(/)
  assert.ok(await shell.evaluate(e => e.hasAttribute('data-glass-search')))
  const input = shell.locator('input')
  const style = await input.evaluate(e => ({ background: getComputedStyle(e).backgroundColor, filter: getComputedStyle(e).filter, backdrop: getComputedStyle(e).backdropFilter }))
  assert.equal(style.background, 'rgba(0, 0, 0, 0)')
  assert.equal(style.filter, 'none')
  assert.equal(style.backdrop, 'none')
  await input.focus()
  assert.equal(await shell.evaluate(e => getComputedStyle(e).outlineStyle), 'solid')
}
try {
  await page.goto(base + '/?section=marketplace&market=browse'); await ready()
  const header = page.locator('.hj-search__field')
  await page.locator('.hj-search__field[data-glass-search]').waitFor()
  for (const theme of ['light', 'dark']) {
    await page.evaluate(t => { document.documentElement.dataset.theme = t }, theme)
    await audit(header)
    await header.locator('input').fill('bàn làm việc')
    assert.equal(await header.locator('input').inputValue(), 'bàn làm việc')
    await header.getByRole('button', { name: 'Xóa tìm kiếm', exact: true }).click()
    assert.equal(await header.locator('input').inputValue(), '')
    await header.screenshot({ path: `${out}/header-${theme}.png` })
  }
  await header.locator('input').fill('bàn học')
  await header.locator('input').press('Enter')
  await page.waitForURL(url => url.searchParams.get('q') === 'bàn học')
  await page.goto(base + '/?section=profile'); await ready()
  await page.getByRole('combobox', { name: 'Trường học', exact: true }).click()
  const picker = page.locator('.choice-picker__search-wrap[data-glass-search]')
  await picker.waitFor(); await audit(picker)
  await picker.locator('input').fill('FPT')
  assert.equal(await picker.locator('input').inputValue(), 'FPT')
  await picker.screenshot({ path: `${out}/picker.png` })
  await page.keyboard.press('Escape')
  await page.getByRole('dialog', { name: 'Trường học', exact: true }).waitFor({ state: 'hidden' })
  await page.goto(base + '/?section=messages'); await ready()
  const inbox = page.locator('.map-messages__inbox-search[data-glass-search]')
  await inbox.waitFor(); await audit(inbox)
  await inbox.locator('input').fill('Nguyễn')
  assert.equal(await inbox.locator('input').inputValue(), 'Nguyễn')
  await inbox.screenshot({ path: `${out}/inbox.png` })
  // Exercise the map shell without loading the external Maps SDK.
  await page.evaluate(() => {
    const host = document.createElement('section'); host.id = 'map-search-fixture'
    host.style.cssText = 'position:fixed;left:24px;top:180px;z-index:9999;padding:24px;background:repeating-linear-gradient(90deg,#c8dbd4 0 28px,#7ba99a 28px 30px)'
    host.innerHTML = '<div class="gmaps-omnibox__card"><form class="gmaps-omnibox__bar"><input aria-label="Tìm kiếm bản đồ thử nghiệm" value="Thủ Đức"></form></div>'
    document.querySelector('#root').append(host)
  })
  const map = page.locator('#map-search-fixture .gmaps-omnibox__bar')
  await audit(map)
  assert.equal(await page.locator('#map-search-fixture .gmaps-omnibox__card').evaluate(e => getComputedStyle(e).backgroundColor), 'rgba(0, 0, 0, 0)')
  await map.screenshot({ path: `${out}/map-shell.png` })
  await page.evaluate(() => document.querySelector('#map-search-fixture').remove())
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Mở tìm kiếm', exact: true }).click()
  await page.locator('.hj-search-overlay .hj-search__field[data-glass-search]').waitFor()
  await audit(page.locator('.hj-search-overlay .hj-search__field'))
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  await page.screenshot({ path: `${out}/mobile.png` })
  assert.deepEqual(errors, [])
  console.log('PASS real header/picker/inbox/mobile search glass; transparent unfiltered text; focus ring; input/clear/Enter/Escape; no horizontal overflow')
} finally { await browser.close() }
