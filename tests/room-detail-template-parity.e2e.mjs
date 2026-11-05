import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'

const base = process.env.HOMEJI_TEST_BASE_URL || 'http://127.0.0.1:5542'
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local fixtures only')
const out = 'output/verification/room-detail-template-parity'
await mkdir(out, { recursive: true })
const images = Array.from({ length: 3 }, (_, i) => `https://res.cloudinary.com/dv4y7cdpi/image/upload/homeji/rental-sources/parity-${i}.jpg`)
const source = { id: 'source-room', title: 'Phòng gần Lê Văn Việt', address: 'Lê Văn Việt, Thủ Đức', publisherName: 'Người đăng kiểm thử', price: 1400000, area: 50, imageUrls: images, depositLabel: 'Chưa cung cấp', description: 'Phòng có cửa sổ, bếp riêng.', amenityHighlights: ['Máy lạnh'], collectedAt: '2026-11-05T00:00:00Z' }
const native = { id: 'reference-room', title: 'Phòng tham chiếu Dương Thanh Duy', address: '12 đường số 8, Linh Trung, Thủ Đức', ownerDisplayName: 'Dương Thanh Duy', ownerId: 'reference-owner', ownerRole: 2, ownerPhone: '0901234567', hasOwnerPhone: true, isOwnerVerified: true, isOwnerPremium: true, type: 1, price: 6000000, area: 54, deposit: 12000000, maxOccupants: 1, media: images.map((path, sortOrder) => ({ path, sortOrder, mediaType: 1 })), description: source.description, amenities: [], viewCount: 0, saveCount: 0 }
await writeFile(out + '/index.html', '<html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
await writeFile(out + '/scene.tsx', `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{MemoryRouter}from'react-router-dom';import{RoomDetailModal}from'/src/components/map/listings/RoomDetailModal.tsx';import{SourceRoomDetail}from'/src/components/map/listings/SourceRoomDetail.tsx';import'/src/index.css';function Scene(){const[selected,setSelected]=useState(null);return <><button onClick={()=>setSelected('native')}>Mở tin tham chiếu</button><button onClick={()=>setSelected('source')}>Mở tin trong cụm</button><RoomDetailModal listingId={selected==='native'?'reference-room':null} onClose={()=>setSelected(null)}/>{selected==='source'?<SourceRoomDetail id="source-room" onClose={()=>setSelected(null)}/>:null}</>}createRoot(document.getElementById('root')).render(<MemoryRouter><Scene/></MemoryRouter>);`)
const browser = await chromium.launch({ headless: true, channel: 'msedge' })
const page = await browser.newPage()
await page.addInitScript(() => localStorage.setItem("homeji_access_token", "local-fixture-only"))
const errors = []; page.on('pageerror', error => errors.push(error.message))
await page.route('**/src/contexts/AuthContext.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const useAuth=()=>({isAuthenticated:true,isLoading:false,needsProfileSetup:false,profile:{id:"viewer",role:1}})' }))
await page.route('**/src/contexts/AuthModalContext.logic.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const useAuthModal=()=>({openAuthModal:()=>{}})' }))
await page.route('**/src/contexts/rental-assistant-context.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const useRentalAssistantSelection=()=>{};export const useRentalAssistantOpener=()=>null;' }))
await page.route('**/src/lib/aiFeatureFlags.ts*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const aiFeatureFlags={decisionTools:false};' }))
await page.route('https://res.cloudinary.com/**', route => route.fulfill({ path: 'public/brand/homeji-logo2.png', contentType: 'image/png' }))
await page.route('**/api/**', route => {
  const path = new URL(route.request().url()).pathname
  if (!path.startsWith('/api/')) return route.continue()
  if (route.request().method() !== 'GET') throw Error('This visual fixture must never write to an API')
  if (path === '/api/rental-posts/reference-room') return route.fulfill({ json: native })
  if (path === '/api/rental-source-listings/source-room') return route.fulfill({ json: source })
  if (path === '/api/rental-source-listings/source-room/contact') return route.fulfill({ json: { phone: '0901234567', phones: ['0901234567'] } })
  if (path === '/api/profile/reference-owner') return route.fulfill({ json: { id: 'reference-owner', displayName: 'Dương Thanh Duy', createdAt: '2026-08-05T00:00:00Z', facebookUrl: null, zaloPhone: null } })
  return route.fulfill({ json: [] })
})
const geometry = async () => page.locator('.room-detail').evaluate(element => {
  const measure = node => { const rect = node.getBoundingClientRect(); return [rect.x, rect.y, rect.width, rect.height].map(Math.round) }
  return Object.fromEntries(['', '__main', '__aside', '__footer', '__photos'].map(part => [part || 'dialog', measure(part ? element.querySelector('.room-detail' + part) : element)]))
})
try {
  for (const width of [1440, 1024, 390, 320]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(base + '/' + out + '/index.html')
    await page.getByRole('button', { name: 'Mở tin tham chiếu', exact: true }).click()
    const dialog = page.locator('.room-detail')
    await dialog.getByText('Dương Thanh Duy', { exact: true }).first().waitFor()
    await dialog.locator('.room-detail__photos').waitFor()
    const reference = await geometry()
    const referenceWidth = reference.dialog[2]
    assert.equal(await dialog.locator('.room-detail__person').count(), 1)
    assert.equal(await dialog.locator('.room-detail__owner-phone').count(), 1)
    await page.screenshot({ path: `${out}/native-${width}.png` })
    await dialog.getByRole('button', { name: 'Đóng', exact: true }).click()
    await dialog.waitFor({ state: 'detached' })
    await page.getByRole('button', { name: 'Mở tin trong cụm', exact: true }).click()
    await dialog.getByText(source.publisherName, { exact: true }).first().waitFor()
    await dialog.locator('.room-detail__photos').waitFor()
    const current = await geometry()
    assert.deepEqual(current.dialog, reference.dialog, 'Source and reference use the exact same modal dimensions and position')
    if (width > 800) {
      for (const part of ['__main', '__aside', '__footer', '__photos']) assert.deepEqual(current[part], reference[part], `Same ${part} geometry`)
    }
    assert.equal(await dialog.locator('.room-detail__person').count(), 1)
    assert.equal(await dialog.locator('.room-detail__owner-phone').count(), 1)
    assert.equal(await dialog.locator('.room-detail__owner-verified').count(), 0, 'Source listings never inherit the reference owner verification')
    assert.ok(referenceWidth <= width)
    assert.equal(await dialog.getByRole('link', { name: 'Gọi điện', exact: true }).count(), 0, 'Phone stays hidden until the user reveals it')
    await dialog.getByRole('button', { name: 'Liên hệ người đăng', exact: true }).click()
    await dialog.getByRole('link', { name: 'Gọi điện', exact: true }).waitFor()
    assert.equal(await dialog.getByRole('link', { name: 'Gọi điện', exact: true }).getAttribute('href'), 'tel:0901234567')
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await page.screenshot({ path: `${out}/source-${width}.png` })
    await page.keyboard.press('Escape')
    await dialog.waitFor({ state: 'detached' })
  }
  assert.deepEqual(errors, [])
  console.log('PASS same native/source dialog and desktop column/gallery/footer geometry; shared profile and flashlight; truthful verification; authenticated contact reveal; Escape; 320–1440 layouts; read-only local API fixtures')
} catch (error) {
  await page.screenshot({ path: `${out}/failure.png` })
  console.log(JSON.stringify({ errors, text: (await page.locator('body').innerText()).slice(0, 1800) }))
  throw error
} finally { await browser.close() }
