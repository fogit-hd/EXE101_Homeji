import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'

const { chromium } = createRequire(import.meta.url)(process.env.HOMEJI_PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.HOMEJI_WALLET_TEST_URL || 'http://127.0.0.1:5492'
if (!['localhost','127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local fixtures only')
const out = new URL('../output/verification/account-wallet/',import.meta.url)
await mkdir(out,{recursive:true})
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const context=await browser.newContext({viewport:{width:1440,height:1000}})
const userId='11111111-1111-4111-8111-111111111111'
let balance=350000, delay=350, failure=false, wrongOwner=false, calls=0
const results={checks:[],responsive:[],errors:[]}
await context.addInitScript(({userId})=>{
  localStorage.setItem('homeji_access_token','fixture-session')
  localStorage.setItem('homeji_user_id',userId)
  localStorage.setItem('homeji_email','fixture@example.test')
},{userId})
await context.route('**/*',async route=>{
  const url=new URL(route.request().url())
  if(url.origin!==new URL(base).origin)return route.abort()
  if(!url.pathname.startsWith('/api/')&&!url.pathname.startsWith('/hubs/'))return route.continue()
  let body=[]
  if(url.pathname==='/api/profile/me') body={id:userId,displayName:'Nguyễn Văn An',role:1,onboardingCompleted:true,isPremium:false}
  else if(url.pathname==='/api/subscriptions/packages')body=[{code:'free',name:'Homeji Free',tier:1,price:0,durationDays:0,badge:'Free',benefits:[]}]
  else if(url.pathname==='/api/subscriptions/me')body={tier:1,isPremium:false,packageCode:'free',packageName:'Homeji Free'}
  else if(url.pathname==='/api/wallet'){
    calls++
    const response={userId:wrongOwner?'other-user':userId,balance,totalDeposited:350000,totalSpent:0,totalEarned:0,isActivated:true,minimumTopUp:10000,maximumTopUp:10000000,minimumWithdrawalReserve:50000,updatedAt:null}
    const status=failure?503:200
    await new Promise(resolve=>setTimeout(resolve,delay))
    return route.fulfill({status,json:status===200?response:{message:'Fixture wallet unavailable'}})
  }
  else if(url.pathname.includes('chatbot/config'))body={enabled:false}
  else if(url.pathname.startsWith('/hubs/'))return route.fulfill({status:503,body:''})
  return route.fulfill({json:body})
})
const page=await context.newPage()
page.on('pageerror',error=>results.errors.push(error.message))
const trigger=page.getByRole('button',{name:'Menu tài khoản',exact:true})
const value=page.locator('.hj-account__wallet-value')
async function open(){await trigger.click();await page.locator('.hj-account__wallet-link').waitFor()}
async function close(){await trigger.click();await page.waitForTimeout(300)}
try{
  await page.goto(base+'/?section=payments')
  await trigger.waitFor()
  const skip=page.getByRole('button',{name:'Bỏ qua',exact:true})
  if(await skip.count())await skip.click()
  await page.locator('.hj-intro').waitFor({state:'detached'})
  assert.equal(calls,0,'closed account menu should not fetch wallet')
  await open()
  assert.equal(await value.innerText(),'Đang tải…')
  await page.getByRole('menuitem',{name:/Ví tiền.*350\.000/}).waitFor()
  assert.equal(calls,1)
  assert.equal(await page.locator('.hj-account__wallet-link').getAttribute('href'),'/?section=marketplace&market=wallet&wallet=deposit')
  await page.screenshot({path:new URL('menu-desktop.png',out).pathname.replace(/^\/([A-Za-z]:)/,'$1')})
  results.checks.push('payments account menu loads real API shape on demand and points at existing wallet route')
  await close()
  delay=650;balance=100000
  await open()
  await page.waitForTimeout(60)
  await trigger.click()
  delay=20;balance=250000
  await open()
  await page.getByRole('menuitem',{name:/Ví tiền.*250\.000/}).waitFor()
  await page.waitForTimeout(800)
  assert.match(await value.innerText(),/250\.000/)
  results.checks.push('reopening refreshes balance and ignores a late response from the previous opening')
  await close()
  failure=true
  await open()
  await page.getByRole('menuitem',{name:'Thử tải lại số dư',exact:true}).waitFor()
  assert.equal(await value.innerText(),'Chưa tải được')
  failure=false;balance=0
  await page.getByRole('menuitem',{name:'Thử tải lại số dư',exact:true}).click()
  await page.getByRole('menuitem',{name:/Ví tiền.*0\s*₫$/}).waitFor()
  assert.match(await value.innerText(),/^0\s*₫$/)
  results.checks.push('error remains unknown instead of zero; retry can display a genuine zero balance')
  await close();wrongOwner=true;balance=999999999
  await open()
  await page.getByRole('menuitem',{name:'Thử tải lại số dư',exact:true}).waitFor()
  assert.equal(await value.innerText(),'Chưa tải được')
  results.checks.push('wallet from a different account is rejected')
  await close();wrongOwner=false;balance=350000
  await open()
  await page.getByRole('menuitem',{name:/Ví tiền.*350\.000/}).waitFor()
  await page.setViewportSize({width:320,height:900})
  await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.hj-account__menu')).opacity)===1)
  const menu=await page.locator('.hj-account__menu').boundingBox()
  assert.ok(menu.x>=0 && menu.x+menu.width<=320,JSON.stringify(menu))
  assert.ok(await page.locator('.hj-account__wallet-link').evaluate(element=>element.scrollWidth<=element.clientWidth))
  results.responsive.push({width:320,menu})
  await page.screenshot({path:new URL('menu-320.png',out).pathname.replace(/^\/([A-Za-z]:)/,'$1')})
  await page.locator('.hj-account__wallet-link').click()
  await page.waitForURL('**/?section=marketplace&market=wallet&wallet=deposit')
  await page.getByRole('region',{name:'Ví Homeji',exact:true}).waitFor()
  assert.equal(await trigger.getAttribute('aria-expanded'),'false')
  results.checks.push('wallet link opens wallet view and closes account menu')
  assert.deepEqual(results.errors,[])
  await writeFile(new URL('results.json',out),JSON.stringify(results,null,2))
  console.log(JSON.stringify(results,null,2))
}finally{await browser.close()}
