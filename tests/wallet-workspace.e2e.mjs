import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {mkdir,writeFile} from 'node:fs/promises'
const {chromium}=createRequire(import.meta.url)(process.env.HOMEJI_PLAYWRIGHT_MODULE||'playwright')
const base=process.env.HOMEJI_THEME_TEST_URL||'http://127.0.0.1:5500'
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local fixture only')
const out=new URL('../output/verification/wallet-workspace/',import.meta.url);await mkdir(out,{recursive:true})
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const context=await browser.newContext({viewport:{width:1440,height:1100},colorScheme:'light',reducedMotion:'reduce'})
const id='11111111-1111-4111-8111-111111111111',calls=[],errors=[];let failGateway=false,balance=350000
await context.addInitScript(id=>{localStorage.setItem('homeji_access_token','wallet-ui-fixture');localStorage.setItem('homeji_user_id',id);localStorage.setItem('homeji-theme','light')},id)
await context.route('**/*',async route=>{
 const u=new URL(route.request().url());if(u.origin!==new URL(base).origin)return route.abort()
 if(u.pathname.startsWith('/hubs/'))return route.fulfill({status:503,body:''})
 if(!u.pathname.startsWith('/api/'))return route.continue()
 if(u.pathname==='/api/search-interests')return route.fulfill({json:{settings:{enabled:false,aiEnabled:false,emailEnabled:false},suggestions:[],following:[],rooms:[]}})
 if(u.pathname==='/api/profile/me')return route.fulfill({json:{id,displayName:'Nguyễn Văn An',role:1,onboardingCompleted:true,isPremium:false}})
 if(u.pathname==='/api/subscriptions/me')return route.fulfill({json:{tier:1,isPremium:false,packageCode:'free'}})
 if(u.pathname==='/api/wallet')return route.fulfill({json:{userId:id,balance,totalDeposited:600000,totalSpent:250000,totalEarned:0,isActivated:true,minimumTopUp:10000,maximumTopUp:10000000,minimumWithdrawalReserve:20000,updatedAt:'2026-10-19T01:00:00Z'}})
 if(u.pathname==='/api/wallet/transactions')return route.fulfill({json:[{id:'tx-fixture',userId:id,kind:1,amount:200000,balanceAfter:350000,description:'Nạp qua MoMo',referenceId:'HOMEJI-123',createdAt:'2026-10-19T01:00:00Z'}]})
 if(u.pathname.startsWith('/api/payments/')&&u.pathname.endsWith('/create')){calls.push({path:u.pathname,...route.request().postDataJSON()});await new Promise(r=>setTimeout(r,400));return failGateway?route.fulfill({status:503,json:{message:'Cổng thanh toán tạm thời không khả dụng'}}):route.fulfill({json:{payUrl:base+'/fixture-gateway',checkoutUrl:base+'/fixture-gateway'}})}
 return route.fulfill({json:u.pathname==='/api/chatbot/popup-config'?{enabled:false}:[]})
})
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message))
const url=base+'/?section=marketplace&market=wallet&wallet=deposit'
async function ready(){await page.locator('.wallet-deposit__amount input').waitFor();const skip=page.getByRole('button',{name:'Bỏ qua',exact:true});if(await skip.isVisible())await skip.click().catch(()=>{});await page.locator('.hj-intro').waitFor({state:'hidden'});await page.evaluate(()=>document.documentElement.dataset.theme='light')}
try{
 await page.goto(url);await ready()
 const input=page.locator('.wallet-deposit__amount input'),submit=page.locator('.wallet-submit button')
 assert.match(await page.locator('.wallet-summary__balance').innerText(),/350.000/)
 assert.equal(await page.locator('.wallet-page details[open]').count(),0,'Secondary information starts collapsed')
 assert.ok(await input.evaluate(e=>parseFloat(getComputedStyle(e).fontSize))>=32,'Funding amount is large')
 await page.locator('.wallet-summary__statement summary').click();await page.getByText('Đã nạp',{exact:true}).waitFor({state:'visible'});await page.locator('.wallet-summary__statement summary').click()
 await page.locator('.wallet-deposit__details summary').last().click();await page.getByText('Giữ mã tham chiếu',{exact:true}).waitFor();await page.locator('.wallet-deposit__details summary').last().click()
 for(const theme of ['light','dark'])for(const width of [1440,768,390,320]){
  await page.setViewportSize({width,height:1100});await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);await page.evaluate(()=>document.fonts.ready)
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow '+theme+' '+width)
  await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({fullPage:true,path:new URL(theme+'-'+width+'.png',out).pathname.slice(1),animations:'disabled'})
 }
 await page.setViewportSize({width:1440,height:1100});await page.evaluate(()=>document.documentElement.dataset.theme='light')
 await input.fill('999');await submit.click();await page.getByRole('alert').filter({hasText:'Nhập số nguyên'}).waitFor();assert.equal(calls.length,0)
 await input.fill('10000001');await submit.click();assert.equal(calls.length,0)
 await page.getByRole('group',{name:'Chọn nhanh số tiền'}).getByRole('button',{name:'500.000 ₫',exact:true}).click();assert.equal(await input.inputValue(),'500.000');assert.match(await submit.innerText(),/500.000/)
 await page.getByRole('button',{name:/PayOS Quét QR/}).click();assert.equal(await page.getByRole('button',{name:/PayOS Quét QR/}).getAttribute('aria-pressed'),'true')
 const popupPromise=page.waitForEvent('popup');await submit.click();assert.equal(await submit.isDisabled(),true);const popup=await popupPromise;await popup.close();await page.getByRole('status').filter({hasText:'Đang chờ xác nhận'}).waitFor();assert.deepEqual(calls.map(c=>[c.path,c.amount]),[['/api/payments/payos/create',500000]]);assert.match(await page.locator('.wallet-summary__balance').innerText(),/350.000/,'No optimistic balance credit')
 await page.goto(url);await ready();failGateway=true;await page.locator('.wallet-submit button').click();await page.getByRole('alert').filter({hasText:'thử lại sau'}).waitFor();assert.equal(calls.at(-1).path,'/api/payments/momo/create');assert.equal(calls.at(-1).amount,200000)
 await page.getByRole('tab',{name:'Lịch sử',exact:true}).click();await page.locator('#wallet-panel-history').waitFor();assert.match(page.url(),/wallet=history/)
 await page.getByRole('tab',{name:'Rút tiền',exact:true}).click();await page.locator('#wallet-panel-withdraw').waitFor();assert.match(page.url(),/wallet=withdraw/)
 balance=0;await page.goto(url+'&status=paid');await ready();assert.match(await page.locator('.wallet-summary__balance').innerText(),/^0/);await page.getByRole('status').filter({hasText:'Đang chờ xác nhận'}).waitFor()
 assert.deepEqual(errors,[]);await writeFile(new URL('results.json',out),JSON.stringify({checks:['responsive light/dark 320/390/768/1440','secondary disclosure','quick/custom amounts and limits','PayOS/MoMo payload preserved','busy state','gateway failure','no optimistic credit','withdraw/history deep links'],calls,errors},null,2));console.log('PASS wallet workspace: responsive, disclosures, amounts/limits, payment methods, pending/failure, no optimistic credit, withdrawal/history',JSON.stringify({calls,errors}))
}catch(error){await page.screenshot({path:new URL('failure.png',out).pathname.slice(1),fullPage:true});console.log(await page.locator('.wallet-page').innerText());throw error}finally{await browser.close()}
