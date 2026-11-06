import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'

const { chromium } = createRequire(import.meta.url)(process.env.HOMEJI_PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.HOMEJI_TEST_BASE_URL || 'http://127.0.0.1:5511'
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local fixture only')
const out = 'output/verification/glass-banner-actions'
await mkdir(out, { recursive: true })
await writeFile(`${out}/index.html`, '<!doctype html><html lang="vi" data-theme="light"><meta charset="utf-8"><div id="root"></div><script type="module" src="./probe.tsx"></script></html>')
await writeFile(`${out}/probe.tsx`, `
import React,{useEffect}from'react';import{createRoot}from'react-dom/client';
import{MemoryRouter,useLocation}from'react-router-dom';import{PromoBanner}from'/src/components/hub/PromoBanner.tsx';
import{LiquidGlassEffects}from'/src/components/ui/LiquidGlassEffects.tsx';
import'/src/index.css';import'/src/liquid-glass.css';import'/src/components/theme/dark-theme.css';import'/src/glass-controls.css';
function Probe(){const l=useLocation();useEffect(()=>{document.body.dataset.route=l.pathname+l.search},[l]);return <div style={{maxWidth:1000,padding:24}}><PromoBanner/></div>}
createRoot(document.getElementById('root')).render(<MemoryRouter><LiquidGlassEffects/><Probe/></MemoryRouter>);
`)
const browser = await chromium.launch({ headless: true, executablePath: process.env.HOMEJI_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const page = await browser.newPage({ viewport: { width: 1000, height: 450 } })
const errors = []
page.on('pageerror', e => errors.push(e.message))
try {
  await page.goto(`${base}/${out}/index.html`)
  const link = page.getByRole('link', { name: 'Mời bạn & nhận quà →', exact: true })
  await link.waitFor()
  for (const theme of ['light', 'dark']) {
    await page.evaluate(t => { document.documentElement.dataset.theme = t }, theme)
    assert.equal(await link.evaluate(e => getComputedStyle(e).backdropFilter), 'none', 'Excluded since 498def3 so the authored fill stays readable')
    assert.equal(await link.getAttribute('data-glass-control'), null)
    assert.equal(await link.evaluate(e => getComputedStyle(e).color), 'rgb(24, 59, 70)', 'Ink stays dark over the light banner illustration')
    assert.ok(await page.locator('.hub-promo__dots button').evaluateAll(es => es.every(e => !e.hasAttribute('data-glass-control'))), 'Small pagination markers keep their own geometry')
    await page.locator('.hub-promo').screenshot({ path: `${out}/${theme}.png`, animations: 'disabled' })
  }
  await link.click()
  await page.waitForFunction(() => document.body.dataset.route.includes('/referrals'))
  await page.getByRole('button', { name: 'Banner 5', exact: true }).click()
  const ai = page.getByRole('button', { name: 'Hỏi AI ngay →', exact: true })
  await ai.waitFor()
  assert.equal(await ai.evaluate(e => getComputedStyle(e).backdropFilter), 'none')
  // Since 7fe204c a request waits until the lazy chat subscribes, so subscribe the way the chat does.
  await page.evaluate(async () => { const { onHomejiAiToggle } = await import('/src/lib/homejiAiLauncher.ts'); onHomejiAiToggle(detail => { document.body.dataset.aiOpened = String(detail.open) }) })
  await ai.click()
  assert.equal(await page.locator('body').getAttribute('data-ai-opened'), 'true')
  assert.deepEqual(errors, [])
  console.log('PASS: banner link and AI button stay out of glass with their own fill; link navigation and AI event remain intact; pagination and light/dark ink stay readable')
} finally { await browser.close() }
