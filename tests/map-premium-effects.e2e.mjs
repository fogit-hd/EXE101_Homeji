import assert from 'node:assert/strict'
import { chromium } from 'playwright'
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
try {
  const page = await browser.newPage({ viewport: { width: 520, height: 600 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(() => {
    const original = requestAnimationFrame.bind(window), cancel = cancelAnimationFrame.bind(window), pending = new Set()
    window.requestAnimationFrame = callback => { const id = original(time => { pending.delete(id); callback(time) }); pending.add(id); return id }
    window.cancelAnimationFrame = id => { pending.delete(id); cancel(id) }
    window.__premiumPendingFrames = () => pending.size
  })
  const base = process.env.BASE_URL || 'http://localhost:5194'
  await page.goto(`${base}/tests/fixtures/map-premium-effects.html`)
  await page.waitForFunction(() => document.querySelectorAll('.map-premium-effect canvas').length === 6)
  const painted = () => page.evaluate(() => [...document.querySelectorAll('.map-premium-effect canvas')].some(c => c.getContext('2d').getImageData(0, 0, c.width, c.height).data.some((v, i) => i % 4 === 3 && v > 10)))
  await page.waitForTimeout(2100)
  assert(await painted(), 'Light-mode effect paints actual pixels')
  assert.equal(await page.locator('.map-pin-cluster:not(.map-pin-cluster--premium) .map-premium-effect').count(), 0)
  assert.equal(await page.evaluate(() => window.__premiumPendingFrames()), 1, 'All effects share one animation frame loop')
  await page.screenshot({ path: 'output/verification/map-premium-assets/integrated-light.png' })
  await page.locator('.map-pin-cluster__count').first().click()
  assert.equal(await page.locator('#markers').getAttribute('data-clicked'), '24', 'Decoration preserves marker click')
  await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; document.body.style.background = '#183448' })
  await page.waitForTimeout(1600)
  assert(await painted(), 'Effects repaint after a theme change')
  await page.screenshot({ path: 'output/verification/map-premium-assets/integrated-dark.png' })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.waitForTimeout(100)
  assert.equal(await page.locator('.map-premium-effect').first().evaluate(e => getComputedStyle(e).display), 'none')
  assert.equal(await page.evaluate(() => window.__premiumPendingFrames()), 0, 'Reduced motion cancels the loop')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.waitForTimeout(600)
  assert.equal(await page.evaluate(() => window.__premiumPendingFrames()), 1)
  await page.evaluate(() => document.querySelector('#markers').remove())
  await page.waitForTimeout(100)
  assert.equal(await page.evaluate(() => window.__premiumPendingFrames()), 0, 'Removing Google Maps marker DOM disposes the loop')
  await page.goto(`${base}/tests/fixtures/map-premium-effects.html`)
  await page.waitForFunction(() => document.querySelectorAll('.map-premium-effect canvas').length === 6)
  await page.waitForTimeout(500)
  await page.evaluate(() => document.querySelector('#markers').style.transform = 'translateY(2000px)')
  await page.waitForTimeout(250)
  assert.equal(await page.evaluate(() => window.__premiumPendingFrames()), 0, 'Offscreen markers do not animate')
  assert.deepEqual(errors, [])
  console.log('PASS map Premium: light/dark, one loop, non-Premium unchanged, clicks, reduced motion, offscreen pause, removal cleanup')
} finally { await browser.close() }
