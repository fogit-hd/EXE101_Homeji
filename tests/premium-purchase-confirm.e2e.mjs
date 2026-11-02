import assert from 'node:assert/strict'
import {mkdir,writeFile} from 'node:fs/promises'
import {chromium} from 'playwright'
const base=process.env.HOMEJI_TEST_BASE_URL||'http://127.0.0.1:5541'
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local payment fixtures only')
const out='output/verification/premium-purchase-confirm';await mkdir(out,{recursive:true})
await writeFile(out+'/index.html','<html><meta charset="utf-8"><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
await writeFile(out+'/scene.tsx',`import React from'react';import{createRoot}from'react-dom/client';import{MemoryRouter}from'react-router-dom';import{PaymentPage}from'/src/pages/PaymentPage.tsx';import{ToastProvider}from'/src/components/toast/ToastProvider.tsx';import'/src/index.css';createRoot(document.getElementById('root')).render(<MemoryRouter><ToastProvider><PaymentPage embedded/></ToastProvider></MemoryRouter>);`)
const browser=await chromium.launch({headless:true,channel:'msedge'})
try{
 const page=await browser.newPage({viewport:{width:1100,height:900}});const calls=[],errors=[]
 page.on('pageerror',error=>errors.push(error.message))
 await page.addInitScript(()=>{localStorage.setItem('homeji_access_token','fixture');localStorage.setItem('homeji_user_id','me')})
 await page.route('**/src/contexts/AuthContext.tsx*',route=>route.fulfill({contentType:'application/javascript',body:'const refreshProfile=async()=>{};export const useAuth=()=>({isAuthenticated:true,needsProfileSetup:false,refreshProfile,profile:{id:"me"}})'}))
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;if(!path.startsWith('/api/'))return route.continue()
  if(path==='/api/subscriptions/packages')return route.fulfill({json:[{code:'premium-30',name:'Premium 30 ngày',tier:2,price:100000,durationDays:30,benefits:[]}]})
  if(path==='/api/subscriptions/me')return route.fulfill({json:{tier:1,isPremium:false,packageCode:'free'}})
  if(path==='/api/wallet')return route.fulfill({json:{balance:350000}})
  if(path==='/api/referrals')return route.fulfill({json:{vouchers:[{id:'voucher-1',purpose:'vip',rate:0.2,minimumSpend:0,maximumDiscount:20000,used:false,expiresAt:'2099-01-01T00:00:00Z'}]}})
  if(path==='/api/referrals/quote')return route.fulfill({json:{discount:20000}})
  if(path.startsWith('/api/subscriptions/premium/')){calls.push({path,body:route.request().postData()?route.request().postDataJSON():null});await new Promise(resolve=>setTimeout(resolve,250));return route.fulfill({status:503,json:{detail:'Fixture payment unavailable'}})}
  return route.fulfill({json:[]})
 })
 await page.goto(base+'/'+out+'/index.html');await page.getByRole('button',{name:'Chọn gói',exact:true}).click()
 const dialog=page.getByRole('dialog',{name:'Xác nhận mua gói thành viên'})
 const wallet=page.getByRole('button',{name:/Thanh toán bằng ví/})
 await wallet.click();await dialog.waitFor();assert.equal(calls.length,0);assert.match(await dialog.innerText(),/Premium 30 ngày/);assert.match(await dialog.innerText(),/100.000/)
 assert.equal(await dialog.getByRole('button',{name:'Quay lại',exact:true}).evaluate(button=>button===document.activeElement),true)
 await page.keyboard.press('Enter');await dialog.waitFor({state:'hidden'});assert.equal(calls.length,0,'Default Enter must cancel instead of purchasing')
 await wallet.click();await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});assert.equal(calls.length,0)
 await page.locator('.voucher-picker select').selectOption('voucher-1');await page.getByText(/Voucher giảm.*20.000/).waitFor();await wallet.click();await dialog.waitFor();assert.match(await dialog.locator('.premium-purchase-confirm__total').innerText(),/80.000/)
 await page.setViewportSize({width:390,height:844});assert.equal(await dialog.evaluate(element=>element.scrollWidth<=element.clientWidth),true);await page.screenshot({path:out+'/wallet-discount-mobile.png'})
 await dialog.getByRole('button',{name:/^Xác nhận thanh toán/}).evaluate(button=>{button.click();button.click()});await page.keyboard.press('Escape');assert.equal(await dialog.isVisible(),true,'Busy confirmation stays open while request is pending')
 await dialog.waitFor({state:'hidden'});assert.equal(calls.length,1);assert.equal(calls[0].body.expectedAmount,80000);assert.equal(calls[0].body.voucherId,'voucher-1');assert.ok(calls[0].body.requestId)
 await wallet.click();await dialog.getByRole('button',{name:'Quay lại',exact:true}).click();assert.equal(calls.length,1)
 await page.locator('.voucher-picker select').selectOption('')
 for(const method of ['MoMo','PayOS']){
  const before=calls.length;await page.getByRole('button',{name:method,exact:true}).click();await dialog.waitFor();assert.equal(calls.length,before);assert.match(await dialog.innerText(),new RegExp(method));await dialog.getByRole('button',{name:'Quay lại',exact:true}).click();assert.equal(calls.length,before)
  await page.getByRole('button',{name:method,exact:true}).click();await dialog.getByRole('button',{name:/^Xác nhận thanh toán/}).evaluate(button=>{button.click();button.click()});await dialog.waitFor({state:'hidden'});assert.equal(calls.length,before+1)
 }
 assert.deepEqual(errors,[]);console.log('PASS wallet/MoMo/PayOS require confirmation; Enter/Escape/cancel create no payment; voucher amount matches payload; double clicks send once; mobile fits')
}finally{await browser.close()}
