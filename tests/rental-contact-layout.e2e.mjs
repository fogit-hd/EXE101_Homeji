import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'

const { chromium } = createRequire(import.meta.url)(process.env.HOMEJI_PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.HOMEJI_TEST_BASE_URL || 'http://127.0.0.1:5515'
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local fixture only')
const out = 'output/verification/rental-contact-layout'
await mkdir(out, { recursive: true })
await writeFile(`${out}/index.html`, '<!doctype html><html lang="vi" data-theme="light"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
const post = { id: 'room-1', type: 1, title: 'Căn hộ 2 phòng ngủ Centum Wealth, không gian thoáng gần làng đại học', address: '2A Phan Chu Trinh, Tăng Nhơn Phú, Hồ Chí Minh 700000, Việt Nam', price: 8000000, area: 79, maxOccupants: 3, deposit: 8000000, latitude: 10.84, longitude: 106.78, ownerDisplayName: 'Người đăng thử nghiệm', ownerPhone: '+84 (901) 234-567', description: 'Căn hộ thoáng sáng, bếp riêng và ban công.\nPhí quản lý: 8.000 đ/m²/tháng.\nVui lòng trao đổi trước khi xem phòng.', amenities: ['wifi','parking'], thumbnailPath: '/landing/bloom-hero-bg2.jpg', media: [0,1,2].map(i => ({ mediaType: 1, path: '/landing/bloom-hero-bg2.jpg?photo=' + i, sortOrder: i })) }
await writeFile(`${out}/scene.tsx`, `
import React,{useState}from'react';import{createRoot}from'react-dom/client';import{MemoryRouter}from'react-router-dom';
import{RoomDetailModal}from'/src/components/map/listings/RoomDetailModal.tsx';import{MapListingsWorkspace}from'/src/components/map/listings/MapListingsWorkspace.tsx';import{LiquidGlassEffects}from'/src/components/ui/LiquidGlassEffects.tsx';
import'/src/index.css';import'/src/liquid-glass.css';import'/src/components/theme/dark-theme.css';import'/src/glass-controls.css';import'/src/workspace-readability.css';
const posts=${JSON.stringify([post, { ...post, id: 'room-2', title: 'Phòng rộng gần trường, có ban công', price: 6400000, area: 55 }])};
function Scene(){const[detail,setDetail]=useState('room-1');const[selected,setSelected]=useState('room-1');return <MemoryRouter initialEntries={['/?view=split']}><LiquidGlassEffects/><div style={{height:'100dvh'}}><MapListingsWorkspace posts={posts} selectedListingId={selected} hoveredListingId={null} loading={false} error="" mapNode={<div style={{height:'100%',background:'repeating-linear-gradient(125deg,#d8ebe2 0 100px,#c2d5d0 100px 112px,#e6efdc 112px 210px)'}}/>} onHoverListing={()=>{}} onLeaveListing={()=>{}} onSelectListing={setSelected} onOpenRoomDetail={setDetail} onToggleSave={()=>document.body.dataset.saved='yes'} onResetFilters={()=>{}}/><RoomDetailModal listingId={detail} onClose={()=>setDetail(null)} onToggleSave={()=>document.body.dataset.saved='yes'} onOpenMessages={id=>document.body.dataset.conversation=id}/></div></MemoryRouter>};createRoot(document.getElementById('root')).render(<Scene/>);
`)
const browser = await chromium.launch({ headless: true, executablePath: process.env.HOMEJI_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const page = await browser.newPage({ reducedMotion: 'reduce' })
await page.addInitScript(() => localStorage.setItem('homeji_access_token', 'fixture-token'))
await page.route('**/src/contexts/AuthContext.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const useAuth=()=>({isAuthenticated:true,profile:{role:1}})' }))
let mode = 'ready', conversationRequests = 0
await page.route('**/api/**', route => {
  const url = new URL(route.request().url())
  if (!url.pathname.startsWith('/api/')) return route.continue()
  if (url.pathname.startsWith('/api/rental-posts/')) return route.fulfill({ status: mode === 'missing' ? 404 : mode === 'error' ? 503 : 200, json: { ...post, ownerPhone: mode === 'invalidPhone' ? 'javascript:alert(1)' : mode === 'noPhone' ? null : post.ownerPhone } })
  if (url.pathname.startsWith('/api/conversations/rental-posts/')) { conversationRequests++; return route.fulfill({ json: { id: 'conversation-fixture' } }) }
  return route.fulfill({ json: [] })
})
const errors = []; page.on('pageerror', error => errors.push(error.message))
try {
  for (const [width,height] of [[1440,900],[1024,768],[390,844],[320,568]]) for (const theme of ['light','dark']) {
    await page.setViewportSize({ width, height }); await page.goto(`${base}/${out}/index.html`)
    const modal = page.locator('.room-detail')
    await modal.getByRole('button', { name: 'Nhắn tin ngay', exact: true }).waitFor()
    await page.evaluate(t => document.documentElement.dataset.theme = t, theme)
    await page.evaluate(() => document.fonts.ready)
    const message = modal.locator('.room-detail__message'), call = modal.getByRole('link', { name: 'Gọi điện', exact: true })
    const colors = await message.evaluate(e => ({ fill: getComputedStyle(e).backgroundColor, ink: getComputedStyle(e).color }))
    assert.match(colors.fill, /^rgb\(/, 'Primary contact action must have an opaque fill that survives global glass styles')
    const luminance = color => color.match(/[\d.]+/g).slice(0,3).map(Number).map(c => c / 255).map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4).reduce((sum,c,i) => sum + c * [.2126,.7152,.0722][i],0)
    const [lighter,darker] = [luminance(colors.fill),luminance(colors.ink)].sort((a,b) => b-a)
    assert.ok((lighter + .05) / (darker + .05) >= 4.5, 'Primary contact label needs readable contrast')
    for (const action of [message,call]) {
      const box = await action.boundingBox()
      assert.ok(box && box.y >= 0 && box.y + box.height <= height && box.width >= 44 && box.height >= 44, `${width}: contact action must stay visible and usable`)
    }
    assert.equal(await call.getAttribute('href'), 'tel:+84901234567')
    assert.equal(await modal.locator('details').count(), 0, 'Essential room information must not require expanding a disclosure')
    await modal.getByRole('heading', { name: 'Mô tả căn phòng', exact: true }).waitFor()
    assert.ok(await modal.getByText('Căn hộ thoáng sáng, bếp riêng và ban công.', { exact: false }).isVisible())
    assert.ok(await modal.locator('.room-detail__costs').getByText('Tiền cọc', { exact: true }).isVisible())
    assert.ok(await modal.getByRole('heading', { name: 'Tiện ích trong phòng', exact: true }).isVisible())
    assert.ok(await modal.locator('.room-detail__summary').evaluate(e => e.getBoundingClientRect().top < document.querySelector('.room-detail__gallery').getBoundingClientRect().top))
    assert.ok(await modal.locator('.room-detail__thumbs button').first().evaluate(e => parseFloat(getComputedStyle(e).borderRadius) <= 12 && !e.hasAttribute('data-glass-control')))
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.querySelector('.room-detail').scrollWidth <= document.querySelector('.room-detail').clientWidth))
    await page.screenshot({ path: `${out}/${theme}-${width}-detail.png` })
    await message.click(); await page.waitForFunction(() => document.body.dataset.conversation === 'conversation-fixture')
    await modal.getByRole('button', { name: 'Đặt lịch xem phòng', exact: true }).click()
    await modal.locator('.room-detail__schedule').waitFor()
    await modal.getByRole('button', { name: 'Hủy đặt lịch', exact: true }).click()
    await modal.getByRole('button', { name: 'Mở ảnh lớn', exact: true }).click()
    await page.getByRole('dialog', { name: 'Xem ảnh phòng', exact: true }).waitFor()
    await page.keyboard.press('Escape'); assert.ok(await modal.isVisible())
    await modal.getByRole('button', { name: 'Đóng', exact: true }).click(); await modal.waitFor({ state: 'detached' })
    await page.screenshot({ path: `${out}/${theme}-${width}-results.png` })
    await page.getByRole('button', { name: 'Xem phòng & liên hệ', exact: true }).click()
    await modal.getByRole('button', { name: 'Nhắn tin ngay', exact: true }).waitFor()
  }
  for (mode of ['noPhone','invalidPhone','missing','error']) {
    await page.goto(`${base}/${out}/index.html`)
    if (mode === 'missing') await page.getByText('Tin không còn', { exact: true }).waitFor()
    else if (mode === 'error') {
      await page.getByText('Không tải được chi tiết', { exact: true }).waitFor()
      mode = 'ready'; await page.getByRole('button', { name: 'Thử lại', exact: true }).click(); await page.getByRole('button', { name: 'Nhắn tin ngay', exact: true }).waitFor()
    } else {
      await page.getByText('Liên hệ qua tin nhắn trên Homeji.', { exact: true }).waitFor()
      assert.equal(await page.getByRole('link', { name: 'Gọi điện', exact: true }).count(), 0)
    }
  }
  assert.ok(conversationRequests >= 8)
  assert.deepEqual(errors, [])
  console.log('PASS: visible room information and prioritized contact at 320/390/1024/1440 in both themes; sanitized/missing phone, message callback, booking toggle, photo viewer, detail links and error/retry. API and map are fixtures.')
} finally { if (errors.length) console.error(errors); await browser.close() }
