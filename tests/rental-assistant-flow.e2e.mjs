import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'

const { chromium } = createRequire(import.meta.url)(process.env.HOMEJI_PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.HOMEJI_TEST_BASE_URL || 'http://127.0.0.1:5527'
if (!['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) throw new Error('Local fixture verification only')
const out = 'output/verification/rental-assistant-context'
await mkdir(out, { recursive: true })
await writeFile(`${out}/index.html`, '<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Rental assistant fixture</title><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
await writeFile(`${out}/scene.tsx`, `
import React,{useState,useEffect}from'react';import{createRoot}from'react-dom/client';import{MemoryRouter}from'react-router-dom';
import{RoomDetailModal}from'/src/components/map/listings/RoomDetailModal.tsx';import{MapMessagesPanel}from'/src/components/map/MapMessagesPanel.tsx';
import{toggleHomejiAi}from'/src/lib/homejiAiLauncher.ts';import{MapPlaceDetailPanel}from'/src/components/map/MapPlaceDetailPanel.tsx';import{ChatbotProvider}from'/src/contexts/ChatbotContext.tsx';import{ToastProvider}from'/src/components/toast/ToastProvider.tsx';
import'/src/index.css';import'/src/ui-consistency.css';import'/src/content-surfaces.css';import'/src/workspace-readability.css';
function Scene(){const[room,setRoom]=useState('room-a');const[conversation,setConversation]=useState(null);const[identity,setIdentity]=useState('renter');const[post,setPost]=useState(null);
useEffect(()=>{const listener=e=>{window.localStorage.setItem('homeji_user_id',e.detail);window.__fixtureUser=e.detail;setIdentity(e.detail)};window.addEventListener('fixture-account',listener);return()=>window.removeEventListener('fixture-account',listener)},[]);
const map=new URLSearchParams(location.search).get('scene')==='map';useEffect(()=>{if(map)fetch('/api/rental-posts/room-a').then(r=>r.json()).then(setPost)},[map]);
return <main key={identity} className={map?"home-map-page--dest":""} style={{height:'95dvh',padding:16}}><button data-homeji-ai-trigger="" style={{position:"fixed",top:8,right:8,zIndex:1000}} onClick={event=>toggleHomejiAi(event.currentTarget)}>Mở trợ lý từ thanh điều hướng</button><p>Kiểm thử local với dữ liệu giả; không gửi giao dịch thật.</p>{conversation?<MapMessagesPanel key={identity} embedded initialConversationId={conversation}/>:map?<MapPlaceDetailPanel open listing={post}/>:<RoomDetailModal listingId={room} onClose={()=>setRoom(null)} onOpenMessages={id=>{setRoom(null);setConversation(id)}}/>}</main>}
createRoot(document.getElementById('root')).render(<MemoryRouter><ToastProvider><ChatbotProvider><Scene/></ChatbotProvider></ToastProvider></MemoryRouter>);`)

const post = { id: 'room-a', ownerId: 'owner-a', ownerRole: 2, title: 'Phòng gần trường · dữ liệu kiểm thử', description: 'Thông tin giả dùng để kiểm tra giao diện.', address: 'Khu vực kiểm thử', price: 3000000, deposit: 3000000, area: 24, type: 1, status: 3, electricityPrice: 3500, waterPrice: 0, internetPrice: 100000, amenities: ['KITCHEN'], maxOccupants: 2, availableSlots: 2, latitude: 10.84, longitude: 106.8, viewCount: 0, saveCount: 0, ownerDisplayName: 'Chủ phòng kiểm thử', media: [], thumbnailPath: null, createdAt: '2026-10-20T00:00:00Z', updatedAt: '2026-10-21T00:00:00Z' }
const conversation = { id: 'conversation-a', subjectType: 1, subjectId: post.id, otherParticipantId: post.ownerId, otherParticipantName: post.ownerDisplayName, lastMessage: null, unreadCount: 0, createdAt: post.createdAt, updatedAt: post.updatedAt }
const browser = await chromium.launch({ headless: true, executablePath: process.env.HOMEJI_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const results = []
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' })
    await context.addInitScript(() => { localStorage.setItem('homeji_access_token', 'fixture'); localStorage.setItem('homeji_user_id', 'renter'); window.__fixtureUser = 'renter' })
    await context.route('**/src/contexts/AuthContext.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const useAuth=()=>({isAuthenticated:true,profile:{id:window.__fixtureUser||"renter",role:1,displayName:"Tài khoản kiểm thử",onboardingCompleted:true}})' }))
    await context.route('**/src/contexts/AuthModalContext.logic.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const useAuthModal=()=>({isOpen:false,openAuthModal:()=>{}})' }))
    const sends = [], assistantRequests = []
    let handoffDelay = 0
    await context.route('**/api/**', async route => {
      const req = route.request(), pathname = new URL(req.url()).pathname
      if (!pathname.startsWith('/api/')) return route.continue()
      let json = []
      if (pathname === '/api/rental-posts/room-a') json = post
      else if (pathname === '/api/conversations') json = [conversation]
      else if (pathname === '/api/conversations/rental-posts/room-a') {
        if (handoffDelay) await new Promise(resolve => setTimeout(resolve, handoffDelay))
        json = conversation
      }
      else if (pathname === '/api/rental-posts/room-a/reviews') json = { reviews: [], reviewCount: 0, averageRating: 0 }
      else if (pathname === '/api/conversations/conversation-a/messages' && req.method() === 'POST') {
        sends.push(req.postDataJSON())
        json = { id: 'message-' + sends.length, conversationId: conversation.id, senderId: 'renter', body: req.postDataJSON().body, sentAt: post.updatedAt }
      } else if (pathname === '/api/chatbot/popup-config') json = { enabled: true, title: 'Homeji', greeting: 'Chào bạn', suggestedPrompts: [], historyStorageEnabled: false }
      else if (pathname === '/api/chatbot/messages') {
        const body = req.postDataJSON(); assistantRequests.push(body)
        json = { conversationId: 'ai-conversation', userMessage: { id: 'question', conversationId: 'ai-conversation', sender: 1, content: body.message, createdAt: post.updatedAt }, assistantMessage: { id: 'answer', conversationId: 'ai-conversation', sender: 2, content: 'Tiền thuê theo tin: 3.000.000 đồng/phòng/tháng. Chưa đủ thông tin để kết luận tổng tháng.', createdAt: post.updatedAt }, actions: [], searchUpdate: null, rentalDecision: { posts: [{ post, cost: { postId: post.id, knownMonthlySubtotal: post.price, estimatedMonthlyTotal: null, initialPayment: null, priceBasis: 'room', unknown: ['Đơn vị phí điện, nước'], questions: ['Điện tính theo đơn vị nào?'], sourceType: 'listing', updatedAt: post.updatedAt }, commute: null }], unavailablePostIds: [], summary: 'Dữ liệu theo chủ tin.' } }
      }
      return route.fulfill({ json })
    })
    const page = await context.newPage(), errors = []
    page.setDefaultTimeout(12_000)
    page.on('pageerror', error => { errors.push(error.message); console.error('Page error:', error.message) })
    page.on('console', message => { if (message.type() === 'error') console.error('Browser error:', message.text()) })
    await page.goto(`${base}/${out}/index.html`)
    await page.getByRole('button', { name: 'Soạn câu hỏi cho người đăng', exact: true }).click()
    const draft = page.getByRole('textbox', { name: /Bản nháp câu hỏi/ })
    assert.match(await draft.inputValue(), /Điện ghi 3\.500/)
    assert.match(await draft.inputValue(), /Nước tính theo/)
    await draft.fill('Chào bạn, điện tính theo kWh hay tháng?\nPhòng còn trống không?')
    assert.equal(sends.length, 0)
    await page.getByRole('button', { name: 'Mở tin nhắn với bản nháp', exact: true }).click()
    await page.getByRole('region', { name: 'Bản nháp câu hỏi về phòng' }).waitFor().catch(async () => page.getByLabel('Bản nháp câu hỏi về phòng').waitFor())
    assert.equal(sends.length, 0)
    const composer = page.getByRole('textbox', { name: 'Nội dung tin nhắn', exact: true })
    assert.equal(await composer.inputValue(), '')
    await page.getByRole('button', { name: 'Dùng bản nháp để chỉnh và gửi', exact: true }).click()
    assert.equal(await composer.inputValue(), 'Chào bạn, điện tính theo kWh hay tháng?\nPhòng còn trống không?')
    assert.equal(sends.length, 0)
    await composer.fill('Bản nháp đã chỉnh.\nMình có thể xem phòng thứ Bảy không?')
    await page.screenshot({ path: `${out}/draft-handoff-${width}.png` })
    const sent = page.waitForResponse(response => new URL(response.url()).pathname === '/api/conversations/conversation-a/messages' && response.request().method() === 'POST')
    await page.getByRole('button', { name: 'Gửi', exact: true }).click()
    await sent
    await page.locator('.map-messages__bubble p').filter({ hasText: 'Bản nháp đã chỉnh.' }).waitFor()
    assert.equal(sends.length, 1)
    assert.match(sends[0].body, /\n/)
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'Horizontal overflow in inbox')

    // A response for a closed/unmounted detail must never hijack navigation.
    await page.goto(`${base}/${out}/index.html`)
    await page.getByRole('button', { name: 'Soạn câu hỏi cho người đăng', exact: true }).click()
    handoffDelay = 700
    const started = page.waitForRequest(request => new URL(request.url()).pathname === '/api/conversations/rental-posts/room-a')
    const ended = page.waitForResponse(response => new URL(response.url()).pathname === '/api/conversations/rental-posts/room-a')
    await page.getByRole('button', { name: 'Mở tin nhắn với bản nháp', exact: true }).click()
    await started
    await page.getByRole('button', { name: 'Đóng', exact: true }).click()
    await ended
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    assert.equal(await page.getByRole('textbox', { name: 'Nội dung tin nhắn', exact: true }).count(), 0, 'Late closed-room response opened inbox')
    assert.equal(await page.evaluate(async () => {
      const { rentalMessageDraftStore } = await import('/src/lib/rentalMessageDraft.ts')
      return rentalMessageDraftStore.peek({ userId: 'renter', conversationId: 'conversation-a', postId: 'room-a', recipientId: 'owner-a' })
    }), null, 'Late response queued a draft after the detail closed')
    await page.goto(`${base}/${out}/index.html`)
    await page.getByRole('button', { name: 'Soạn câu hỏi cho người đăng', exact: true }).click()
    const accountRequestStarted = page.waitForRequest(request => new URL(request.url()).pathname === '/api/conversations/rental-posts/room-a')
    const accountRequestEnded = page.waitForResponse(response => new URL(response.url()).pathname === '/api/conversations/rental-posts/room-a')
    await page.getByRole('button', { name: 'Mở tin nhắn với bản nháp', exact: true }).click()
    await accountRequestStarted
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('fixture-account', { detail: 'another-renter' })))
    await accountRequestEnded
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    assert.equal(await page.getByRole('textbox', { name: 'Nội dung tin nhắn', exact: true }).count(), 0, 'Old-account response opened inbox')
    handoffDelay = 0

    // The room modal must provide its own entry while covering the navbar.
    await page.goto(`${base}/${out}/index.html`)
    const roomModal = page.getByRole('dialog', { name: 'Chi tiết phòng', exact: true })
    const modalAssistant = roomModal.getByRole('button', { name: 'Hỏi trợ lý về phòng đang xem', exact: true })
    await modalAssistant.click()
    const assistantDialog = page.getByRole('dialog', { name: 'Homeji', exact: true })
    await assistantDialog.waitFor()
    await assistantDialog.getByRole('textbox', { name: 'Nhập tin nhắn cho Homeji', exact: true }).focus()
    await page.keyboard.press('Tab')
    assert.equal(await page.evaluate(() => Boolean(document.activeElement.closest('[data-homeji-ai-panel="open"]'))), true, 'Room modal intercepted assistant Tab')
    await page.keyboard.press('Escape')
    await assistantDialog.waitFor({ state: 'hidden' })
    assert.equal(await roomModal.isVisible(), true, 'Assistant Escape also closed the selected room')
    assert.equal(await modalAssistant.evaluate(element => element === document.activeElement), true, 'Closing assistant did not return focus to the modal opener')
    await modalAssistant.click()
    await assistantDialog.getByRole('button', { name: 'Tính tiền tháng', exact: true }).click()
    await assistantDialog.getByLabel('Thông tin và chi phí theo tin phòng').waitFor()
    assert.equal(assistantRequests.length, 1)
    assert.deepEqual(assistantRequests[0].rentalContext, { postId: post.id, task: 'cost' })
    await assistantDialog.getByRole('button', { name: 'Đóng Homeji', exact: true }).click()
    assert.equal(await roomModal.isVisible(), true)

    await page.goto(`${base}/${out}/index.html?scene=map`)
    assert.equal(await page.locator('.map-chatbot__fab').count(), 0, 'Release must keep navbar AI entry without restoring old FAB')
    await page.getByRole('button', { name: 'Mở trợ lý từ thanh điều hướng', exact: true }).click()
    await page.getByRole('dialog', { name: 'Homeji', exact: true }).waitFor()
    assert.equal(await page.locator('.map-chatbot.is-nav').count(), 1, 'Production navbar panel was replaced')
    await page.getByRole('dialog', { name: 'Homeji', exact: true }).getByRole('button', { name: 'Đóng Homeji', exact: true }).click()
    await page.getByRole('button', { name: 'Hỏi trợ lý về phòng đang xem', exact: true }).click()
    await page.getByRole('button', { name: 'Tính tiền tháng', exact: true }).click()
    await page.getByLabel('Thông tin và chi phí theo tin phòng').waitFor()
    assert.equal(assistantRequests.length, 2)
    assert.deepEqual(assistantRequests[1].rentalContext, { postId: post.id, task: 'cost' })
    assert.ok(!JSON.stringify(assistantRequests[1]).includes(post.address), 'Client sent full listing instead of a context ID')
    assert.equal(await page.locator('.map-chatbot__fab').count(), 0)
    await page.getByRole('dialog', { name: 'Homeji', exact: true }).getByRole('button', { name: 'Đóng Homeji', exact: true }).focus()
    await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.map-chatbot__panel')).opacity) >= 0.999)
    await page.screenshot({ path: `${out}/context-cost-${width}.png` })
    assert.deepEqual(errors, [])
    results.push({ width, sends: sends.length, groundedContextRequests: assistantRequests.length, navbarLauncherPreserved: true, modalAssistantKeyboardPreserved: true, lateClosedRoomIgnored: true, lateAccountChangedIgnored: true, pageErrors: errors })
    await context.close()
  }
  await writeFile(`${out}/results.json`, JSON.stringify({ evidence: 'Local real components with mocked APIs; no real account/message/provider', results }, null, 2))
  console.log(JSON.stringify(results))
} finally { await browser.close() }
