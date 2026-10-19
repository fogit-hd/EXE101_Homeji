import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'

const {chromium} = createRequire(import.meta.url)(process.env.HOMEJI_PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.HOMEJI_GLASS_TEST_URL || 'http://127.0.0.1:5493'
if (!['localhost','127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local fixtures only')
const out = 'output/verification/grouped-menu'
await mkdir(out,{recursive:true})
const browser = await chromium.launch({headless:true,executablePath:process.env.HOMEJI_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const results = {checks:[],viewports:[],errors:[]}
const id = '11111111-1111-4111-8111-111111111111'
const food = [1,2,3].map(i=>({id:`food-${i}`,sellerId:'seller-fixture',sellerDisplayName:'Bếp kiểm thử',title:`Cơm nhà ${i}`,description:'Món ăn dữ liệu kiểm thử local.',price:35000,availableQuantity:10,reservedQuantity:0,unit:'phần',condition:'Mới',category:'Cơm',latitude:10.85,longitude:106.8,listingType:2,status:1,mediaUrls:['/brand/homeji-logo2.png'],address:'Thủ Đức',distanceKm:null,preparationMinutes:20,createdAt:'2026-10-19T00:00:00Z',updatedAt:'2026-10-19T00:00:00Z'}))
try {
 const context = await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'})
 await context.addInitScript(id=>{localStorage.setItem('homeji_access_token','fixture');localStorage.setItem('homeji_user_id',id);sessionStorage.setItem('hj-intro-seen','1')},id)
 await context.route('**/*',route=>{
  const u=new URL(route.request().url()),p=u.pathname
  if(u.origin!==new URL(base).origin)return route.abort()
  if(!p.startsWith('/api/')&&!p.startsWith('/hubs/'))return route.continue()
  if(p.startsWith('/hubs/'))return route.fulfill({status:503,body:''})
  let json=[]
  if(p==='/api/profile/me')json={id,displayName:'Nguyễn Văn An',role:1,onboardingCompleted:true,isPremium:false}
  if(p==='/api/search-interests')json={settings:{enabled:false,emailEnabled:false,aiEnabled:false},following:[],suggestions:[],rooms:[],notice:null}
  if(p==='/api/wallet')json={userId:id,balance:3785600,isActivated:true}
  if(p==='/api/subscriptions/me')json={tier:1,isPremium:false,packageCode:'free'}
  if(p==='/api/chatbot/popup-config')json={enabled:false}
  if(p==='/api/marketplace-posts')json=u.searchParams.get('listingType')==='1'?food.map(p=>({...p,title:'Ghế kiểm thử',listingType:1,category:'Nội thất'})):food
  return route.fulfill({json})
 })
 const page=await context.newPage()
 page.on('pageerror',e=>results.errors.push(e.message))
 for(const theme of ['light','dark']){
  await page.addInitScript(theme=>localStorage.setItem('homeji_theme',theme),theme)
  await page.goto(base+'/?section=marketplace&market=food')
  await page.locator('.marketplace-header').waitFor().catch(async e=>{await page.screenshot({path:out+'/failure.png'});console.log(JSON.stringify(results));console.log((await page.locator('body').innerText()).slice(0,4000));throw e})
  const skip=page.getByRole('button',{name:'Bỏ qua',exact:true});if(await skip.isVisible())await skip.click()
  await page.locator('.hj-intro').waitFor({state:'hidden'})
  await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme)
  await page.locator('.food-card').first().waitFor()
  for(const width of [1440,1024,390,320]){
   await page.setViewportSize({width,height:width<500?844:1000})
   await page.waitForTimeout(250)
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${theme}/${width}: horizontal overflow`)
   assert.equal(await page.locator('[data-glass-face]').count(),0)
   const adjacent = await page.locator('.marketplace-header__subtabs-lead > *').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom}}))
   for(let i=1;i<adjacent.length;i++){const a=adjacent[i-1],b=adjacent[i];assert.ok(Math.min(a.right,b.right)-Math.max(a.left,b.left)<=1||Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)<=1,'Shopping tabs and filters must not overlap')}

   const lenses=await page.locator('.liquid-tabs').evaluateAll(es=>es.map(e=>({label:Number(getComputedStyle(e.querySelector('[role="tab"]')).zIndex),surface:Number(getComputedStyle(e.querySelector('.liquid-tabs__lens')).zIndex)})))
   assert.ok(lenses.every(e=>e.label>e.surface),'Tab labels must paint above glass')
   const surfaces=await page.locator('.marketplace-header,.food-rail-desktop .liquid-surface').evaluateAll(es=>es.map(e=>({background:getComputedStyle(e).backgroundColor,filter:getComputedStyle(e).backdropFilter})))
   assert.ok(surfaces.every(e=>!e.filter.includes('url(')),'Food utility surfaces must not displace text')
   const contrast = await page.locator('.food-featured__title,.food-source-directory h2').evaluateAll(es=>{
    const rgb=s=>s.match(/[\d.]+/g).slice(0,3).map(Number)
    const luminance=rgb=>rgb.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0)
    return es.map(e=>{let p=e;while(p&&getComputedStyle(p).backgroundColor==='rgba(0, 0, 0, 0)')p=p.parentElement;const a=luminance(rgb(getComputedStyle(e).color)),b=luminance(rgb(getComputedStyle(p).backgroundColor));return(Math.max(a,b)+.05)/(Math.min(a,b)+.05)})
   })
   assert.ok(contrast.every(r=>r>=4.5),'Food headings must remain readable in both themes: '+contrast)
   await page.screenshot({path:`${out}/food-${theme}-${width}.png`,animations:'disabled'})
   results.viewports.push({theme,width,surfaces})
  }
  await page.setViewportSize({width:1440,height:1000})
  const category=page.getByRole('button',{name:'Mở danh mục',exact:true})
  await category.focus();await category.press('ArrowDown')
  const groups=page.locator('.hj-mega__group-toggle')
  await groups.first().waitFor()
  await page.waitForFunction(()=>document.activeElement?.matches('.hj-mega__group-toggle'))
  assert.equal(await groups.count(),4)
  await groups.filter({hasText:'TÀI KHOẢN'}).click()
  await page.locator('.hj-mega').getByRole('link',{name:'Hồ sơ',exact:true}).waitFor()
  await page.screenshot({path:`${out}/categories-${theme}.png`,animations:'disabled'})
  await page.keyboard.press('Escape')
  assert.equal(await category.evaluate(e=>e===document.activeElement),true)
  const account=page.getByRole('button',{name:'Menu tài khoản',exact:true})
  await account.focus();await account.press('ArrowDown')
  await page.getByRole('menuitem',{name:/Ví tiền.*3\.785\.600/}).waitFor()
  assert.equal(await page.getByRole('group',{name:'Ví & thanh toán',exact:true}).count(),1)
  assert.equal(await page.getByRole('group',{name:'Tài khoản & dịch vụ',exact:true}).count(),1)
  assert.equal(await page.getByRole('group',{name:'Hoạt động của bạn',exact:true}).count(),1)
  await page.keyboard.press('End')
  assert.match(await page.evaluate(()=>document.activeElement.textContent),/Đăng xuất/)
  await page.screenshot({path:`${out}/account-${theme}.png`,animations:'disabled'})
  await page.keyboard.press('Escape')
  assert.equal(await account.evaluate(e=>e===document.activeElement),true)
  await page.setViewportSize({width:390,height:844})
  await category.click()
  await page.screenshot({path:`${out}/categories-${theme}-mobile.png`,animations:'disabled'})
  assert.equal(await page.locator('.food-cart-fab').isVisible(),false)
  assert.equal(await page.locator('.interest-launch').isVisible(),false)
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
  await page.keyboard.press('Escape')
  const foodTab=page.getByRole('tab',{name:'Đồ ăn',exact:true})
  await foodTab.focus();await foodTab.press('ArrowRight')
  await page.waitForURL('**market=browse')
  await page.locator('.marketplace-card').first().waitFor()
  assert.equal(await page.locator('[data-glass-face]').count(),0)
  await page.screenshot({path:`${out}/goods-${theme}-mobile.png`,animations:'disabled'})
  await page.getByRole('tab',{name:'Chợ đồ',exact:true}).press('ArrowLeft')
  await page.waitForURL('**market=food')
  await page.locator('.food-card').first().waitFor()
  results.checks.push(`${theme}: grouped categories, keyboard open, disclosures, account groups, End/Escape and focus restoration`)
 }
 assert.deepEqual(results.errors,[])
 await writeFile(`${out}/results.json`,JSON.stringify(results,null,2))
 console.log(JSON.stringify(results,null,2))
} finally {await browser.close()}
