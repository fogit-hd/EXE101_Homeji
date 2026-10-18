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
// Dark admin intentionally uses flat tabs; lens geometry applies to the other surfaces.
async function aligned(list){await page.waitForFunction(label=>{const root=[...document.querySelectorAll('.liquid-tabs')].find(e=>e.getAttribute('aria-label')===label);const active=root?.querySelector('[aria-selected="true"]');const lens=root?.querySelector('.liquid-tabs__lens');if(!active||!lens||root.dataset.lensEngaged)return false;if(getComputedStyle(lens).display==='none')return document.documentElement.dataset.theme==='dark'&&root.closest('.admin-workspace')!==null;const a=active.getBoundingClientRect(),l=lens.getBoundingClientRect(),box=root.getBoundingClientRect();return Math.abs(a.x-l.x)<2&&Math.abs(a.width-l.width)<2&&Math.abs(l.height-a.height)<2&&l.top>=box.top-1&&l.bottom<=box.bottom+1},await list.getAttribute('aria-label'))}
try {
 await page.goto(base+'/?section=marketplace&market=browse'); await ready();
 const actual=page.locator('.marketplace-card__main').first();await actual.waitFor();assert.equal(await actual.getAttribute('data-glass-face'),null);assert.equal(await actual.evaluate(e=>getComputedStyle(e).backdropFilter),'none');await actual.hover();assert.equal(await actual.evaluate(e=>getComputedStyle(e).backdropFilter),'none');
 await page.screenshot({path:new URL('marketplace-clear-cards.png',out).pathname.slice(1)});
 await page.evaluate(()=>{
  const host=document.createElement('section');host.id='glass-scope-regression';host.style.cssText='padding:20px;display:grid;gap:20px;grid-template-columns:repeat(3,260px);background:#f2f7fa';
  for(const cls of ['map-explore-card','map-listing-card','marketplace-card__main']){
   const card=document.createElement('article');card.className=cls;card.setAttribute('role','button');card.tabIndex=0;card.style.cssText='display:block;width:260px;border-radius:16px;padding:16px;background:white';
   card.innerHTML='<div style="height:120px;background:linear-gradient(45deg,#b3cebf,#4e786b)"></div><h3>Phòng sáng, ảnh và chữ rõ ràng</h3><p>6.000.000 đ · Thủ Đức</p><button type="button">Lưu tin</button>';
   host.append(card);
  }
  document.querySelector('#root').append(host);
 });
 await page.waitForFunction(()=>document.querySelector('#glass-scope-regression button').hasAttribute('data-glass-face'));
 const cards=await page.locator('#glass-scope-regression > article').evaluateAll(es=>es.map(e=>({cls:e.className,face:e.dataset.glassFace||null,filter:getComputedStyle(e).backdropFilter,radius:getComputedStyle(e).borderRadius,childFace:e.querySelector('button').dataset.glassFace})));
 const issues=[];
 for(const c of cards){if(c.face||c.filter!=='none')issues.push(c.cls+' must not refract its content');if(!c.childFace)issues.push(c.cls+' save action must retain glass');}
 const tabs=page.getByRole('tablist',{name:'Chợ Homeji',exact:true});await tabs.getByRole('tab',{name:'Số dư',exact:true}).click();await aligned(tabs);await tabs.locator('.liquid-tabs__lens').evaluate(async e=>{await Promise.all(e.getAnimations().map(a=>a.finished))});
 const gaps=await tabs.evaluate(e=>{const l=e.querySelector('.liquid-tabs__lens').getBoundingClientRect(),r=e.getBoundingClientRect(),s=getComputedStyle(e,'::before');return{right:r.right-l.right,top:l.top-r.top-parseFloat(s.top),bottom:r.bottom-parseFloat(s.bottom)-l.bottom}});
 if(Math.abs(gaps.right-gaps.top)>1||Math.abs(gaps.bottom-gaps.top)>1)issues.push('Last lens has uneven rail insets: '+JSON.stringify(gaps));
 await page.locator('#glass-scope-regression').screenshot({path:new URL('cards-scope.png',out).pathname.slice(1)});
 await tabs.screenshot({path:new URL('last-tab-inset.png',out).pathname.slice(1)});
 for(const width of [320,390]){await page.setViewportSize({width,height:1000});await aligned(tabs);await tabs.locator('.liquid-tabs__lens').evaluate(async e=>{await Promise.all(e.getAnimations().map(a=>a.finished))});const gap=await tabs.evaluate(e=>{const l=e.querySelector('.liquid-tabs__lens').getBoundingClientRect(),r=e.getBoundingClientRect();return r.right-l.right});assert.ok(gap>=2&&gap<=5,'Right end stays inset on mobile at '+width+': '+gap)}
 assert.deepEqual(issues,[]);assert.deepEqual(errors,[]);console.log('PASS: content cards keep clear media/text; nested actions retain glass; last lens has equal top/right/bottom insets',JSON.stringify(gaps));
}finally{await browser.close()}
