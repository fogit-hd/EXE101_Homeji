import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'

const {chromium} = createRequire(import.meta.url)(process.env.HOMEJI_PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.HOMEJI_GLASS_TEST_URL || 'http://127.0.0.1:5493'
if (!['localhost','127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local fixtures only')
const out = 'output/verification/cart-accessibility'
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

 await page.setViewportSize({width:390,height:844})
 await page.goto(base+'/?section=marketplace&market=food')
 await page.locator('.food-card').first().waitFor()
 await page.locator('.hj-intro').waitFor({state:'hidden'})
 const trigger=page.getByRole('button',{name:'Mở giỏ hàng, 0 món',exact:true})
 await trigger.click()
 const cart=page.getByRole('dialog',{name:'Giỏ hàng',exact:true})
 await cart.waitFor()
 await page.screenshot({path:`${out}/${process.env.GLASS_PHASE||'after'}-cart.png`})
 const duplicates=await page.locator('[id]').evaluateAll(es=>es.map(e=>e.id).filter((id,i,all)=>all.indexOf(id)!==i))
 console.log(JSON.stringify({focused:await page.evaluate(()=>document.activeElement?.className),duplicateIds:duplicates}))
 assert.equal(await cart.evaluate(e=>e.contains(document.activeElement)),true,'Opening cart must move focus into the dialog')
 assert.deepEqual(duplicates,[],'Desktop and mobile copies must have unique label IDs')
 for(let i=0;i<10;i++){await page.keyboard.press('Tab');assert.equal(await cart.evaluate(e=>e.contains(document.activeElement)),true,'Tab must stay in the open cart')}
 await page.keyboard.press('Escape');await cart.waitFor({state:'hidden'})
 assert.equal(await trigger.evaluate(e=>e===document.activeElement),true,'Escape restores cart trigger focus')
 await page.locator('.food-card__cart-btn').first().click()
 const filledTrigger=page.getByRole('button',{name:'Mở giỏ hàng, 1 món',exact:true})
 await filledTrigger.click()
 await cart.getByRole('textbox',{name:'Ghi chú cho bếp',exact:true}).fill('Giữ ghi chú sau khi quay lại')
 await cart.locator('.food-rail__checkout').click()
 const confirmation=page.locator('.food-checkout-confirmation')
 await confirmation.waitFor()
 await page.screenshot({path:`${out}/checkout-confirmation.png`,animations:'disabled'})
 assert.equal(await confirmation.evaluate(e=>e.matches(':modal')),true,'Checkout confirmation must be above the native cart')
 await page.keyboard.press('Escape')
 await confirmation.waitFor({state:'hidden'})
 assert.equal(await cart.isVisible(),true,'Escape closes only the top confirmation')
 assert.equal(await cart.getByRole('textbox',{name:'Ghi chú cho bếp',exact:true}).inputValue(),'Giữ ghi chú sau khi quay lại')
 assert.equal(await cart.locator('.food-rail__checkout').evaluate(e=>e===document.activeElement),true)
 await page.keyboard.press('Escape');await cart.waitFor({state:'hidden'})
 assert.equal(await filledTrigger.evaluate(e=>e===document.activeElement),true)
 for(const theme of ['light','dark']){
  await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme)
  for(const width of [320,390]){
   await page.setViewportSize({width,height:844})
   await filledTrigger.click();await cart.waitFor()
   const box=await cart.boundingBox()
   assert.ok(box.x>=0&&box.x+box.width<=width+1,'Cart fits viewport')
   const cartTop=await cart.locator('.food-rail__cart').evaluate(e=>e.getBoundingClientRect().top)
   const locationTop=await cart.locator('.food-rail__location').evaluate(e=>e.getBoundingClientRect().top)
   assert.ok(cartTop<locationTop,'Cart contents appear before utility sections')
   assert.equal(await page.evaluate(()=>document.body.style.overflow),'hidden')
   await page.screenshot({path:`${out}/cart-${theme}-${width}.png`,animations:'disabled'})
   await page.keyboard.press('Escape');await cart.waitFor({state:'hidden'})
   assert.equal(await page.evaluate(()=>document.body.style.overflow),'')
   assert.equal(await filledTrigger.evaluate(e=>e===document.activeElement),true)
   results.viewports.push({theme,width,box})
  }
 }
 assert.deepEqual(results.errors,[])
 await writeFile(`${out}/results.json`,JSON.stringify(results,null,2))
 console.log('PASS: cart focus, unique IDs, Tab containment, Escape and focus restoration')
} finally {await browser.close()}
