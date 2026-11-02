import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'

const base = process.env.HOMEJI_TEST_BASE_URL || 'http://127.0.0.1:5541'
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local fixture origin only')
const out = 'output/verification/intro-banner-order'
await mkdir(out, { recursive: true })
await writeFile(out + '/index.html', '<html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
await writeFile(out + '/scene.tsx', `import React from'react';import{createRoot}from'react-dom/client';import{MemoryRouter}from'react-router-dom';import{BrandIntro}from'/src/components/intro/BrandIntro.tsx';import{PremiumLaunchOffer}from'/src/components/payments/PremiumLaunchOffer.tsx';import{NetworkStatusProvider}from'/src/contexts/NetworkStatusContext.tsx';import{markHomeReady}from'/src/lib/introGate.ts';import'/src/index.css';localStorage.clear();sessionStorage.clear();document.documentElement.dataset.intro='1';markHomeReady();createRoot(document.getElementById('root')).render(<MemoryRouter initialEntries={['/']}><NetworkStatusProvider><BrandIntro/><PremiumLaunchOffer/><main><h1>Homeji</h1></main></NetworkStatusProvider></MemoryRouter>);`)

const browser = await chromium.launch({ headless: true, channel: 'msedge' })
const context = await browser.newContext({ viewport: { width: 1366, height: 768 } })
const page = await context.newPage()
const errors = [], apiRequests = []
page.on('pageerror', error => errors.push(error.message))
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
page.on('request', request => { if (request.url().includes('/api/')) apiRequests.push(new URL(request.url()).pathname) })
const offerEndsAt = '2026-11-08T08:12:28Z'
await page.route('**/api/**', route => {
  const path = new URL(route.request().url()).pathname
  if (!path.startsWith('/api/')) return route.continue()
  apiRequests.push(path)
  if (path === '/api/maintenance-announcements') return route.fulfill({ json: [] })
  if (path === '/api/subscriptions/packages') return route.fulfill({ json: [{ code: 'PREMIUM_MONTHLY', name: 'Premium', price: 49000, originalPrice: 99000, durationDays: 30, offerEndsAt, benefits: [] }] })
  if (path === '/api/subscriptions/price-announcements') return route.fulfill({ json: [] })
  return route.fulfill({ json: [] })
})

try {
  await page.goto(base + '/' + out + '/index.html')
  const intro = page.locator('.hj-intro')
  await intro.waitFor({ state: 'attached', timeout: 5000 }).catch(async error => {
    console.error(JSON.stringify({ errors, apiRequests, root: await page.locator('#root').innerHTML().catch(() => '') }))
    throw error
  })
  await page.waitForFunction(() => document.fonts.status === 'loaded')
  await page.waitForTimeout(250)
  assert.ok(apiRequests.includes('/api/subscriptions/packages'), `Subscription packages not requested: ${apiRequests.join(', ')}`)
  assert.ok(apiRequests.includes('/api/maintenance-announcements'), `Maintenance notices not requested: ${apiRequests.join(', ')}`)
  assert.equal(await page.locator('.premium-launch-offer').count(), 0, 'Discount dialog must wait while the logo intro is visible')

  await page.evaluate(() => window.dispatchEvent(new Event('offline')))
  await page.waitForTimeout(100)
  assert.equal(await page.locator('.network-banner').count(), 0, 'Network notices must wait while the logo intro is visible')

  await intro.waitFor({ state: 'detached', timeout: 15000 })
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('heading', { name: /Homeji lo bản nháp/ }).waitFor()
  await page.locator('.network-banner--offline').waitFor()
  await page.screenshot({ path: out + '/after-intro.png' })
  assert.deepEqual(errors, [])
  console.log('PASS: Premium discount and network notice stay hidden during the logo intro and appear after its handoff')
} finally {
  await browser.close()
}
