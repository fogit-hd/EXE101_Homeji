import assert from 'node:assert/strict'
import {mkdir,writeFile} from 'node:fs/promises'
import {chromium} from 'playwright'
const base=process.env.HOMEJI_TEST_BASE_URL||'http://127.0.0.1:5542'
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local fixture only')
const out='output/verification/mobile-discovery';await mkdir(out,{recursive:true})
await writeFile(out+'/index.html','<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
await writeFile(out+'/scene.tsx',`import React from'react';import{createRoot}from'react-dom/client';import{MemoryRouter}from'react-router-dom';import{MapListingsWorkspace}from'/src/components/map/listings/MapListingsWorkspace.tsx';import{GuestMapSection}from'/src/components/landing/GuestMapSection.tsx';import'/src/index.css';import'/src/pages/HomePage.css';import'/src/components/theme/dark-theme.css';import'/src/components/layout/AppLayout.css';document.documentElement.dataset.theme=new URLSearchParams(location.search).get('theme')||'light';const posts=Array.from({length:25},(_,i)=>({id:'room-'+i,type:1,title:'Phòng có cửa sổ '+i,price:2500000,area:25,address:'Lê Văn Việt, Thủ Đức',latitude:10.84,longitude:106.78}));const guest=new URLSearchParams(location.search).has('guest');createRoot(document.getElementById('root')).render(<MemoryRouter initialEntries={['/?section=listings&view=split&maxPrice=3000000']}><div style={{height:'100dvh'}}>{guest?<GuestMapSection/>:<MapListingsWorkspace posts={posts} selectedListingId="room-1" hoveredListingId={null} loading={false} error="" mapNode={<div style={{height:'100%',background:'var(--surface-muted)'}}>Bản đồ kiểm thử</div>} onHoverListing={()=>{}} onLeaveListing={()=>{}} onSelectListing={()=>{}} onResetFilters={()=>{}}/>}</div></MemoryRouter>);`)
const browser=await chromium.launch({headless:true,channel:'msedge'}),results=[]
try{
for(const [width,height,theme]of[[320,568,'light'],[390,844,'dark'],[430,932,'light'],[1280,800,'light']]){
 const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.message)});page.on('console',m=>{if(m.type()==='error')console.error(m.text())})
 await page.route('**/api/**',route=>new URL(route.request().url()).pathname.startsWith('/api/')?route.fulfill({json:[]}):route.continue())
 await page.route('**/src/contexts/GoogleMapsProvider.logic.tsx*',route=>route.fulfill({contentType:'application/javascript',body:'export const useGoogleMaps=()=>({apiKey:"",isLoaded:false})'}))
 await page.route('**/src/contexts/AuthModalContext.logic.ts*',route=>route.fulfill({contentType:'application/javascript',body:'export const useAuthModal=()=>({openAuthModal:()=>{}})'}))
 await page.route('**/src/contexts/chatbot-surface.ts*',route=>route.fulfill({contentType:'application/javascript',body:'export const useChatbotSurface=()=>{}'}))
 await page.route('**/src/contexts/AuthContext.tsx*',route=>route.fulfill({contentType:'application/javascript',body:'export const useAuth=()=>({isAuthenticated:false,isLoading:false,profile:null})'}))
 await page.goto(base+'/'+out+'/index.html?theme='+theme)
 await page.getByRole('group',{name:'Loại tin',exact:true}).waitFor()
 if(width<768){
  await page.getByRole('button',{name:'Danh sách',exact:true}).click()
  const list=page.getByRole('complementary',{name:'Danh sách kết quả',exact:true});await list.waitFor()
  assert.ok((await list.boundingBox()).height>height*.5,'List must use the pane, not a half-height bottom overlay')
  assert.equal(await page.locator('.map-listings__display').isVisible(),false)
  await page.getByRole('button',{name:'Bản đồ',exact:true}).click()
  assert.equal(await list.isVisible(),false)
  await page.getByRole('button',{name:/^Lọc/}).click()
  await page.getByRole('button',{name:'Đóng bộ lọc',exact:true}).waitFor()
  await page.getByRole('button',{name:'Đóng bộ lọc',exact:true}).click()
 }
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal overflow')
 await page.screenshot({path:out+'/'+theme+'-'+width+'.png'})
 await page.goto(base+'/'+out+'/index.html?guest&theme='+theme)
 await page.getByRole('button',{name:/Lọc khu vực/}).count()
 if(width<768){
  assert.equal(await page.getByRole('combobox',{name:'Phường',exact:true}).isVisible(),false)
  await page.getByRole('button',{name:/Lọc khu vực/}).click()
  assert.equal(await page.getByRole('combobox',{name:'Phường',exact:true}).isVisible(),true)
  await page.getByRole('button',{name:/Lọc khu vực/}).click()
  assert.equal(await page.getByRole('combobox',{name:'Phường',exact:true}).isVisible(),false)
 }
 assert.deepEqual(errors,[]);results.push({width,height,theme,passed:true});await page.close()
}
console.log(JSON.stringify(results,null,2))
}finally{await writeFile(out+'/results.json',JSON.stringify(results,null,2));await browser.close()}



