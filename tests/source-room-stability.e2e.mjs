import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'

const base = process.env.HOMEJI_TEST_BASE_URL || 'http://127.0.0.1:5541'
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local fixtures only')
const out = 'output/verification/source-room-stability'
await mkdir(out, { recursive: true })
// Keep fallback coverage independent of real source IDs now mapped to native posts.
const id = 'c3022940-7db2-4d1d-803a-ec9444952978'
const row = { id, title: 'Cho Thuê Phòng Trọ Cao Cấp Có Gác', address: 'Trương Văn Thành, Hiệp Phú', publisherName: 'Người đăng kiểm thử', price: 3700000, area: 30, imageUrls: [], description: 'Phòng có gác và máy lạnh.', collectedAt: '2026-11-04T00:00:00Z' }
await writeFile(out + '/index.html', '<html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
// Run the same query normalization as HomePage alongside the real preview and detail host.
await writeFile(out + '/scene.tsx', `import React,{useEffect}from'react';import{createRoot}from'react-dom/client';import{MemoryRouter,useSearchParams,useNavigate,useLocation}from'react-router-dom';import{SourceRoomDetailsHost}from'/src/components/map/listings/SourceRoomDetailsHost.tsx';import{RentalMapPreview}from'/src/components/map/listings/RentalMapPreview.tsx';import{parseFiltersFromURL,serializeFiltersToQuery}from'/src/components/map/listings/listingAdapters.ts';import{sourceRoomHref}from'/src/lib/sourceRoomLink.ts';import{ThemeSwitch}from'/src/components/theme/ThemeSwitch.tsx';import'/src/components/theme/theme.css';import'/src/index.css';function Scene(){const[params,setParams]=useSearchParams(),navigate=useNavigate(),location=useLocation();useEffect(()=>{const next=serializeFiltersToQuery(parseFiltersFromURL(params),params);if(next.toString()!==params.toString())setParams(next,{replace:true})},[params,setParams]);return <><ThemeSwitch floating/><output hidden>{location.search}</output><RentalMapPreview monthly view={{id:'rental:${id}',title:${JSON.stringify(row.title)},address:${JSON.stringify(row.address)},priceLabel:'3.700.000 ₫',areaLabel:'30 m²',typeLabel:'Phòng trọ',thumbnailUrl:null,isPremium:false,isOwnerVerified:false,facts:[]}} onOpen={()=>navigate(sourceRoomHref('${id}',location))}/><SourceRoomDetailsHost/></>}createRoot(document.getElementById('root')).render(<MemoryRouter initialEntries={['/?section=explore&view=map&keyword=Truong+Van+Thanh']}><Scene/></MemoryRouter>);`)
const browser = await chromium.launch({ headless: true, channel: 'msedge' })
try {
  for (const width of [1366, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' })
    const errors = []; page.on('pageerror', error => errors.push(error.message))
    await page.route('**/src/contexts/ThemeContext.ts*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const useTheme=()=>({theme:"light",busy:false,toggle:()=>{}})' }))
    await page.route('**/src/contexts/AuthContext.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const useAuth=()=>({isAuthenticated:false,isLoading:false})' }))
    await page.route('**/src/contexts/AuthModalContext.logic.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const useAuthModal=()=>({openAuthModal:()=>document.body.dataset.loginRequested="yes"})' }))
    let fail = true, release
    const held = new Promise(resolve => { release = resolve })
    await page.route('**/api/rental-source-listings/' + id, async route => {
      await held
      return fail ? route.abort('namenotresolved') : route.fulfill({ json: row })
    })
    await page.goto(base + '/' + out + '/index.html')
    await page.getByRole('button', { name: 'Xem phòng & liên hệ', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await dialog.waitFor()
    await page.waitForTimeout(250)
    assert.equal(await dialog.count(), 1, 'Opening detail must survive HomePage query normalization')
    assert.match(await page.locator('output').textContent(), new RegExp('source=' + id))
    release()
    await dialog.getByRole('alert').waitFor()
    assert.equal(await dialog.count(), 1, 'Network failure must keep detail open with retry')
    fail = false
    await dialog.getByRole('button', { name: 'Thử lại', exact: true }).click()
    await dialog.getByText(row.title, { exact: true }).waitFor()
    await dialog.getByRole('button', { name: /Đăng nhập để xem số điện thoại/ }).click()
    assert.equal(await page.locator('body').getAttribute('data-login-requested'), 'yes')
    assert.equal(await dialog.count(), 1)
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    assert.ok(await dialog.getByRole('button', { name: 'Đóng', exact: true }).evaluate(node => { const r = node.getBoundingClientRect(); return node.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)) }), 'Floating theme switch must not intercept room close')
    await page.screenshot({ path: out + '/recovered-' + width + '.png' })
    await dialog.getByRole('button', { name: 'Đóng', exact: true }).click()
    await dialog.waitFor({ state: 'detached' })
    assert.doesNotMatch(await page.locator('output').textContent(), /source=/)
    assert.match(await page.locator('output').textContent(), /keyword=Truong\+Van\+Thanh/)
    assert.deepEqual(errors, [])
    await page.close()
  }
  console.log('PASS real preview/detail survives filter normalization, DNS failure, retry, contact login and close at desktop/mobile widths')
} finally { await browser.close() }
