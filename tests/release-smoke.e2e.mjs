import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const base = new URL(process.env.HOMEJI_TEST_BASE_URL || 'http://127.0.0.1:4173')
assert.ok(['127.0.0.1', 'localhost'].includes(base.hostname), 'Release smoke uses local fixtures')
const id = '11111111-1111-4111-8111-111111111111'
const first = { id: 'a', type: 12, title: 'Thông báo mới', message: 'Nội dung kiểm thử', isRead: false, createdAt: '2026-11-26T01:00:00Z' }
const older = { ...first, id: 'b', title: 'Thông báo cũ' }
const before = { id: first.id, createdAt: first.createdAt }
const counts = { messages: 0, other: 2 }
const browser = await chromium.launch({ executablePath: process.env.HOMEJI_CHROME_PATH })

try {
  const context = await browser.newContext({ reducedMotion: 'reduce', serviceWorkers: 'block' })
  const errors = []
  const cursors = []
  await context.addInitScript(() => sessionStorage.setItem('hj-intro-seen', '1'))
  await context.route('**/*', route => {
    const url = new URL(route.request().url())
    if (url.origin !== base.origin) return route.abort()
    if (url.pathname.startsWith('/hubs/')) return route.fulfill({ status: 503 })
    if (!url.pathname.startsWith('/api/')) return route.continue()
    if (url.pathname === '/api/account/session') return route.fulfill({ json: { accessToken: 'fixture', userId: id } })
    if (url.pathname === '/api/profile/me') return route.fulfill({ json: { id, displayName: 'Homeji kiểm thử', role: 1, onboardingCompleted: true } })
    if (url.pathname === '/api/search-interests') return route.fulfill({ json: { settings: { enabled: false }, following: [], suggestions: [], rooms: [] } })
    if (url.pathname === '/api/chatbot/popup-config') return route.fulfill({ json: { enabled: false } })
    if (url.pathname === '/api/notifications/unread-counts') return route.fulfill({ json: counts })
    if (url.pathname === '/api/notifications/page') {
      const cursor = url.searchParams.get('beforeId')
      if (cursor) cursors.push([cursor, url.searchParams.get('beforeCreatedAt')])
      return route.fulfill({ json: { items: cursor ? [older] : [first], nextCursor: cursor ? null : before, unreadCounts: counts } })
    }
    return route.fulfill({ json: [] })
  })

  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(new URL('/receipts', base).href)
  await page.waitForURL('**/login')
  await context.addCookies([{ name: 'homeji_session_hint', value: '1', url: base.origin }])
  await page.goto(new URL('/?section=notifications', base).href)
  await page.getByText(first.title, { exact: true }).waitFor()
  await page.getByRole('button', { name: 'Xem thông báo cũ hơn' }).click()
  await page.getByText(older.title, { exact: true }).waitFor()
  assert.equal(await page.getByText(first.title, { exact: true }).count(), 1)
  assert.deepEqual(cursors, [[before.id, before.createdAt]])
  assert.deepEqual(errors, [])
  console.log('PASS guest authentication gate and notification cursor on the production bundle')
} finally {
  await browser.close()
}
