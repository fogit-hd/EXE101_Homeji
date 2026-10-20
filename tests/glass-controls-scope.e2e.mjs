import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
const { chromium } = createRequire(import.meta.url)(process.env.HOMEJI_PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.HOMEJI_THEME_TEST_URL || 'http://127.0.0.1:5510'
if (!['127.0.0.1','localhost'].includes(new URL(base).hostname)) throw Error('Local fixtures only')
const out = new URL('../output/verification/glass-controls/', import.meta.url)
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


try {
 await page.goto(base+'/?section=marketplace&market=browse');await ready();
 await page.evaluate(()=>{
  const dialog=document.createElement('dialog');dialog.id='portal-glass-fixture';
  dialog.style.cssText='padding:32px;background:repeating-linear-gradient(90deg,#e5efec 0 30px,#92b7ac 30px 32px);border:0';
  dialog.innerHTML='<button type="button" class="btn" id="portal-glass-action">Đóng chi tiết phòng</button>';
  dialog.querySelector('button').onclick=()=>{document.body.dataset.portalAction='clicked';dialog.close()};
  document.body.append(dialog);dialog.showModal();
 });
 const portalAction=page.locator('#portal-glass-action');
 await page.waitForFunction(()=>document.querySelector('#portal-glass-action')?.style.getPropertyValue('--glass-lens-filter').includes('url('));
 assert.match(await portalAction.evaluate(e=>getComputedStyle(e).backdropFilter),/url\(/,'Body portal actions share the new refractive material');
 assert.equal(await portalAction.evaluate(e=>getComputedStyle(e,'::after').backdropFilter),'none');
 const portalOptical=await portalAction.screenshot({path:new URL('portal-action.png',out).pathname.slice(1)});
 await portalAction.evaluate(e=>e.style.setProperty('--glass-lens-filter','saturate(1)'));
 const portalFlat=await portalAction.screenshot();
 assert.notEqual(createHash('sha256').update(portalOptical).digest('hex'),createHash('sha256').update(portalFlat).digest('hex'),'Top-layer dialog must render actual refracted backdrop pixels');
 await portalAction.evaluate(e=>e.style.removeProperty('--glass-lens-filter'));
 await portalAction.click();assert.equal(await page.locator('body').getAttribute('data-portal-action'),'clicked');
 await page.evaluate(()=>document.querySelector('#portal-glass-fixture').remove());
 await page.goto(base+'/?section=marketplace&market=browse');await ready();
 const shop=page.getByRole('tablist',{name:'Mua sắm',exact:true});await shop.getByRole('tab',{name:'Chợ đồ',exact:true}).click();
 const card=page.locator('.marketplace-card__main').first();await card.waitFor();
 assert.equal(await card.getAttribute('data-glass-control'),null);
 assert.equal(await card.evaluate(e=>getComputedStyle(e).backdropFilter),'none');
 await page.waitForFunction(()=>document.querySelector('.hj-post-cta')?.hasAttribute('data-glass-control'));
 const category=page.locator('.hj-menu-trigger');
 await page.waitForFunction(()=>document.querySelector('.hj-menu-trigger')?.hasAttribute('data-glass-face'));
 assert.equal(await category.evaluate(e=>getComputedStyle(e,'::after').backdropFilter),'none');
 assert.match(await category.evaluate(e=>getComputedStyle(e).backdropFilter),/url\(/);
 await category.screenshot({path:new URL('category-rest.png',out).pathname.slice(1)});
 const categoryBox=await category.boundingBox();
 await page.mouse.move(categoryBox.x+categoryBox.width/2,categoryBox.y+categoryBox.height/2);
 await page.mouse.down();
 await category.evaluate(async e=>{await Promise.all(e.getAnimations().map(a=>a.finished))});
 assert.notEqual(await category.evaluate(e=>getComputedStyle(e).scale),'none');
 await category.screenshot({path:new URL('category-pressed.png',out).pathname.slice(1)});
 await page.mouse.up();
 await page.waitForFunction(()=>document.querySelector('.hj-menu-trigger')?.getAttribute('aria-expanded')==='true');
 assert.equal(await category.evaluate(e=>getComputedStyle(e,'::after').backdropFilter),'none');
 assert.match(await category.evaluate(e=>getComputedStyle(e).backdropFilter),/url\(/);
 await page.keyboard.press('Escape');
 await page.waitForFunction(()=>document.querySelector('.hj-menu-trigger')?.getAttribute('aria-expanded')==='false');
 await page.screenshot({path:new URL('initial.png',out).pathname.slice(1)}); const headerAction=page.locator('.hj-post-cta').first();
 assert.equal(await headerAction.evaluate(e=>getComputedStyle(e,'::after').backdropFilter),'none');
 assert.match(await headerAction.evaluate(e=>getComputedStyle(e).backdropFilter),/url\(/);
 assert.equal(await headerAction.evaluate(e=>getComputedStyle(e).filter),'none');
 await page.evaluate(()=>{
  const host=document.createElement('section');host.id='scope-fixture';host.style.cssText='margin:24px;padding:24px;background:repeating-linear-gradient(90deg,#245443 0 28px,#99b78a 28px 30px);display:flex;gap:16px;flex-wrap:wrap';
  host.innerHTML='<button id="scope-action" style="padding:12px 24px">Xem trên bản đồ</button><select aria-label="Chế độ xem"><option>Danh sách</option></select><article role="button" class="marketplace-card__main" style="background:white;padding:20px"><h3>Sản phẩm và mô tả phải rõ</h3><p>Nhiều chữ để đọc, không phải một tấm kính.</p><button>Mua bằng số dư</button></article><button role="button" id="scope-user"><h3>Thông tin người dùng</h3><p>Địa chỉ và thông tin hồ sơ nhiều dòng.</p></button>';
  document.querySelector('#root').append(host);
 });
 await page.waitForFunction(()=>document.querySelector('#scope-action').style.getPropertyValue('--glass-lens-filter').includes('url('));
 assert.equal(await page.locator('#scope-user').getAttribute('data-glass-control'),null);
 assert.equal(await page.locator('#scope-user').evaluate(e=>getComputedStyle(e).backdropFilter),'none');
 assert.equal(await page.locator('#scope-fixture article').getAttribute('data-glass-control'),null);
 assert.notEqual(await page.locator('#scope-fixture article button').getAttribute('data-glass-control'),null);
 assert.match(await page.locator('select[aria-label="Chế độ xem"]').evaluate(e=>getComputedStyle(e).backdropFilter),/url\(/);
 const action=page.locator('#scope-action');await action.scrollIntoViewIfNeeded();
 await page.evaluate(async()=>{await Promise.all([...document.querySelectorAll('feImage')].map(async e=>{const image=new Image();image.src=e.getAttribute('href');await image.decode()}))});
 const originalFace=await action.evaluate(e=>e.style.getPropertyValue('--glass-lens-filter')); const optical=await action.screenshot({path:new URL('action-optical.png',out).pathname.slice(1)});
 await action.evaluate(e=>e.style.setProperty('--glass-lens-filter','none','important'));
 const flat=await action.screenshot({path:new URL('action-flat.png',out).pathname.slice(1)});
 assert.notEqual(createHash('sha256').update(optical).digest('hex'),createHash('sha256').update(flat).digest('hex'),'The action actually refracts background pixels');
 await action.evaluate((e,value)=>e.style.setProperty('--glass-lens-filter',value),originalFace);
 // Uniform backing and no border/shadow isolate foreground glyph preservation.
 const isolate=await page.addStyleTag({content:'#scope-fixture{background:#245443!important}#scope-action{background:transparent!important;border:0!important;box-shadow:none!important;font-size:24px!important;padding:8px!important;color:white!important}'});
 await page.waitForFunction(()=>document.querySelector('#scope-action').style.getPropertyValue('--glass-lens-filter').includes('url('));
 const cap=await action.evaluate(e=>({face:e.hasAttribute('data-glass-face'),filter:getComputedStyle(e,'::after').backdropFilter,pointer:getComputedStyle(e,'::after').pointerEvents}));
 assert.ok(cap.face);assert.equal(cap.filter,'none');assert.equal(cap.pointer,'none');
 const refracted=await action.screenshot({path:new URL('glyphs-through-glass.png',out).pathname.slice(1)});
 const hide=await page.addStyleTag({content:'#scope-action::after{display:none!important}'});
 const glyphsFlat=await action.screenshot({path:new URL('glyphs-without-glass.png',out).pathname.slice(1)});
 assert.equal(createHash('sha256').update(refracted).digest('hex'),createHash('sha256').update(glyphsFlat).digest('hex'),'The surface reflection never resamples button glyphs');
 await hide.evaluate(e=>e.remove());await isolate.evaluate(e=>e.remove());
 // The same stationary hover/focus must settle back to a neutral lens.
 const optics=locator=>locator.evaluate(e=>{
  const style=getComputedStyle(e);
  const id=/url\(["']?#([^"')]+)/.exec(style.backdropFilter)?.[1];
  return {active:!!id?.endsWith('-active'),filter:style.backdropFilter};
 });
 const settled=locator=>locator.evaluate(e=>new Promise(resolve=>{
  const check=()=>!e.hasAttribute('data-glass-interacting')?resolve():requestAnimationFrame(check);check();
 }));
 await settled(action);assert.equal((await optics(action)).active,false);
 await action.hover();assert.equal((await optics(action)).active,true);
 await action.screenshot({path:new URL('transient-active.png',out).pathname.slice(1)});
 await settled(action);assert.equal((await optics(action)).active,false,'Stationary hover returns to neutral optics');
 await action.screenshot({path:new URL('transient-idle-hover.png',out).pathname.slice(1)});
 await action.hover();await page.mouse.down();await page.waitForTimeout(240);
 assert.equal((await optics(action)).active,true,'A held press retains rim reflections');
 await page.mouse.up();await settled(action);assert.equal((await optics(action)).active,false);
 await action.focus();await page.keyboard.down(' ');assert.equal((await optics(action)).active,true);
 await page.keyboard.up(' ');await settled(action);assert.equal((await optics(action)).active,false,'Focus alone does not retain interactive refraction');
 await action.dispatchEvent('pointerdown',{pointerId:72});await action.dispatchEvent('pointercancel',{pointerId:72});
 await settled(action);assert.equal((await optics(action)).active,false,'Canceled pointer restores idle optics');
 await action.dispatchEvent('pointerdown',{pointerId:73});await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
 assert.equal(await action.getAttribute('data-glass-interacting'),null);
 await page.evaluate(()=>document.querySelector('#scope-fixture').insertAdjacentHTML('beforeend','<details class="rental-draft-assistant"><summary>Trợ lý soạn tin · xem trước rồi xác nhận</summary><button class="ai-spectrum-button">Tạo bản gợi ý bằng Gemini</button></details><button role="listitem" class="pay-table__row"><strong>Nạp số dư Homeji</strong><small>500.000 đ</small></button>'));
 const summary=page.locator('#scope-fixture summary');await summary.waitFor();
 await page.waitForFunction(()=>document.querySelector('#scope-fixture summary')?.hasAttribute('data-glass-face'));
 assert.equal((await optics(summary)).active,false);
 const aiPanel=page.locator('#scope-fixture .rental-draft-assistant');
 assert.ok(!(await aiPanel.evaluate(e=>getComputedStyle(e).backgroundImage)).includes('conic-gradient'));
 await summary.hover();assert.equal((await optics(summary)).active,true);
 assert.match(await aiPanel.evaluate(e=>getComputedStyle(e).backgroundImage),/conic-gradient/);
 await settled(summary);await settled(aiPanel);
 assert.ok(!(await aiPanel.evaluate(e=>getComputedStyle(e).backgroundImage)).includes('conic-gradient'));
 await summary.screenshot({path:new URL('summary-idle.png',out).pathname.slice(1)});
 await aiPanel.evaluate(e=>{e.open=true;e.insertAdjacentHTML('beforeend','<input aria-label="Gợi ý thử nghiệm">')});
 const draftInput=page.getByRole('textbox',{name:'Gợi ý thử nghiệm'});
 await draftInput.focus();await page.keyboard.type('a');
 assert.notEqual(await aiPanel.getAttribute('data-glass-interacting'),null,'Typing activates AI reflections');
 await settled(aiPanel);assert.ok(!(await aiPanel.evaluate(e=>getComputedStyle(e).backgroundImage)).includes('conic-gradient'));

 assert.equal(await page.locator('#scope-fixture .pay-table__row').getAttribute('data-glass-control'),null);
 const nativeSelect=page.locator('select[aria-label="Chế độ xem"]');
 await nativeSelect.hover();assert.equal((await optics(nativeSelect)).active,true);
 await settled(nativeSelect);assert.equal((await optics(nativeSelect)).active,false);
 for(const theme of ['light','dark']){
  await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
  await page.mouse.move(0,0);
  await category.hover();assert.equal((await optics(category)).active,true);
  await settled(category);assert.equal((await optics(category)).active,false);
  assert.equal(await headerAction.evaluate(e=>getComputedStyle(e,'::after').backdropFilter),'none');
 assert.match(await headerAction.evaluate(e=>getComputedStyle(e).backdropFilter),/url\(/);
  const controlsState=await page.locator('.btn:not(:disabled),.hj-post-cta').evaluateAll(es=>es.map(e=>({text:e.textContent,filter:getComputedStyle(e).filter,backdrop:getComputedStyle(e).backdropFilter,bg:getComputedStyle(e).backgroundColor}))); for(const c of controlsState){assert.equal(c.filter,'none',c.text);assert.match(c.backdrop,/url\(/,c.text);assert.ok(!c.bg.startsWith('rgb('),c.text+' must remain translucent');} const bg=await headerAction.evaluate(e=>getComputedStyle(e).backgroundColor);
  assert.match(bg,/rgba|color\(/,'Control surface remains translucent in '+theme);
  await page.locator('#scope-fixture').screenshot({path:new URL('scope-'+theme+'.png',out).pathname.slice(1)});
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:new URL('page-'+theme+'.png',out).pathname.slice(1)});
 }
 await page.setViewportSize({width:390,height:900});await page.evaluate(()=>window.scrollTo(0,0));
 await page.screenshot({path:new URL('mobile.png',out).pathname.slice(1)});
 await page.mouse.move(0,0);await settled(category);
 const touchBox=await category.boundingBox();
 await page.touchscreen.tap(touchBox.x+touchBox.width/2,touchBox.y+touchBox.height/2);
 assert.equal((await optics(category)).active,true,'Touch activates interactive refraction');
 await settled(category);assert.equal((await optics(category)).active,false,'Touch settles to neutral');
 await page.keyboard.press('Escape');
 await page.emulateMedia({reducedMotion:'reduce'});
 await category.focus();await page.keyboard.down('Enter');assert.equal((await optics(category)).active,true);
 await page.keyboard.up('Enter');await settled(category);assert.equal((await optics(category)).active,false);
 await page.keyboard.press('Escape');
 await page.emulateMedia({reducedMotion:'no-preference'});

 // The report-status picker is explicitly flat; other admin controls retain optics.
 profileRole=3;
 await page.setViewportSize({width:1440,height:1000});
 await page.goto(base+'/admin');await ready();
 await page.getByRole('tab',{name:/^Báo cáo/}).click();
 const status=page.getByRole('combobox',{name:'Trạng thái báo cáo'});
 await status.waitFor();
 for(const theme of ['light','dark']){
  await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
  assert.equal(await status.getAttribute('data-glass-control'),null);
  assert.equal(await status.getAttribute('data-glass-face'),null);
  assert.equal(await status.evaluate(e=>getComputedStyle(e).backdropFilter),'none');
  assert.equal(await status.evaluate(e=>getComputedStyle(e,'::after').backdropFilter),'none');
  await status.screenshot({path:new URL('report-status-'+theme+'.png',out).pathname.slice(1)});
 }
 await status.click();
 await page.getByRole('option',{name:'Tất cả',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('[aria-label="Trạng thái báo cáo"]')?.textContent.includes('Tất cả'));
 assert.match(await page.locator('.liquid-tabs__lens').first().evaluate(e=>getComputedStyle(e).backdropFilter),/url\(/);
 assert.deepEqual(errors,[]);console.log('PASS idle/motion/held-press/cancel/keyboard/blur/touch optics, neutral AI rims, light/dark; glass scope: actions/selects/icons light+dark; real backdrop refraction; product and user-information blocks excluded; nested buy action retains glass');
}finally{await browser.close()}
