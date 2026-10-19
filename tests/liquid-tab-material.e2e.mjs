import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
const { chromium } = createRequire(import.meta.url)(process.env.HOMEJI_PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.HOMEJI_THEME_TEST_URL || 'http://127.0.0.1:5510'
if (!['127.0.0.1','localhost'].includes(new URL(base).hostname)) throw Error('Local fixtures only')
const out = new URL('../output/verification/liquid-tabs-material/', import.meta.url)
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
  if(url.pathname==='/api/marketplace-posts')return route.fulfill({json:[{id:'22222222-2222-4222-8222-222222222222',sellerId:'33333333-3333-4333-8333-333333333333',sellerDisplayName:'Homeji',status:1,title:'Ghế làm việc — giữ nguyên ảnh và chữ',description:'Đồ dùng',price:150000,condition:'Đã sử dụng',category:'Nội thất',address:'Thủ Đức',latitude:10.84,longitude:106.8,mediaUrls:['/brand/homeji-logo2.png'],listingType:1,availableQuantity:1,reservedQuantity:0,unit:'món',createdAt:'2026-10-19T00:00:00Z'}]})
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

try {
 await page.goto(base+'/?section=marketplace&market=browse'); await ready();
 const list=page.getByRole('tablist',{name:'Chợ Homeji',exact:true});
 const lens=list.locator('.liquid-tabs__lens');
 await lens.waitFor();
 await page.waitForFunction(()=>[...document.querySelectorAll('.liquid-tabs__lens')].some(e=>e.style.getPropertyValue('--glass-lens-filter').includes('url(')));
 await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.querySelectorAll('feImage')].map(async e=>{const i=new Image();i.src=e.getAttribute('href');await i.decode()}))});
 await lens.evaluate(async e=>{await Promise.all(e.getAnimations().map(a=>a.finished))});
 const state=await lens.evaluate(e=>({filter:getComputedStyle(e).backdropFilter,z:getComputedStyle(e).zIndex,buttonZ:getComputedStyle(e.parentElement.querySelector('[role="tab"]')).zIndex}));
 assert.match(state.filter,/url\(/);assert.ok(+state.z>+state.buttonZ);
 await list.screenshot({path:new URL('rest.png',out).pathname.slice(1)});
 const active=list.getByRole('tab',{name:'Mua sắm',exact:true}); const rect=await active.boundingBox();
 await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);await page.mouse.down();
 await lens.evaluate(async e=>{await Promise.all(e.getAnimations().map(a=>a.finished))});
 assert.match(await lens.evaluate(e=>getComputedStyle(e).backdropFilter),/-active/);
 assert.match(await lens.evaluate(e=>getComputedStyle(e,'::before').backgroundImage),/linear-gradient/,'Interaction adds a separate spectrum reflection');
 assert.equal(await lens.evaluate(e=>{const id=/url\(["']?#([^"')]+)/.exec(getComputedStyle(e).backdropFilter)?.[1];return !!id?.endsWith('-active')}),true,'Dragging uses interactive refraction rim reflections');

 await page.mouse.move(rect.x+rect.width*.85,rect.y+rect.height/2,{steps:5});
 const crop=await list.screenshot({path:new URL('drag.png',out).pathname.slice(1)});
 const filters=await page.locator('feDisplacementMap').evaluateAll(es=>es.map(e=>e.getAttribute('scale')));
 await page.locator('feDisplacementMap').evaluateAll(es=>es.forEach(e=>e.setAttribute('scale','0')));
 const flat=await list.screenshot();
 assert.notEqual(createHash('sha256').update(crop).digest('hex'),createHash('sha256').update(flat).digest('hex'),'Actual rail and label pixels bend under the lens');
 await page.locator('feDisplacementMap').evaluateAll((es,values)=>es.forEach((e,i)=>e.setAttribute('scale',values[i])),filters);
 await page.mouse.up(); console.log('stage: drag complete');
 await list.getByRole('tab',{name:'Mua sắm',exact:true}).focus(); await page.keyboard.press('End'); console.log('stage: End',await listState()); await page.waitForFunction(()=>[...document.querySelectorAll('[role=tab][aria-selected=true]')].some(e=>e.textContent.includes('Số dư'))); 
 await page.waitForFunction(()=>![...document.querySelectorAll('.liquid-tabs')].some(e=>e.dataset.lensEngaged));
 await lens.evaluate(async e=>{await Promise.all(e.getAnimations().map(a=>a.finished))});
 console.log('stage: settle complete');
 await page.waitForFunction(()=>!document.querySelector('.liquid-tabs__lens')?.hasAttribute('data-glass-interacting'));
 assert.equal(await lens.evaluate(e=>{const id=/url\(["']?#([^"')]+)/.exec(getComputedStyle(e).backdropFilter)?.[1];return !!id?.endsWith('-active')}),false,'Settled tab lens has no interactive refraction split');
 const gaps=await list.evaluate(e=>{const r=e.getBoundingClientRect(),l=e.querySelector('.liquid-tabs__lens').getBoundingClientRect(),a=e.querySelector('[aria-selected="true"]').getBoundingClientRect();return {right:r.right-l.right,dx:l.x-a.x,dy:l.y-a.y}});
 assert.ok(Math.abs(gaps.dx)<1&&Math.abs(gaps.dy)<1&&gaps.right>=2&&gaps.right<=5,JSON.stringify(gaps));
 for(const width of [390,1440]){ console.log('stage: width',width);
  await page.setViewportSize({width,height:1000});
  await list.getByRole('tab',{name:'Mua sắm',exact:true}).click();
  await page.waitForFunction(()=>![...document.querySelectorAll('.liquid-tabs')].some(e=>e.dataset.lensEngaged));
  await lens.evaluate(async e=>{await Promise.all(e.getAnimations().map(a=>a.finished))});
  await page.screenshot({path:new URL('page-'+width+'.png',out).pathname.slice(1)});
  for(const theme of ['dark','light']){
   await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
   await list.screenshot({path:new URL(theme+'-'+width+'.png',out).pathname.slice(1)});
  }
 }
 await page.getByRole('tablist',{name:'Mua sắm',exact:true}).getByRole('tab',{name:'Chợ đồ',exact:true}).click(); await page.locator('.marketplace-card__main').first().waitFor(); assert.equal(await page.locator('.marketplace-card__main').first().evaluate(e=>getComputedStyle(e).backdropFilter),'none');

 const filterCount=await page.locator('.liquid-glass-defs filter').count();
 await page.evaluate(()=>{
  const stage=document.createElement('section');stage.id='optical-proof';stage.className='liquid-tabs';
  stage.style.cssText='position:fixed;left:40px;top:160px;width:640px;height:160px;z-index:999999;background:repeating-linear-gradient(90deg,#245443 0 39px,#9aba9b 39px 40px);border-radius:24px;overflow:hidden;color:white';
  stage.innerHTML='<span style="position:absolute;left:20px;top:65px;font:24px sans-serif;white-space:nowrap">HOMEJI · Phòng mới · Số dư Homeji</span><span class="liquid-tabs__lens" data-glass-interacting style="left:0;top:36px;width:180px;height:84px"></span>';
  document.querySelector('#root').append(stage);
 });
 const proof=page.locator('#optical-proof .liquid-tabs__lens');
 await page.waitForFunction(()=>document.querySelector('#optical-proof .liquid-tabs__lens')?.style.getPropertyValue('--glass-lens-filter'));
 const physical=await proof.evaluate(e=>{
  const id=/url\(["']?#([^"')]+)/.exec(getComputedStyle(e).backdropFilter)?.[1];const f=document.getElementById(id);
  return {units:f.getAttribute('primitiveUnits'),scale:+f.querySelector('feDisplacementMap').getAttribute('scale'),height:e.offsetHeight,warps:f.querySelectorAll('feDisplacementMap').length,composites:f.querySelectorAll('feComposite,feColorMatrix').length};
 });
 assert.equal(physical.units,'userSpaceOnUse');assert.equal(physical.warps,1);assert.equal(physical.composites,0);
 assert.ok(physical.scale/physical.height<.1,'Typography uses a bounded pixel displacement');
 for(const left of [15,130,255]){
  await proof.evaluate((e,left)=>e.style.left=left+'px',left);
  await page.locator('#optical-proof').screenshot({path:new URL('text-crossing-'+left+'.png',out).pathname.slice(1)});
 }
 await page.locator('#optical-proof').evaluate(e=>e.remove());
 await page.waitForFunction(count=>document.querySelectorAll('.liquid-glass-defs filter').length===count,filterCount);
 assert.deepEqual(errors,[]);console.log('PASS actual tab lens: SVG refraction, rim reflections, active depth, alignment, mobile/desktop, light/dark, clear cards',JSON.stringify({state,gaps}));
}catch(error){console.log(await listState());await page.screenshot({path:new URL('failure.png',out).pathname.slice(1)});throw error}finally{await browser.close()}
async function listState(){return page.locator('.liquid-tabs').evaluateAll(es=>es.map(e=>({label:e.getAttribute('aria-label'),selected:e.querySelector('[aria-selected=true]')?.textContent,engaged:e.dataset.lensEngaged}))) }
