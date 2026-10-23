import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'

const { chromium } = createRequire(import.meta.url)(process.env.HOMEJI_PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.HOMEJI_TEST_BASE_URL || 'http://127.0.0.1:5534'
if (!['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) throw new Error('Local fixtures only')
const out = 'output/verification/food-assistant'
await mkdir(out, { recursive: true })
const foods = [
  { id: 'food-rice', title: 'Cơm gà nhà làm', price: 35000 },
  { id: 'food-bread', title: 'Bánh mì chả cá nóng', price: 22000 },
].map(item => ({ ...item, sellerId: 'seller-a', sellerDisplayName: 'Bếp Homeji kiểm thử', sellerName: 'Bếp Homeji kiểm thử',
  description: 'Dữ liệu giả để kiểm tra giao diện', availableQuantity: 5, reservedQuantity: 0, unit: 'phần', preparationMinutes: 15,
  listingType: 2, status: 1, condition: 'Mới làm', category: 'Cơm nhà', address: 'Thủ Đức', latitude: 10.84, longitude: 106.8,
  mediaUrls: [], distanceKm: null, updatedAt: '2026-10-22T00:00:00Z', createdAt: '2026-10-22T00:00:00Z' }))
await writeFile(`${out}/index.html`, '<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Food assistant local fixture</title><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
await writeFile(`${out}/scene.tsx`, `
import React from'react';import{createRoot}from'react-dom/client';import{BrowserRouter,useLocation}from'react-router-dom';import{QueryClient,QueryClientProvider}from'@tanstack/react-query';import{ChatbotProvider}from'/src/contexts/ChatbotContext.tsx';import{ToastProvider}from'/src/components/toast/ToastProvider.tsx';import{MarketplacePage}from'/src/pages/MarketplacePage.tsx';import{toggleHomejiAi}from'/src/lib/homejiAiLauncher.ts';
import'/src/index.css';import'/src/ui-consistency.css';import'/src/ai-spectrum.css';import'/src/product-ui.css';import'/src/glass-controls.css';import'/src/content-surfaces.css';import'/src/workspace-readability.css';import'/src/components/theme/dark-theme.css';
const client=new QueryClient({defaultOptions:{queries:{retry:false}}});function Scene(){const route=useLocation();return <main style={{padding:16}}><p>Dữ liệu kiểm thử local</p><button data-homeji-ai-trigger="" onClick={event=>toggleHomejiAi(event.currentTarget,true)}>Mở trợ lý kiểm thử</button>{new URLSearchParams(route.search).get('section')==='marketplace'?<MarketplacePage embedded/>:null}</main>}
createRoot(document.getElementById('root')).render(<BrowserRouter><QueryClientProvider client={client}><ToastProvider><ChatbotProvider><Scene/></ChatbotProvider></ToastProvider></QueryClientProvider></BrowserRouter>);`)
const browser = await chromium.launch({ headless: true, executablePath: process.env.HOMEJI_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const results = []
try {
  for (const { width, theme } of [{ width: 390, theme: 'light' }, { width: 1440, theme: 'light' }, { width: 390, theme: 'dark' }, { width: 320, theme: 'dark' }]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce', colorScheme: theme })
    await context.addInitScript(theme => {
      localStorage.setItem('homeji_access_token', 'fixture'); localStorage.setItem('homeji_user_id', 'renter')
      window.__gpsCalls = 0
      navigator.geolocation.getCurrentPosition = () => { window.__gpsCalls++; throw new Error('No automatic GPS') }
      document.addEventListener('DOMContentLoaded', () => { document.documentElement.dataset.theme = theme }, { once: true })
    }, theme)
    await context.route('**/src/contexts/AuthContext.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const useAuth=()=>({isAuthenticated:true,profile:{id:"renter",role:1,onboardingCompleted:true}})' }))
    await context.route('**/src/contexts/AuthModalContext.logic.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const useAuthModal=()=>({isOpen:false,openAuthModal:()=>{}})' }))
    await context.route('**/src/contexts/GoogleMapsProvider.logic.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const useGoogleMaps=()=>({apiKey:"fixture",isLoaded:true});' }))
    await context.route('**/src/lib/placeAutocomplete.ts*', route => {
      if (route.request().url().includes('actualFixture')) return route.continue()
      return route.fulfill({ contentType: 'application/javascript', body: `export * from '/src/lib/placeAutocomplete.ts?actualFixture';export const fetchPlacePredictions=async()=>[{placeId:'fixture-landmark',title:'Mốc kiểm thử Thủ Đức',subtitle:'Địa chỉ giả dùng kiểm thử'}];export const resolvePlaceCoordinates=async()=>({placeId:'fixture-landmark',address:'Mốc kiểm thử Thủ Đức',lat:10.84,lng:106.8});` })
    })
    const requests = [], writes = []
    await context.route('**/api/**', async route => {
      const request = route.request(), url = new URL(request.url()), path = url.pathname
      if (!path.startsWith('/api/')) return route.continue()
      let json = []
      if (path === '/api/chatbot/popup-config') json = { enabled: true, greeting: 'Chào bạn', suggestedPrompts: [], historyStorageEnabled: false }
      else if (path === '/api/chatbot/messages') {
        const body = request.postDataJSON(); requests.push(body)
        const origin = body.foodContext || body.previousFoodCriteria?.origin || null
        const locationRequired = (/GẦN TUI/i.test(body.message) || body.previousFoodCriteria?.nearby) && !origin
        const maxPrice = /dưới 40k/i.test(body.message) ? 40000 : body.previousFoodCriteria?.maxPrice || null
        const status = /empty/.test(body.message) ? 'empty' : /unavailable/.test(body.message) ? 'unavailable' : locationRequired ? 'locationRequired' : 'results'
        const foodDiscovery = { status, summary: locationRequired ? 'Bạn muốn ăn quanh đâu? Chọn mốc để tìm món.' : status === 'empty' ? 'Chưa có món khớp bộ lọc.' : status === 'unavailable' ? 'Chưa tải được món đang bán.' : 'Đây là các món đang bán theo tin người bán.',
          items: status === 'results' ? foods.filter(item => !maxPrice || item.price <= maxPrice).map(item => ({ ...item, distanceKm: origin ? .5 : null })) : [],
          keyword: body.previousFoodCriteria?.keyword || null, maxPrice, origin, nearby: Boolean(origin || locationRequired) }
        json = { conversationId: 'fixture', userMessage: { id: 'u' + requests.length, sender: 1, content: body.message },
          assistantMessage: { id: 'a' + requests.length, sender: 2, content: foodDiscovery.summary }, searchUpdate: null, rentalDecision: null, foodDiscovery,
          actions: [{ id: 'food-menu', label: 'Mở Chợ đồ ăn', kind: 1, description: 'Xem thực đơn', target: 'marketplace:food' }] }
      } else if (path === '/api/marketplace-posts') json = foods
      else if (path.startsWith('/api/marketplace-posts/food-')) json = foods.find(item => path.endsWith(item.id))
      else if (path === '/api/wallet') json = { userId: 'renter', balance: 0, isActivated: false }
      else if (request.method() !== 'GET') writes.push(path)
      return route.fulfill({ json })
    })
    const page = await context.newPage(), errors = []
    page.setDefaultTimeout(15000)
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(`${base}/${out}/index.html`)
    await page.getByRole('button', { name: 'Mở trợ lý kiểm thử', exact: true }).click()
    if (width > 900) await page.getByRole('button', { name: 'Mở rộng cuộc trò chuyện', exact: true }).click()
    const composer = page.getByRole('textbox', { name: 'Nhập tin nhắn cho Homeji', exact: true })
    await composer.fill('CÓ GÌ ĂN GIỚI THIỆU ĐI'); await composer.press('Enter')
    await page.locator('.ai-food__item').first().waitFor()
    assert.equal(await page.locator('.ai-rental-result').count(), 0)
    assert.match(await page.locator('.ai-food').first().textContent(), /35\.000.*phần.*Bếp Homeji kiểm thử/s)
    assert.equal(requests[0].rentalContext, undefined); assert.equal(requests[0].previousCriteria, undefined)
    await page.screenshot({ path: `${out}/food-results-${width}-${theme}.png` })
    await composer.fill('dưới 40k'); await composer.press('Enter')
    await page.waitForFunction(() => document.querySelectorAll('.ai-food').length === 2)
    assert.deepEqual(requests[1].previousFoodCriteria, { keyword: null, maxPrice: null, origin: null, nearby: false })
    await composer.fill('gần tui'); await composer.press('Enter')
    await page.waitForFunction(() => document.querySelectorAll('.ai-food').length === 3)
    assert.equal(requests[2].previousFoodCriteria.maxPrice, 40000)
    assert.equal(await page.locator('.ai-food').last().locator('.ai-food__item').count(), 0)
    await composer.fill('GIỚI THIỆU ĐỒ ĂN NGON GẦN TUI'); await composer.press('Enter')
    await page.waitForFunction(() => document.querySelectorAll('.ai-food').length === 4)
    const locationCard = page.locator('.ai-food').last()
    const address = locationCard.getByRole('combobox', { name: 'Tìm quanh địa chỉ hoặc mốc', exact: true })
    const search = locationCard.getByRole('button', { name: 'Tìm quanh mốc này', exact: true })
    await address.waitFor(); assert.equal(await locationCard.locator('.ai-food__item').count(), 0)
    await address.fill('Thủ Đức'); assert.equal(await search.isDisabled(), true)
    await page.getByRole('option').filter({ hasText: 'Mốc kiểm thử Thủ Đức' }).click()
    await search.waitFor({ state: 'visible' }); assert.equal(await search.isEnabled(), true)
    await address.fill('Đổi mốc'); assert.equal(await search.isDisabled(), true)
    await page.getByRole('option').filter({ hasText: 'Mốc kiểm thử Thủ Đức' }).click()
    await search.click()
    await page.locator('.ai-food').last().getByRole('link', { name: 'Xem món & thực đơn', exact: false }).first().waitFor()
    assert.deepEqual(requests[4].foodContext, { latitude: 10.84, longitude: 106.8, radiusKm: 3 })
    assert.equal(requests[4].message, 'GIỚI THIỆU ĐỒ ĂN NGON GẦN TUI')
    assert.match(await page.locator('.ai-food').last().textContent(), /0,5 km đường thẳng/)
    assert.equal(await page.evaluate(() => window.__gpsCalls), 0)
    assert.equal(await page.locator('.ai-rental-result').count(), 0)
    assert.ok(await page.locator('.map-chatbot__body').evaluate(body => body.scrollWidth <= body.clientWidth + 1), 'No chat horizontal overflow')
    const contrast = await page.locator('.ai-food__open').last().evaluate(element => {
      const luminance = color => { const rgb = color.match(/[\d.]+/g).slice(0, 3).map(Number).map(value => { const x = value / 255; return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4 }); return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2] }
      const style = getComputedStyle(element), a = luminance(style.color), b = luminance(style.backgroundColor)
      return (Math.max(a, b) + .05) / (Math.min(a, b) + .05)
    })
    assert.ok(contrast >= 4.5)
    await page.screenshot({ path: `${out}/nearby-results-${width}-${theme}.png` })
    await page.locator('.ai-food').last().getByRole('link', { name: 'Xem món & thực đơn', exact: false }).first().click()
    await page.getByRole('dialog', { name: 'Cơm gà nhà làm', exact: true }).waitFor()
    assert.equal(new URL(page.url()).searchParams.get('seller'), 'seller-a')
    assert.equal(new URL(page.url()).searchParams.get('item'), 'food-rice')
    assert.equal(await page.locator('[data-homeji-ai-panel="open"]').count(), 0)
    assert.equal(writes.length, 0, 'Discovery and opening menus must not create orders or payments')
    await page.getByRole('button', { name: 'Đóng chi tiết', exact: true }).click()
    await page.getByRole('button', { name: 'Mở trợ lý kiểm thử', exact: true }).click()
    for (const status of ['empty', 'unavailable']) {
      await composer.fill(`Gợi ý đồ ăn ${status}`); await composer.press('Enter')
      await page.locator('.ai-food').last().waitFor()
      await page.waitForFunction(count => document.querySelectorAll('.ai-food').length === count, status === 'empty' ? 6 : 7)
      assert.equal(await page.locator('.ai-food').last().locator('.ai-food__item').count(), 0)
    }
    assert.deepEqual(errors, []); assert.equal(writes.length, 0)
    results.push({ width, theme, exactUserPhrases: true, explicitOrigin: true, actualFoodDetails: true, emptyAndUnavailable: true, noWrites: true, contrast })
    await context.close()
  }
  await writeFile(`${out}/results.json`, JSON.stringify({ fixture: true, results }, null, 2))
  console.log(JSON.stringify(results))
} finally { await browser.close() }
