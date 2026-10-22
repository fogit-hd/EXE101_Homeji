import assert from 'node:assert/strict'
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
let profileRole=1
const fixtureRoute = route => {
  const url = new URL(route.request().url())
  if (url.origin !== new URL(base).origin) return route.abort()
  if (!url.pathname.startsWith('/api/') && !url.pathname.startsWith('/hubs/')) return route.continue()
  if (url.pathname.startsWith('/hubs/')) return route.fulfill({status:503,body:''})
  if(url.pathname==='/api/admin/analytics/product')return route.fulfill({status:503,json:{detail:'Fixture analytics unavailable'}})
  if(url.pathname==='/api/search-interests')return route.fulfill({json:{settings:{enabled:false,aiEnabled:false,emailEnabled:false},suggestions:[],following:[],rooms:[]}})
  let json = []
  if (url.pathname === '/api/profile/me') json = {id,displayName:'Nguyễn Văn An',role:profileRole,onboardingCompleted:true,isPremium:false}
  if (url.pathname === '/api/wallet') json = {userId:id,balance:350000,isActivated:true}
  if (url.pathname === '/api/chatbot/popup-config') json = {enabled:false}
  if (url.pathname === '/api/subscriptions/me') json = {tier:1,isPremium:false,packageCode:'free'}
  return route.fulfill({json})
}
await context.route('**/*', fixtureRoute)
const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message))
async function ready(){const skip=page.getByRole('button',{name:'Bỏ qua',exact:true});if(await skip.isVisible().catch(()=>false))await skip.click({timeout:1500}).catch(async error=>{if(await skip.isVisible())throw error});await page.locator('.hj-intro').waitFor({state:'hidden'})}
// Dark admin intentionally uses flat tabs; lens geometry applies to the other surfaces.
async function aligned(list){await page.waitForFunction(label=>{const root=[...document.querySelectorAll('.liquid-tabs')].find(e=>e.getAttribute('aria-label')===label);const active=root?.querySelector('[aria-selected="true"]');const lens=root?.querySelector('.liquid-tabs__lens');if(!active||!lens||root.dataset.lensEngaged)return false;if(getComputedStyle(lens).display==='none')return document.documentElement.dataset.theme==='dark'&&root.closest('.admin-workspace')!==null;const a=active.getBoundingClientRect(),l=lens.getBoundingClientRect(),box=root.getBoundingClientRect();return Math.abs(a.x-l.x)<2&&Math.abs(a.width-l.width)<2&&Math.abs(l.height-a.height)<2&&l.top>=box.top-1&&l.bottom<=box.bottom+1},await list.getAttribute('aria-label'))}
try{
 await page.goto(base+'/?section=profile');await ready();const profile=page.getByRole('tablist',{name:'Phần hồ sơ',exact:true});await aligned(profile);assert.ok(await profile.evaluate(e=>e.scrollWidth<=e.clientWidth),'Two profile tabs must both fit without clipping')
 const raisedLens=profile.locator('.liquid-tabs__lens')
 const basic=profile.getByRole('tab',{name:'Cơ bản',exact:true}),lifestyle=profile.getByRole('tab',{name:'Lối sống',exact:true})
 const baseRect=await basic.boundingBox(),targetRect=await lifestyle.boundingBox()
 assert.ok(await raisedLens.evaluate(e=>Number(getComputedStyle(e).zIndex)<Number(getComputedStyle(e.parentElement.querySelector('[role="tab"]')).zIndex)),'Labels remain above the glass')
 await page.mouse.move(baseRect.x+baseRect.width/2,baseRect.y+baseRect.height/2);await page.mouse.down()
 assert.equal(await basic.evaluate(e=>getComputedStyle(e).filter),'none')
 assert.equal(await basic.evaluate(e=>getComputedStyle(e).backdropFilter),'none')
 assert.doesNotMatch(await raisedLens.evaluate(e=>getComputedStyle(e).backdropFilter),/url\(/,'The face uses smooth background softness without displacement')
 const lightBefore=await raisedLens.evaluate(e=>e.style.getPropertyValue('--lens-light-x'))

 await page.screenshot({path:new URL('profile-lens-pressed.png',out).pathname.slice(1)});await profile.screenshot({path:new URL('profile-lens-pressed-detail.png',out).pathname.slice(1)})
 await page.mouse.move(targetRect.x+targetRect.width/2,targetRect.y+targetRect.height/2,{steps:8})
 assert.notEqual(await raisedLens.evaluate(e=>e.style.getPropertyValue('--lens-light-x')),lightBefore,'Specular reflection follows the interaction direction')
 assert.equal(await basic.getAttribute('aria-selected'),'true','Dragging previews without committing selection')
 await page.mouse.up();await aligned(profile);assert.equal(await lifestyle.getAttribute('aria-selected'),'true','Release commits the dragged destination')
 await basic.click();await aligned(profile)
 // Pointer cancellation restores the committed tab and clears the swollen lens.
 await basic.evaluate(e=>e.addEventListener('pointerdown',event=>{e.dataset.testPointer=String(event.pointerId)},{once:true}))
 await page.mouse.move(baseRect.x+20,baseRect.y+20);await page.mouse.down()
 await basic.dispatchEvent('pointercancel',{pointerId:Number(await basic.getAttribute('data-test-pointer')),isPrimary:true})
 await page.mouse.up()
 await aligned(profile);assert.equal(await basic.getAttribute('aria-selected'),'true')
 await page.screenshot({path:new URL('profile-lens-rest.png',out).pathname.slice(1)});await profile.screenshot({path:new URL('profile-lens-rest-detail.png',out).pathname.slice(1)})
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
    await page.waitForFunction(()=>[...document.querySelectorAll('.profile-hero,.profile-section,.hj-reveal__char')].every(e=>{const r=e.getBoundingClientRect();if(r.top>=innerHeight||r.bottom<=0)return true;const s=getComputedStyle(e);return Number(s.opacity)>.99&&!e.getAnimations().some(a=>a.playState==='running'&&a.effect?.getTiming().iterations!==Infinity)}));await page.screenshot({path:new URL(section+'-'+theme+'-'+width+'.png',out).pathname.slice(1),animations:'disabled'})
   }
  }
 }
 await page.goto(base+'/?section=marketplace');await ready();await page.setViewportSize({width:320,height:900});const market=page.getByRole('tablist',{name:'Chợ Homeji',exact:true});await market.getByRole('tab').first().focus();await market.getByRole('tab').first().press('End');await aligned(market);await market.locator('.liquid-tabs__lens').evaluate(async e=>{await Promise.all(e.getAnimations().map(a=>a.finished))});assert.ok(await market.evaluate(e=>parseFloat(getComputedStyle(e,'::before').width)>=e.scrollWidth-1),'The colored rail extends beneath every scrolled tab');assert.ok(await market.evaluate(e=>{const a=e.querySelector('[aria-selected="true"]').getBoundingClientRect(),r=e.getBoundingClientRect();return a.left>=r.left&&a.right<=r.right+1}),'Last tab is revealed inside its mobile rail');await market.screenshot({path:new URL('market-last-tab-320.png',out).pathname.slice(1)});const rail=await market.evaluate(e=>({scrollLeft:e.scrollLeft,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth,pseudoWidth:getComputedStyle(e,'::before').width,pseudoLeft:getComputedStyle(e,'::before').left}));console.log('Mobile rail geometry:',JSON.stringify(rail));
 await page.emulateMedia({reducedMotion:'reduce',forcedColors:'active'});await page.goto(base+'/?section=profile');await ready();const reduced=page.getByRole('tablist',{name:'Phần hồ sơ',exact:true});await aligned(reduced);assert.equal(await reduced.locator('.liquid-tabs__lens').evaluate(e=>getComputedStyle(e).transitionDuration),'0s');assert.equal(await reduced.locator('.liquid-tabs__lens').evaluate(e=>getComputedStyle(e).backdropFilter),'none')
 const touchContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'no-preference'})
 await touchContext.addInitScript(id=>{localStorage.setItem('homeji_access_token','theme-fixture');localStorage.setItem('homeji_user_id',id)},id)
 await touchContext.route('**/*',fixtureRoute)
 const touchPage=await touchContext.newPage();touchPage.on('pageerror',error=>errors.push(error.message))
 await touchPage.goto(base+'/?section=profile');await touchPage.getByRole('tablist',{name:'Phần hồ sơ',exact:true}).waitFor();const touchSkip=touchPage.getByRole('button',{name:'Bỏ qua',exact:true});if(await touchSkip.isVisible())await touchSkip.click({timeout:1500}).catch(async error=>{if(await touchSkip.isVisible())throw error});await touchPage.locator('.hj-intro').waitFor({state:'hidden'})
 const touchBasic=touchPage.getByRole('tab',{name:'Cơ bản',exact:true}),touchLife=touchPage.getByRole('tab',{name:'Lối sống',exact:true})
 await touchBasic.scrollIntoViewIfNeeded()
 const from=await touchBasic.boundingBox(),to=await touchLife.boundingBox()
 const session=await touchContext.newCDPSession(touchPage)
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:from.x+from.width/2,y:from.y+from.height/2}]})
 for(let step=1;step<=8;step++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:from.x+from.width/2+(to.x+to.width/2-from.x-from.width/2)*step/8,y:from.y+from.height/2}]})
 assert.equal(await touchBasic.getAttribute('aria-selected'),'true','Touch drag does not commit mid-gesture')
 await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
 await touchPage.waitForFunction(()=>document.querySelector('[role="tab"][aria-selected="true"]')?.textContent.includes('Lối sống'),null,{timeout:5000})
 await touchPage.waitForFunction(()=>!document.querySelector('.liquid-tabs').dataset.lensEngaged)
 await touchPage.screenshot({path:new URL('touch-drag-settled-390.png',out).pathname.slice(1),fullPage:true})
 await touchContext.close()
 await page.emulateMedia({forcedColors:'none',reducedMotion:'no-preference'});await page.setViewportSize({width:1280,height:800});profileRole=3
 await page.goto(base+'/admin');await ready()
 const admin=page.getByRole('tablist',{name:'Mục quản trị',exact:true});await admin.waitFor()
 const pending=admin.getByRole('tab',{name:'Tin chờ duyệt (0)',exact:true}),verification=admin.getByRole('tab',{name:'Xác minh chủ nhà (0)',exact:true}),withdraw=admin.getByRole('tab',{name:'Rút tiền (0)',exact:true})
 await pending.click();await aligned(admin);await admin.screenshot({path:new URL('admin-pending-rest.png',out).pathname.slice(1)})
 const pa=await pending.boundingBox(),ve=await verification.boundingBox()
 await page.mouse.move(pa.x+pa.width/2,pa.y+pa.height/2);await page.mouse.down();await page.mouse.move(ve.x+ve.width*.25,ve.y+ve.height/2,{steps:8})
 await admin.locator('.liquid-tabs__lens').evaluate(async e=>{await Promise.all(e.getAnimations().map(a=>a.finished))})
 await admin.screenshot({path:new URL('admin-labels-through-glass.png',out).pathname.slice(1)});await page.mouse.up();await aligned(admin)
 await withdraw.click();await aligned(admin);await admin.screenshot({path:new URL('admin-withdraw-rest.png',out).pathname.slice(1)})
 await page.screenshot({path:new URL('admin-context.png',out).pathname.slice(1)})
 for(const width of [390,320]){
  await page.setViewportSize({width,height:844})
  for(const target of [pending,verification,withdraw]){await target.click();await aligned(admin)}
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Admin tabs fit '+width)
  await admin.screenshot({path:new URL('admin-withdraw-'+width+'.png',out).pathname.slice(1)})
 }

 assert.deepEqual(errors,[]);console.log('PASS: sharp text stays above lens, long admin labels at 320/390/1280, resting lens fits rail, subtle press, drag commits on release, cancellation restores, same lens follows selection and keyboard, correct geometry at 320/390/1440, actual profile/payment/market tabs and select, forced-colors/reduced-motion')
}finally{await browser.close()}
