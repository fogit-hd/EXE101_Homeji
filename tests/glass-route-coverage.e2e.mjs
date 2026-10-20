import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'

const { chromium } = createRequire(import.meta.url)(process.env.HOMEJI_PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.HOMEJI_TEST_BASE_URL || 'http://127.0.0.1:5515'
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local fixtures only')
const out = 'output/verification/glass-route-coverage'
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ headless: true, executablePath: process.env.HOMEJI_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const id = '11111111-1111-4111-8111-111111111111'
const results = []
try {
  for (const authenticated of [false, true]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
    await context.addInitScript(({ id, authenticated }) => {
      localStorage.setItem('hj-intro-seen', '1')
      if (authenticated) {
        localStorage.setItem('homeji_access_token', 'glass-coverage-fixture'); localStorage.setItem('homeji_user_id', id)
        localStorage.setItem('homeji:map-search-recent', JSON.stringify([{ keyword: 'Thủ Đức' }]))
      }
    }, { id, authenticated })
    await context.route('**/*', route => {
      const url = new URL(route.request().url())
      if (url.origin !== new URL(base).origin) return route.abort()
      if (url.pathname.startsWith('/hubs/')) return route.fulfill({ status: 503, body: '' })
      if (!url.pathname.startsWith('/api/')) return route.continue()
      let json = []
      if (url.pathname === '/api/profile/me') json = { id, displayName: 'Nguyễn Văn An', role: 3, onboardingCompleted: true }
      if (url.pathname === '/api/wallet') json = { userId: id, balance: 350000, isActivated: true }
      if (url.pathname === '/api/chatbot/popup-config') json = { enabled: false }
      if (url.pathname === '/api/subscriptions/me') json = { tier: 1, isPremium: false, packageCode: 'free' }
      if (url.pathname === '/api/search-interests') json = { settings: { enabled: false }, suggestions: [], following: [], rooms: [] }
      if (url.pathname === '/api/admin/analytics/product') return route.fulfill({ status: 503, json: { detail: 'Fixture analytics unavailable' } })
      return route.fulfill({ json })
    })
    const routes = authenticated
      ? ['/', ...['listings', 'saved', 'invitations', 'notifications', 'messages', 'appointments', 'payments', 'profile', 'marketplace', 'wanted', 'activities', 'myPosts'].map(section => `/?section=${section}`), '/?section=marketplace&market=wallet&wallet=deposit', '/?section=marketplace&market=wallet&wallet=withdraw', '/receipts', '/admin']
      : ['/login', '/register', '/forgot-password', '/verify-email', '/terms', '/privacy']
    const page = await context.newPage()
    for (const path of routes) {
      const errors = []
      const onError = error => errors.push(error.message)
      page.on('pageerror', onError)
      await page.goto(base + path)
      const skip = page.getByRole('button', { name: 'Bỏ qua', exact: true })
      if (await skip.isVisible().catch(() => false)) await skip.click()
      await page.locator('.hj-intro').waitFor({ state: 'hidden' })
      await page.waitForFunction(() => document.querySelector('[data-glass-control]'))
      await page.locator('.screen-pending').waitFor({ state: 'hidden' })
      if (authenticated && path === '/') {
        await page.locator('.hub-banner__cta[data-glass-control]').waitFor()
        await page.locator('.hub-search a[data-glass-control]').waitFor()
      }
      if (path === '/?section=notifications') {
        const trigger = page.locator('.hj-notify__trigger')
        if (await trigger.getAttribute('aria-expanded') !== 'true') await trigger.click()
        await page.locator('.hj-notify__pop[data-glass-surface]').waitFor()
      }
      const state = await page.evaluate(() => ({
        controls: document.querySelectorAll('[data-glass-control]').length,
        fields: document.querySelectorAll('[data-glass-field]').length,
        searches: document.querySelectorAll('[data-glass-search]').length,
        excludedLeaks: document.querySelectorAll('[data-glass-exclude] [data-glass-control],.marketplace-card__main[data-glass-control],.food-card__main[data-glass-control]').length,
        foregroundFilters: [...document.querySelectorAll('input[data-glass-field],textarea[data-glass-field]')].filter(e => getComputedStyle(e).filter !== 'none').length,
        bodyText: document.body.innerText.length,
      }))
      assert.equal(state.excludedLeaks, 0, path)
      assert.equal(state.foregroundFilters, 0, path)
      assert.ok(state.bodyText > 50, path)
      assert.deepEqual(errors, [], path)
      results.push({ path, ...state })
      if (['/', '/login', '/?section=profile', '/?section=marketplace&market=wallet&wallet=withdraw'].includes(path)) {
        await page.screenshot({ path: `${out}/route-${results.length}.png`, fullPage: true })
      }
      page.off('pageerror', onError)
    }
    await context.close()
  }
  await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2))
  console.log(`PASS: ${results.length} actual route renders with fixture APIs; shared controls registered; dense exceptions and editable text preserved. This is UI coverage, not live business-flow verification.`)
} finally { await browser.close() }
