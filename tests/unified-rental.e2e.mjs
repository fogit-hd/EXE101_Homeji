import assert from 'node:assert/strict'
import {mkdir,writeFile} from 'node:fs/promises'
import {chromium} from 'playwright'
const base=process.env.HOMEJI_TEST_BASE_URL||'http://127.0.0.1:5542'
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local fixture only')
const out='output/verification/unified-rental';await mkdir(out,{recursive:true})
await writeFile(out+'/index.html','<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
await writeFile(out+'/scene.tsx',`import React,{useState}from'react';import{createRoot}from'react-dom/client';import{MemoryRouter}from'react-router-dom';import{RentalMapPreview}from'/src/components/map/listings/RentalMapPreview.tsx';import{RoomDetailModal}from'/src/components/map/listings/RoomDetailModal.tsx';import{SourceRoomDetail}from'/src/components/map/listings/SourceRoomDetail.tsx';import'/src/index.css';import'/src/components/theme/dark-theme.css';const q=new URLSearchParams(location.search),source=q.has('source');document.documentElement.dataset.theme=q.get('theme')||'light';const view={id:'rental:room',title:'Phòng có cửa sổ',priceLabel:'2.500.000 ₫',areaLabel:'25 m²',address:'Lê Văn Việt, Thủ Đức',thumbnailUrl:'/brand/homeji-logo2.png',latitude:10.84,longitude:106.78,typeLabel:'Phòng trọ',highlightTag:null,ownerBadge:null,isPremium:!source,isOwnerVerified:!source,facts:[],updatedAt:null};function Scene(){const[open,setOpen]=useState(false);return <MemoryRouter><div style={{height:'100dvh',position:'relative'}}><RentalMapPreview view={view} monthly onOpen={()=>setOpen(true)} onClose={()=>{}}/>{source?open&&<SourceRoomDetail id="source-room" onClose={()=>setOpen(false)}/>:<RoomDetailModal listingId={open?'native-room':null} onClose={()=>setOpen(false)}/>}</div></MemoryRouter>}createRoot(document.getElementById('root')).render(<Scene/>);`)
const image='/brand/homeji-logo2.png'; const common={title:'Phòng có cửa sổ',price:2500000,area:25,address:'Lê Văn Việt, Thủ Đức',description:'Phòng có máy lạnh, cửa sổ.\n'+('Mô tả chi tiết.\n'.repeat(80))}
const source={...common,id:'source-room',source:'mogi',sourceId:'fixture',sourceUrl:'https://mogi.vn/fixture',district:'quan-9',imageUrls:['https://res.cloudinary.com/dv4y7cdpi/image/upload/fixture.png'],publisherName:'Người đăng kiểm thử',depositLabel:'Cọc 1 tháng',collectedAt:'2026-11-03T00:00:00Z',amenityHighlights:['Máy lạnh']}
const native={...common,id:'native-room',type:1,ownerId:'owner-fixture',ownerDisplayName:'Người đăng kiểm thử',isOwnerVerified:true,priceBasis:'room',deposit:2500000,amenities:['AirConditioner'],thumbnailPath:image,media:[],latitude:10.84,longitude:106.78,maxOccupants:2,hasOwnerPhone:true,ownerPhone:'0901234567'}
const browser=await chromium.launch({headless:true,channel:'msedge'}),results=[]
try{
for(const width of[320,390,1280])for(const sourced of[false,true]){
 const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'}),errors=[],calls=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.message)});page.on('console',m=>{if(m.type()==='error')console.error(m.text())})
 await page.addInitScript(()=>{localStorage.setItem('homeji_access_token','local-fixture-only');localStorage.setItem('homeji_user_id','viewer')})
 await page.route('**/src/contexts/AuthContext.tsx*',r=>r.fulfill({contentType:'application/javascript',body:'export const useAuth=()=>({isAuthenticated:!new URLSearchParams(location.search).has("guest"),needsProfileSetup:false,isLoading:false,profile:{id:"viewer",role:1}})'}))
 await page.route('**/src/contexts/AuthModalContext.logic.tsx*',r=>r.fulfill({contentType:'application/javascript',body:'export const useAuthModal=()=>({openAuthModal:()=>{document.body.dataset.authPrompt="open"}})'}))
 await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!==new URL(base).origin)return u.hostname==='res.cloudinary.com'?r.fulfill({path:'public/brand/homeji-logo2.png',contentType:'image/png'}):r.abort();if(u.pathname.startsWith('/api/')){calls.push(u.pathname);if(u.pathname.endsWith('/contact'))return r.fulfill({json:{phone:'0901234567',phones:['0901234567','0912345678']}});if(u.pathname.includes('/rental-source-listings/'))return r.fulfill({json:source});if(u.pathname.includes('/rental-posts/'))return r.fulfill({json:native});return r.fulfill({json:{}})}return r.fallback()})
 await page.goto(base+'/'+out+'/index.html?'+(sourced?'source&':'')+'theme='+(width===390?'dark':'light'))
 const preview=page.getByRole('article',{name:'Phòng đang chọn'});await preview.waitFor()
 assert.equal(await preview.locator('.premium-badge').count(),Number(!sourced),'Never invent Premium for imported data')
 await preview.getByRole('button',{name:'Xem phòng & liên hệ'}).click()
 const dialog=page.getByRole('dialog',{name:'Chi tiết phòng trọ',exact:true});await dialog.waitFor()
 await dialog.locator('.room-detail__essentials').waitFor();await dialog.locator('.room-detail__photo-main').waitFor()
 assert.equal(await dialog.locator('.room-detail__body > .room-detail__main').count(),1)
 assert.equal(await dialog.locator('.room-detail__body > .room-detail__aside').count(),1)
 if(width>700){const aside=await dialog.locator('.room-detail__aside').boundingBox();await dialog.locator('.room-detail__main').evaluate(e=>e.scrollTop=e.scrollHeight);assert.equal((await dialog.locator('.room-detail__aside').boundingBox()).y,aside.y)}
 if(sourced){await dialog.getByRole('button',{name:'Liên hệ người đăng',exact:true}).click();await dialog.getByRole('link',{name:'Gọi người đăng, số 2'}).waitFor();assert.equal(calls.filter(p=>p.endsWith('/contact')).length,1)}
 await dialog.locator('.room-detail__main').evaluate(e=>e.scrollTop=0)
 await dialog.locator('.room-detail__photo-main').click();await page.getByRole('dialog',{name:'Xem ảnh phòng',exact:true}).waitFor();await page.keyboard.press('Escape');await dialog.waitFor()
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
 await page.screenshot({path:out+'/'+(sourced?'source':'native')+'-'+width+'.png'})
 await dialog.getByRole('button',{name:'Đóng',exact:true}).click();await dialog.waitFor({state:'detached'});assert.deepEqual(errors,[])
 results.push({width,kind:sourced?'source':'native',sharedLayout:true,photoViewer:true,fixedContact:width>700});await page.close()
}
console.log(JSON.stringify(results,null,2))
}finally{await writeFile(out+'/results.json',JSON.stringify(results,null,2));await browser.close()}


