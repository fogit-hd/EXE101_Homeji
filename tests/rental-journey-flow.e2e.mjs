import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'

const { chromium } = createRequire(import.meta.url)(process.env.HOMEJI_PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.HOMEJI_TEST_BASE_URL || 'http://127.0.0.1:5534'
if (!['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) throw new Error('Local fixture verification only')
const out = 'output/verification/rental-journey'
await mkdir(out, { recursive: true })
const posts = ['a', 'b', 'c', 'd'].map((letter, index) => ({ id: 'room-' + letter, ownerId: 'owner-' + letter, ownerRole: 2,
  title: 'Phòng ' + letter.toUpperCase() + ' · dữ liệu kiểm thử', description: 'Dữ liệu giả để kiểm tra giao diện.', address: 'Khu vực kiểm thử',
  price: 3000000 + index * 100000, deposit: 3000000, area: 24, type: 1, status: 3, electricityPrice: 3500, waterPrice: 0, internetPrice: 100000,
  amenities: ['KITCHEN'], maxOccupants: 3, availableSlots: 2, latitude: 10.84, longitude: 106.8, viewCount: 0, saveCount: 0,
  ownerDisplayName: 'Chủ tin kiểm thử', media: [], thumbnailPath: null, createdAt: '2026-10-20T00:00:00Z', updatedAt: '2026-10-22T00:00:00Z' }))
await writeFile(`${out}/index.html`, '<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Rental journey fixture</title><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
await writeFile(`${out}/scene.tsx`, `
import React,{useState}from'react';import{createRoot}from'react-dom/client';import{MemoryRouter,useLocation,useNavigate}from'react-router-dom';import{QueryClient,QueryClientProvider}from'@tanstack/react-query';
import{ChatbotProvider}from'/src/contexts/ChatbotContext.tsx';import{ToastProvider}from'/src/components/toast/ToastProvider.tsx';import{RentalPostCard}from'/src/components/RentalPostCard.tsx';import{SavedPostsPage}from'/src/pages/SavedPostsPage.tsx';import{RoomDetailModal}from'/src/components/map/listings/RoomDetailModal.tsx';import{MapListingsWorkspace}from'/src/components/map/listings/MapListingsWorkspace.tsx';
import'/src/index.css';import'/src/ui-consistency.css';import'/src/ai-spectrum.css';import'/src/product-ui.css';import'/src/glass-controls.css';import'/src/content-surfaces.css';import'/src/workspace-readability.css';import'/src/components/theme/dark-theme.css';
const posts=${JSON.stringify(posts)};const queryClient=new QueryClient({defaultOptions:{queries:{retry:false}}});
function Scene(){const route=useLocation();const navigate=useNavigate();const params=new URLSearchParams(route.search);const[selected,setSelected]=useState(null);const useMap=new URLSearchParams(location.search).get('scene')==='map';return <main style={{padding:16,paddingBottom:110,maxWidth:1200,margin:'auto'}}><p>Kiểm thử local với dữ liệu giả.</p>{params.get('post')?<RoomDetailModal listingId={params.get('post')} onClose={()=>navigate('/?section=saved&view=considering')} onOpenMessages={()=>{}}/>:params.get('section')==='saved'?<SavedPostsPage embedded/>:useMap?<MapListingsWorkspace posts={posts} selectedListingId={selected} hoveredListingId={null} loading={false} error="" mapNode={null} onHoverListing={()=>{}} onLeaveListing={()=>{}} onSelectListing={setSelected} onOpenRoomDetail={id=>navigate('/?post='+id)} onResetFilters={()=>{}}/>:<div className="grid-posts">{posts.map(post=><RentalPostCard key={post.id} post={post}/>)}</div>}</main>}
function App(){const[identity,setIdentity]=useState('renter');return <QueryClientProvider client={queryClient}><ToastProvider><button style={{position:'fixed',right:0,top:0,zIndex:1200}} onClick={()=>{window.__fixtureUser='other';setIdentity('other')}}>Đổi tài khoản kiểm thử</button><ChatbotProvider><output data-testid="identity">{identity}</output><Scene/></ChatbotProvider></ToastProvider></QueryClientProvider>}
createRoot(document.getElementById('root')).render(<MemoryRouter initialEntries={['/?view=list']}><App/></MemoryRouter>);`)

const decision = ids => ({ posts: ids.map(id => { const post = posts.find(post => post.id === id); return { post, cost: {
  postId: id, knownMonthlySubtotal: post.price, estimatedMonthlyTotal: null, initialPayment: null, priceBasis: 'room',
  unknown: ['Đơn vị phí nước chưa xác nhận'], questions: ['Nước tính theo đơn vị nào?'], sourceType: 'listing', updatedAt: post.updatedAt }, commute: null } }),
  unavailablePostIds: [], summary: 'Kịch bản kiểm thử, còn khoản cần xác nhận.' })
const browser = await chromium.launch({ headless: true, executablePath: process.env.HOMEJI_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const results = []
try {
  for (const { width, theme } of [{ width: 390, theme: 'light' }, { width: 1440, theme: 'light' }, { width: 390, theme: 'dark' }, { width: 1440, theme: 'dark' }]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, colorScheme: theme, reducedMotion: 'reduce' })
    await context.addInitScript(theme => {
      localStorage.setItem('homeji_access_token', 'fixture'); localStorage.setItem('homeji_user_id', 'renter'); window.__fixtureUser = 'renter'
      document.addEventListener('DOMContentLoaded', () => { document.documentElement.dataset.theme = theme }, { once: true })
    }, theme)
    await context.route('**/src/contexts/AuthContext.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const useAuth=()=>({isAuthenticated:true,profile:{id:window.__fixtureUser||"renter",role:1,onboardingCompleted:true}})' }))
    await context.route('**/src/contexts/AuthModalContext.logic.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const useAuthModal=()=>({isOpen:false,openAuthModal:()=>{}})' }))
    const compares = [], chats = [], writes = []
    await context.route('**/api/**', async route => {
      const request = route.request(), pathname = new URL(request.url()).pathname
      if (!pathname.startsWith('/api/')) return route.continue()
      let json = []
      if (pathname === '/api/saved-posts') json = []
      else if (pathname === '/api/chatbot/popup-config') json = { enabled: true, greeting: 'Chào bạn', suggestedPrompts: [], historyStorageEnabled: false }
      else if (pathname === '/api/rental-assistant/compare') { compares.push(request.postDataJSON()); json = decision(compares.at(-1).postIds) }
      else if (pathname === '/api/chatbot/messages') {
        const body = request.postDataJSON(); chats.push(body)
        json = { conversationId: 'fixture', userMessage: { id: 'u' + chats.length, sender: 1, content: body.message },
          assistantMessage: { id: 'a' + chats.length, sender: 2, content: 'So sánh đúng các lựa chọn, còn phí cần hỏi chủ tin.' }, actions: [], searchUpdate: null,
          rentalDecision: decision(body.rentalSelection?.postIds ?? [body.rentalContext.postId]) }
      } else if (/^\/api\/rental-posts\/room-[a-d]$/.test(pathname)) json = posts.find(post => pathname.endsWith(post.id))
      else if (pathname.endsWith('/reviews')) json = { reviews: [], reviewCount: 0, averageRating: 0 }
      else if (request.method() !== 'GET') writes.push({ pathname, body: request.postDataJSON() })
      return route.fulfill({ json })
    })
    const page = await context.newPage(), errors = []
    page.setDefaultTimeout(12000)
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(`${base}/${out}/index.html${width === 1440 ? '?scene=map' : ''}`)
    await page.getByRole('button', { name: /Thêm vào cân nhắc.*Phòng A/ }).click()
    await page.getByRole('button', { name: /Thêm vào cân nhắc.*Phòng B/ }).click()
    await page.getByRole('link', { name: 'So sánh các lựa chọn', exact: true }).click()
    const workspace = page.getByRole('region', { name: 'Danh sách cân nhắc và so sánh chung' })
    await workspace.waitFor()
    assert.equal(await page.getByRole('region', { name: 'So sánh phòng và kịch bản chi phí' }).count(), 1)
    await page.getByLabel('Số người', { exact: true }).fill('2')
    await page.getByLabel('Điện dự kiến (kWh/tháng)', { exact: true }).fill('120')
    await page.getByRole('button', { name: 'Làm mới so sánh / tính kịch bản', exact: true }).click()
    await page.getByRole('table').waitFor()
    assert.deepEqual(compares[0].postIds, ['room-a', 'room-b'])
    assert.equal(compares[0].scenario.occupants, 2)
    await page.getByRole('button', { name: 'Hỏi trợ lý về các lựa chọn này', exact: true }).click()
    await page.getByRole('button', { name: 'So sánh các lựa chọn', exact: true }).click()
    await page.getByText('So sánh đúng các lựa chọn, còn phí cần hỏi chủ tin.', { exact: true }).waitFor()
    assert.deepEqual(chats[0].rentalSelection.postIds, compares[0].postIds)
    assert.equal(chats[0].rentalSelection.scenario.electricityKwh, 120)
    assert.equal(chats[0].rentalContext, undefined)
    assert.doesNotMatch(JSON.stringify(chats[0].rentalSelection), /địa chỉ|address|title|description/)
    assert.equal(await page.locator('.rental-context-card h4').count(), 2)
    await page.getByRole('button', { name: 'Mở rộng cuộc trò chuyện', exact: true }).click()
    await page.screenshot({ path: `${out}/shared-comparison-${width}-${theme}.png` })
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No horizontal overflow')
    await page.getByRole('button', { name: 'Đóng Homeji', exact: true }).click()
    await workspace.locator('.rental-journey__choices').getByRole('link', { name: posts[0].title, exact: true }).click()
    await page.getByRole('button', { name: 'Soạn câu hỏi cho người đăng', exact: true }).click()
    await page.getByRole('textbox', { name: /Bản nháp câu hỏi/ }).fill('Mình có thể xem phòng cuối tuần này không? Điện nước tính thế nào?')
    assert.equal(writes.length, 0, 'Opening detail and editing questions must not send messages or appointments')
    await page.getByRole('button', { name: 'Đóng', exact: true }).click()
    await workspace.waitFor()
    assert.equal(await page.getByLabel('Số người', { exact: true }).inputValue(), '2')
    await page.getByRole('button', { name: 'Đổi tài khoản kiểm thử', exact: true }).click()
    await page.getByText('Chưa chọn phòng.', { exact: false }).waitFor()
    assert.equal(await page.getByRole('table').count(), 0)
    assert.equal(await page.locator('.rental-journey-tray').count(), 0)
    assert.deepEqual(errors, [])
    results.push({ width, theme, compares: compares.length, chats: chats.length, writes: writes.length })
    await context.close()
  }
  await writeFile(`${out}/results.json`, JSON.stringify({ fixture: true, results }, null, 2))
  console.log(JSON.stringify(results))
} finally { await browser.close() }
