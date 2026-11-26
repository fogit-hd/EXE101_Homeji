import assert from 'node:assert/strict'
import {mkdir,writeFile} from 'node:fs/promises'
import {chromium} from 'playwright'
const base=process.env.HOMEJI_TEST_BASE_URL||'http://127.0.0.1:5541'
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local payment fixtures only')
const out='output/verification/premium-purchase-confirm';await mkdir(out,{recursive:true})
await writeFile(out+'/index.html','<html><meta charset="utf-8"><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
await writeFile(out+'/scene.tsx',`import React from'react';import{createRoot}from'react-dom/client';import{MemoryRouter}from'react-router-dom';import{QueryClient,QueryClientProvider}from'@tanstack/react-query';import{PaymentPage}from'/src/pages/PaymentPage.tsx';import{ToastProvider}from'/src/components/toast/ToastProvider.tsx';import'/src/index.css';createRoot(document.getElementById('root')).render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><ToastProvider><PaymentPage embedded/></ToastProvider></MemoryRouter></QueryClientProvider>);`)
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'})
try{
 const page=await browser.newPage({viewport:{width:1100,height:900}});const calls=[],errors=[]
 let packageCode='PREMIUM_MONTHLY'
 let minimumPurchaseDurationDays=0
 page.on('pageerror',error=>errors.push(error.message))
 await page.addInitScript(()=>{localStorage.setItem('homeji_access_token','fixture');localStorage.setItem('homeji_user_id','me')})
 await page.route('**/src/contexts/AuthContext.tsx*',route=>route.fulfill({contentType:'application/javascript',body:'const refreshProfile=async()=>{};export const useAuth=()=>({isAuthenticated:true,needsProfileSetup:false,refreshProfile,profile:{id:"me"}})'}))
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;if(!path.startsWith('/api/'))return route.continue()
  if(path==='/api/subscriptions/packages'){
   const plans=[
    {code:'PREMIUM_MONTHLY',name:'Gói Trải Nghiệm',tier:2,price:100000,durationDays:30,benefits:[]},
    {code:'PREMIUM_6MONTHS',name:'Gói An Tâm',tier:2,price:450000,durationDays:180,benefits:[]},
    {code:'PREMIUM_YEARLY',name:'Gói Tối Ưu',tier:2,price:780000,durationDays:365,benefits:[]},
   ]
   return route.fulfill({json:minimumPurchaseDurationDays ? plans : plans.filter(plan=>plan.code===packageCode)})
  }
  if(path==='/api/subscriptions/me')return route.fulfill({json:minimumPurchaseDurationDays
   ? {tier:2,isPremium:true,packageCode:'PREMIUM_MONTHLY',packageName:'Gói Trải Nghiệm',minimumPurchaseDurationDays}
   : {tier:1,isPremium:false,packageCode:'free'}})
  if(path==='/api/wallet')return route.fulfill({json:{balance:350000}})
  if(path==='/api/referrals')return route.fulfill({json:{vouchers:[{id:'voucher-1',purpose:'vip',rate:0.2,minimumSpend:0,maximumDiscount:20000,used:false,expiresAt:'2099-01-01T00:00:00Z'}]}})
  if(path==='/api/referrals/quote')return route.fulfill({json:{discount:20000}})
  if(path==='/api/subscriptions/premium/PREMIUM_MONTHLY/wallet/promotion/quote'){
   if (route.request().postDataJSON().code === 'trainghiemtructiep') return route.fulfill({json:{code:'trainghiemtructiep',basePrice:100000,discount:75000,amountDue:25000}})
   return route.fulfill({status:400,json:{errors:{promotionCode:['Mã giảm giá không hợp lệ.']}}})
  }
  if(path==='/api/subscriptions/premium/PREMIUM_6MONTHS/wallet/promotion/quote'){
   assert.equal(route.request().postDataJSON().code,'sinhvien30')
   return route.fulfill({json:{code:'sinhvien30',basePrice:450000,discount:135000,amountDue:315000}})
  }
  if(path.startsWith('/api/subscriptions/premium/')){calls.push({path,amount:new URL(route.request().url()).searchParams.get('expectedAmount'),body:route.request().postData()?route.request().postDataJSON():null});await new Promise(resolve=>setTimeout(resolve,250));return route.fulfill({status:503,json:{detail:'Fixture payment unavailable'}})}
  return route.fulfill({json:[]})
 })
 await page.goto(base+'/'+out+'/index.html')
 const upcomingPayPal=page.getByRole('button',{name:'PayPal · Sẽ có mặt sớm',exact:true})
 await upcomingPayPal.waitFor()
 assert.equal(await upcomingPayPal.isDisabled(),true)
 assert.ok(await upcomingPayPal.evaluate(button=>Number(getComputedStyle(button).opacity)<1))
 await page.getByRole('button',{name:'Chọn gói',exact:true}).click()
 const dialog=page.getByRole('dialog',{name:'Xác nhận mua gói Premium'})
 const wallet=page.getByRole('button',{name:/Thanh toán bằng ví/})
 await wallet.click();await dialog.waitFor();assert.equal(calls.length,0);assert.match(await dialog.innerText(),/Gói Trải Nghiệm/);assert.match(await dialog.innerText(),/100.000/)
 assert.equal(await dialog.getByRole('button',{name:'Quay lại',exact:true}).evaluate(button=>button===document.activeElement),true)
 await page.keyboard.press('Enter');await dialog.waitFor({state:'hidden'});assert.equal(calls.length,0,'Default Enter must cancel instead of purchasing')
 await wallet.click();await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});assert.equal(calls.length,0)
 await page.locator('.pay-voucher-panel > summary').click();await page.locator('.voucher-picker select').selectOption('voucher-1');await page.getByText(/Voucher giảm.*20.000/).waitFor();await wallet.click();await dialog.waitFor();assert.match(await dialog.locator('.premium-purchase-confirm__total').innerText(),/80.000/)
 await page.setViewportSize({width:390,height:844});assert.equal(await dialog.evaluate(element=>element.scrollWidth<=element.clientWidth),true);await page.screenshot({path:out+'/wallet-discount-mobile.png'})
 await dialog.getByRole('button',{name:/^Xác nhận thanh toán/}).evaluate(button=>{button.click();button.click()});await page.keyboard.press('Escape');assert.equal(await dialog.isVisible(),true,'Busy confirmation stays open while request is pending')
 await dialog.waitFor({state:'hidden'});assert.equal(calls.length,1);assert.equal(calls[0].body.expectedAmount,80000);assert.equal(calls[0].body.voucherId,'voucher-1');assert.ok(calls[0].body.requestId)
 await wallet.click();await dialog.getByRole('button',{name:'Quay lại',exact:true}).click();assert.equal(calls.length,1)
 const picker=page.getByRole('combobox',{name:'Chọn voucher Premium'})
 const promotion=page.locator('.voucher-picker').getByRole('textbox',{name:'Mã giảm giá'})
 assert.equal(await promotion.count(),0)
 await picker.selectOption({label:'Nhập mã giảm giá'})
 await promotion.fill('unknown');await promotion.press('Enter')
 await page.getByRole('alert').filter({hasText:'Mã giảm giá không hợp lệ.'}).waitFor()
 await promotion.fill('trainghiemtructiep');await page.getByRole('button',{name:'Áp dụng',exact:true}).click()
 await page.getByRole('status').filter({hasText:/Mã giảm.*75.000.*25.000/}).waitFor()
 assert.equal(await picker.isEnabled(),true)
 await wallet.click();await dialog.waitFor();assert.match(await dialog.innerText(),/trainghiemtructiep/)
 assert.match(await dialog.locator('.premium-purchase-confirm__total').innerText(),/25.000/)
 await dialog.getByRole('button',{name:/^Xác nhận thanh toán/}).click()
 await dialog.waitFor({state:'hidden'})
 assert.equal(calls.at(-1).body.expectedAmount,25000);assert.equal(calls.at(-1).body.promotionCode,'trainghiemtructiep')
 assert.equal(calls.at(-1).body.voucherId,undefined)
 for(const method of ['MoMo','PayOS']){
  const before=calls.length;await page.getByRole('button',{name:method,exact:true}).click();await dialog.waitFor();assert.equal(calls.length,before);assert.match(await dialog.innerText(),new RegExp(method));await dialog.getByRole('button',{name:'Quay lại',exact:true}).click();assert.equal(calls.length,before)
  await page.getByRole('button',{name:method,exact:true}).click();await dialog.getByRole('button',{name:/^Xác nhận thanh toán/}).evaluate(button=>{button.click();button.click()});await dialog.waitFor({state:'hidden'});assert.equal(calls.length,before+1)
  assert.equal(calls.at(-1).path,`/api/subscriptions/premium/PREMIUM_MONTHLY/${method.toLowerCase()}/create`)
  assert.equal(calls.at(-1).amount,'25000');assert.deepEqual(calls.at(-1).body,{code:'trainghiemtructiep'})
 }
 await picker.selectOption('voucher-1')
 await page.getByText(/Voucher giảm.*20.000/).waitFor()
 assert.equal(await promotion.count(),0)
 await picker.selectOption({label:'Nhập mã giảm giá'})
 assert.equal(await promotion.inputValue(),'')
 packageCode='PREMIUM_6MONTHS'
 await page.reload();await page.getByRole('button',{name:'Chọn gói',exact:true}).click();await page.locator('.pay-voucher-panel > summary').click()
 await picker.selectOption({label:'Nhập mã giảm giá'})
 await promotion.fill('sinhvien30');await promotion.press('Enter')
 await page.getByRole('status').filter({hasText:/Mã giảm.*135.000.*315.000/}).waitFor()
 await wallet.click();await dialog.getByRole('button',{name:/^Xác nhận thanh toán/}).click()
 await dialog.waitFor({state:'hidden'})
 assert.equal(calls.at(-1).path,'/api/subscriptions/premium/PREMIUM_6MONTHS/wallet')
 assert.equal(calls.at(-1).body.promotionCode,'sinhvien30')
 const payPalInCheckout=page.getByRole('group',{name:'Chọn hình thức thanh toán'}).getByRole('button',{name:'PayPal · Sẽ có mặt sớm',exact:true})
 assert.equal(await payPalInCheckout.isDisabled(),true)
 assert.equal(await page.getByRole('link',{name:/PayPal/}).count(),0)
 minimumPurchaseDurationDays=180
 await page.reload()
 const card=name=>page.getByRole('article').filter({has:page.getByRole('heading',{name,exact:true})})
 const lower=card('Gói Trải Nghiệm')
 await lower.getByRole('button',{name:'Đã khóa'}).waitFor()
 assert.equal(await lower.getByRole('button',{name:'Đã khóa'}).isDisabled(),true)
 assert.equal(await lower.getByRole('button',{name:/Chọn gói|Gia hạn gói/}).count(),0)
 assert.equal(await card('Gói An Tâm').getByRole('button',{name:'Chọn gói',exact:true}).isEnabled(),true)
 assert.equal(await card('Gói Tối Ưu').getByRole('button',{name:'Chọn gói',exact:true}).isEnabled(),true)
 assert.deepEqual(errors,[]);console.log('PASS payment methods, vouchers and lower-plan lock after a paid upgrade')
}finally{await browser.close()}
