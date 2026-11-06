import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'
const base=process.env.HOMEJI_TEST_BASE_URL||'http://127.0.0.1:5541'
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local fixture only')
const out = 'output/verification/vip-cluster'
await mkdir(out, { recursive: true })
// Rewriting an .html file under Vite's root reloads the open page, so leave an unchanged scene alone.
const writeScene = async (file, content) => { if (await readFile(file, 'utf8').catch(() => '') !== content) await writeFile(file, content) }
await writeScene(out + '/index.html', '<html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
await writeScene(out + '/scene.tsx', `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{MemoryRouter}from'react-router-dom';import{RentalMap}from'/src/components/map/RentalMap.tsx';import'/src/index.css';import'/src/glass-controls.css';import{LiquidGlassEffects}from'/src/components/ui/LiquidGlassEffects.tsx';const posts=Array.from({length:3},(_,i)=>({id:'native-'+i,type:1,title:'Phòng Homeji '+i,address:'Lê Văn Việt, Thủ Đức',price:3000000+i*100000,area:25,latitude:10.842,longitude:106.81,thumbnailPath:'/brand/homeji-agent-cat.png',isOwnerPremium:i!==0,viewCount:0,saveCount:0}));function Scene(){const[vip,setVip]=useState(true),[selected,setSelected]=useState('');return <><button id="expiry" onClick={()=>setVip(false)}>Hết Premium</button><p id="selected">{selected}</p><div style={{height:500}}><RentalMap showSourceCatalog posts={posts.map(p=>({...p,isOwnerPremium:vip&&p.isOwnerPremium}))} selectedPostId={selected||null} onSelectPost={setSelected}/></div><LiquidGlassEffects/></>}createRoot(document.getElementById('root')).render(<MemoryRouter><Scene/></MemoryRouter>);`)
const browser = await chromium.launch({ headless: true, channel: 'msedge' })
const page = await browser.newPage({ viewport: { width: 1100, height: 800 } })
const errors = []; page.on('pageerror', error => errors.push(error.message))
await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ contentType: 'text/css', body: '' }))
await page.route('**/src/contexts/GoogleMapsProvider.logic*', route => route.fulfill({ contentType: 'application/javascript', body: `export const useGoogleMaps=()=>({apiKey:'fixture',mapId:'fixture',isLoaded:true});export const useGoogleMapsStatus=useGoogleMaps;` }))
await page.route('**/src/hooks/useGoogleMapsDiagnostics*', route => route.fulfill({ contentType: 'application/javascript', body: `export const useGoogleMapsDiagnostics=()=>({});` }))
await page.route('**/src/lib/mapWebGL.ts*', route => route.fulfill({ contentType: 'application/javascript', body: `export const waitForMapHostSize=async()=>{};` }))
await page.route('**/src/lib/googleMaps.ts*', route => route.fulfill({ contentType: 'application/javascript', body: `export const DEFAULT_MAP_CENTER={lat:10.84,lng:106.81},DEFAULT_MAP_ZOOM=13,MAP_FIT_MAX_ZOOM=16,MAP_FOCUS_ZOOM=17;export const createMapOptions=()=>({});export const isValidCoord=(a,b)=>Number.isFinite(a)&&Number.isFinite(b);export const loadMarkerLibrary=async()=>({AdvancedMarkerElement:window.Marker});export const loadStreetViewLibrary=async()=>({});export const resolveMapsColorScheme=()=>null;` }))
await page.route('**/src/lib/mapCamera.ts*', route => route.fulfill({ contentType: 'application/javascript', body: `export const createMapCameraScheduler=()=>({attach(){},dispose(){},schedule(){}});` }))
await page.addInitScript(() => {
  window.clusters = []
  class Marker extends EventTarget {
    constructor(values) { super(); Object.assign(this, values) }
    addListener(name, handler) { this.handler = handler; return { remove() {} } }
  }
  window.Marker = Marker
  class Popup {
    setContent(content) { this.content = content }
    setPosition() {}
    open() { document.getElementById('fixture-popup')?.remove(); const host = document.createElement('div'); host.id = 'fixture-popup'; host.style.cssText = 'position:fixed;right:16px;top:100px;padding:16px;background:white;z-index:5000;border-radius:16px'; host.append(this.content); document.body.append(host) }
    close() { if (this.content?.parentElement?.id === 'fixture-popup') this.content.parentElement.remove() }
  }
  class FakeMap {
    constructor(host) { this.host = host; window.mapHost = host }
    getStreetView() { return { setOptions() {}, addListener() { return { remove() {} } }, getVisible() { return false } } }
    addListener() { return { remove() {} } }
    getZoom() { return 13 }
    fitBounds() { window.zoomed = true }
  }
  class Bounds { extend() { return this } getCenter() { return { lat: () => 10.84, lng: () => 106.81 } } }
  window.google = { maps: { Map: FakeMap, InfoWindow: Popup, LatLngBounds: Bounds, event: { removeListener() {}, clearInstanceListeners() {}, trigger() {} } } }
})
// Keep Google's clustering boundary mocked; run the actual RentalMap renderer,
// shared marker ownership, source hook, DOM list and entitlement updates.
await page.route('**/node_modules/.vite/deps/@googlemaps_markerclusterer.js*', route => route.fulfill({ contentType: 'application/javascript', body: `export class SuperClusterAlgorithm{};export class MarkerClusterer{constructor(options){this.options=options;this.markers=[];window.clusters.push(this)}clearMarkers(){this.markers=[]}addMarkers(markers){this.markers.push(...markers)}setMap(){}render(){const old=document.getElementById('fixture-cluster');old?.remove();if(this.markers.length<2)return;const cluster={markers:this.markers,count:this.markers.length,position:{lat:10.84,lng:106.81},bounds:{}};const rendered=this.options.renderer.render(cluster);const button=document.createElement('button');button.id='fixture-cluster';button.title=rendered.title;button.style.cssText='position:absolute;left:40%;top:30%;background:transparent;border:0';button.append(rendered.content);button.onclick=()=>this.options.onClusterClick({},cluster,this.options.map);window.mapHost.append(button)}}` }))
await page.route('**/api/**', route => {
  const path = new URL(route.request().url()).pathname
  if (!path.startsWith('/api/')) return route.continue()
  if (path === '/api/rental-source-listings') return route.fulfill({ json: Array.from({ length: 14 }, (_, i) => ({ id: 'source-' + i, source: 'mogi', sourceUrl: 'https://mogi.vn/tin-' + i, title: 'Phòng nhập ' + i, address: 'Lê Văn Việt', latitude: 10.842, longitude: 106.81, price: 2200000, imageUrls: [] })) })
  return route.fulfill({ json: [] })
})
try {
  await page.goto(base + '/' + out + '/index.html', { waitUntil: 'domcontentloaded' })
  await page.getByText('★ 2 Premium', { exact: true }).waitFor()
  assert.equal(await page.evaluate(() => window.clusters.length), 1)
  assert.equal(await page.evaluate(() => window.clusters[0].markers.length), 17)
  assert.equal(await page.locator('.map-pin-cluster__count').textContent(), '17')
  await page.screenshot({ path: `${out}/cluster-1100.png` })
  await page.locator('#fixture-cluster').click()
  assert.equal(await page.locator('.map-cluster-listings__card:visible').count(), 17)
  await page.getByRole('button', { name: 'Xem Premium (2)', exact: true }).click()
  assert.equal(await page.locator('.map-cluster-listings__card:visible').count(), 2)
  await page.locator('.map-cluster-listings__card:visible').last().click()
  assert.equal(await page.locator('#selected').textContent(), 'native-2')
  await page.evaluate(() => window.clusters[0].markers.find(marker => marker.title === 'Phòng Homeji 0').dispatchEvent(new Event('gmp-click')))
  await page.waitForFunction(() => document.querySelector('#selected').textContent === 'native-0', null, { timeout: 5000 })
  await page.evaluate(() => window.clusters[0].markers.find(marker => marker.title === 'Phòng Homeji 2').dispatchEvent(new Event('gmp-click')))
  // A timeout here means the DOM click listener did not survive marker visual updates.
  await page.waitForFunction(() => document.querySelector('#selected').textContent === 'native-2', null, { timeout: 5000 })
  for (const width of [1100, 390, 320]) {
    await page.setViewportSize({ width, height: 800 })
    await page.locator('#fixture-cluster').click()
    await page.getByRole('button', { name: 'Xem Premium (2)', exact: true }).click()
    const box = await page.locator('.map-cluster-listings').boundingBox()
    assert.ok(box.width < width && box.x >= 0 && box.x + box.width <= width)
    await page.screenshot({ path: `${out}/vip-${width}.png` })
    await page.getByRole('button', { name: 'Xem tất cả (17)', exact: true }).click()
    assert.equal(await page.locator('.map-cluster-listings__card:visible').count(), 17)
    await page.getByRole('button', { name: 'Phóng to khu vực', exact: true }).click()
  }
  assert.equal(await page.evaluate(() => window.zoomed), true)
  await page.locator('#expiry').click()
  await page.locator('.map-pin-cluster__vip').waitFor({ state: 'detached' })
  assert.equal(await page.locator('.premium-stars').count(), 0)
  await page.locator('#fixture-cluster').click()
  assert.equal(await page.getByRole('button', { name: /Xem Premium/ }).count(), 0)
  assert.equal(await page.locator('.map-cluster-listings__card:visible').count(), 17)
  assert.deepEqual(errors, [])
  console.log('PASS one shared cluster, 17 total/2 strict Premium, correct selection, mobile list, Premium/all toggle, zoom and entitlement expiry; actual RentalMap and source hook with mocked Google Maps boundary')
} catch (error) {
  console.log(JSON.stringify({ errors }))
  throw error
} finally { await browser.close() }
