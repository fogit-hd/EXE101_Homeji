import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'

const { chromium } = createRequire(import.meta.url)(process.env.HOMEJI_PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.HOMEJI_TEST_BASE_URL || 'http://127.0.0.1:5534'
if (!['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) throw new Error('Local fixture verification only')
const out = 'output/verification/ai-search-readability'
await mkdir(out, { recursive: true })
const posts = [
  { id: 'room-a', title: 'CHUNG CƯ SAIGON GATEWAY Q9 1PN 1WC (Phòng trống)', type: 1, ownerRole: 2, price: 6400000, area: 55 },
  { id: 'room-b', title: 'Tìm bạn cùng ở gần trường', type: 2, ownerRole: 1, price: 1800000, area: 25 },
  { id: 'room-c', title: 'Pass phòng có cửa sổ và bếp riêng', type: 3, ownerRole: 2, price: 3200000, area: 24, isOwnerPremium: true },
].map(post => ({ ownerId: 'owner-' + post.id, description: 'Dữ liệu kiểm thử giao diện.', address: 'Quận 9, Tăng Nhơn Phú, Thành phố Hồ Chí Minh, Việt Nam',
  status: 3, deposit: 0, amenities: ['KITCHEN'], availableSlots: 2, maxOccupants: 3, media: [], thumbnailPath: null,
  latitude: 10.84, longitude: 106.8, viewCount: 0, saveCount: 0, updatedAt: '2026-10-15T00:00:00Z', createdAt: '2026-10-15T00:00:00Z', ...post }))
const result = { criteria: { budgetBasis: 'rent', unknown: [], criteria: [], requiredAmenities: [], excludedAmenities: [] },
  posts: posts.map(post => ({ post, score: 0, reasons: ['Fallback không được thay nguồn đã có'], updatedAt: post.updatedAt,
    reasonEvidence: [{ postId: post.id, sourceType: 'listing', field: 'status', value: 'active', text: 'Tin công khai trong phạm vi Homeji; chưa có thêm tiêu chí để xếp hạng.' },
      { postId: 'another-room', sourceType: 'listing', field: 'amenities', value: 'GYM', text: 'Sai đối tượng' }] })), tag: '', mapFocusAddress: null }
await writeFile(`${out}/index.html`, '<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AI search readability fixture</title><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
await writeFile(`${out}/scene.tsx`, `
import React,{useState}from'react';import{createRoot}from'react-dom/client';import{MemoryRouter,useLocation,useNavigate}from'react-router-dom';import{ChatbotProvider}from'/src/contexts/ChatbotContext.tsx';import{ToastProvider}from'/src/components/toast/ToastProvider.tsx';import{AiSearchReview}from'/src/components/ai/AiSearchReview.tsx';import{AiSearchDialog}from'/src/components/ai/AiSearchDialog.tsx';import{NaturalRentalSearch}from'/src/components/ai/NaturalRentalSearch.tsx';import{RoomDetailModal}from'/src/components/map/listings/RoomDetailModal.tsx';import{toggleHomejiAi}from'/src/lib/homejiAiLauncher.ts';
import'/src/index.css';import'/src/ui-consistency.css';import'/src/ai-spectrum.css';import'/src/product-ui.css';import'/src/glass-controls.css';import'/src/content-surfaces.css';import'/src/workspace-readability.css';import'/src/components/theme/dark-theme.css';import'/src/components/ai/RentalAssistant.css';
const result=${JSON.stringify(result)};
function Scene(){const route=useLocation();const navigate=useNavigate();const[reviewOpen,setReviewOpen]=useState(true);const postId=new URLSearchParams(route.search).get('post');const mode=new URLSearchParams(location.search).get('scene');return <main style={{padding:16,maxWidth:900,margin:'auto',paddingBottom:100}}><p>Kiểm thử local · dữ liệu giả</p>{postId?<RoomDetailModal listingId={postId} onClose={()=>navigate('/')} onOpenMessages={()=>{}}/>:mode==='chat'?<button data-homeji-ai-trigger="" onClick={event=>toggleHomejiAi(event.currentTarget,true)}>Mở trợ lý kiểm thử</button>:mode==='compact'?<NaturalRentalSearch/>:mode==='review-dialog'?(reviewOpen?<AiSearchDialog result={{...result,criteria:{...result.criteria,budgetBasis:'total',unknown:['feeUnits']}}} busy={false} onClose={()=>setReviewOpen(false)} onApply={()=>{}} onCorrection={()=>{}}/>:null):<AiSearchReview result={result} onApply={()=>{}} onRefine={()=>{}}/>}</main>}
createRoot(document.getElementById('root')).render(<MemoryRouter><ToastProvider><ChatbotProvider><Scene/></ChatbotProvider></ToastProvider></MemoryRouter>);`)
const browser = await chromium.launch({ headless: true, executablePath: process.env.HOMEJI_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const results = []
try {
  for (const { width, theme, scene } of [
    { width: 900, theme: 'light', scene: 'cards' }, { width: 390, theme: 'light', scene: 'cards' },
    { width: 390, theme: 'dark', scene: 'cards' }, { width: 320, theme: 'dark', scene: 'cards' },
    { width: 390, theme: 'light', scene: 'chat' }, { width: 1440, theme: 'dark', scene: 'chat' },
    { width: 390, theme: 'light', scene: 'compact' }, { width: 1440, theme: 'dark', scene: 'compact' },
    { width: 900, theme: 'light', scene: 'review-dialog' },
  ].filter(item => !process.env.HOMEJI_READABILITY_SCENE || item.scene === process.env.HOMEJI_READABILITY_SCENE)) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, colorScheme: theme, reducedMotion: 'reduce' })
    await context.addInitScript(theme => {
      localStorage.setItem('homeji_access_token', 'fixture'); localStorage.setItem('homeji_user_id', 'renter')
      document.addEventListener('DOMContentLoaded', () => { document.documentElement.dataset.theme = theme }, { once: true })
    }, theme)
    await context.route('**/src/contexts/AuthContext.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const useAuth=()=>({isAuthenticated:true,profile:{id:"renter",role:1,onboardingCompleted:true}})' }))
    await context.route('**/src/contexts/AuthModalContext.logic.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const useAuthModal=()=>({isOpen:false,openAuthModal:()=>{}})' }))
    const requests = [], writes = []
    await context.route('**/api/**', async route => {
      const request = route.request(), pathname = new URL(request.url()).pathname
      if (!pathname.startsWith('/api/')) return route.continue()
      let json = []
      if (pathname === '/api/chatbot/popup-config') json = { enabled: true, greeting: 'Chào bạn', suggestedPrompts: [], historyStorageEnabled: false }
      else if (pathname === '/api/chatbot/messages') {
        const body = request.postDataJSON(); requests.push(body)
        json = { conversationId: 'fixture', userMessage: { id: 'u' + requests.length, sender: 1, content: body.message },
          assistantMessage: { id: 'a' + requests.length, sender: 2, content: 'Mình tìm được các tin dưới đây. Chọn một phòng để xem thêm hoặc đưa vào cân nhắc.' }, actions: [], searchUpdate: result }
      } else if (pathname.includes('/ai/') && request.method() === 'POST') json = result
      else if (/^\/api\/rental-posts\/room-[a-c]$/.test(pathname)) json = posts.find(post => pathname.endsWith(post.id))
      else if (pathname.endsWith('/reviews')) json = { reviews: [], reviewCount: 0, averageRating: 0 }
      else if (request.method() !== 'GET') writes.push(pathname)
      return route.fulfill({ json })
    })
    const page = await context.newPage(), errors = []
    page.setDefaultTimeout(12000)
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(`${base}/${out}/index.html?scene=${scene}`)
    if (scene === 'chat') {
      await page.getByRole('button', { name: 'Mở trợ lý kiểm thử', exact: true }).click()
      if (width > 600) await page.getByRole('button', { name: 'Mở rộng cuộc trò chuyện', exact: true }).click()
      const composer = page.getByRole('textbox', { name: 'Nhập tin nhắn cho Homeji', exact: true })
      await composer.fill('Tìm phòng ở Quận 9')
      await composer.press('Enter')
      await page.locator('.ai-rental-result').first().waitFor()
      const initial = await page.evaluate(() => {
        const body = document.querySelector('.map-chatbot__body'), answer = document.querySelector('.map-chatbot__msg.is-assistant')
        return { offset: answer.getBoundingClientRect().top - body.getBoundingClientRect().top, scroll: body.scrollTop, end: body.scrollHeight - body.clientHeight }
      })
      assert.ok(initial.offset >= 0 && initial.offset < 40, 'The new reply should start at its beginning')
      assert.ok(initial.scroll < initial.end - 100, 'A long result must not jump past its first choices')
      const privacySummary = page.locator('.map-chatbot__privacy > summary')
      await privacySummary.focus()
      await page.keyboard.press('Tab')
      assert.equal(await page.getByRole('button', { name: 'Cuộc trò chuyện mới', exact: true }).evaluate(element => element === document.activeElement), true)
      await composer.fill('Bản nháp tiếp theo chưa gửi')
      assert.equal(await page.locator('.map-chatbot__body').evaluate(body => body.scrollTop), initial.scroll, 'Typing must not reset reading position')
    } else if (scene === 'compact') {
      await page.getByRole('button', { name: 'Gợi ý AI', exact: true }).click()
      await page.getByRole('textbox', { name: 'Mô tả nhu cầu của bạn', exact: true }).fill('Tìm phòng ở Quận 9')
      await page.getByRole('button', { name: 'Tìm theo nhu cầu', exact: true }).click()
      await page.locator('.ai-suggest-review__card').first().waitFor()
      await page.waitForFunction(() => [...document.querySelectorAll('.ai-suggest-review__cards > div')].every(element => Number(getComputedStyle(element).opacity) > .99))
      assert.equal(await page.locator('.ai-suggest-review__card-unit').count(), 3)
    }
    if (scene === 'review-dialog') {
      const dialog = page.getByRole('dialog', { name: 'Xác nhận tìm phòng', exact: true })
      await dialog.waitFor()
      const first = dialog.getByRole('button', { name: 'Đóng', exact: true })
      const last = dialog.locator('.rental-cost > summary').last()
      await last.focus()
      await page.keyboard.press('Tab')
      assert.equal(await first.evaluate(element => element === document.activeElement), true, 'Tab must wrap past closed cost inputs to the dialog close button')
      await first.focus()
      await page.keyboard.press('Shift+Tab')
      assert.equal(await last.evaluate(element => element === document.activeElement), true, 'Shift+Tab must wrap to the last visible disclosure, not its hidden inputs')
    }
    if (scene !== 'compact') {
      const card = page.locator('.ai-rental-result').first()
      const evidence = card.locator('.ai-rental-result__evidence')
      assert.equal(await evidence.getAttribute('open'), null)
      assert.equal(await card.getByText('Tin cập nhật:', { exact: false }).isVisible(), false)
      assert.equal(await card.getByText('Theo tin chủ đăng · chưa xác nhận phòng trống và phí phát sinh.', { exact: true }).isVisible(), true)
      assert.equal(await card.getByRole('link', { name: 'Xem phòng', exact: false }).isVisible(), true)
      assert.doesNotMatch(await card.textContent(), /Sai đối tượng|Fallback không được thay/)
      if (scene === 'cards') await card.screenshot({ path: `${out}/first-card-${width}-${theme}.png` })
      const toggle = card.getByRole('button', { name: /cân nhắc/i })
      await toggle.click()
      assert.equal(await toggle.getAttribute('aria-pressed'), 'true')
      assert.equal(writes.length, 0)
      await card.getByText('Xem nguồn & lưu ý', { exact: true }).click()
      assert.equal(await card.getByText('Tin cập nhật:', { exact: false }).isVisible(), true)
      await card.getByText('Xem nguồn & lưu ý', { exact: true }).click()
      assert.match(await page.locator('.ai-rental-result').nth(1).textContent(), /Chi phí dự kiến\/người\/tháng/)
      const ratio = await card.getByRole('link', { name: 'Xem phòng', exact: false }).evaluate(element => {
        const rgb = color => color.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => { const s = v / 255; return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4 })
        const luminance = color => { const [r, g, b] = rgb(color); return .2126 * r + .7152 * g + .0722 * b }
        const style = getComputedStyle(element), a = luminance(style.color), b = luminance(style.backgroundColor)
        return (Math.max(a, b) + .05) / (Math.min(a, b) + .05)
      })
      assert.ok(ratio >= 4.5, 'Primary action text must be readable')
    }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No page-level horizontal overflow')
    await page.screenshot({ path: `${out}/${scene}-${width}-${theme}.png`, fullPage: scene === 'cards' })
    if (scene === 'chat') {
      await page.locator('.ai-rental-result').first().getByRole('link', { name: 'Xem phòng', exact: false }).click()
      await page.getByRole('dialog', { name: 'Chi tiết phòng', exact: true }).waitFor()
      assert.equal(await page.locator('[data-homeji-ai-panel="open"]').count(), 0)
      assert.equal(requests.length, 1, 'Opening details must not submit a new AI query')
    } else if (scene === 'compact') {
      await page.locator('.ai-suggest-review__card').first().click()
      await page.getByRole('dialog', { name: 'Chi tiết phòng', exact: true }).waitFor()
      assert.equal(await page.getByRole('dialog', { name: 'Gợi ý AI tìm phòng', exact: true }).count(), 0)
    }
    assert.equal(writes.length, 0)
    assert.deepEqual(errors, [])
    results.push({ width, theme, scene, noWrites: true, noHorizontalOverflow: true, noPageErrors: true })
    await context.close()
  }
  await writeFile(`${out}/results.json`, JSON.stringify({ fixture: true, results }, null, 2))
  console.log(JSON.stringify(results))
} finally { await browser.close() }
