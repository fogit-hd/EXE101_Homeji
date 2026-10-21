import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
const {chromium}=createRequire(import.meta.url)(process.env.HOMEJI_PLAYWRIGHT_MODULE||'playwright')
const base=process.env.HOMEJI_TEST_BASE_URL||'http://127.0.0.1:5515'
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local fixture only')
const out='output/verification/content-surfaces'
await mkdir(out,{recursive:true})
await writeFile(out+'/index.html','<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/tests/fixtures/content-surfaces.tsx"></script></html>')
const receipt={id:'aaaaaaaa-1111-2222-3333-bbbbbbbbbbbb',referenceId:'r1',event:3,amount:125000,currency:'VND',referenceCode:'HOMEJI-TEST-<script>',description:'KIỂM THỬ <img src=x onerror=alert(1)> không phải giao dịch thật.',issuedAt:'2026-10-20T01:00:00Z',emailSentAt:null,emailAttempts:0,emailFailed:false,emailScheduled:true}
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const page=await browser.newPage({reducedMotion:'reduce'})
await page.addInitScript(()=>localStorage.setItem('homeji_access_token','fixture-only-token'))
await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.pathname.startsWith('/api/'))return r.fulfill({json:{items:[receipt],hasMore:false}});return u.origin===new URL(base).origin?r.continue():r.abort()})
if(process.env.HOMEJI_DISABLE_SURFACE_FIX==='1')await page.route('**/src/content-surfaces.css*',r=>r.fulfill({contentType:'application/javascript',body:''}))
const errors=[];page.on('pageerror',e=>errors.push(e.message))
page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(base))console.error(r.status(),r.url())})
function luminance(color){return color.match(/[\d.]+/g).slice(0,3).map(Number).map(x=>color.startsWith('color(')?x:x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((s,x,i)=>s+x*[.2126,.7152,.0722][i],0)}
async function contrast(selector,bg=selector){
 const c=await page.locator(selector).first().evaluate((node,bg)=>{let e=document.querySelector(bg),fill='';while(e){const c=getComputedStyle(e).backgroundColor;if(c!=='rgba(0, 0, 0, 0)'&&c!=='transparent'){fill=c;break}e=e.parentElement}return{ink:getComputedStyle(node).color,fill}},bg)
 const[a,b]=[luminance(c.ink),luminance(c.fill)].sort((a,b)=>b-a);assert.ok((a+.05)/(b+.05)>=4.5,selector+' contrast '+JSON.stringify(c))
}
async function goto(view,theme){await page.goto(base+'/'+out+'/index.html?view='+view);await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(350)}
try{
 for(const[width,height]of[[1440,1000],[390,844],[320,700]])for(const theme of['dark','light']){
  await page.setViewportSize({width,height});await goto('samples',theme);await page.getByRole('button',{name:'Lưu tin',exact:true}).waitFor()
  await contrast('.post-card-body h3','.post-card');await contrast('.post-card-price','.post-card');await contrast('.hub-market li b','.hub-market');await contrast('.hub-market li strong','.hub-market');await contrast('.guest-fixed-cta__go');await contrast('.map-chatbot__privacy p','.map-chatbot__privacy')
  assert.equal(await page.locator('.hj-nrow__main[data-glass-control]').count(),0)
  assert.equal(await page.locator('.hj-nrow__main').first().evaluate(e=>getComputedStyle(e).borderRadius),'0px')
  await page.locator('.hj-nrow__read').click();assert.equal(await page.locator('.hj-nrow.is-unread').count(),0)
  await page.getByRole('button',{name:'Lưu tin',exact:true}).click();assert.equal(await page.locator('body').getAttribute('data-saved'),'yes')
  await page.getByRole('button',{name:'Xóa nội dung phiên và tiêu chí',exact:true}).click();assert.equal(await page.locator('body').getAttribute('data-cleared'),'yes')
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Samples overflow')
  await page.screenshot({path:out+'/'+theme+'-'+width+'-surfaces.png',fullPage:true})
  await goto('journey',theme);await page.locator('.guest-journey__steps li').nth(2).waitFor()
  await contrast('.guest-journey h2','.guest-journey');await contrast('.guest-journey__steps p','.guest-journey__steps li');await contrast('.guest-journey__promises p','.guest-journey')
  assert.equal(await page.locator('.guest-journey section').count(),3)
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Journey overflow')
  await page.screenshot({path:out+'/'+theme+'-'+width+'-journey.png',fullPage:true})
  await goto('receipts',theme);await page.getByRole('button',{name:'Xem biên nhận',exact:true}).click()
  await page.getByRole('region',{name:'Chi tiết biên nhận',exact:true}).waitFor()
  assert.equal(await page.getByRole('button',{name:'Tải HTML'}).count(),0);assert.equal(await page.locator('iframe,a[download]').count(),0)
  assert.ok(await page.getByText(receipt.description,{exact:true}).isVisible());assert.equal(await page.locator('.receipts-preview img,.receipts-preview script').count(),0)
  await contrast('.receipts-preview dd','.receipts-preview');await contrast('.receipts-preview__amount','.receipts-preview')
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Receipts overflow')
  await page.screenshot({path:out+'/'+theme+'-'+width+'-receipt.png',fullPage:true})
  await page.getByRole('button',{name:'Đóng chi tiết',exact:true}).click();assert.ok(await page.getByRole('button',{name:'Xem biên nhận',exact:true}).evaluate(e=>e===document.activeElement))
  if(width===1440){await goto('map',theme);await page.locator('.map-listings__save').waitFor();await contrast('.map-listings__meta span');await contrast('.map-listings__preview-tags span');await contrast('.map-listings__move');await contrast('.map-listings__card-open','.map-listings__card');await page.locator('.map-listings__save').click();assert.equal(await page.locator('body').getAttribute('data-saved'),'yes');await page.screenshot({path:out+'/'+theme+'-map.png'})}
 }
 assert.deepEqual(errors,[]);console.log('PASS: journey, guest cards, inbox action, CTA, privacy/order samples, market text, map metadata/save, native receipts without HTML; dark/light 320/390/1440. API mocked; no email or transaction sent.')
}catch(error){console.error({url:page.url(),errors,body:(await page.locator('body').innerText()).slice(0,800)});await page.screenshot({path:out+'/failure.png',fullPage:true});throw error}finally{await browser.close()}

