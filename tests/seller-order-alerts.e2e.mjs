import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {mkdir,writeFile} from 'node:fs/promises'
const require=createRequire(import.meta.url)
const {chromium}=require(process.env.HOMEJI_PLAYWRIGHT_MODULE || 'playwright')
const base=process.env.HOMEJI_TEST_BASE_URL || 'http://127.0.0.1:5589'
const out=process.env.HOMEJI_SELLER_OUTPUT || 'output/verification/seller-alerts'
await mkdir(out,{recursive:true})
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const context=await browser.newContext({viewport:{width:1440,height:1000}})
const seller='11111111-1111-4111-8111-111111111111',buyer='22222222-2222-4222-8222-222222222222'
const stamp='2026-10-19T03:00:00Z'
const order=(id,patch={})=>({id,checkoutId:'checkout-food',marketplacePostId:id,buyerId:buyer,sellerId:seller,postTitle:id==='rice'?'Cơm gà xối mỡ':'Bánh mì chả cá',quantity:1,unitPrice:40000,agreedPrice:40000,platformFeeRate:0,platformFeeAmount:0,sellerNetAmount:40000,status:1,pickupAt:'2026-10-19T15:00:00Z',pickupAddress:'Linh Trung, Thủ Đức',buyerDisplayName:'Khách Minh Anh',sellerDisplayName:'Bếp Homeji',createdAt:stamp,updatedAt:stamp,...patch})
let orders=[order('old',{status:5})],fail=false,calls=0,mutations=[]
await context.addInitScript(({seller})=>{
 localStorage.setItem('homeji_access_token','seller-fixture');localStorage.setItem('homeji_user_id',seller);sessionStorage.setItem('hj-intro-seen','1')
 window.__toneStarts=0
 const original=AudioContext.prototype.createOscillator
 AudioContext.prototype.createOscillator=function(...args){window.__toneStarts++;return original.apply(this,args)}
},{seller})
await context.route('**/*',async route=>{
 const u=new URL(route.request().url()),method=route.request().method()
 if(u.origin!==new URL(base).origin)return route.abort()
 if(!u.pathname.startsWith('/api/')&&!u.pathname.startsWith('/hubs/'))return route.continue()
 if(u.pathname.startsWith('/hubs/'))return route.fulfill({status:503,body:''})
 let json=[]
 if(u.pathname==='/api/profile/me')json={id:seller,displayName:'Người bán Homeji',role:1,onboardingCompleted:true,isPremium:false}
 else if(u.pathname==='/api/marketplace-orders'){
  calls++;if(fail)return route.fulfill({status:503,json:{detail:'Tạm mất kết nối đơn hàng'}});json=orders
 }else if(u.pathname.endsWith('/accept')||u.pathname.endsWith('/delivered')){
  mutations.push(u.pathname);orders=orders.map(o=>({...o,status:u.pathname.endsWith('/accept')?2:7}));json=orders[0]
 }else if(u.pathname==='/api/wallet')json={userId:seller,balance:300000,isActivated:true,minimumTopUp:10000,maximumTopUp:10000000}
 else if(u.pathname==='/api/subscriptions/me')json={tier:1,isPremium:false}
 else if(u.pathname==='/api/search-interests')json={settings:{enabled:false},following:[],suggestions:[],rooms:[]}
 else if(u.pathname==='/api/chatbot/popup-config')json={enabled:false}
 if(method!=='GET'&&!u.pathname.endsWith('/accept')&&!u.pathname.endsWith('/delivered')&&!u.pathname.includes('analytics'))console.log('Fixture write',u.pathname)
 return route.fulfill({json})
})
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message))
const tones=()=>page.evaluate(()=>window.__toneStarts)
const refresh=()=>page.evaluate(()=>window.dispatchEvent(new Event('focus')))
const event=()=>page.evaluate(seller=>window.dispatchEvent(new CustomEvent('homeji:notification-received',{detail:{ownerId:seller,notification:{id:'event',type:13,isRead:false}}})),seller)
const dialog=page.getByRole('dialog',{name:'Đơn bán cần xử lý',exact:true})
try{
 await page.clock.install()
 await page.goto(base+'/?section=marketplace&market=sales')
 await page.getByText('Đang theo dõi đơn bán',{exact:true}).waitFor()
 await page.getByRole('button',{name:'Bật âm báo đơn',exact:true}).click()
 await page.getByRole('button',{name:'Âm đơn: Bật',exact:true}).waitFor();assert.ok(await tones()>=3)
 await page.goto(base+'/?section=profile')
 // Reloading requires a gesture again; the UI must say so rather than claiming sound is ready.
 await page.getByRole('button',{name:'Chạm để bật lại âm',exact:true}).waitFor()
 await page.getByRole('button',{name:'Chạm để bật lại âm',exact:true}).click()
 orders=[order('rice'),order('bread',{agreedPrice:22000,unitPrice:22000}),order('buyer-only',{sellerId:buyer,buyerId:seller,checkoutId:'buyer-cart'})]
 await page.waitForTimeout(3100)
 const before=await tones();await event()
 await page.getByText('1 đơn bán cần xử lý',{exact:true}).waitFor()
 await page.waitForTimeout(500);assert.equal(await tones()-before,3,'One cart rings once for both lines')
 const heard=await tones();await event();await event();await page.waitForTimeout(550);assert.equal(await tones(),heard,'Duplicate events do not ring twice')
 await page.getByRole('button',{name:'Theo dõi / xử lý',exact:true}).click();await dialog.waitFor()
 assert.equal(await dialog.locator('.seller-watch__orders > li').count(),1)
 assert.match(await dialog.innerText(),/Cơm gà xối mỡ/);assert.match(await dialog.innerText(),/Bánh mì chả cá/)
 await dialog.getByRole('button',{name:'Đã ghi nhận · dừng nhắc âm',exact:true}).click()
 assert.equal(await dialog.locator('.seller-watch__orders > li').count(),1,'Acknowledgement cannot dismiss pending work')
 await dialog.getByRole('button',{name:'Đóng theo dõi đơn bán',exact:true}).click()
 await page.reload();await page.getByText('1 đơn bán cần xử lý',{exact:true}).waitFor()
 await page.getByRole('button',{name:'Theo dõi / xử lý',exact:true}).click();await dialog.getByRole('button',{name:'Đã ghi nhận',exact:true}).waitFor()
 await dialog.getByRole('link',{name:'Mở đơn để xử lý',exact:true}).click()
 await page.waitForURL('**market=sales&sale=rice')
 await page.locator('.is-purchase-focus').waitFor()
 await page.getByRole('button',{name:'Xác nhận nhận đơn',exact:true}).click()
 await page.getByText('Đơn đã nhận · cần chuẩn bị giao',{exact:true}).waitFor()
 await page.getByRole('button',{name:'Theo dõi / xử lý',exact:true}).click()
 await dialog.getByRole('button',{name:'Đã ghi nhận · dừng nhắc âm',exact:true}).waitFor()
 await page.screenshot({path:out+'/accepted-desktop.png'})
 await dialog.getByRole('button',{name:'Đóng theo dõi đơn bán',exact:true}).click()
 fail=true;await refresh();await page.getByText('Mất đồng bộ · đang thử lại, hãy kiểm tra đơn',{exact:true}).waitFor()
 assert.equal(await page.getByText('1 đơn bán cần xử lý',{exact:true}).count(),1,'Failed synchronization preserves the last pending queue')
 fail=false;await refresh();await page.getByText('Đơn đã nhận · cần chuẩn bị giao',{exact:true}).waitFor()
 for(const theme of ['light','dark'])for(const width of [320,390,1440]){
  await page.setViewportSize({width,height:900});await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme)
  await page.getByRole('button',{name:'Theo dõi / xử lý',exact:true}).click();await dialog.waitFor()
  const overflow=await dialog.evaluate(e=>e.scrollWidth>e.clientWidth+1);assert.equal(overflow,false)
  await page.screenshot({path:`${out}/queue-${theme}-${width}.png`})
  await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'})
 }
 await page.locator('.marketplace-order-group__actions .btn-primary').click()
 await page.getByText('Đang theo dõi đơn bán',{exact:true}).waitFor()
 assert.deepEqual(mutations,['/api/marketplace-orders/rice/accept','/api/marketplace-orders/rice/delivered'])
 // Reconciliation after the hub was unavailable must recover an order that arrived offline.
 orders=[order('pass',{checkoutId:'checkout-goods',postTitle:'Đèn bàn pass lại'})]
 await page.clock.fastForward(30001)
 await page.getByText('1 đơn bán cần xử lý',{exact:true}).waitFor()
 await page.getByRole('button',{name:'Chạm để bật lại âm',exact:true}).click()
 const firstRing=await tones()
 await page.clock.fastForward(60001)
 for(let attempt=0;attempt<30 && await tones()<=firstRing;attempt++)await new Promise(resolve=>setTimeout(resolve,100))
 assert.ok(await tones()>firstRing,'Pending work sounds again after one minute')
 await page.getByRole('button',{name:'Theo dõi / xử lý',exact:true}).click()
 await dialog.getByRole('button',{name:'Đã ghi nhận · dừng nhắc âm',exact:true}).click()
 const acknowledgedTones=await tones()
 await page.clock.fastForward(90001)
 await new Promise(resolve=>setTimeout(resolve,300))
 assert.equal(await tones(),acknowledgedTones,'Acknowledged work is not re-announced by polling')
 assert.deepEqual(errors,[])
 await writeFile(out+'/result.json',JSON.stringify({passed:true,fixtureData:true,calls,errors,mutations,tones:await tones()},null,2))
 console.log('PASS seller cart grouping, chime/duplicate suppression, acknowledgement/reload, accept/handoff, failure retention, polling recovery and reminders; 320/390/1440 light/dark')
}finally{await page.screenshot({path:out+'/final.png'}).catch(()=>{});await browser.close()}
