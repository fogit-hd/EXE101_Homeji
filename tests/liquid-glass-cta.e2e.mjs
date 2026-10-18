import assert from 'node:assert/strict'
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
async function glass(selector){const styles=await page.locator(selector).first().evaluate(e=>{const s=getComputedStyle(e);return {image:s.backgroundImage,filter:s.backdropFilter,radius:s.borderRadius,color:s.color}});assert.match(styles.image,/radial-gradient/,selector);assert.notEqual(styles.filter,'none',selector);return styles}
try{
 await page.goto(base);await page.locator('.guest-hero__primary').waitFor();const skip=page.getByRole('button',{name:'Bỏ qua',exact:true});if(await skip.isVisible())await skip.click();await page.locator('.hj-intro').waitFor({state:'hidden'})
 await glass('.guest-hero__primary');await glass('.guest-hero__top-login-link');assert.equal(await page.locator('.guest-hero__primary').getAttribute('href'),'/register')
 for(const theme of ['light','dark']){
  if(theme==='dark')await page.getByRole('switch',{name:'Chế độ tối',exact:true}).click()
  await page.waitForFunction(t=>document.documentElement.dataset.theme===t,theme)
  await page.locator('#mission').scrollIntoViewIfNeeded()
  await page.waitForFunction(()=>document.querySelector('.guest-fixed-cta')?.getAttribute('aria-hidden')==='false')
  await page.locator('.guest-fixed-cta').waitFor({state:'visible'});await page.waitForFunction(()=>{const e=document.querySelector('.guest-fixed-cta');const r=e.getBoundingClientRect();return Number(getComputedStyle(e).opacity)>.99&&r.bottom<=innerHeight})
  await glass('.guest-fixed-cta > span');await glass('.guest-fixed-cta__go')
  await page.screenshot({path:new URL('landing-'+theme+'.png',out).pathname.slice(1),animations:'disabled'})
 }
 await page.setViewportSize({width:390,height:844})
 await page.waitForFunction(()=>{const r=document.querySelector('.guest-fixed-cta__go').getBoundingClientRect();return r.x>=0&&r.right<=innerWidth})
 assert.equal(await page.locator('.guest-fixed-cta > span').isVisible(),false)
 await page.keyboard.press('Tab');await page.locator('.guest-fixed-cta__go').focus();assert.match(await page.locator('.guest-fixed-cta__go').evaluate(e=>getComputedStyle(e).outlineStyle),/solid/)
 await page.screenshot({path:new URL('landing-mobile.png',out).pathname.slice(1),animations:'disabled'})
 await page.locator('.guest-fixed-cta__go').press('Enter');await page.waitForURL('**/register');await page.locator('input[type="password"]').first().waitFor()
 assert.deepEqual(errors,[]);console.log('PASS: real landing CTA links and label use glass in both themes; mobile fits; keyboard focus and registration navigation work')
}catch(e){console.log(await page.evaluate(()=>({y:scrollY,hero:document.querySelector('#hero')?.getBoundingClientRect().bottom,cta:document.querySelector('.guest-fixed-cta')?.outerHTML,overflow:getComputedStyle(document.body).overflow})));await page.screenshot({path:new URL('failure.png',out).pathname.slice(1)});throw e}finally{await browser.close()}
