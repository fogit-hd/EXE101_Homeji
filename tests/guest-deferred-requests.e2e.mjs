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
  const native = Array.from({ length: 101 }, (_, i) => ({
    id: `native-${i}`, title: `Phòng Homeji ${i}`, type: 1, price: 2500000, area: 25,
    address: 'Lê Văn Việt, Phường Hiệp Phú', latitude: 10.84, longitude: 106.79,
  }))
  const sources = Array.from({ length: 50 }, (_, i) => ({
    id: `source-${i}`, sourceUrl: `https://mogi.vn/tin-${i}`, title: `Phòng nguồn ngoài ${i}`,
    address: 'Đường số 8, Phường Long Trường', latitude: 10.81, longitude: 106.83, price: 2300000, imageUrls: [],
  }))
  sources.push({ ...sources[0], id: native[0].id },
    { ...sources[0], id: 'no-point', latitude: null },
    { ...sources[0], id: 'expired', sourceExpiresAt: '2000-01-01T00:00:00Z' })
  await context.route('**/*', route => {
    const url = new URL(route.request().url())
    if (url.origin !== new URL(base).origin) return route.abort()
    if (url.pathname.startsWith('/hubs/')) return route.fulfill({ status: 503, body: '' })
    if (!url.pathname.startsWith('/api/')) return route.continue()
    calls.push(url.pathname + url.search)
    const page = Number(url.searchParams.get('page')) || 1
    const pageSize = Number(url.searchParams.get('pageSize')) || 20
    const inventory = url.pathname === '/api/rental-posts' ? native
      : url.pathname === '/api/rental-source-listings' ? sources : null
    if (inventory) return route.fulfill({ json: inventory.slice((page - 1) * pageSize, page * pageSize) })
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

  const mapRooms = () => calls.filter(path => path.startsWith('/api/rental-posts?') && path.includes('pageSize=100'))
  assert.deepEqual(calls.filter(path => /subscriptions\/(packages|price-announcements)/.test(path)), [], 'Visitors never see offers, so pricing is not fetched')
  assert.equal(mapRooms().length, 0, 'The map rooms wait until the map is near')

  await page.locator('#map').scrollIntoViewIfNeeded()
  await page.waitForFunction(() => document.querySelector('#map')?.getBoundingClientRect().top < innerHeight)
  const map = page.locator('#map')
  await map.getByText('151 tin trên bản đồ').waitFor()
  assert.equal(await map.locator('.guest-map__card-wrap').count(), 151)
  assert.equal(await map.getByRole('link', { name: /đăng nhập/i }).count(), 0)
  assert.deepEqual(mapRooms().map(path => new URL(path, base).searchParams.get('page')), ['1', '2'])
  assert.ok(mapRooms().every(path => !new URL(path, base).searchParams.has('keyword')), 'Default view includes addresses without the city name')

  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(500)
  await page.locator('#map').scrollIntoViewIfNeeded()
  await page.waitForTimeout(1000)
  assert.equal(mapRooms().length, 2, 'Scrolling back does not load them again')
  assert.deepEqual(errors, [])
  console.log('PASS visitors see all 151 mappable listings; duplicate, expired and unlocated entries are skipped')
} finally {
  await browser.close()
}
