import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'
const base=process.env.HOMEJI_TEST_BASE_URL||'http://127.0.0.1:5544'
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('Local fixtures only')
const out='output/verification/control-spacing'
await mkdir(out,{recursive:true})
await writeFile(out+'/index.html','<html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
await writeFile(out+'/scene.tsx',`import React from'react';import{createRoot}from'react-dom/client';import{MemoryRouter}from'react-router-dom';import{MapListingsWorkspace}from'/src/components/map/listings/MapListingsWorkspace.tsx';import{AuthenticatedHub}from'/src/components/hub/AuthenticatedHub.tsx';import{WebglButtonGlassEffects}from'/src/components/ui/WebglButtonGlassEffects.tsx';import{LiquidGlassEffects}from'/src/components/ui/LiquidGlassEffects.tsx';import'/src/index.css';import'/src/ui-consistency.css';import'/src/components/map/MapMessagesPanel.css';import'/src/components/theme/dark-theme.css';import'/src/product-ui.css';import'/src/glass-controls.css';import'/src/workspace-readability.css';import'/src/components/chrome/PageFrame.css';const q=new URLSearchParams(location.search);document.documentElement.dataset.theme=q.get('theme')||'dark';const post={id:'native',title:'Phòng sáng thoáng gần trường',price:2500000,area:25,address:'Lê Văn Việt, Thủ Đức',type:1,thumbnailPath:'/landing/bloom-hero-bg2.jpg',amenities:[],latitude:10.84,longitude:106.8};createRoot(document.getElementById('root')).render(<MemoryRouter initialEntries={['/?view=list&catalog=rooms']}><WebglButtonGlassEffects/><LiquidGlassEffects/>{q.has('hub')?<AuthenticatedHub/>:<><div className="page-frame__filters" style={{padding:16}}><input className="form-input" aria-label="Ngân sách" placeholder="Ngân sách"/><button>Áp dụng</button></div><div className="map-messages is-workspace"><div className="map-messages__bubbles">{[false,true].map(mine=><div key={String(mine)} className={'map-messages__bubble'+(mine?' is-mine':'')}><div className="map-messages__bubble-body"><p>{mine?'Chào chủ phòng':'Phòng vẫn còn nhé'}</p></div><time>10:20</time></div>)}</div></div><MapListingsWorkspace posts={[post]} selectedListingId={null} hoveredListingId={null} loading={false} error="" mapNode={null} onHoverListing={()=>{}} onLeaveListing={()=>{}} onSelectListing={()=>{}} onOpenRoomDetail={()=>{document.body.dataset.opened='native'}} onResetFilters={()=>{}} onFocusSource={()=>{document.body.dataset.focused='source'}}/></>}</MemoryRouter>);`)
const browser=await chromium.launch({headless:true,channel:'msedge'})
try{
for(const theme of ['light','dark'])for(const width of [390,1366]){
 const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'}),errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/rental-source-listings?*',r=>r.fulfill({json:[{id:'source',title:'Phòng trọ mới gần trường',price:2500000,area:25,address:'Lê Văn Việt, Thủ Đức',imageUrls:['https://file.phongtro.vn/fixture.jpg'],amenityHighlights:['Máy lạnh'],district:'quan-9',latitude:10.84,longitude:106.8,publisherName:'Người đăng',sourceUpdatedAt:null}]}))
 await page.route('https://file.phongtro.vn/fixture.jpg',r=>r.fulfill({path:'public/landing/bloom-hero-bg2.jpg',contentType:'image/jpeg'}))
 await page.goto(base+'/'+out+'/index.html?theme='+theme)
 await page.locator('.source-results__card').waitFor()
 const colors=await page.locator('.map-messages__bubble').evaluateAll(es=>es.map(e=>({outer:getComputedStyle(e).backgroundColor,inner:getComputedStyle(e.querySelector('.map-messages__bubble-body')).backgroundColor,radius:parseFloat(getComputedStyle(e.querySelector('.map-messages__bubble-body')).borderRadius)})))
 for(const c of colors){assert.equal(c.outer,'rgba(0, 0, 0, 0)','Outer layout must not paint a square');assert.ok(c.radius>=16)}
 if(theme==='dark')assert.equal(colors[1].inner,'rgb(35, 88, 97)')
 const input=await page.getByRole('textbox',{name:'Ngân sách',exact:true}).evaluate(e=>{const s=getComputedStyle(e);return{height:e.offsetHeight,left:parseFloat(s.paddingLeft),right:parseFloat(s.paddingRight)}})
 assert.ok(input.height>=44&&input.left>=12&&input.right>=12,JSON.stringify(input))
 const apply=page.getByRole('button',{name:'Áp dụng',exact:true}).first()
 assert.ok((await apply.boundingBox()).height>=40)
 const cards=await page.locator('.map-listings__cards>li>article').evaluateAll(es=>es.map(e=>{const img=e.querySelector('.map-listings__card-photo,.source-results__photo').getBoundingClientRect(),copy=e.querySelector('.map-listings__card-copy,.source-results__copy').getBoundingClientRect();return{imageWidth:img.width,cardWidth:e.clientWidth,ratio:img.width/img.height,copyTop:copy.top,imageBottom:img.bottom}}))
 assert.equal(cards.length,2)
 for(const c of cards){assert.ok(Math.abs(c.ratio-1.6)<.03);assert.ok(c.imageWidth>=c.cardWidth-3);assert.ok(c.copyTop>=c.imageBottom-1)}
 await page.screenshot({path:out+'/'+theme+'-'+width+'.png',fullPage:true})
 await page.getByRole('button',{name:'Xem vị trí trên bản đồ',exact:true}).click();assert.equal(await page.locator('body').getAttribute('data-focused'),'source')
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
 assert.deepEqual(errors,[])
 await page.close()
}
for(const role of [1,2,3]){
 const page=await browser.newPage();const calls=[];page.on('pageerror',e=>console.error('HUB',e.message))
 await page.addInitScript(()=>localStorage.setItem('homeji_access_token','fixture'))
 await page.route('**/src/contexts/AuthContext.tsx*',r=>r.fulfill({contentType:'application/javascript',body:'export const useAuth=()=>({isAuthenticated:true,profile:{id:"me",role:'+role+',displayName:"Test"}})'}))
 await page.route('**/api/**',r=>{const path=new URL(r.request().url()).pathname;if(!path.startsWith('/api/'))return r.continue();calls.push(path);return r.fulfill({json:[]})})
 await page.goto(base+'/'+out+'/index.html?hub&theme=dark')
 await page.locator('.hub-home').waitFor()
 await page.waitForTimeout(200)
 assert.equal(calls.includes('/api/saved-posts'),role===1)
 assert.equal(calls.includes('/api/roommate-invitations/mine'),role===1)
 await page.close()
}
console.log('PASS rounded chat light/dark, padded budget/action, matching source/native cards desktop/mobile, role-aware protected requests')
}finally{await browser.close()}
