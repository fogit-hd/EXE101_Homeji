import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'

const { chromium } = createRequire(import.meta.url)(process.env.HOMEJI_PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.HOMEJI_TEST_BASE_URL || 'http://127.0.0.1:5515'
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local fixture only')
const out = 'output/verification/nearby-panel-layout'
await mkdir(out, { recursive: true })
await writeFile(`${out}/index.html`, '<!doctype html><html lang="vi" data-theme="light"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./probe.tsx"></script></html>')
await writeFile(`${out}/probe.tsx`, `
import React,{useState}from'react';import{createRoot}from'react-dom/client';import{MapNearbyPanel}from'/src/components/map/MapNearbyPanel.tsx';import{LiquidGlassEffects}from'/src/components/ui/LiquidGlassEffects.tsx';import'/src/index.css';import'/src/liquid-glass.css';import'/src/components/theme/dark-theme.css';import'/src/glass-controls.css';
const anchor={lat:10.8,lng:106.7,label:'Căn hộ Flora Anh Đào gần hồ bơi và phòng gym',placeId:'anchor'};
function Probe(){const[category,setCategory]=useState('food');const[open,setOpen]=useState(true);return <><LiquidGlassEffects/><main style={{position:'relative',height:'100dvh',background:'repeating-linear-gradient(130deg,#d8ebe2 0 100px,#c2d5d0 100px 112px,#e6efdc 112px 210px)'}}>{open&&<MapNearbyPanel anchor={anchor} category={category} onCategoryChange={setCategory} onClose={()=>setOpen(false)} onPick={place=>document.body.dataset.picked=place.placeId}/>}</main></>};createRoot(document.getElementById('root')).render(<Probe/>);
`)
const browser = await chromium.launch({ headless: true, executablePath: process.env.HOMEJI_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const page = await browser.newPage()
const errors = []; page.on('pageerror', e => errors.push(e.message))
await page.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort())
await page.route('**/src/contexts/GoogleMapsProvider.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: 'export function useGoogleMaps(){return {apiKey:"fixture",isLoaded:true}}' }))
await page.route('**/src/lib/placeAutocomplete.ts*', route => route.fulfill({ contentType: 'application/javascript', body: `
export const NEARBY_PLACE_CATEGORY_OPTIONS=[['food','Ăn uống'],['cafe','Cà phê'],['grocery','Tạp hóa'],['health','Y tế'],['pharmacy','Nhà thuốc'],['studyCafe','Cà phê để học']].map(([id,label])=>({id,label}));
const items=Array.from({length:8},(_,i)=>({placeId:'place-'+i,title:['PHỞ GÀ TA NGÔ GIA PHÚ','Cà phê sân vườn gần nhà','Cửa hàng tiện lợi khu dân cư'][i%3],address:'673 Đ. Đỗ Xuân Hợp, Bình Trưng Đông, Thủ Đức, Hồ Chí Minh',typeLabel:'Nhà hàng',distanceMeters:403+i*125,lat:10.8,lng:106.7}));
export async function searchNearbyPlaces(){if(window.nearbyMode==='error')throw Error('fixture');if(window.nearbyMode==='empty')return [];if(window.nearbyMode==='loading')return new Promise(resolve=>window.resolveNearby=()=>resolve(items));return items}
` }))
try {
  for (const [width,height] of [[1440,900],[431,626],[390,720],[320,568]]) for (const theme of ['light','dark']) {
    await page.setViewportSize({ width, height }); await page.goto(`${base}/${out}/index.html`)
    await page.evaluate(t => document.documentElement.dataset.theme = t, theme)
    const list = page.locator('.map-nearby-panel__results')
    await list.locator('article').nth(7).waitFor()
    await page.screenshot({ path: `${out}/${theme}-${width}.png` })
    assert.ok((await list.boundingBox()).height >= 200, `${width}x${height} ${theme}: result height ${(await list.boundingBox()).height} needs usable reading space`)
    assert.equal(await page.locator('details').getAttribute('open'), null)
    assert.equal(await page.getByRole('button', { name: 'Ăn uống', exact: true }).getAttribute('aria-pressed'), 'true')
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    assert.ok(await page.locator('.map-nearby-panel').evaluate(e => e.scrollWidth <= e.clientWidth))
    assert.ok(await list.evaluate(e => e.scrollWidth <= e.clientWidth))
    await page.screenshot({ path: `${out}/${theme}-${width}.png` })
    const first = list.locator('article').first()
    await first.getByRole('button').click(); assert.equal(await page.locator('body').getAttribute('data-picked'), 'place-0')
    assert.match(await first.getByRole('link').getAttribute('href'), /query_place_id=place-0/)
    await page.getByText('Nguồn & cách tính khoảng cách', { exact: true }).click()
    assert.ok(await page.locator('details').evaluate(e => e.open)); assert.ok((await list.boundingBox()).height >= 100)
    await page.getByText('Nguồn & cách tính khoảng cách', { exact: true }).click()
    await list.locator('article').last().getByRole('button').click(); assert.equal(await page.locator('body').getAttribute('data-picked'), 'place-7')
  }
  await page.evaluate(() => window.nearbyMode = 'loading')
  await page.getByRole('button', { name: 'Cà phê', exact: true }).click()
  await page.getByText('Đang tìm tiện ích trong bán kính 1,8 km…', { exact: true }).waitFor()
  await page.evaluate(() => window.resolveNearby()); await page.locator('article').nth(7).waitFor()
  await page.evaluate(() => window.nearbyMode = 'empty')
  await page.getByRole('button', { name: 'Tạp hóa', exact: true }).click()
  await page.getByText('Chưa tìm thấy địa điểm thuộc nhóm này.', { exact: false }).waitFor()
  await page.evaluate(() => window.nearbyMode = 'error')
  await page.getByRole('button', { name: 'Y tế', exact: true }).click(); await page.getByRole('alert').waitFor()
  await page.evaluate(() => window.nearbyMode = 'results')
  await page.getByRole('button', { name: 'Thử lại', exact: true }).click(); await page.locator('article').nth(7).waitFor()
  await page.getByRole('button', { name: 'Cà phê để học', exact: true }).click()
  await page.locator('.map-nearby-panel__notice').waitFor()
  await page.getByRole('button', { name: 'Đóng tiện ích gần đây' }).click(); await page.locator('aside').waitFor({ state: 'detached' })
  assert.deepEqual(errors, [])
  console.log('PASS nearby panel: readable result space at 320/390/431/1440, light/dark, clear selection, scroll, disclosure, picking, links, loading/empty/retry and closing. Places responses are fixtures.')
} finally { await browser.close() }
