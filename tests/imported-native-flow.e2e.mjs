import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'

const base = process.env.HOMEJI_TEST_BASE_URL || 'http://127.0.0.1:5542'
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local fixture only')
const link = JSON.parse(await readFile('src/lib/sourcePublisherLinks.generated.json', 'utf8')).find(row => row.nativePostId)
const id = link.nativePostId, ownerId = link.ownerId
const out = 'output/verification/imported-native-flow'
await mkdir(out, { recursive: true })
await writeFile(out + '/index.html', '<html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
await writeFile(out + '/scene.tsx', `import React from'react';import{createRoot}from'react-dom/client';import{MemoryRouter,useNavigate}from'react-router-dom';import{ImportedRentalPreview}from'/src/components/map/listings/ImportedRentalPreview.tsx';import{SourceRoomDetailsHost}from'/src/components/map/listings/SourceRoomDetailsHost.tsx';import{sourceRoomHref}from'/src/lib/sourceRoomLink.ts';import'/src/index.css';function Scene(){const navigate=useNavigate();return <><div style={{height:'100vh',position:'relative'}}><ImportedRentalPreview pin={{id:'rental:${id}',kind:'rental',title:'Phòng đã gắn tài khoản',address:'Lê Văn Việt, Thủ Đức',price:1400000,area:50,lat:10.84,lng:106.81,imageUrl:'/brand/homeji-logo2.png',amenityHighlights:[],sourceUpdatedAt:null}} onClose={()=>{}} onOpen={()=>navigate(sourceRoomHref('${id}'))}/></div><SourceRoomDetailsHost/></>}createRoot(document.getElementById('root')).render(<MemoryRouter><Scene/></MemoryRouter>);`)
const browser = await chromium.launch({ headless: true, channel: 'msedge' })
const page = await browser.newPage()
await page.addInitScript(() => localStorage.setItem('homeji_access_token', 'local-fixture-only'))
const errors = [], mutations = []
page.on('pageerror', error => errors.push(error.message))
await page.route('**/src/contexts/AuthContext.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const useAuth=()=>({isAuthenticated:true,isLoading:false,needsProfileSetup:false,profile:{id:"fixture-viewer",role:1}})' }))
await page.route('**/src/contexts/AuthModalContext.logic.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const useAuthModal=()=>({openAuthModal:()=>{}})' }))
await page.route('**/src/contexts/rental-assistant-context.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const useRentalAssistantSelection=()=>{};export const useRentalAssistantOpener=()=>null;' }))
await page.route('**/src/contexts/rental-journey.ts*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const useRentalJourney=()=>({enabled:true,choices:[],toggle:choice=>{window.chosenRental=choice.postId}});' }))
await page.route('**/src/components/ai/RentalDetailAssistant.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const RentalDetailAssistant=()=>null;' }))
const post = { id, ownerId, ownerDisplayName: 'Người đăng kiểm thử', ownerRole: 2, ownerPhone: '0901234567', hasOwnerPhone: true, type: 1, status: 3, title: 'Phòng đã gắn tài khoản', description: 'Thông tin theo người đăng.', price: 1400000, area: 50, deposit: 0, maxOccupants: 1, availableSlots: 1, latitude: 10.84, longitude: 106.81, address: 'Lê Văn Việt, Thủ Đức', amenities: [], media: [0, 1, 2].map(sortOrder => ({ id: String(sortOrder), path: '/brand/homeji-logo2.png', mediaType: 1, isThumbnail: sortOrder === 0, sortOrder })), isOwnerPremium: false, isOwnerVerified: false, isImportedSource: true }
let saved = false, failSave = true, sourceReads = 0
await page.route('**/api/**', route => {
  const path = new URL(route.request().url()).pathname, method = route.request().method()
  if (!path.startsWith('/api/')) return route.continue()
  if (path.includes('/rental-source-listings/')) { sourceReads++; return route.fulfill({ status: 404, json: {} }) }
  if (path === `/api/rental-posts/${id}`) return route.fulfill({ json: post })
  if (path === '/api/saved-posts' && method === 'GET') return route.fulfill({ json: saved ? [post] : [] })
  if (path === `/api/saved-posts/${id}` && ['PUT', 'DELETE'].includes(method)) {
    mutations.push(method)
    if (failSave) { failSave = false; return route.fulfill({ status: 503, json: { detail: 'Lưu tin kiểm thử thất bại' } }) }
    saved = method === 'PUT'; return route.fulfill({ status: 204 })
  }
  if (path === `/api/profile/${ownerId}`) return route.fulfill({ json: { id: ownerId, displayName: post.ownerDisplayName, createdAt: '2026-11-05T00:00:00Z', facebookUrl: null, zaloPhone: null } })
  if (method !== 'GET') throw Error('Unexpected fixture write: ' + path)
  return route.fulfill({ json: [] })
})
try {
  for (const width of [1440, 390]) {
    saved = false; failSave = true
    await page.setViewportSize({ width, height: 900 })
    await page.goto(base + '/' + out + '/index.html')
    const preview = page.getByRole('article', { name: 'Phòng đang chọn' })
    await preview.getByText(post.title, { exact: true }).waitFor()
    assert.equal(await preview.locator('.premium-badge').count(), 0)
    assert.doesNotMatch(await preview.innerText(), /0901234567/)
    await preview.getByRole('button', { name: /Thêm vào cân nhắc/ }).click()
    assert.equal(await page.evaluate(() => window.chosenRental), id)
    await preview.getByRole('button', { name: 'Lưu phòng', exact: true }).click()
    await preview.getByRole('alert').waitFor()
    assert.equal(saved, false)
    await preview.getByRole('button', { name: 'Lưu phòng', exact: true }).click()
    await preview.getByRole('button', { name: 'Bỏ lưu', exact: true }).waitFor()
    await page.screenshot({ path: `${out}/preview-${width}.png` })
    await preview.getByRole('button', { name: 'Xem phòng & liên hệ', exact: true }).click()
    const dialog = page.locator('.room-detail')
    await dialog.getByText(post.ownerDisplayName, { exact: true }).first().waitFor()
    assert.equal(await dialog.locator('.room-detail__owner-phone').count(), 1)
    await dialog.getByRole('button', { name: /Đã lưu/ }).waitFor()
    assert.equal(await dialog.getByRole('button', { name: 'Nhắn tin ngay', exact: true }).count(), 1)
    assert.equal(await dialog.getByRole('button', { name: 'Đặt lịch xem phòng', exact: true }).count(), 1)
    assert.doesNotMatch(await dialog.innerText(), /Tối đa 1 người|Tiền thuê cả phòng/)
    await dialog.getByRole('button', { name: 'Đã lưu', exact: false }).click()
    await dialog.getByRole('button', { name: /Lưu tin/ }).waitFor()
    assert.equal(saved, false)
    await dialog.getByRole('button', { name: 'Hiện số điện thoại', exact: true }).click()
    await dialog.locator('.room-detail__phone-value').getByRole('link').waitFor()
    await page.screenshot({ path: `${out}/detail-${width}.png` })
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await dialog.getByRole('button', { name: 'Đóng', exact: true }).click()
    await dialog.waitFor({ state: 'detached' })
    await preview.getByRole('button', { name: 'Lưu phòng', exact: true }).waitFor()
  }
  assert.deepEqual(mutations, ['PUT', 'PUT', 'DELETE', 'PUT', 'PUT', 'DELETE'])
  assert.equal(sourceReads, 0, 'Mapped records use the actual native detail API, not a styled source modal')
  assert.deepEqual(errors, [])
  console.log('PASS imported account -> actual native preview/detail, shortlist ID, save failure/retry, shared saved state, phone reveal, native chat/schedule controls, unknown source facts, 390/1440 layouts; all writes intercepted locally')
} catch (error) { console.log(JSON.stringify({ errors, text: (await page.locator('body').innerText()).slice(0, 1600) })); throw error }
finally { await browser.close() }
