// A visitor opening the landing page should not pay for sections they have not reached:
// the map's rooms load only when the map is near, and signed-in-only pricing never loads.
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const base = process.env.HOMEJI_TEST_BASE_URL || 'http://127.0.0.1:5555'
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Local fixtures only')

const browser = await chromium.launch({ headless: true, executablePath: process.env.HOMEJI_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  const calls = []
  await context.route('**/*', route => {
    const url = new URL(route.request().url())
    if (url.origin !== new URL(base).origin) return route.abort()
    if (url.pathname.startsWith('/hubs/')) return route.fulfill({ status: 503, body: '' })
    if (!url.pathname.startsWith('/api/')) return route.continue()
    calls.push(url.pathname + url.search)
    return route.fulfill({ json: [] })
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${base}/`, { waitUntil: 'load', timeout: 45000 })
  const skip = page.getByRole('button', { name: 'Bỏ qua', exact: true })
  if (await skip.isVisible().catch(() => false)) await skip.click()
  await page.locator('#map').waitFor({ state: 'attached' })
  await page.waitForTimeout(2500)

  const mapRooms = () => calls.filter(path => path.startsWith('/api/rental-posts') && path.includes('pageSize=24'))
  assert.deepEqual(calls.filter(path => /subscriptions\/(packages|price-announcements)/.test(path)), [], 'Visitors never see offers, so pricing is not fetched')
  assert.equal(mapRooms().length, 0, 'The map rooms wait until the map is near')

  await page.locator('#map').scrollIntoViewIfNeeded()
  await page.waitForFunction(() => document.querySelector('#map')?.getBoundingClientRect().top < innerHeight)
  await page.waitForTimeout(1500)
  assert.equal(mapRooms().length, 1, 'Reaching the map loads its rooms once')

  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(500)
  await page.locator('#map').scrollIntoViewIfNeeded()
  await page.waitForTimeout(1000)
  assert.equal(mapRooms().length, 1, 'Scrolling back does not load them again')
  assert.deepEqual(errors, [])
  console.log('PASS map rooms load when the map is near and only once; visitors skip pricing requests')
} finally {
  await browser.close()
}
