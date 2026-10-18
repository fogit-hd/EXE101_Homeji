import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
const { chromium } = createRequire(import.meta.url)(process.env.HOMEJI_PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.HOMEJI_THEME_TEST_URL || 'http://127.0.0.1:5498'
if (!['127.0.0.1','localhost'].includes(new URL(base).hostname)) throw Error('Local fixtures only')
const out = new URL('../output/verification/liquid-tabs/', import.meta.url)
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'light', reducedMotion: 'no-preference' })
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
const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message))
async function ready(){const skip=page.getByRole('button',{name:'Bỏ qua',exact:true});if(await skip.isVisible().catch(()=>false))await skip.click();await page.locator('.hj-intro').waitFor({state:'hidden'})}
async function aligned(list){await page.waitForFunction(label=>{const root=[...document.querySelectorAll('.liquid-tabs')].find(e=>e.getAttribute('aria-label')===label);const active=root?.querySelector('[aria-selected="true"]');const lens=root?.querySelector('.liquid-tabs__lens');if(!active||!lens)return false;const a=active.getBoundingClientRect(),l=lens.getBoundingClientRect(),box=root.getBoundingClientRect();return Math.abs(a.x-l.x)<2&&Math.abs(a.width-l.width)<2&&l.height>=a.height+8&&l.top>=box.top-1&&l.bottom<=box.bottom+1},await list.getAttribute('aria-label'))}
try{
 await page.goto(base+'/?section=profile');await ready();const profile=page.getByRole('tablist',{name:'Phần hồ sơ',exact:true});await aligned(profile);assert.ok(await profile.evaluate(e=>e.scrollWidth<=e.clientWidth),'Two profile tabs must both fit without clipping')
 await page.evaluate(async()=>{await Promise.all([...document.querySelectorAll('feImage')].map(async e=>{const i=new Image();i.src=e.getAttribute('href');await i.decode()}))});
 const optical=await profile.screenshot({animations:'disabled'});await page.evaluate(()=>document.querySelectorAll('feDisplacementMap').forEach(e=>e.setAttribute('scale','0')));const flat=await profile.screenshot({animations:'disabled'});assert.notEqual(createHash('sha256').update(optical).digest('hex'),createHash('sha256').update(flat).digest('hex'),'The actual tab track refracts beneath the selected lens');await page.evaluate(()=>document.querySelectorAll('feDisplacementMap').forEach(e=>e.setAttribute('scale','0.24')));
 const lens=profile.locator('.liquid-tabs__lens');const identity=await lens.elementHandle();const before=await lens.evaluate(e=>getComputedStyle(e).transform)
 await profile.getByRole('tab',{name:'Lối sống',exact:true}).click();await page.waitForFunction(t=>document.querySelector('.liquid-tabs__lens').style.transform!==t,before)
 await aligned(profile);assert.equal(await identity.evaluate(e=>e.isConnected),true,'The same physical lens moves rather than remounting on each tab')
 await profile.getByRole('tab',{name:'Lối sống',exact:true}).press('ArrowLeft');await aligned(profile);assert.equal(await profile.getByRole('tab',{name:'Cơ bản',exact:true}).getAttribute('aria-selected'),'true')
 assert.equal(await profile.getByRole('tab',{name:'Lối sống',exact:true}).getAttribute('tabindex'),'-1')
 await page.getByRole('combobox',{name:'Trường học',exact:true}).click();await page.getByRole('dialog',{name:'Trường học',exact:true}).waitFor();await page.screenshot({path:new URL('select-desktop.png',out).pathname.slice(1)});await page.keyboard.press('Escape')
 const sample=await page.getByRole('combobox',{name:'Trường học',exact:true}).evaluate(e=>getComputedStyle(e).backdropFilter);assert.match(sample,/homeji-liquid-lens/)
 for(const theme of ['light','dark']){
  if(theme==='dark')await page.getByRole('switch',{name:'Chế độ tối',exact:true}).click()
  await page.waitForFunction(t=>document.documentElement.dataset.theme===t&&!document.documentElement.dataset.themeTransition,theme)
  for(const section of ['profile','payments','marketplace']){
   await page.goto(base+'/?section='+section);await ready();await page.locator('.liquid-tabs').first().waitFor();const lists=page.locator('.liquid-tabs')
   for(const width of [1440,390,320]){
    await page.setViewportSize({width,height:960});for(const list of await lists.all())if(await list.isVisible())await aligned(list)
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),section+' fits '+width)
    await page.waitForFunction(()=>[...document.querySelectorAll('.profile-hero,.profile-section,.hj-reveal__char')].every(e=>{const r=e.getBoundingClientRect();if(r.top>=innerHeight||r.bottom<=0)return true;const s=getComputedStyle(e);return Number(s.opacity)>.99&&(s.transform==='none'||s.transform==='matrix(1, 0, 0, 1, 0, 0)')&&(s.filter==='none'||s.filter==='blur(0px)')}));await page.screenshot({path:new URL(section+'-'+theme+'-'+width+'.png',out).pathname.slice(1),animations:'disabled'})
   }
  }
 }
 await page.goto(base+'/?section=marketplace');await ready();await page.setViewportSize({width:320,height:900});const market=page.getByRole('tablist',{name:'Chợ Homeji',exact:true});await market.getByRole('tab').first().focus();await market.getByRole('tab').first().press('End');await aligned(market);assert.ok(await market.evaluate(e=>{const a=e.querySelector('[aria-selected="true"]').getBoundingClientRect(),r=e.getBoundingClientRect();return a.left>=r.left&&a.right<=r.right+1}),'Last tab is revealed inside its mobile rail');
 await page.emulateMedia({reducedMotion:'reduce',forcedColors:'active'});await page.goto(base+'/?section=profile');await ready();const reduced=page.getByRole('tablist',{name:'Phần hồ sơ',exact:true});await aligned(reduced);assert.equal(await reduced.locator('.liquid-tabs__lens').evaluate(e=>getComputedStyle(e).transitionDuration),'0s');assert.equal(await reduced.locator('.liquid-tabs__lens').evaluate(e=>getComputedStyle(e).backdropFilter),'none')
 assert.deepEqual(errors,[]);console.log('PASS: same raised lens follows selection and keyboard, correct geometry at 320/390/1440, actual profile/payment/market tabs and select, forced-colors/reduced-motion')
}finally{await browser.close()}
