import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {mkdir,writeFile} from 'node:fs/promises'
const {chromium}=createRequire(import.meta.url)(process.env.HOMEJI_PLAYWRIGHT_MODULE||'playwright')
const base=process.env.HOMEJI_THEME_TEST_URL||'http://127.0.0.1:5500'
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local fixture only')
const out=new URL('../output/verification/wallet-workspace/',import.meta.url);await mkdir(out,{recursive:true})
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const context=await browser.newContext({viewport:{width:1440,height:1100},colorScheme:'light',reducedMotion:'reduce'})
const id='11111111-1111-4111-8111-111111111111',calls=[],errors=[];let failGateway=false,failWallet=false,balance=350000
await context.addInitScript(id=>{localStorage.setItem('homeji_access_token','wallet-ui-fixture');localStorage.setItem('homeji_user_id',id);localStorage.setItem('homeji-theme','light')},id)
await context.route('**/*',async route=>{
 const u=new URL(route.request().url());if(u.origin!==new URL(base).origin)return route.abort()
 if(u.pathname.startsWith('/hubs/'))return route.fulfill({status:503,body:''})
 if(!u.pathname.startsWith('/api/'))return route.continue()
 if(u.pathname==='/api/search-interests')return route.fulfill({json:{settings:{enabled:false,aiEnabled:false,emailEnabled:false},suggestions:[],following:[],rooms:[]}})
 if(u.pathname==='/api/profile/me')return route.fulfill({json:{id,displayName:'Nguyễn Văn An',role:1,onboardingCompleted:true,isPremium:false}})
 if(u.pathname==='/api/subscriptions/me')return route.fulfill({json:{tier:1,isPremium:false,packageCode:'free'}})
 if(u.pathname==='/api/wallet'&&failWallet)return route.fulfill({status:503,json:{message:'Fixture wallet unavailable'}})
 if(u.pathname==='/api/wallet')return route.fulfill({json:{userId:id,balance,totalDeposited:600000,totalSpent:250000,totalEarned:0,isActivated:true,minimumTopUp:10000,maximumTopUp:10000000,minimumWithdrawalReserve:20000,updatedAt:'2026-10-19T01:00:00Z'}})
 if(u.pathname==='/api/wallet/transactions')return route.fulfill({json:[{id:'tx-fixture',userId:id,kind:1,amount:200000,balanceAfter:350000,description:'Nạp qua MoMo',referenceId:'HOMEJI-123',createdAt:'2026-10-19T01:00:00Z'}]})
 if(u.pathname.startsWith('/api/payments/')&&u.pathname.endsWith('/create')){calls.push({path:u.pathname,...route.request().postDataJSON()});await new Promise(r=>setTimeout(r,400));return failGateway?route.fulfill({status:503,json:{message:'Cổng thanh toán tạm thời không khả dụng'}}):route.fulfill({json:{payUrl:base+'/fixture-gateway',checkoutUrl:base+'/fixture-gateway'}})}
 return route.fulfill({json:u.pathname==='/api/chatbot/popup-config'?{enabled:false}:[]})
})
let releaseExtras,releaseWallet;const gate=new Promise(r=>releaseExtras=r),walletGate=new Promise(r=>releaseWallet=r);await context.route('**/api/**',async route=>{const p=new URL(route.request().url()).pathname;if(p==='/api/subscriptions/packages')return route.fulfill({json:[{code:'premium-30',name:'Premium 30 ngày',tier:2,price:100000,durationDays:30,benefits:[],badge:'Premium'}]});if(p==='/api/wallet'){await walletGate;return route.fallback()}if(p==='/api/payments'){await gate;return route.fallback()}return route.fallback()});
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message))
const url=base+'/?section=marketplace&market=wallet&wallet=deposit'
async function ready(){await page.locator('.wallet-deposit__amount input').waitFor();const skip=page.getByRole('button',{name:'Bỏ qua',exact:true});if(await skip.isVisible())await skip.click().catch(()=>{});await page.locator('.hj-intro').waitFor({state:'hidden'});await page.evaluate(()=>document.documentElement.dataset.theme='light')}
try{
 await page.goto(base+'/?section=payments');const skip=page.getByRole('button',{name:'Bỏ qua',exact:true});if(await skip.isVisible())await skip.click().catch(()=>{});await page.locator('.hj-intro').waitFor({state:'hidden'});await page.locator('.pay-plan').first().waitFor({timeout:2500});assert.equal(await page.locator('.pay-plan').count(),1);releaseWallet();await page.getByRole('button',{name:'Chọn gói',exact:true}).first().click();await page.getByRole('button',{name:/Số dư ví Homeji.*350.000/}).waitFor({timeout:2500});console.log('PASS Premium catalog loads before extras; wallet loads independently of history');
}finally{releaseExtras();releaseWallet();await browser.close()}
