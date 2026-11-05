import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'
const base = process.env.HOMEJI_TEST_BASE_URL || 'http://127.0.0.1:5541'
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local navigation fixture only')
const out = 'output/verification/source-room-navigation'
await mkdir(out, { recursive: true })
const id = 'e73cd2c3-42de-5863-b404-e6e338e5a22e'
const row = { id, title: 'Phòng công khai không có tài khoản chủ nhà', address: 'Lê Văn Việt, Thủ Đức', publisherName: 'Thanh Hậu Home', price: 1400000, area: 50, district: 'quan-9', imageUrls: [], description: 'Thông tin phòng công khai', collectedAt: '2026-11-02T00:00:00Z' }
await writeFile(out + '/index.html', '<html><meta charset="utf-8"><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
await writeFile(out + '/scene.tsx', `import React,{useEffect,useRef}from'react';import{createRoot}from'react-dom/client';import{MemoryRouter,Routes,Route,useLocation,useNavigate}from'react-router-dom';import{ExplorePage}from'/src/pages/ExplorePage.tsx';import{SourceRoomDetailsHost}from'/src/components/map/listings/SourceRoomDetailsHost.tsx';import{createSourceCatalogPopup}from'/src/components/map/sourceCatalogPopup.ts';import{sourceRoomHref}from'/src/lib/sourceRoomLink.ts';import'/src/index.css';import'/src/components/map/RentalMap.css';const id=${JSON.stringify(id)};function Scene(){const ref=useRef(null),navigate=useNavigate(),location=useLocation();useEffect(()=>{const pin={id:'rental:'+id,kind:'rental',title:${JSON.stringify(row.title)},address:'Lê Văn Việt',price:1400000,area:50,imageUrl:null,publisherName:'Thanh Hậu Home',sourceUpdatedAt:null,amenityHighlights:[]};ref.current.replaceChildren(createSourceCatalogPopup(pin,id=>navigate(sourceRoomHref(id,{search:'?keyword=Le+Van+Viet',hash:'#map'}))));},[navigate]);return <><output>{location.pathname+location.search+location.hash}</output><div ref={ref}/><SourceRoomDetailsHost/><Routes><Route path="/explore" element={<ExplorePage/>}/><Route path="/" element={<span>Bản đồ Homeji</span>}/></Routes></>}createRoot(document.getElementById('root')).render(<MemoryRouter initialEntries={[new URLSearchParams(window.location.search).has('redirect')?'/explore?source='+id+'&keyword=Le+Van+Viet':'/']}><Scene/></MemoryRouter>);`)
const browser = await chromium.launch({ headless: true, channel: 'msedge' })
try {
  const page = await browser.newPage()
  const errors = []; let detailReads = 0, contactReads = 0, accountWrites = 0
  page.on('pageerror', error => { errors.push(error.message); console.error('Page error:',error.message) })
  await page.route('**/src/contexts/AuthContext.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const useAuth=()=>({isAuthenticated:false,isLoading:false})' }))
  await page.route('**/src/contexts/AuthModalContext.logic.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const useAuthModal=()=>({openAuthModal:()=>document.body.dataset.loginRequested="yes"})' }))
  await page.route('**/api/**', route => {
    const request = route.request(), path = new URL(request.url()).pathname
    if (!path.startsWith('/api/')) return route.continue()
    if (request.method() !== 'GET') accountWrites++
    if (path.endsWith('/contact')) { contactReads++; return route.fulfill({ status: 401, json: {} }) }
    if (path.endsWith('/' + id)) { detailReads++; return route.fulfill({ json: row }) }
    return route.fulfill({ json: [] })
  })
  for (const suffix of ['', '?redirect=1']) {
    await page.goto(base + '/' + out + '/index.html' + suffix)
    if (!suffix) await page.getByRole('link', { name: 'Xem phòng & liên hệ', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Chi tiết phòng trọ', exact: true })
    await dialog.waitFor()
    await dialog.getByRole('complementary', { name: 'Giá thuê và liên hệ' }).getByText('Thanh Hậu Home', { exact: true }).waitFor()
    assert.match(await page.locator('output').textContent(), new RegExp('^/\\?[^#]*source=' + id))
    assert.match(await page.locator('output').textContent(), /keyword=Le\+Van\+Viet/)
    assert.equal(contactReads, 0)
    await dialog.getByRole('button', { name: /Đăng nhập để xem số điện thoại/ }).click()
    assert.equal(await page.locator('body').getAttribute('data-login-requested'), 'yes')
    assert.equal(contactReads, 0)
    await page.screenshot({ path: out + (suffix ? '/explore-redirect.png' : '/popup-click.png') })
    await dialog.getByRole('button', { name: 'Đóng', exact: true }).click()
    await dialog.waitFor({ state: 'detached' })
  }
  assert.equal(detailReads, 2); assert.equal(accountWrites, 0); assert.deepEqual(errors, [])
  console.log('PASS popup and /explore retain public listing ID and filters; no owner account or invented contact required; phone remains login gated')
} finally { await browser.close() }
