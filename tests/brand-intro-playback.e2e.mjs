import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'

const { chromium } = createRequire(import.meta.url)(process.env.HOMEJI_PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.HOMEJI_INTRO_TEST_URL || 'http://127.0.0.1:5515'
if (!['localhost','127.0.0.1','homeji.onrender.com'].includes(new URL(base).hostname)) throw Error('Known Homeji origin with intercepted APIs only')
const output = 'output/verification/brand-intro-home-only'
await mkdir(output,{recursive:true})
const browser = await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const context = await browser.newContext({viewport:{width:1440,height:1000}})
const id='11111111-1111-4111-8111-111111111111'
await context.route('**/*',route=>{
  const url=new URL(route.request().url())
  if(url.origin!==new URL(base).origin)return route.abort()
  if(url.pathname==='/api/profile/me')return route.fulfill({json:{id,displayName:'Kiểm thử intro',role:1,onboardingCompleted:true,isPremium:false}})
  if(url.pathname==='/api/wallet')return route.fulfill({json:{userId:id,balance:350000,isActivated:true}})
  if(url.pathname==='/api/subscriptions/me')return route.fulfill({json:{tier:1,isPremium:false,packageCode:'free'}})
  if(url.pathname==='/api/chatbot/popup-config')return route.fulfill({json:{enabled:false}})
  if(url.pathname==='/api/search-interests')return route.fulfill({json:{settings:{enabled:false},suggestions:[],following:[],rooms:[]}})
  if(url.pathname.startsWith('/api/'))return route.fulfill({json:[]})
  if(url.pathname.startsWith('/hubs/'))return route.fulfill({status:503,body:''})
  return route.continue()
})
// Observe from document creation, including the inline gate before React loads.
await context.addInitScript(()=>{
  window.__introTrace={requested:false,overlay:false}
  new MutationObserver(records=>{
    if(document.documentElement?.dataset.intro==='1'||records.some(r=>r.attributeName==='data-intro'&&r.oldValue==='1'))window.__introTrace.requested=true
    if(document.querySelector('.hj-intro')||records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('.hj-intro')||n.querySelector?.('.hj-intro')))))window.__introTrace.overlay=true
  }).observe(document,{subtree:true,childList:true,attributes:true,attributeOldValue:true,attributeFilter:['data-intro']})
})
const page=await context.newPage(),errors=[],results=[]
page.setDefaultTimeout(10000)
page.on('pageerror',error=>errors.push(error.message))
async function noIntro(path,reload=false){
  if(reload)await page.reload();else await page.goto(base+path)
  await page.waitForFunction(()=>document.getElementById('root')?.childElementCount>0)
  await page.waitForTimeout(250)
  const state=await page.evaluate(()=>({...window.__introTrace,marker:document.documentElement.dataset.intro,boot:document.getElementById('hj-boot')?getComputedStyle(document.getElementById('hj-boot')).display:'removed'}))
  assert.equal(state.requested,false,path+': never lock scrolling or paint the boot layer')
  assert.equal(state.overlay,false,path+': never mount the animated overlay')
  assert.equal(state.marker,undefined)
  assert.ok(['none','removed'].includes(state.boot))
  results.push({path,reload,...state})
}
async function home(rate){
  await page.goto(base+'/')
  await page.locator('.hj-intro__hero[style]').waitFor()
  assert.equal(await page.locator('.hj-intro').getAttribute('data-playback-rate'),String(rate))
}
async function skip(){
  await page.getByRole('button',{name:'Bỏ qua',exact:true}).click()
  await page.locator('.hj-intro').waitFor({state:'detached',timeout:10000})
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.intro),undefined)
}
async function spa(path){
  await page.evaluate(path=>{history.pushState({},'',path);dispatchEvent(new PopStateEvent('popstate'))},path)
}
try{
  await home(1);await skip()
  await home(3);await skip()
  for(const path of ['/terms','/privacy','/login','/register/','/explore','/?section=listings','/?post=123','/#help'])await noIntro(path)
  await noIntro('/admin')
  await page.waitForURL('**/login')
  await page.evaluate(id=>{
    const payload=btoa(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600}))
    localStorage.setItem('homeji_access_token','fixture.'+payload+'.fixture')
    localStorage.setItem('homeji_user_id',id)
  },id)
  const wallet='/?section=marketplace&market=wallet&wallet=history'
  await noIntro(wallet)
  const tabs=page.getByRole('tablist',{name:'Quản lý số dư',exact:true})
  await tabs.getByRole('tab',{name:'Rút tiền',exact:true}).click()
  assert.equal(await page.locator('.hj-intro').count(),0)
  await noIntro(page.url().slice(base.length),true)
  await page.screenshot({path:output+'/wallet-without-intro.png'})
  await noIntro('/payments/wait?paymentId=123')
  await home(3)
  await spa(wallet)
  await page.locator('.hj-intro').waitFor({state:'detached'})
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.intro),undefined,'Leaving home cancels and unlocks the intro')
  await spa('/')
  await page.waitForTimeout(350)
  assert.equal(await page.locator('.hj-intro').count(),0,'SPA return to home does not replay the intro')
  assert.deepEqual(errors,[])
  await writeFile(output+'/results.json',JSON.stringify({base,readOnlyFixtures:true,homeRates:[1,3],routes:results,spaCancels:true,spaDoesNotReplay:true,errors},null,2))
  console.log('PASS: bare home retains intro; wallet/deep links/reloads/auth/payment paths have no pre-paint or React intro; SPA cancellation and no replay')
}finally{await browser.close()}
