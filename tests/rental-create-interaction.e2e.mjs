import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
const { chromium } = createRequire(import.meta.url)(process.env.HOMEJI_PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.HOMEJI_THEME_TEST_URL || 'http://127.0.0.1:5510'
if (!['127.0.0.1','localhost'].includes(new URL(base).hostname)) throw Error('Local fixtures only')
const out = new URL('../output/verification/rental-create/', import.meta.url)
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'light', hasTouch: true, reducedMotion: 'no-preference' })
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


let draftCalls=[]
await context.route('**/api/rental-posts/drafts',route=>{
 draftCalls.push(route.request().postDataJSON());
 return draftCalls.length===1?route.fulfill({status:503,json:{detail:'Không thể tạo tin nháp thử nghiệm'}}):route.fulfill({json:{id:'44444444-4444-4444-8444-444444444444'}})
})
try {
 await page.goto(base+'/posts/new');await ready();
 const roommate=page.locator('.type-card').filter({hasText:'Tìm bạn ở ghép'});
 const transfer=page.locator('.type-card').filter({hasText:'Pass phòng'});
 await roommate.waitFor();
 await transfer.click();assert.match(await transfer.getAttribute('class'),/selected/);
 await page.mouse.move(0,0);
 const appearance=await page.locator('.type-card').evaluateAll(es=>es.map(e=>({selected:e.classList.contains('selected'),border:getComputedStyle(e).borderColor,background:getComputedStyle(e).backgroundColor,pointer:getComputedStyle(e).pointerEvents})));
 console.log('Type selection appearance',JSON.stringify(appearance));
 await page.screenshot({path:new URL('selection.png',out).pathname.slice(1)});
 assert.notEqual(appearance[0].border,appearance[1].border,'Selected type must be visibly different after clicking');
 assert.equal(await transfer.getAttribute('aria-pressed'),'true');
 for(const [theme,width] of [['dark',390],['light',1440]]){
  await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);await page.setViewportSize({width,height:1000});
  await roommate.focus();await page.keyboard.press('Enter');assert.equal(await roommate.getAttribute('aria-pressed'),'true');
  await transfer.click();await page.mouse.move(0,0);
  const borders=await page.locator('.type-card').evaluateAll(es=>es.map(e=>getComputedStyle(e).borderColor));
  assert.notEqual(borders[0],borders[1]);
  await page.screenshot({path:new URL('selection-'+theme+'-'+width+'.png',out).pathname.slice(1)});
 }

 assert.equal(await page.getByRole('button',{name:'Tiếp tục',exact:true}).count(),1,'Only one Continue action is shown after choosing a post type');
 await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
 await page.getByText('Không thể tạo tin nháp thử nghiệm',{exact:true}).waitFor();
 assert.deepEqual(draftCalls,[{type:3}]);
 await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
 await page.waitForURL('**/posts/44444444-4444-4444-8444-444444444444/edit');
 assert.deepEqual(draftCalls,[{type:3},{type:3}]);
 await page.goto(base+'/posts/new');await ready();await roommate.focus();await page.keyboard.press('Enter');
 assert.equal(await roommate.getAttribute('aria-pressed'),'true');
 assert.equal(await transfer.getAttribute('aria-pressed'),'false');
 console.log('PASS rental type: pointer/keyboard visible selection, failure feedback, retry and selected type draft navigation');
}finally{await browser.close()}
