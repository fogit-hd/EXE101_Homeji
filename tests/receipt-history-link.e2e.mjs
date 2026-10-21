import assert from 'node:assert/strict'
import{createRequire}from'node:module'
import{mkdir,readFile,writeFile}from'node:fs/promises'
const{chromium}=createRequire(import.meta.url)(process.env.HOMEJI_PLAYWRIGHT_MODULE||'playwright')
const base=process.env.HOMEJI_TEST_BASE_URL||'http://127.0.0.1:5515'
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('Local intercepted API only')
const out='output/verification/receipt-history-link'
const email=await readFile(out+'/receipt.html','utf8')
const destination='/marketplace?market=wallet&wallet=history'
assert.ok(email.includes('href="https://homeji.onrender.com/marketplace?market=wallet&amp;wallet=history" target="_blank"'))
await mkdir(out,{recursive:true})
await writeFile(out+'/email-preview.html',email)
const id='11111111-1111-4111-8111-111111111111'
const receipt={id,referenceId:id,event:1,amount:125000,currency:'VND',referenceCode:'LINK-TEST-ONLY',description:'KIỂM THỬ liên kết, không phải giao dịch thật.',issuedAt:new Date().toISOString(),emailScheduled:true}
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'})
let fakeLogins=0
async function contextFor(authenticated){
 const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'})
 await context.addInitScript(({authenticated,id})=>{if(authenticated){localStorage.setItem('homeji_access_token','fixture-token');localStorage.setItem('homeji_user_id',id)}localStorage.setItem('homeji_theme','light')},{authenticated,id})
 await context.route('**/*',route=>{
  const u=new URL(route.request().url())
  if(u.origin==='https://homeji.onrender.com'&&route.request().isNavigationRequest())return route.fulfill({status:302,headers:{location:base+u.pathname+u.search}})
  if(u.origin!==new URL(base).origin)return route.abort()
  if(u.pathname.startsWith('/hubs/'))return route.fulfill({status:503,body:''})
  if(!u.pathname.startsWith('/api/'))return route.continue()
  let json=[]
  if(u.pathname==='/api/account/login'){fakeLogins++;json={accessToken:'fixture-token',userId:id,email:'fixture@example.test'}}
  if(u.pathname==='/api/profile/me')json={id,displayName:'Kiểm thử liên kết',role:1,onboardingCompleted:true,isPremium:false}
  if(u.pathname==='/api/subscriptions/me')json={tier:1,isPremium:false,packageCode:'free'}
  if(u.pathname==='/api/search-interests')json={settings:{enabled:false,aiEnabled:false,emailEnabled:false},suggestions:[],following:[],rooms:[]}
  if(u.pathname==='/api/receipts')json={items:[receipt],hasMore:false}
  if(u.pathname==='/api/wallet')json={userId:id,balance:350000,totalDeposited:350000,totalSpent:0,totalEarned:0,isActivated:true}
  if(u.pathname==='/api/wallet/transactions')json=[{id,userId:id,kind:1,amount:125000,balanceAfter:350000,description:'KIỂM THỬ lịch sử đã mở',referenceId:'LINK-TEST-ONLY',createdAt:new Date().toISOString()}]
  if(u.pathname==='/api/chatbot/popup-config')json={enabled:false}
  return route.fulfill({json})
 })
 return context
}
async function history(page){await page.locator('#wallet-panel-history').waitFor({timeout:30000});assert.equal(new URL(page.url()).searchParams.get('wallet'),'history');await page.getByRole('heading',{name:'Lịch sử giao dịch',exact:true}).waitFor();await page.getByText('KIỂM THỬ lịch sử đã mở',{exact:false}).first().waitFor()}
try{
 const context=await contextFor(true),page=await context.newPage()
 await page.goto(base+'/receipts')
 const link=page.getByRole('link',{name:'Xem lịch sử giao dịch',exact:true});await link.waitFor();assert.equal(await link.getAttribute('href'),destination)
 await link.click();await history(page)
 await page.screenshot({path:out+'/web-history.png',fullPage:true})
 await page.goto(base+'/'+out+'/email-preview.html')
 const popupEvent=page.waitForEvent('popup');await page.getByRole('link',{name:/Xem lịch sử giao dịch/}).click();const popup=await popupEvent
 await history(popup);await popup.close();await context.close()
 const signedOut=await contextFor(false),emailPage=await signedOut.newPage()
 await emailPage.goto(base+'/'+out+'/email-preview.html')
 const loginPopupEvent=emailPage.waitForEvent('popup');await emailPage.getByRole('link',{name:/Xem lịch sử giao dịch/}).click();const loginPage=await loginPopupEvent
 await loginPage.locator('#auth-email').waitFor({timeout:30000})
 assert.equal(new URL(loginPage.url()).pathname,'/login')
 assert.equal(await loginPage.evaluate(()=>history.state.usr.from),destination)
 await loginPage.locator('#auth-email').fill('fixture@example.test');await loginPage.locator('#auth-password').fill('FixturePassword123!')
 await loginPage.locator('button.auth-cinema__submit').click()
 await history(loginPage);assert.equal(fakeLogins,1)
 await loginPage.screenshot({path:out+'/after-login-history.png',fullPage:true})
 await signedOut.close()
 console.log('PASS: web receipt action and generated email popup reach wallet history; signed-out email entry retains destination through mocked sign-in. All APIs intercepted; no real login/email/financial write.')
}finally{await browser.close()}

