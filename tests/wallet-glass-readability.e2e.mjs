import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'

const { chromium } = createRequire(import.meta.url)(process.env.HOMEJI_PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.HOMEJI_TEST_BASE_URL || 'http://127.0.0.1:5511'
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local fixture only')
const out = 'output/verification/wallet-glass-readability'
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ headless: true, executablePath: process.env.HOMEJI_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, colorScheme: 'light' })
const id = '11111111-1111-4111-8111-111111111111'
await context.addInitScript(id => {
  localStorage.setItem('homeji_access_token', 'wallet-readability-fixture')
  localStorage.setItem('homeji_user_id', id)
}, id)
await context.route('**/*', route => {
  const url = new URL(route.request().url())
  if (url.origin !== new URL(base).origin) return route.abort()
  if (url.pathname.startsWith('/hubs/')) return route.fulfill({ status: 503, body: '' })
  if (!url.pathname.startsWith('/api/')) return route.continue()
  // No transaction endpoints are invoked by this visual check.
  if (route.request().method() !== 'GET' && /\/api\/(wallet|payments)\//.test(url.pathname)) throw Error('Unexpected transaction write: ' + url.pathname)
  let json = []
  if (url.pathname === '/api/profile/me') json = { id, displayName: 'Khách thử nghiệm', role: 1, onboardingCompleted: true }
  if (url.pathname === '/api/wallet') json = { userId: id, balance: 3205600, isActivated: true, minimumTopUp: 10000, maximumTopUp: 10000000, minimumWithdrawalReserve: 20000 }
  if (url.pathname === '/api/subscriptions/me') json = { tier: 1, isPremium: false, packageCode: 'free' }
  if (url.pathname === '/api/chatbot/popup-config') json = { enabled: false }
  if (url.pathname === '/api/search-interests') json = { settings: { enabled: false }, suggestions: [], following: [], rooms: [] }
  return route.fulfill({ json })
})
const page = await context.newPage()
const errors = [], results = []
page.on('pageerror', error => errors.push(error.message))
const luminance = color => {
  const channels = color.match(/[\d.]+/g).slice(0, 3).map(Number).map(c => c / 255).map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4)
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722
}
try {
  await page.goto(base + '/?section=marketplace&market=wallet&wallet=deposit')
  await page.locator('.wallet-submit button[data-glass-control]').waitFor()
  const skip = page.getByRole('button', { name: 'Bỏ qua', exact: true })
  if (await skip.isVisible()) await skip.click()
  await page.locator('.hj-intro').waitFor({ state: 'hidden' })
  for (const theme of ['light', 'dark']) for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1100 })
    await page.evaluate(theme => { document.documentElement.dataset.theme = theme }, theme)
    for (const rail of await page.locator('.liquid-tabs').all()) {
      const opacity = await rail.evaluate(e => {
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = getComputedStyle(e).getPropertyValue('--tabs-track').trim()
        ctx.fillRect(0, 0, 1, 1)
        return ctx.getImageData(0, 0, 1, 1).data[3] / 255
      })
      assert.ok(opacity < .35, 'Tab rail must transmit the backdrop, rather than hide the lens behind an opaque green track')
    }
    for (const tab of ['Nạp tiền', 'Rút tiền']) {
      await page.getByRole('tab', { name: tab, exact: true }).click()
      await page.locator(tab === 'Nạp tiền' ? '.wallet-deposit__amount input' : '#wallet-panel-withdraw').waitFor()
      const submit = page.locator('.wallet-submit button')
      await submit.waitFor()
      await submit.scrollIntoViewIfNeeded()
      await submit.hover()
      await page.screenshot({ path: `${out}/${theme}-${width}-${tab === 'Nạp tiền' ? 'deposit' : 'withdraw'}.png`, fullPage: true })
      const style = await submit.evaluate(e => ({ ink: getComputedStyle(e).color, fill: getComputedStyle(e).backgroundColor, face: getComputedStyle(e, '::after').backdropFilter, reflection: getComputedStyle(e, '::after').backgroundImage }))
      const [a, b] = [luminance(style.ink), luminance(style.fill)].sort((a, b) => b - a)
      const contrast = (a + .05) / (b + .05)
      results.push({ theme, width, tab, contrast, ...style })
      assert.ok(!style.fill.startsWith('rgba('), 'Transaction fill must remain opaque for predictable contrast')
      assert.ok(contrast >= 4.5, `${tab} ${theme}: text contrast ${contrast.toFixed(2)} must be >= 4.5`)
      assert.equal(style.face, 'none', 'Transaction labels are never optically resampled')
      assert.ok(!style.reflection.includes('linear-gradient'), 'No straight rainbow stripes over labels')
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal overflow')
    }
    const tabs = page.locator('.wallet-tabs')
    const deposit = tabs.getByRole('tab', { name: 'Nạp tiền', exact: true })
    await deposit.scrollIntoViewIfNeeded()
    await deposit.hover()
    await page.mouse.down()
    assert.ok(!(await tabs.locator('.liquid-tabs__lens').evaluate(e => getComputedStyle(e, '::before').backgroundImage)).includes('linear-gradient'), 'Pressed lens uses curved reflections')
    await page.mouse.up()
    await page.waitForFunction(e => !e.hasAttribute('data-lens-travel') && !e.hasAttribute('data-lens-engaged'), await tabs.elementHandle())
    assert.ok(await tabs.evaluate(e => Number(getComputedStyle(e.querySelector('button')).zIndex) > Number(getComputedStyle(e.querySelector('.liquid-tabs__lens')).zIndex)), 'Tab labels sit above the optical backdrop')
    await tabs.screenshot({ path: `${out}/${theme}-${width}-tabs.png` })
  }
  assert.deepEqual(errors, [])
  await writeFile(`${out}/results.json`, JSON.stringify({ results, errors }, null, 2))
  console.log('PASS: wallet primary labels contrast >=4.5, no foreground resampling or rainbow stripes; tabs clickable; light/dark desktop/mobile')
} finally { await browser.close() }
