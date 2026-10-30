import assert from 'node:assert/strict'
import {chromium} from 'playwright'
import {mkdir,writeFile} from 'node:fs/promises'
const base=process.env.HOMEJI_TEST_BASE_URL||'http://127.0.0.1:5202'
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local fixture only')
const out='output/verification/ai-listing-review';await mkdir(out,{recursive:true})
await writeFile(out+'/fixture.html','<!doctype html><html lang="vi"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./fixture.tsx"></script></html>')
await writeFile(out+'/fixture.tsx',`import React from 'react';import{createRoot}from'react-dom/client';import{AiListingReviewPanel}from'/src/components/admin/AiListingReviewPanel.tsx';import '/src/index.css';createRoot(document.getElementById('root')).render(<main style={{maxWidth:1100,margin:'24px auto',padding:20}}><AiListingReviewPanel/></main>);`)
const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1280,height:1000}})
const writes=[],errors=[];let fail=false
const settings={enabled:true,autoBlock:true,batchSize:3,spacingSeconds:60,pauseMinutes:10,dailyRequestLimit:30,dailyTokenBudget:200000}
const data={settings,nextAllowedAt:'2026-10-30T08:00:00Z',requestsToday:2,tokensReservedToday:9000,pauseReason:'AI đang tạm nghỉ vì cổng xử lý giới hạn lượt gọi.',pending:3,needsReview:1,blocked:1,items:[
{id:'review-1',subjectId:'post-1',kind:'food',title:'Tin đồ ăn cần xem lại',state:'needs_review',category:'other',reason:'Nội dung cần người duyệt kiểm tra.',evidence:'Trích từ nội dung tin',confidence:.7,attempts:1,createdAt:'2026-10-30T07:00:00Z',completedAt:'2026-10-30T07:01:00Z',reviewedAt:null},
{id:'review-2',subjectId:'post-2',kind:'goods',title:'Tin hàng cấm kiểm thử',state:'blocked',category:'illegal_drugs',reason:'Nội dung chào bán hàng cấm.',evidence:'Nội dung vi phạm trong tin',confidence:.99,attempts:1,createdAt:'2026-10-30T07:02:00Z',completedAt:'2026-10-30T07:03:00Z',reviewedAt:null}]}
await page.addInitScript(()=>localStorage.setItem('homeji_access_token','fixture-only'))
page.on('pageerror',e=>errors.push(e.message))
await page.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!==new URL(base).origin)return route.abort();if(!u.pathname.startsWith('/api/'))return route.continue();if(route.request().method()==='GET')return route.fulfill({json:data});const body=route.request().postDataJSON();writes.push({path:u.pathname,body});if(fail)return route.fulfill({status:503,json:{detail:'Fixture unavailable'}});if(u.pathname.endsWith('/settings'))Object.assign(settings,body);return route.fulfill({status:204})})
try{
await page.goto(base+'/'+out+'/fixture.html');await page.getByRole('heading',{name:'AI kiểm tra tin',exact:true}).waitFor();await page.getByText('Tin hàng cấm kiểm thử',{exact:true}).waitFor();assert.equal(writes.length,0)
await page.getByRole('spinbutton',{name:'Số tin mỗi đợt',exact:true}).fill('2');await page.getByRole('button',{name:'Lưu lịch kiểm tra',exact:true}).click();await page.getByRole('status').filter({hasText:'Đã lưu lịch kiểm tra.'}).waitFor();assert.equal(writes.at(-1).body.batchSize,2)
await page.getByRole('button',{name:'Khôi phục tin',exact:true}).click();await page.getByRole('status').filter({hasText:'Đã khôi phục tin.'}).waitFor();assert.deepEqual(writes.at(-1),{path:'/api/admin/ai-reviews/review-2/resolve',body:{restore:true}})
page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Mở đợt kiểm tra tin cũ',exact:true}).click();await page.getByRole('status').filter({hasText:'Đã mở đợt kiểm tra tin cũ.'}).waitFor();assert.equal(writes.at(-1).path,'/api/admin/ai-reviews/backfill')
fail=true;await page.getByRole('button',{name:'Giữ tin',exact:true}).click();await page.getByRole('alert').waitFor();assert.equal(await page.getByRole('button',{name:'Giữ tin',exact:true}).isEnabled(),true)
fail=false;await page.getByRole('button',{name:'Làm mới kết quả',exact:true}).click();await page.getByRole('status').filter({hasText:'Đã cập nhật kết quả.'}).waitFor()
for(const [theme,width]of [['light',1280],['dark',390]]){await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);await page.setViewportSize({width,height:950});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:out+'/'+theme+'.png',fullPage:true})}
assert.deepEqual(errors,[]);console.log('PASS: moderation settings, independent old-listing batch, restore action, recoverable failures, mobile/dark, no automatic AI calls from the UI')
}finally{await browser.close()}
