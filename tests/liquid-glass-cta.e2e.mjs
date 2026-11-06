import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {createRequire} from 'node:module'
import {mkdir} from 'node:fs/promises'
const {chromium}=createRequire(import.meta.url)(process.env.HOMEJI_PLAYWRIGHT_MODULE||'playwright')
const base=process.env.HOMEJI_GLASS_TEST_URL||'http://127.0.0.1:5498'
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('Local fixtures only')
const out=new URL('../output/verification/liquid-cta/',import.meta.url);await mkdir(out,{recursive:true})
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const page=await browser.newPage({viewport:{width:1280,height:860},reducedMotion:'reduce',colorScheme:'light'})
const errors=[];page.on('pageerror',e=>errors.push(e.message))
await page.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!==new URL(base).origin)return route.abort();if(u.pathname.startsWith('/api/'))return route.fulfill({json:u.pathname.includes('popup-config')?{enabled:false}:[]});if(u.pathname.startsWith('/hubs/'))return route.abort();return route.continue()})
try{
 await page.goto(base);await page.locator('.guest-hero__account a').waitFor();const skip=page.getByRole('button',{name:'Bỏ qua',exact:true});if(await skip.isVisible())await skip.click();await page.locator('.hj-intro').waitFor({state:'hidden'})
 await page.waitForFunction(()=>{const i=document.querySelector('.guest-hero__bg-img');return i?.complete&&i.naturalWidth>0});
 await page.locator('.guest-hero__account a').scrollIntoViewIfNeeded();
 await page.screenshot({path:new URL('real-hero-glass.png',out).pathname.slice(1),animations:'disabled'});
 await page.waitForFunction(()=>document.querySelector('.guest-hero__top-login-link')?.hasAttribute('data-glass-button-ready'));assert.equal(await page.locator('.guest-hero__top-login-link > canvas.button-glass__surface').count(),1,'The live hero action paints its glass in WebGL');
 assert.equal(await page.locator('.guest-hero__account a').getAttribute('href'),'/register')
 for(const theme of ['light','dark']){
  if(theme==='dark')await page.getByRole('switch',{name:'Chế độ tối',exact:true}).click()
  await page.waitForFunction(t=>document.documentElement.dataset.theme===t,theme)
  await page.evaluate(()=>scrollTo(0,document.querySelector('#hero').getBoundingClientRect().bottom+scrollY+200))
  await page.locator('.guest-fixed-cta.is-visible').waitFor()
  await page.locator('.guest-fixed-cta').waitFor({state:'visible'});await page.waitForFunction(()=>{const e=document.querySelector('.guest-fixed-cta');const r=e.getBoundingClientRect();return Number(getComputedStyle(e).opacity)>.99&&r.bottom<=innerHeight})
  assert.notEqual(await page.locator('.guest-fixed-cta').getAttribute('data-glass-exclude'),null)
  await page.screenshot({path:new URL('landing-'+theme+'.png',out).pathname.slice(1),animations:'disabled'})
 }
 // GuestChrome.css has hidden the fixed CTA on phones since f628970.
 await page.setViewportSize({width:390,height:844})
 await page.locator('.guest-fixed-cta').waitFor({state:'hidden'})
 await page.screenshot({path:new URL('landing-mobile.png',out).pathname.slice(1),animations:'disabled'})
 await page.setViewportSize({width:1280,height:860});await page.locator('.guest-fixed-cta__go').waitFor()
 await page.locator('.guest-fixed-cta__go').focus();await page.keyboard.press('Shift+Tab');await page.keyboard.press('Tab');assert.match(await page.locator('.guest-fixed-cta__go').evaluate(e=>getComputedStyle(e).outlineStyle),/solid/)
 await page.locator('.guest-fixed-cta__go').press('Enter');await page.waitForURL('**/register');await page.locator('input[type="password"]').first().waitFor()
 for(const route of ['/login','/register']){
  await page.goto(base+route);await page.locator('input[type="password"]').first().waitFor();
  for(const width of [1440,390,320]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route+' fits '+width);await page.screenshot({path:new URL(route.slice(1)+'-'+width+'.png',out).pathname.slice(1),animations:'disabled'});const submit=page.locator('button[type="submit"]').first();assert.equal(await submit.evaluate(e=>getComputedStyle(e).textShadow),'none');}
 }
 assert.deepEqual(errors,[]);console.log('PASS: real landing login action uses glass and the fixed CTA keeps its own fill in both themes; mobile fits; keyboard focus and registration navigation work')
}catch(e){console.log(await page.evaluate(()=>({y:scrollY,hero:document.querySelector('#hero')?.getBoundingClientRect().bottom,cta:document.querySelector('.guest-fixed-cta')?.outerHTML,overflow:getComputedStyle(document.body).overflow})));await page.screenshot({path:new URL('failure.png',out).pathname.slice(1)});throw e}finally{await browser.close()}
