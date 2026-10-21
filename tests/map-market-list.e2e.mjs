import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {mkdir,writeFile} from 'node:fs/promises'
const {chromium}=createRequire(import.meta.url)(process.env.HOMEJI_PLAYWRIGHT_MODULE||'playwright')
const base=process.env.HOMEJI_TEST_BASE_URL||'http://127.0.0.1:5518'
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('Local fixture only')
const out='output/verification/map-market-list';await mkdir(out,{recursive:true})
const posts=['Ghế làm việc có tựa lưng còn mới','Bún trộn nhà làm','Trà sữa trân châu','Đèn bàn LED có điều chỉnh độ sáng'].map((title,i)=>({id:'post-'+i,sellerId:'seller',sellerDisplayName:'Võ Ngọc Mai',title,price:[15000000,35000,25000,120000][i],category:i?'Đồ ăn':'Nội thất',listingType:i?2:1,status:1,address:'Tăng Nhơn Phú, Thành phố Thủ Đức',latitude:10.84,longitude:106.78,mediaUrls:['/landing/bloom-hero-bg2.jpg']}))
await writeFile(out+'/index.html','<!doctype html><html lang="vi"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
await writeFile(out+'/scene.tsx',`import React,{useState}from'react';import{createRoot}from'react-dom/client';import{MemoryRouter}from'react-router-dom';import{MapListingsWorkspace}from'/src/components/map/listings/MapListingsWorkspace.tsx';import{LiquidGlassEffects}from'/src/components/ui/LiquidGlassEffects.tsx';import'/src/index.css';import'/src/ui-consistency.css';import'/src/liquid-glass.css';import'/src/components/theme/dark-theme.css';import'/src/product-ui.css';import'/src/glass-controls.css';import'/src/content-surfaces.css';import'/src/workspace-readability.css';import'/src/home-refinement.css';const posts=${JSON.stringify(posts)};function Scene(){const[id,setId]=useState(null);return <MemoryRouter initialEntries={['/?section=listings&catalog=market&view='+new URLSearchParams(location.search).get('view')]}><LiquidGlassEffects/><div style={{height:'100dvh'}}><MapListingsWorkspace posts={[]} marketPosts={posts} selectedListingId={id} hoveredListingId={null} loading={false} error="" mapNode={<div style={{height:'100%',background:'#cadfda'}}/>} onHoverListing={()=>{}} onLeaveListing={()=>{}} onSelectListing={id=>{setId(id);document.body.dataset.selected=id}} onResetFilters={()=>{}}/></div></MemoryRouter>};createRoot(document.getElementById('root')).render(<Scene/>);`)
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const page=await browser.newPage({reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message))
try{
 for(const width of[1440,1024,390,320])for(const theme of['light','dark'])for(const view of['split','list']){
  await page.setViewportSize({width,height:900});await page.goto(base+'/'+out+'/index.html?view='+view);await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);if(width<=1024&&view==='split')await page.getByRole('button',{name:'Danh sách',exact:true}).click();await page.locator('.seller-catalog__items').waitFor();await page.evaluate(()=>document.fonts.ready)
  assert.equal(await page.locator('.seller-catalog__items > li').count(),posts.length,'Map list must show all matching products');
  const sizes=await page.locator('.seller-catalog__items').evaluate(e=>({list:e.clientWidth,items:[...e.children].map(c=>({width:c.getBoundingClientRect().width,top:c.getBoundingClientRect().top}))}))
  await page.screenshot({path:out+'/'+view+'-'+theme+'-'+width+'.png'})
  assert.ok(sizes.items.every(i=>i.width>=sizes.list-32),`${width}/${view}: products must use separate full-width rows: ${JSON.stringify(sizes)}`)
  assert.ok(sizes.items[1].top>sizes.items[0].top)
  for(const price of await page.locator('.map-listings__card .map-listings__price').all())assert.ok(await price.evaluate(e=>e.scrollWidth<=e.clientWidth+1),'Price must fit on one line')
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No page overflow')
  if(view==='split'){await page.locator('.map-listings__card-hit').first().click();assert.equal(await page.locator('body').getAttribute('data-selected'),'post-0')}
  assert.match(await page.getByRole('link',{name:'Xem cửa hàng',exact:false}).getAttribute('href'),/seller=seller/)
 }
 assert.deepEqual(errors,[]);console.log('PASS market map rows: full names/prices, selection, seller links, split/list and 320–1440 light/dark')
}finally{await browser.close()}
