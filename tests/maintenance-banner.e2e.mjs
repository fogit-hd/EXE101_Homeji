import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'

const out = 'output/verification/maintenance-banner'
await mkdir(out, { recursive: true })
await writeFile(out + '/index.html', '<html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
await writeFile(out + '/scene.tsx', `import React from'react';import{createRoot}from'react-dom/client';import{MemoryRouter}from'react-router-dom';import{PremiumLaunchOffer}from'/src/components/payments/PremiumLaunchOffer.tsx';import{LiquidGlassEffects}from'/src/components/ui/LiquidGlassEffects.tsx';import'/src/index.css';import'/src/ui-consistency.css';import'/src/ai-spectrum.css';import'/src/liquid-glass.css';import'/src/product-ui.css';import'/src/glass-controls.css';import'/src/workspace-readability.css';import'/src/home-refinement.css';createRoot(document.getElementById('root')).render(<MemoryRouter initialEntries={[location.search.includes('admin')?'/admin':'/']}><main><h1>Homeji</h1></main><PremiumLaunchOffer/><LiquidGlassEffects/></MemoryRouter>);`)
const browser = await chromium.launch({ headless: true, channel: 'msedge' })
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
const errors = [], writes = []
page.on('pageerror', error => errors.push(error.message))
await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ contentType: 'text/css', body: '' }))
const notice = { id: 'maintenance-one', title: 'Bảo trì thanh toán', message: 'Homeji nâng cấp hệ thống thanh toán. Bạn vẫn có thể xem phòng.', scheduledStartAt: '2026-11-02T16:00:00Z', scheduledEndAt: '2026-11-02T16:30:00Z', createdAt: '2026-11-02T08:00:00Z', expiresAt: '2026-11-02T16:30:00Z' }
let notices = [notice], maintenanceFails = false, offer = true
await page.route('**/api/**', route => {
  const path = new URL(route.request().url()).pathname
  if (!path.startsWith('/api/')) return route.continue()
  if (route.request().method() !== 'GET') writes.push(path)
  if (path === '/api/maintenance-announcements') return route.fulfill(maintenanceFails ? { status: 503, json: { detail: 'Offline' } } : { json: notices })
  if (path === '/api/subscriptions/packages') return route.fulfill({ json: offer ? [{ code: 'PREMIUM_MONTHLY', name: 'Premium', price: 49000, originalPrice: 99000, durationDays: 30, offerEndsAt: '2026-11-08T08:12:28Z', benefits: [] }] : [] })
  return route.fulfill({ json: [] })
})
const url = 'http://127.0.0.1:5541/' + out + '/index.html'
try {
  await page.clock.install({ time: new Date('2026-11-02T08:00:00Z') })
  await page.clock.pauseAt(new Date('2026-11-02T08:00:01Z'))
  for (const width of [1366, 390, 320]) {
    await page.setViewportSize({ width, height: 768 })
    await page.goto(url)
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
    await page.reload()
    const modal = page.getByRole('dialog')
    await modal.getByRole('heading', { name: notice.title }).waitFor()
    assert.equal(await modal.count(), 1)
    assert.equal(await modal.getByText('GIẢM 51%').count(), 0)
    await modal.getByText(/23:00.*02[-/]11/).waitFor()
    assert.equal(await modal.locator('[data-glass-control]').count(), 0)
    const box = await modal.boundingBox()
    assert.ok(box.width <= width && box.x >= 0 && box.height <= 736)
    await page.screenshot({ path: `${out}/banner-${width}.png` })
    await page.keyboard.press('Escape')
    await page.getByRole('heading', { name: /Homeji lo bản nháp/ }).waitFor()
    await page.getByRole('button', { name: 'Đóng thông báo Premium' }).click()
  }
  // No authentication needed, and dismissal does not mark account notifications read.
  assert.equal(await page.evaluate(() => localStorage.getItem('homeji_access_token')), null)
  await page.reload()
  assert.equal(await page.getByRole('dialog').count(), 0)
  notices = [{ ...notice, id: 'maintenance-two', title: 'Lịch bảo trì mới' }]
  await page.evaluate(async () => { const events = await import('/src/lib/sellerOrderAlerts.ts'); window.dispatchEvent(new CustomEvent(events.NOTIFICATION_RECEIVED, { detail: { notification: { type: 14 } } })) })
  await page.getByRole('heading', { name: 'Lịch bảo trì mới' }).waitFor()
  await page.clock.runFor(14999)
  assert.equal(await page.getByRole('dialog').isVisible(), true)
  await page.clock.runFor(1)
  await page.getByRole('dialog').waitFor({ state: 'detached' })
  await page.reload()
  assert.equal(await page.getByRole('dialog').count(), 0)
  notices = [{ ...notice, id: 'expired', expiresAt: '2026-11-02T07:00:00Z' }]
  offer = false
  await page.reload()
  await page.waitForLoadState('networkidle')
  assert.equal(await page.getByRole('dialog').count(), 0)
  notices = [notice]
  await page.goto(url + '?admin')
  await page.waitForLoadState('networkidle')
  assert.equal(await page.getByRole('dialog').count(), 0)
  maintenanceFails = true; offer = true
  await page.goto(url)
  await page.evaluate(() => sessionStorage.clear())
  await page.reload()
  await page.getByRole('heading', { name: /Homeji lo bản nháp/ }).waitFor()
  assert.equal(await page.getByRole('dialog').getByText(/Ưu đãi đến|Giờ Việt Nam|Áp dụng từ/).count(), 0)
  assert.deepEqual(writes, [])
  assert.deepEqual(errors, [])
  console.log('PASS public maintenance priority, mobile widths, schedule in Vietnam time, Escape, persisted dismissal, live refresh, exact 15-second timeout, expiry, admin exclusion and API failure fallback; no purchase or notification write')
} finally { await browser.close() }
