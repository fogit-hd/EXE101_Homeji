import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'

const { chromium } = createRequire(import.meta.url)(process.env.HOMEJI_PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.HOMEJI_INTRO_TEST_URL || 'http://127.0.0.1:5492'
if (!['localhost','127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local isolated fixture only')
const output = new URL('../output/verification/brand-intro-speed/',import.meta.url)
await mkdir(output,{recursive:true})
const browser = await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const context = await browser.newContext({viewport:{width:1440,height:1000}})
const errors=[]
await context.route('**/*',route=>{
  const url=new URL(route.request().url())
  if(url.origin!==new URL(base).origin)return route.abort()
  if(url.pathname==='/api/profile/me')return route.fulfill({json:{id:'11111111-1111-4111-8111-111111111111',displayName:'Kiểm thử intro',role:1,onboardingCompleted:true,isPremium:false}})
  if(url.pathname.startsWith('/api/'))return route.fulfill({json:[]})
  if(url.pathname.startsWith('/hubs/'))return route.fulfill({status:503,body:''})
  return route.continue()
})
const page=await context.newPage()
page.on('pageerror',error=>errors.push(error.message))
const results=[]
async function measure(path,reload=false){
  if(reload)await page.reload();else await page.goto(base+path)
  const overlay=page.locator('.hj-intro')
  await overlay.waitFor({state:'visible'})
  const start=performance.now()
  if(path==='/terms'&&!reload){
    await page.waitForTimeout(700)
    await page.screenshot({path:new URL('terms-fast-intro.png',output).pathname.replace(/^\/([A-Za-z]:)/,'$1')})
  }
  await overlay.waitFor({state:'detached',timeout:12000})
  const elapsed=Math.round(performance.now()-start)
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.intro),undefined)
  results.push({path,reload,elapsedMs:elapsed})
  return elapsed
}
try{
  const normal=await measure('/')
  const fast=await measure('/terms')
  assert.ok(fast<normal*.75,JSON.stringify({normal,fast}))
  assert.ok(fast<3500,'non-home page must not wait for HomePage or the 10s timeout')
  const reloaded=await measure('/terms',true)
  assert.ok(reloaded<normal*.75)
  await page.getByRole('link',{name:'← Về Homeji',exact:true}).click()
  assert.equal(await page.locator('.hj-intro').count(),0,'SPA navigation must not replay the boot intro')
  for(const path of ['/login','/register','/register/']){
    await page.goto(base+path)
    await page.locator('input[autocomplete="new-password"],input[autocomplete="current-password"]').first().waitFor()
    assert.equal(await page.locator('.hj-intro').count(),0)
    assert.equal(await page.evaluate(()=>document.documentElement.dataset.intro),undefined)
  }
  await page.goto(base+'/admin')
  await page.waitForURL('**/login')
  assert.equal(await page.locator('.hj-intro').count(),0,'auth redirect cancels intro')
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.intro),undefined)
  await page.evaluate(()=>{
    const payload=btoa(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600}))
    localStorage.setItem('homeji_access_token',`fixture.${payload}.fixture`)
    localStorage.setItem('homeji_user_id','11111111-1111-4111-8111-111111111111')
    localStorage.setItem('homeji_email','fixture@example.test')
  })
  const authenticatedHome=await measure('/')
  assert.ok(authenticatedHome<normal*.75,'authenticated home also uses 3x playback')
  assert.deepEqual(errors,[])
  await writeFile(new URL('results.json',output),JSON.stringify({results,excluded:['/login','/register','/register/'],authRedirectClears:true,spaDoesNotReplay:true,errors},null,2))
  console.log(JSON.stringify(results,null,2))
}finally{await browser.close()}
