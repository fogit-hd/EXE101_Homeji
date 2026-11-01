import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'

const base = process.env.HOMEJI_TEST_BASE_URL || 'http://127.0.0.1:5541'
if (!['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) throw new Error('Local fixture only')
const out = 'output/verification/glass-game'
await mkdir(out, { recursive: true })
await writeFile(`${out}/index.html`, '<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
await writeFile(`${out}/scene.tsx`, `
import React,{useState}from'react';import{createRoot}from'react-dom/client';import{MemoryRouter}from'react-router-dom';import{MarketplaceHeader}from'/src/components/marketplace/MarketplaceHeader.tsx';import{LiquidGlassEffects}from'/src/components/ui/LiquidGlassEffects.tsx';import{ChatbotProvider}from'/src/contexts/ChatbotContext.tsx';import{ToastProvider}from'/src/components/toast/ToastProvider.tsx';import{toggleHomejiAi}from'/src/lib/homejiAiLauncher.ts';
import'/src/index.css';import'/src/ui-consistency.css';import'/src/ai-spectrum.css';import'/src/product-ui.css';import'/src/liquid-glass.css';import'/src/glass-controls.css';import'/src/components/theme/dark-theme.css';
function Scene(){const[tab,setTab]=useState('food');return <main style={{padding:16,maxWidth:1100,margin:'auto'}}><p>Dữ liệu kiểm thử local · không giao dịch thật</p><MarketplaceHeader tab={tab} availableBalance={0} walletStatus="ready" sellerActionCount={0} onTabChange={setTab} onOpenSell={()=>{}} onTopUp={()=>{}}/><section id="marketplace-panel" role="tabpanel">Tab hiện tại: {tab}</section><button data-homeji-ai-trigger="" onClick={event=>toggleHomejiAi(event.currentTarget,true)}>Mở AI kiểm thử</button></main>}
createRoot(document.getElementById('root')).render(<MemoryRouter><ToastProvider><ChatbotProvider><LiquidGlassEffects/><Scene/></ChatbotProvider></ToastProvider></MemoryRouter>);`)

const browser = await chromium.launch({ headless: true, executablePath: process.env.HOMEJI_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--enable-webgl', '--enable-unsafe-swiftshader'] })
const results = []
try {
  for (const [width, theme, fallback] of [[390, 'light', false], [1280, 'dark', false], [390, 'dark', true]]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: width < 600 ? 3 : 1, reducedMotion: 'no-preference' })
    await context.addInitScript(({ theme, fallback }) => {
      localStorage.setItem('homeji_access_token', 'fixture')
      document.addEventListener('DOMContentLoaded', () => { document.documentElement.dataset.theme = theme }, { once: true })
      window.__glassStats = { draws: 0, totalCpuMs: 0, maxCpuMs: 0 }
      const originalDraw = WebGLRenderingContext.prototype.drawArrays
      WebGLRenderingContext.prototype.drawArrays = function (...args) {
        const start = performance.now()
        const result = originalDraw.apply(this, args)
        if (this.canvas.classList.contains('liquid-tabs__webgl')) {
          const elapsed = performance.now() - start
          window.__glassStats.draws++
          window.__glassStats.totalCpuMs += elapsed
          window.__glassStats.maxCpuMs = Math.max(window.__glassStats.maxCpuMs, elapsed)
        }
        return result
      }
      if (fallback) {
        const getContext = HTMLCanvasElement.prototype.getContext
        HTMLCanvasElement.prototype.getContext = function (kind, ...args) { return kind === 'webgl' ? null : getContext.call(this, kind, ...args) }
      }
    }, { theme, fallback })
    await context.route('**/src/contexts/AuthContext.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const useAuth=()=>({isAuthenticated:true,profile:{id:"fixture",role:1,onboardingCompleted:true}})' }))
    await context.route('**/src/contexts/AuthModalContext.logic.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const useAuthModal=()=>({isOpen:false,openAuthModal:()=>{}})' }))
    let held = null
    await context.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname
      if (!path.startsWith('/api/')) return route.continue()
      if (path === '/api/chatbot/popup-config') return route.fulfill({ json: { enabled: true, suggestedPrompts: [], historyStorageEnabled: false } })
      if (path === '/api/chatbot/messages') { held = route; return }
      return route.fulfill({ json: [] })
    })
    const page = await context.newPage(), errors = []
    page.on('pageerror', error => errors.push(error.message))
    page.setDefaultTimeout(15000)
    await page.goto(`${base}/${out}/index.html`)
    const tabs = page.getByRole('tablist', { name: 'Chợ Homeji', exact: true })
    await page.waitForFunction(expected => document.querySelector('.marketplace-header__tabs')?.dataset.glassRenderer === expected, fallback ? 'fallback' : 'webgl')
    assert.equal(await page.locator('canvas.liquid-tabs__webgl').count(), fallback ? 0 : 1)
    const frameProbe = page.evaluate(() => new Promise(resolve => {
      const intervals = [], start = performance.now()
      let previous = start
      function sample(now) {
        intervals.push(now - previous); previous = now
        if (now - start < 1000) requestAnimationFrame(sample)
        else {
          intervals.shift()
          intervals.sort((a, b) => a - b)
          resolve({ samples: intervals.length, medianMs: intervals[Math.floor(intervals.length / 2)], p95Ms: intervals[Math.floor(intervals.length * .95)] })
        }
      }
      requestAnimationFrame(sample)
    }))
    await tabs.getByRole('tab', { name: 'Đơn mua', exact: true }).click()
    assert.equal(await tabs.getByRole('tab', { name: 'Đơn mua', exact: true }).getAttribute('aria-selected'), 'true')
    await page.keyboard.press('End')
    assert.equal(await tabs.getByRole('tab', { name: 'Ví Homeji', exact: true }).getAttribute('aria-selected'), 'true')
    await page.keyboard.press('Home')
    await page.waitForFunction(() => !document.querySelector('.marketplace-header__tabs')?.dataset.lensEngaged)
    const initialDraws = await page.evaluate(() => window.__glassStats.draws)
    await page.waitForTimeout(350)
    const settledDraws = await page.evaluate(() => window.__glassStats.draws)
    await page.waitForTimeout(350)
    assert.equal(await page.evaluate(() => window.__glassStats.draws), settledDraws, 'No continuous idle render loop')
    const profile = { ...await page.evaluate(() => {
      const canvas = document.querySelector('.liquid-tabs__webgl')
      if (!canvas) return { ...window.__glassStats, renderer: 'fallback' }
      const gl = canvas.getContext('webgl'), info = gl.getExtension('WEBGL_debug_renderer_info')
      return { ...window.__glassStats, renderer: info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'unavailable', backingPixels: canvas.width * canvas.height }
    }), frameIntervals: await frameProbe }
    assert.ok(settledDraws >= initialDraws)
    await page.screenshot({ path: `${out}/${width}-${theme}-tabs.png`, fullPage: true })
    await page.getByRole('button', { name: 'Chơi một chút', exact: true }).click()
    const game = page.getByRole('dialog', { name: 'Lật thẻ Góc nhà' })
    await game.waitFor()
    const cards = game.locator('.homeji-memory__card')
    assert.equal(await cards.count(), 8)
    const kinds = await cards.locator('.homeji-memory__front > span').allTextContents()
    const pairs = [...new Set(kinds)].map(kind => kinds.flatMap((name, index) => name === kind ? [index] : []))
    for (const pair of pairs) {
      await cards.nth(pair[0]).click()
      await cards.nth(pair[1]).click()
    }
    await game.getByRole('status').filter({ hasText: 'hoàn thành trong 4 lượt' }).waitFor()
    assert.equal(await page.evaluate(() => localStorage.getItem('homeji.memory-best.v1')), '4')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    assert.equal(await cards.first().locator('.homeji-memory__card-inner').evaluate(e => getComputedStyle(e).transitionDuration), '0s')
    await page.screenshot({ path: `${out}/${width}-${theme}-game.png`, fullPage: true })
    const overflow = await game.evaluate(e => e.scrollWidth > e.clientWidth + 1)
    assert.equal(overflow, false)
    await page.keyboard.press('Escape')
    await game.waitFor({ state: 'hidden' })
    assert.equal(await page.getByRole('button', { name: 'Chơi một chút', exact: true }).evaluate(e => e === document.activeElement), true)

    await page.locator('.homeji-assistant').waitFor({ state: 'attached' })
    await page.getByRole('button', { name: 'Mở AI kiểm thử' }).click()
    await page.getByRole('textbox', { name: 'Nhập tin nhắn cho Homeji' }).fill('Xin chào')
    await page.getByRole('button', { name: 'Gửi', exact: true }).click()
    await page.locator('.homeji-assistant__wait-tools').getByRole('button', { name: 'Chơi một chút' }).click()
    await page.getByRole('dialog', { name: 'Lật thẻ Góc nhà' }).waitFor()
    assert.ok(held)
    await held.fulfill({ json: { conversationId: 'fixture', userMessage: { id: 'u', sender: 1, content: 'Xin chào' }, assistantMessage: { id: 'a', sender: 2, content: 'Phản hồi fixture đã sẵn sàng.' }, actions: [] } })
    await page.getByRole('status').filter({ hasText: 'Homeji đã phản hồi.' }).waitFor()
    await page.getByRole('button', { name: 'Quay lại chat', exact: true }).click()
    await page.getByText('Phản hồi fixture đã sẵn sàng.', { exact: true }).waitFor()
    assert.equal(await page.getByRole('textbox', { name: 'Nhập tin nhắn cho Homeji' }).evaluate(e => e === document.activeElement), true)
    await page.getByRole('button', { name: 'Đóng Homeji', exact: true }).click()

    if (!fallback) {
      await page.locator('canvas.liquid-tabs__webgl').evaluate(canvas => canvas.getContext('webgl').getExtension('WEBGL_lose_context').loseContext())
      await page.waitForFunction(() => document.querySelector('.marketplace-header__tabs')?.dataset.glassRenderer === 'fallback')
      await tabs.getByRole('tab', { name: 'Đơn mua', exact: true }).click()
      assert.equal(await tabs.getByRole('tab', { name: 'Đơn mua', exact: true }).getAttribute('aria-selected'), 'true')
    }
    assert.deepEqual(errors, [])
    results.push({ width, theme, fallback, profile, perfectGame: true, replyNotice: true, contextLossFallback: true })
    await context.close()
  }
  await writeFile(`${out}/results.json`, JSON.stringify({ environment: 'Desktop headless Chromium; mobile viewport emulation, not a physical phone; CPU submission timings are not GPU timings.', results }, null, 2))
  console.log(JSON.stringify(results, null, 2))
} finally { await browser.close() }
