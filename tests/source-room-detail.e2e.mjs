import assert from 'node:assert/strict'
import { mkdir,writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'
const base=process.env.HOMEJI_TEST_BASE_URL||'http://127.0.0.1:5541'
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('Local fixtures only')
const out='output/verification/source-room-detail';await mkdir(out,{recursive:true})
await writeFile(out+'/index.html','<html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
await writeFile(out+'/scene.tsx',`import React from'react';import{createRoot}from'react-dom/client';import{MemoryRouter,Link}from'react-router-dom';import{SourceRoomDetailsHost}from'/src/components/map/listings/SourceRoomDetailsHost.tsx';import'/src/index.css';createRoot(document.getElementById('root')).render(<MemoryRouter initialEntries={['/?section=listings&view=split']}><Link to="?section=listings&view=split&source=5a871a2c-a2e7-4d74-a16a-10805bb824c9">Mở phòng</Link><SourceRoomDetailsHost/></MemoryRouter>);`)
const browser=await chromium.launch({headless:true,channel:'msedge'})
const page=await browser.newPage({reducedMotion:'reduce'});await page.addInitScript(()=>localStorage.setItem('homeji_access_token','local-fixture-only'));
await page.route('**/src/contexts/AuthContext.tsx*',r=>r.fulfill({contentType:'application/javascript',body:'export const useAuth=()=>({isAuthenticated:true,profile:{id:"viewer"}})'}));
await page.route('**/src/contexts/AuthModalContext.logic.tsx*',r=>r.fulfill({contentType:'application/javascript',body:'export const useAuthModal=()=>({openAuthModal:()=>{}})'}));const errors=[];let missing=false,fail=false
page.on('pageerror',error=>errors.push(error.message))
const row={id:'5a871a2c-a2e7-4d74-a16a-10805bb824c9',source:'mogi',sourceId:'123456',title:'Phòng trọ đầy đủ tiện nghi gần Lê Văn Việt',address:'Lê Văn Việt, Thủ Đức',district:'quan-9',publisherName:'Nguyễn An (kiểm thử)',price:2500000,area:26,imageUrls:['https://res.cloudinary.com/dv4y7cdpi/image/upload/homeji/rental-sources/fixture.jpg'],description:Array.from({length:40},(_,i)=>'Thông tin phòng '+(i+1)+': có cửa sổ, bếp riêng.').join('\n'),contactPhone:'0901234567',collectedAt:'2026-11-01T00:00:00Z',detailsCollectedAt:'2026-11-01T00:00:00Z'}
await page.route('**/api/rental-source-listings/**',route=>route.fulfill(fail?{status:503,json:{detail:'Chưa tải được phòng'}}:{json:route.request().url().endsWith('/contact')?{phone:missing?null:row.contactPhone,phones:missing?[]:[row.contactPhone]}:{...row,contactPhone:null}}))
await page.route('https://res.cloudinary.com/**',route=>route.fulfill({path:'public/brand/homeji-logo2.png',contentType:'image/png'}))
try{
 for(const width of[1440,1024,390,320]){
  await page.setViewportSize({width,height:900});await page.goto(base+'/'+out+'/index.html');await page.getByRole('link',{name:'Mở phòng'}).click()
  const dialog=page.getByRole('dialog');await dialog.getByText(row.publisherName,{exact:true}).first().waitFor({state:width>760?'visible':'attached'})
  assert.equal(await dialog.getByRole('link',{name:/tin gốc/}).count(),0)
  await dialog.getByText('Thông tin phòng 40:',{exact:false}).waitFor()
  if(width>700){
   const contact=page.locator('.source-room-detail__contact');const before=await contact.boundingBox()
   await page.locator('.source-room-detail__room').evaluate(element=>{element.scrollTop=element.scrollHeight})
   const after=await contact.boundingBox();assert.equal(after.y,before.y);assert.equal(after.x,before.x)
   assert.ok(await page.locator('.source-room-detail__room').evaluate(element=>element.scrollTop>100))
  }
  await dialog.getByRole('button',{name:/Nhấn để xem số điện thoại/}).click()
  assert.equal(await dialog.getByRole('link',{name:'Gọi người đăng, số 1'}).getAttribute('href'),'tel:0901234567')
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
  await page.screenshot({path:out+'/contact-'+width+'.png'})
  await dialog.getByRole('button',{name:'Đóng'}).click();await dialog.waitFor({state:'detached'});assert.equal(await page.getByRole('dialog').count(),0)
 }
 missing=true;await page.getByRole('link',{name:'Mở phòng'}).click();await page.getByRole('button',{name:'Liên hệ người đăng',exact:true}).click();await page.getByText('Tin này chưa có số điện thoại để liên hệ.').waitFor();assert.equal(await page.getByRole('link',{name:'Gọi người đăng, số 1'}).count(),0)
 await page.getByRole('button',{name:'Đóng'}).click();fail=true;await page.getByRole('link',{name:'Mở phòng'}).click();await page.getByRole('alert').waitFor();fail=false;await page.getByRole('button',{name:'Thử lại',exact:true}).click();await page.getByText('Thông tin phòng 40:',{exact:false}).waitFor()
 await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'detached'});assert.equal(await page.getByRole('dialog').count(),0)
 assert.deepEqual(errors,[]);console.log('PASS desktop independent room scroll/fixed contact, shared mobile detail layout, internal detail, public phone, missing data, retry, Escape and 320–1440 layouts')
}finally{await browser.close()}
