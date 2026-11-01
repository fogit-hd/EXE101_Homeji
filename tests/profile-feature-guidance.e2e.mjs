import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'

const base = process.env.HOMEJI_TEST_BASE_URL || 'http://127.0.0.1:5541'
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Local fixtures only')
const out = 'output/verification/profile-feature-guidance'
await mkdir(out, { recursive: true })
await writeFile(`${out}/index.html`, '<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
await writeFile(`${out}/scene.tsx`, `
import React,{useState}from'react';import{createRoot}from'react-dom/client';import{MemoryRouter,useLocation}from'react-router-dom';import{RoomDetailModal}from'/src/components/map/listings/RoomDetailModal.tsx';import{ChatbotProvider}from'/src/contexts/ChatbotContext.tsx';import{ToastProvider}from'/src/components/toast/ToastProvider.tsx';
import'/src/index.css';import'/src/ui-consistency.css';import'/src/product-ui.css';import'/src/components/theme/dark-theme.css';
function Scene(){const[open,setOpen]=useState(true);const route=useLocation();return <>{route.search.includes('section=profile')?<h1>Thông tin cơ bản</h1>:null}{open?<RoomDetailModal listingId="room-1" onClose={()=>setOpen(false)}/>:null}</>}
createRoot(document.getElementById('root')).render(<MemoryRouter initialEntries={['/?post=room-1']}><ToastProvider><ChatbotProvider><Scene/></ChatbotProvider></ToastProvider></MemoryRouter>);`)
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const results = []
try {
  for (const scenario of ['known', 'server', 'network', 'forbidden', 'missing']) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
    await context.addInitScript(() => localStorage.setItem('homeji_access_token', 'fixture'))
    await context.route('**/src/contexts/AuthContext.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: `export const useAuth=()=>({isAuthenticated:true,isLoading:false,needsProfileSetup:${scenario === 'known'},profile:${scenario === 'known' ? 'null' : '{id:"renter",role:1,onboardingCompleted:true}'},refreshProfile:async()=>{}})` }))
    await context.route('**/src/contexts/AuthModalContext.logic.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const useAuthModal=()=>({isOpen:false,openAuthModal:()=>{}})' }))
    let roomReads = 0
    await context.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname
      if (!path.startsWith('/api/')) return route.continue()
      if (path === '/api/chatbot/popup-config') return route.fulfill({ json: { enabled: false } })
      if (path === '/api/rental-posts/room-1') {
        roomReads++
        return route.fulfill({ status: scenario === 'network' ? 503 : scenario === 'missing' ? 404 : 403, json: scenario === 'forbidden'
          ? { code: 'access_denied', detail: 'Tài khoản này không có quyền xem tin.' } : scenario === 'network'
          ? { detail: 'Dịch vụ đang bảo trì. Vui lòng thử lại sau.' }
          : { code: 'profile_required', detail: 'Vui lòng hoàn thiện hồ sơ trước khi dùng tính năng này.' } })
      }
      return route.fulfill({ json: [] })
    })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    page.setDefaultTimeout(10000)
    await page.goto(`${base}/${out}/index.html`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('dialog', { name: 'Chi tiết phòng' }).waitFor()
    if (scenario === 'network' || scenario === 'forbidden') {
      await page.getByRole('button', { name: 'Thử lại', exact: true }).waitFor()
      assert.equal(await page.getByRole('link', { name: 'Cập nhật hồ sơ', exact: true }).count(), 0)
      await page.getByText(scenario === 'network' ? 'Dịch vụ đang bảo trì. Vui lòng thử lại sau.' : 'Tài khoản này không có quyền xem tin.', { exact: true }).waitFor()
    } else if (scenario === 'missing') {
      await page.getByRole('heading', { name: 'Tin không còn', exact: true }).waitFor()
      assert.equal(await page.getByRole('link', { name: 'Cập nhật hồ sơ', exact: true }).count(), 0)
    } else {
      const update = page.getByRole('link', { name: 'Cập nhật hồ sơ', exact: true })
      await update.waitFor()
      await page.getByText('Vui lòng cập nhật hồ sơ để xem thông tin phòng.', { exact: true }).waitFor()
      assert.equal(await page.getByRole('button', { name: 'Thử lại', exact: true }).count(), 0)
      const href = new URL(await update.getAttribute('href'), 'https://homeji.test')
      assert.equal(href.searchParams.get('section'), 'profile')
      assert.equal(href.searchParams.get('returnTo'), '/?post=room-1')
      if (scenario === 'known') assert.equal(roomReads, 0, 'Known missing profile must be checked before requesting room details')
    }
    assert.deepEqual(errors, [])
    await page.screenshot({ path: `${out}/${scenario}.png`, fullPage: true })
    if (scenario === 'known' || scenario === 'server') {
      await page.getByRole('link', { name: 'Cập nhật hồ sơ', exact: true }).click()
      await page.getByRole('heading', { name: 'Thông tin cơ bản', exact: true }).waitFor()
      assert.equal(await page.getByRole('dialog', { name: 'Chi tiết phòng' }).count(), 0, 'Profile navigation must close the room overlay')
    }
    results.push({ scenario, roomReads })
    await context.close()
  }
  console.log(JSON.stringify(results))
} finally { await browser.close() }
