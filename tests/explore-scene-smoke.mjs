import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'output', 'explore-scene')
await mkdir(outDir, { recursive: true })

async function openPage(browser, { url, width, height }) {
  const page = await browser.newPage({ viewport: { width, height } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(() => {
    sessionStorage.setItem('hj-intro-seen', '1')
  })
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForSelector('#map.explore-scene', { timeout: 45000 })
  return { page, errors }
}

function metrics(page) {
  return page.evaluate(() => {
    const section = document.querySelector('#map.explore-scene')
    const rect = section?.getBoundingClientRect()
    const mapBox = document.querySelector('.explore-scene__map')?.getBoundingClientRect()
    return {
      top: rect?.top ?? null,
      bottom: rect?.bottom ?? null,
      height: rect?.height ?? null,
      mapBottom: mapBox?.bottom ?? null,
      innerHeight: window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      cards: document.querySelectorAll('.explore-card:not(.explore-card--skeleton)').length,
      mapless: section?.classList.contains('is-mapless') ?? false,
      fallback: Boolean(document.querySelector('.explore-scene__map-fallback')),
      title: document.querySelector('.explore-scene__kicker')?.textContent ?? '',
      listHead: document.querySelector('.explore-scene__list-head h3')?.textContent ?? '',
      distances: [...document.querySelectorAll('.explore-card__meta')].slice(0, 5).map(node => node.textContent),
    }
  })
}

const browser = await chromium.launch({
  executablePath: chrome,
  headless: true,
})

try {
  const apiHits = []
  const desktop = await openPage(browser, {
    url: 'http://localhost:5173/#map',
    width: 1440,
    height: 900,
  })
  desktop.page.on('request', request => {
    if (request.url().includes('/api/rental-posts')) apiHits.push(request.url())
  })

  await desktop.page.waitForTimeout(2500)
  const before = await metrics(desktop.page)
  await desktop.page.screenshot({ path: path.join(outDir, 'desktop-map.png'), fullPage: false })

  const search = desktop.page.locator('.explore-search__input')
  await search.click()
  await search.fill('Nông Lâm')
  await desktop.page.waitForTimeout(800)
  const suggestion = desktop.page.locator('[role="option"]', { hasText: /Nông Lâm/i }).first()
  await suggestion.waitFor({ timeout: 20000 })
  apiHits.length = 0
  await suggestion.click()
  await desktop.page.waitForTimeout(4000)
  const after = await metrics(desktop.page)
  const lastApi = apiHits.at(-1) ?? ''
  await desktop.page.screenshot({ path: path.join(outDir, 'desktop-nong-lam.png'), fullPage: false })

  const mobile = await openPage(browser, {
    url: 'http://localhost:5173/#map',
    width: 390,
    height: 844,
  })
  await mobile.page.waitForTimeout(2500)
  const mobileMetrics = await metrics(mobile.page)
  await mobile.page.screenshot({ path: path.join(outDir, 'mobile-map.png'), fullPage: false })

  const denied = await openPage(browser, {
    url: 'http://127.0.0.1:5173/#map',
    width: 1440,
    height: 900,
  })
  await denied.page.waitForTimeout(6000)
  const deniedMetrics = await metrics(denied.page)
  await denied.page.screenshot({ path: path.join(outDir, 'denied-map.png'), fullPage: false })

  const report = {
    desktopBefore: before,
    desktopAfterSearch: after,
    lastApi,
    hasKeyword: /[?&]keyword=/.test(lastApi),
    desktopErrors: desktop.errors,
    mobileMetrics,
    mobileErrors: mobile.errors,
    deniedMetrics,
    deniedErrors: denied.errors,
    shots: {
      desktopMap: 'tests/output/explore-scene/desktop-map.png',
      desktopNongLam: 'tests/output/explore-scene/desktop-nong-lam.png',
      mobileMap: 'tests/output/explore-scene/mobile-map.png',
      deniedMap: 'tests/output/explore-scene/denied-map.png',
    },
  }
  console.log(JSON.stringify(report, null, 2))

  assert.ok(Math.abs(after.top ?? 999) < 120, `section top after search should be <120, got ${after.top}`)
  assert.ok((after.bottom ?? 0) <= after.innerHeight + 12, `section should not overflow bottom, bottom=${after.bottom} ih=${after.innerHeight}`)
  assert.ok((after.mapBottom ?? 0) <= after.innerHeight + 12, `map should not overflow bottom, mapBottom=${after.mapBottom}`)
  assert.equal(after.scrollWidth, after.clientWidth, 'no horizontal overflow after search')
  assert.equal(mobileMetrics.scrollWidth, mobileMetrics.clientWidth, 'no horizontal overflow on mobile')
  assert.equal(report.hasKeyword, false, 'place pick must not send keyword')
  assert.ok((after.cards ?? 0) >= 3, `expected >=3 cards after Nông Lâm when data allows, got ${after.cards}`)
  assert.ok(after.distances.some(text => /cách /.test(text ?? '')), 'cards should show distance')
  assert.ok(
    deniedMetrics.fallback || deniedMetrics.mapless || (deniedMetrics.cards ?? 0) > 0,
    'denied origin keeps list/fallback',
  )
  assert.ok(!(deniedMetrics.fallback === false && deniedMetrics.mapless === false && denied.errors.some(m => /RefererNotAllowed|InvalidKey|ApiNotActivated/i.test(m))), 'maps deny should not white-screen')
  assert.ok(!denied.errors.some(message => /IntersectionObserver|rootMargin|Thử lại/.test(message)), 'no IO crash')
  assert.ok(!desktop.errors.some(message => /IntersectionObserver|rootMargin/.test(message)), 'no IO crash on desktop')
} finally {
  await browser.close()
}
