import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'

const { chromium }=createRequire(import.meta.url)(process.env.HOMEJI_PLAYWRIGHT_MODULE||'playwright')
const base=process.env.HOMEJI_TEST_BASE_URL||'http://127.0.0.1:5515'
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local fixture only')
const out='output/verification/map-context-panel'
await mkdir(out,{recursive:true})
await writeFile(out+'/index.html','<!doctype html><html lang="vi" data-theme="light"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
await writeFile(out+'/scene.tsx',`
import React,{useState}from'react';import{createRoot}from'react-dom/client';import{MemoryRouter}from'react-router-dom';import{MapListingsWorkspace}from'/src/components/map/listings/MapListingsWorkspace.tsx';import{MapNearbyPanel}from'/src/components/map/MapNearbyPanel.tsx';import'/src/index.css';import'/src/pages/HomePage.css';
const posts=[1,2,3].map(i=>({id:'room-'+i,type:1,title:'Căn hộ Flora Fuji Kikyo '+i,price:7500000,area:67,address:'Quận 9, TP. Thủ Đức',thumbnailPath:'/landing/bloom-hero-bg2.jpg',latitude:10.84,longitude:106.78}));
function Scene(){const[nearby,setNearby]=useState(true),[category,setCategory]=useState('food');const panel=nearby?<MapNearbyPanel anchor={{lat:10.84,lng:106.78,label:'Căn hộ Flora',placeId:'room'}} category={category} onCategoryChange={setCategory} onClose={()=>setNearby(false)} onPick={()=>document.body.dataset.picked='yes'}/>:null;return <MemoryRouter initialEntries={['/?view=split']}><div style={{height:'100dvh'}}><MapListingsWorkspace contextPanel={panel} posts={posts} selectedListingId="room-1" hoveredListingId={null} loading={false} error="" mapNode={<div className="home-map-frame" style={{background:'#d7ebe2'}}><button type="button" onClick={()=>setNearby(true)}>Mở tiện ích</button></div>} onHoverListing={()=>{}} onLeaveListing={()=>{}} onSelectListing={()=>{}} onResetFilters={()=>{}}/></div></MemoryRouter>};createRoot(document.getElementById('root')).render(<Scene/>);
`)
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const page=await browser.newPage({reducedMotion:'reduce'})
await page.route('**/*',route=>new URL(route.request().url()).origin===new URL(base).origin?route.continue():route.abort())
await page.route('**/src/contexts/GoogleMapsProvider.logic.tsx*',route=>route.fulfill({contentType:'application/javascript',body:'export const useGoogleMaps=()=>({apiKey:"fixture",isLoaded:true})'}))
await page.route('**/src/lib/placeAutocomplete.ts*',route=>route.fulfill({contentType:'application/javascript',body:`export const NEARBY_PLACE_CATEGORY_OPTIONS=[['food','Ăn uống'],['cafe','Cà phê'],['grocery','Tạp hóa'],['health','Y tế'],['pharmacy','Nhà thuốc'],['studyCafe','Cà phê để học']].map(([id,label])=>({id,label}));export async function searchNearbyPlaces(){return Array.from({length:8},(_,i)=>({placeId:'place-'+i,title:'Tiện ích thử nghiệm '+i,address:'Quận 9',typeLabel:'Cà phê',distanceMeters:80+i*100,lat:10.84,lng:106.78}))}`}))
const errors=[];page.on('pageerror',e=>errors.push(e.message))
try{
 for(const [width,height]of[[1440,900],[1024,768],[768,720],[390,844],[320,568]]){
  await page.setViewportSize({width,height});await page.goto(base+'/'+out+'/index.html')
  const panel=page.locator('.map-nearby-panel')
  await panel.locator('article').nth(7).waitFor()
  assert.ok(await panel.locator('h2').evaluate(e=>{const b=e.getBoundingClientRect();return e.closest('.map-nearby-panel').contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2))}),'Nearby heading must be on top, not hidden behind the room list')
  assert.equal(await page.getByRole('complementary',{name:'Danh sách kết quả',exact:true}).count(),0,'Only the active context owns the side panel')
  const box=await panel.boundingBox()
  assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=width+1&&box.y+box.height<=height+1)
  assert.ok((await panel.locator('.map-nearby-panel__results').boundingBox()).height>=100,'Nearby results need usable scroll space')
  await panel.getByRole('button',{name:'Xem vị trí Tiện ích thử nghiệm 0',exact:true}).click()
  assert.equal(await page.locator('body').getAttribute('data-picked'),'yes')
  await page.screenshot({path:out+'/nearby-'+width+'.png'})
  await panel.getByRole('button',{name:'Đóng tiện ích gần đây',exact:true}).click()
  await panel.waitFor({state:'detached'})
  const list=page.getByRole('complementary',{name:'Danh sách kết quả',exact:true})
  if(width<=1100)await page.getByRole('button',{name:'Danh sách',exact:true}).first().click()
  assert.ok(await list.isVisible(),'Closing nearby restores the existing room list')
  assert.equal(await list.locator('.map-listings__card').count(),3)
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
 }
 assert.deepEqual(errors,[])
 console.log('PASS: nearby panel owns the context area without room-list overlap, usable scrolling/picking/close and restored list at 320/390/768/1024/1440')
}finally{await browser.close()}
