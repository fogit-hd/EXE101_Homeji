import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {mkdir} from 'node:fs/promises'
const {chromium}=createRequire(import.meta.url)(process.env.HOMEJI_PLAYWRIGHT_MODULE||'playwright')
const base=process.env.HOMEJI_TEST_BASE_URL||'http://127.0.0.1:5515'
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local fixtures only')
const out='output/verification/payment-return';await mkdir(out,{recursive:true})
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'})
const id='11111111-1111-4111-8111-111111111111',paymentId='22222222-2222-4222-8222-222222222222'
await context.addInitScript(id=>{localStorage.setItem('homeji_access_token','payment-return-fixture');localStorage.setItem('homeji_user_id',id);localStorage.setItem('hj-intro-seen','1');localStorage.setItem('homeji_analytics_consent_v1','rejected')},id)
let status=1,method=2,purpose=3,lookupError=false,expired=false
await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!==new URL(base).origin)return r.abort();if(u.pathname.startsWith('/hubs/'))return r.abort();if(!u.pathname.startsWith('/api/'))return r.continue();
 if(r.request().method()!=='GET'&&/\/api\/(payments|wallet)/.test(u.pathname))throw Error('No payment writes in UI fixtures')
 let json=[]
 if(u.pathname==='/api/profile/me')json={id,displayName:'Nguyễn Văn An',role:1,onboardingCompleted:true}
 if(u.pathname==='/api/subscriptions/me')json={tier:1,isPremium:false,packageCode:'free'}
 if(u.pathname==='/api/wallet')json={balance:3205600,isActivated:true}
 if(u.pathname==='/api/chatbot/popup-config')json={enabled:false}
 if(u.pathname==='/api/search-interests')json={settings:{enabled:false},suggestions:[],following:[],rooms:[]}
 if(u.pathname.startsWith('/api/payments/')&&!u.pathname.includes('packages')){if(lookupError)return r.fulfill({status:503,json:{detail:'Fixture unavailable'}});json={id:paymentId,userId:id,status,method,purpose,amount:200000,orderCode:'803347',description:purpose===3?'Nạp Số dư Homeji':'Gói Premium',paymentUrl:'https://pay.payos.vn/fixture',createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+(expired?-60000:600000)).toISOString(),paidAt:status===2?new Date().toISOString():null}}
 return r.fulfill({json})})
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message))
async function open(query,viaPlans=false){await page.goto(base+(viaPlans?'/?section=payments&':'/payments/wait?')+'orderCode=803347&'+query);const skip=page.getByRole('button',{name:'Bỏ qua',exact:true});if(await skip.isVisible().catch(()=>false))await skip.click();await page.locator('.hj-intro').waitFor({state:'hidden'})}
try{
 await open('provider=payos&cancel=true&providerStatus=CANCELLED',true)
 await page.getByRole('heading',{name:'Bạn đã hủy thanh toán',exact:true}).waitFor()
 assert.equal(new URL(page.url()).searchParams.get('cancel'),'true')
 assert.equal(await page.getByRole('timer').count(),0)
 assert.equal(await page.getByRole('link',{name:/Thanh toán qua/}).count(),0)
 await page.reload();await page.getByRole('heading',{name:'Bạn đã hủy thanh toán',exact:true}).waitFor()
 for(const provider of ['payos','momo'])for(const state of ['cancel','success','failed','expired','verifying','pending']){
  method=provider==='payos'?2:1;status={cancel:4,success:2,failed:3,expired:5,verifying:1,pending:1}[state]
  const hint=provider==='payos'?'provider=payos&status=PAID&cancel=false':'provider=momo&resultCode=0'
  await open(state==='verifying'?hint:'provider='+provider)
  const title={cancel:'Thanh toán đã hủy',success:'Thanh toán thành công',failed:'Thanh toán không thành công',expired:'Đơn thanh toán đã hết hạn',verifying:'Đang xác minh thanh toán',pending:'Chờ bạn thanh toán'}[state]
  await page.getByRole('heading',{name:title,exact:true}).waitFor()
  assert.equal(await page.getByRole('link',{name:/Thanh toán qua/}).count(),state==='pending'?1:0)
  await page.screenshot({path:`${out}/${provider}-${state}.png`,fullPage:true})
 }
 status=1;method=1;await open('provider=momo&resultCode=1006');await page.getByRole('heading',{name:'Bạn đã hủy thanh toán',exact:true}).waitFor()
 status=2;await page.getByRole('button',{name:'Kiểm tra trạng thái',exact:true}).click();await page.getByRole('heading',{name:'Thanh toán thành công',exact:true}).waitFor()
 assert.equal(await page.getByRole('link',{name:'Về ví Homeji',exact:true}).getAttribute('href'),'/?section=marketplace&market=wallet')
 status=1;await open('provider=momo&resultCode=1001');await page.getByRole('heading',{name:'Chưa hoàn tất thanh toán',exact:true}).waitFor()
 expired=true;await open('');await page.getByRole('heading',{name:'Đã hết thời gian thanh toán',exact:true}).waitFor();expired=false
 status=2;purpose=2;await open('provider=payos&cancel=true');await page.getByRole('heading',{name:'Thanh toán thành công',exact:true}).waitFor()
 assert.equal(await page.getByRole('link',{name:'Xem gói của tôi',exact:true}).getAttribute('href'),'/?section=payments')
 lookupError=true;await open('provider=payos&cancel=true');await page.getByRole('heading',{name:'Chưa tải được giao dịch',exact:true}).waitFor();assert.equal(await page.getByRole('heading',{name:'Thanh toán thành công',exact:true}).count(),0)
 lookupError=false;status=3;method=2;purpose=3
 await page.setViewportSize({width:390,height:844});await open('provider=payos');await page.getByRole('heading',{name:'Thanh toán không thành công',exact:true}).waitFor()
 for(const theme of ['light','dark']){await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`${out}/mobile-${theme}.png`,fullPage:true})}
 assert.deepEqual(errors,[]);console.log('PASS provider cancel through legacy redirect/reload; both gateways terminal/waiting/verification; server success beats cancel; lookup error; purpose-aware actions; mobile light/dark. API fixtures, no real payments.')
}finally{await browser.close()}
