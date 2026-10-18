import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
const { chromium } = createRequire(import.meta.url)(process.env.HOMEJI_PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.HOMEJI_THEME_TEST_URL || 'http://127.0.0.1:5498'
if (!['127.0.0.1','localhost'].includes(new URL(base).hostname)) throw Error('Local fixtures only')
const out = new URL('../output/verification/glass-context/', import.meta.url)
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'light', reducedMotion: 'reduce' })
const id = '11111111-1111-4111-8111-111111111111'
await context.addInitScript(id => { localStorage.setItem('homeji_access_token','theme-fixture');localStorage.setItem('homeji_user_id',id) }, id)
const fixtureRoute = route => {
  const url = new URL(route.request().url())
  if (url.origin !== new URL(base).origin) return route.abort()
  if (!url.pathname.startsWith('/api/') && !url.pathname.startsWith('/hubs/')) return route.continue()
  if (url.pathname.startsWith('/hubs/')) return route.fulfill({status:503,body:''})
  let json = []
  if (url.pathname === '/api/profile/me') json = {id,displayName:'Nguyễn Văn An',role:1,onboardingCompleted:true,isPremium:false}
  if (url.pathname === '/api/wallet') json = {userId:id,balance:350000,isActivated:true}
  if (url.pathname === '/api/chatbot/popup-config') json = {enabled:false}
  if (url.pathname === '/api/subscriptions/me') json = {tier:1,isPremium:false,packageCode:'free'}
  return route.fulfill({json})
}
await context.route('**/*', fixtureRoute)

const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message))
const phase=process.env.GLASS_PHASE||'after'
const shot=async name=>{await page.waitForFunction(()=>[...document.querySelectorAll('.profile-section,.hj-reveal__char,.hj-account__menu')].every(e=>{const r=e.getBoundingClientRect();if(r.top>=innerHeight||r.bottom<=0)return true;const s=getComputedStyle(e);return (s.transform==='none'||s.transform==='matrix(1, 0, 0, 1, 0, 0)')&&Number(s.opacity)>.99}));await page.screenshot({path:new URL(phase+'-'+name+'.png',out).pathname.slice(1),animations:'disabled'})}
async function headerFits(){
 const boxes=await page.locator('.hj-header__menu,.hj-logo,.hj-search-slot,.hj-actions').evaluateAll(es=>es.filter(e=>e.getBoundingClientRect().width>0).map(e=>{const r=e.getBoundingClientRect();return{label:e.className,left:r.left,right:r.right,top:r.top,bottom:r.bottom}}));
 for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];assert.ok(Math.min(a.right,b.right)-Math.max(a.left,b.left)<=1||Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)<=1,'Header overlap: '+a.label+' / '+b.label)}
}

async function ready(){const skip=page.getByRole('button',{name:'Bỏ qua',exact:true});if(await skip.isVisible().catch(()=>false))await skip.click();await page.locator('.hj-intro').waitFor({state:'hidden'})}
try{
 await page.goto(base+'/?section=profile');await ready();await page.getByRole('textbox',{name:'Họ tên',exact:true}).waitFor();await shot('profile-light');
 const tabs=page.getByRole('tab');const samples=await tabs.evaluateAll(els=>els.map(e=>{const s=getComputedStyle(e);return{selected:e.getAttribute('aria-selected'),background:s.color,shadow:s.boxShadow,textShadow:s.textShadow}}));
 await page.getByRole('button',{name:'Menu tài khoản',exact:true}).click();await page.getByRole('menu').waitFor();await shot('account-light');await page.keyboard.press('Escape');
 const picker=page.getByRole('combobox',{name:'Trường học',exact:true});await picker.click();await page.getByRole('dialog',{name:'Trường học',exact:true}).waitFor();await shot('picker-light');await page.keyboard.press('Escape');
 const menu=page.locator('.hj-menu-trigger');await page.mouse.move(0,500);const rest=await menu.evaluate(e=>getComputedStyle(e).backgroundColor);await menu.hover();await page.waitForFunction(({rest})=>getComputedStyle(document.querySelector('.hj-menu-trigger')).backgroundColor!==rest,{rest});await page.mouse.move(0,500);

 assert.equal(samples[0].textShadow,'none','Small live labels must stay crisp without a white glow');
 assert.notEqual(samples[0].background,samples[1].background,'Selected and unselected tab labels must remain distinguishable above the shared lens');
 for(const theme of ['light','dark']){
  if(theme==='dark')await page.getByRole('switch',{name:'Chế độ tối',exact:true}).click()
  for(const section of ['profile','payments','marketplace']){
   await page.setViewportSize({width:1440,height:1000});await page.goto(base+'/?section='+section);await ready();await page.locator('.hj-header').waitFor();
   if(section==='profile')await page.getByRole('textbox',{name:'Họ tên',exact:true}).waitFor()
   if(section==='payments'){await page.locator('.pay-v2').waitFor();if(theme==='dark'){assert.ok(await page.locator('.pay-current').evaluate(e=>getComputedStyle(e).backgroundColor.match(/[0-9]+/g).slice(0,3).reduce((s,v)=>s+Number(v),0)<255),'Current plan must use an actual dark surface');assert.ok(await page.locator('.pay-tabs .liquid-tabs__lens').isVisible(),'Payment selection uses the shared glass lens');}}
   if(section==='marketplace')await page.locator('.marketplace-header').waitFor()
   await shot(section+'-'+theme+'-desktop');await page.setViewportSize({width:390,height:844});await headerFits();await shot(section+'-'+theme+'-mobile');await page.setViewportSize({width:320,height:740});await headerFits();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),section+' mobile overflow');
  }
 }
 assert.deepEqual(errors,[]);console.log('PASS: actual product states remain distinguishable, labels crisp, light/dark desktop/mobile inspected')
}finally{await browser.close()}
