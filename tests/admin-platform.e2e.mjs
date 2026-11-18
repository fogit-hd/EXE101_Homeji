import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const base = new URL(process.env.HOMEJI_TEST_BASE_URL || 'http://127.0.0.1:5542')
assert.ok(['localhost', '127.0.0.1'].includes(base.hostname))
const admin = '11111111-1111-4111-8111-111111111111'
const browser = await chromium.launch({ headless: true, channel: 'msedge' })

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' })
  page.setDefaultTimeout(12_000)
  page.on('pageerror', error => console.error('Browser error', error.message))
  await page.addInitScript(id => {
    localStorage.setItem('homeji_access_token', 'fixture')
    localStorage.setItem('homeji_user_id', id)
    localStorage.setItem('homeji_analytics_consent_v1', 'rejected')
    sessionStorage.setItem('hj-intro-seen', '1')
  }, admin)
  let requests = 0
  await page.route('**/*', route => {
    const url = new URL(route.request().url())
    if (url.pathname === '/api/profile/me') {
      return route.fulfill({ json: { id: admin, displayName: 'Admin fixture', role: 3, onboardingCompleted: true } })
    }
    if (url.pathname === '/api/admin/platform') {
      requests++
      return requests === 2
        ? route.fulfill({ status: 503, json: { detail: 'Fixture outage' } })
        : route.fulfill({ json: {
          checkedAt: '2026-11-18T02:00:00Z', publisherConfigured: false, analyticsConfigured: true,
          telemetryConfigured: true, pendingSample: 1000, retryingInSample: 7, sampleLimited: true,
          publicationDays: [{ date: '2026-11-18', count: 3 }],
        } })
    }
    if (url.pathname === '/api/subscriptions/me') return route.fulfill({ json: { tier: 1, isPremium: false } })
    if (url.pathname === '/api/search-interests') {
      return route.fulfill({ json: { settings: { enabled: false }, suggestions: [], following: [], rooms: [] } })
    }
    if (url.pathname.startsWith('/hubs/')) return route.fulfill({ status: 503, body: '' })
    if (url.pathname.startsWith('/api/')) return route.fulfill({ json: [] })
    return url.origin === base.origin ? route.continue() : route.abort()
  })

  await page.goto(new URL('/admin/platform', base).href)
  const skip = page.getByRole('button', { name: 'Bỏ qua', exact: true })
  if (await skip.isVisible()) await skip.click()
  await page.locator('.admin-nav').waitFor().catch(async error => {
    console.error(page.url(), (await page.locator('body').innerText()).slice(0, 350))
    throw error
  })
  const link = page.getByRole('navigation', { name: 'Mục quản trị' })
    .getByRole('link', { name: 'Vận hành hệ thống', exact: true })
  assert.equal(await link.getAttribute('aria-current'), 'page')
  await page.getByRole('heading', { level: 1, name: 'Vận hành hệ thống' }).waitFor()
  await page.getByText('Chưa bật', { exact: true }).waitFor()
  assert.equal(await page.locator('.admin-platform-queue strong').first().textContent(), '1.000+')
  await page.getByRole('table').getByRole('cell', { name: '3', exact: true }).waitFor()
  const grafana = page.getByRole('link', { name: 'Mở Grafana (tab mới)' })
  if (await grafana.isVisible()) assert.equal(await grafana.getAttribute('rel'), 'noopener noreferrer')

  await page.getByRole('button', { name: 'Làm mới' }).click()
  await page.getByText(/Không làm mới được/).waitFor()
  await page.getByRole('table').getByRole('cell', { name: '3', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Làm mới' }).click()
  await page.getByText(/Không làm mới được/).waitFor({ state: 'hidden' })

  await page.setViewportSize({ width: 320, height: 900 })
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
  console.log('PASS admin navigation, status, refresh recovery and narrow viewport')
} finally {
  await browser.close()
}
