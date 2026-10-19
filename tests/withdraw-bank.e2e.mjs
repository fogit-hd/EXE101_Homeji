import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'

const {chromium} = createRequire(import.meta.url)(process.env.HOMEJI_PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.HOMEJI_GLASS_TEST_URL || 'http://127.0.0.1:5493'
if (!['localhost','127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local fixtures only')
const out = 'output/verification/withdraw-bank'
await mkdir(out,{recursive:true})
const browser = await chromium.launch({headless:true,executablePath:process.env.HOMEJI_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const results = {checks:[],viewports:[],errors:[]}
const id = '11111111-1111-4111-8111-111111111111'
const food = [1,2,3].map(i=>({id:`food-${i}`,sellerId:'seller-fixture',sellerDisplayName:'Bếp kiểm thử',title:`Cơm nhà ${i}`,description:'Món ăn dữ liệu kiểm thử local.',price:35000,availableQuantity:10,reservedQuantity:0,unit:'phần',condition:'Mới',category:'Cơm',latitude:10.85,longitude:106.8,listingType:2,status:1,mediaUrls:['/brand/homeji-logo2.png'],address:'Thủ Đức',distanceKm:null,preparationMinutes:20,createdAt:'2026-10-19T00:00:00Z',updatedAt:'2026-10-19T00:00:00Z'}))
const requests=[]
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
  if(p==='/api/wallet/withdrawals'&&route.request().method()==='POST'){requests.push(route.request().postDataJSON());return route.fulfill({status:503,json:{message:'Fixture: thử lại sau'}})}
  if(p==='/api/wallet')json={userId:id,balance:3785600,isActivated:true}
  if(p==='/api/subscriptions/me')json={tier:1,isPremium:false,packageCode:'free'}
  if(p==='/api/chatbot/popup-config')json={enabled:false}
  if(p==='/api/marketplace-posts')json=u.searchParams.get('listingType')==='1'?food.map(p=>({...p,title:'Ghế kiểm thử',listingType:1,category:'Nội thất'})):food
  return route.fulfill({json})
 })
 const page=await context.newPage()
 page.on('pageerror',e=>results.errors.push(e.message))

 await page.goto(base+'/?section=marketplace&market=wallet&wallet=withdraw')
 const bank=page.getByRole('combobox',{name:'Tên ngân hàng',exact:true})
 await bank.waitFor();await page.locator('.hj-intro').waitFor({state:'hidden'})
 await bank.click();assert.ok(await page.getByRole('option').count()>25)
 await bank.fill('vietcom');await bank.press('ArrowDown');await bank.press('Enter')
 assert.equal(await bank.inputValue(),'Vietcombank')
 await bank.fill('Ngân hàng riêng');await bank.press('Escape');assert.equal(await bank.inputValue(),'Ngân hàng riêng')
 await page.getByRole('textbox',{name:'Số tài khoản',exact:true}).fill('0123456789')
 await page.getByRole('textbox',{name:'Tên chủ tài khoản',exact:true}).fill('nguyen van an')
 await page.getByRole('textbox',{name:/Số tiền muốn rút/}).fill('100000')
 const submit=page.getByRole('button',{name:'Gửi yêu cầu rút tiền',exact:true})
 await submit.click();await page.locator('.wallet-status[role="alert"]').waitFor()
 assert.equal(requests.length,1);assert.equal(requests[0].bankName,'Ngân hàng riêng');assert.equal(requests[0].amount,100000)
 await bank.fill('techcom');await bank.press('ArrowDown');await bank.press('Enter');assert.equal(await bank.inputValue(),'Techcombank')
 for(const theme of ['light','dark'])for(const width of [1440,390,320]){
  await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme)
  await page.setViewportSize({width,height:1000});await bank.scrollIntoViewIfNeeded()
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
  const style=await submit.evaluate(e=>({background:getComputedStyle(e).backgroundColor,color:getComputedStyle(e).color}))
  assert.equal(style.background,theme==='light'?'rgb(23, 92, 87)':'rgb(128, 217, 219)')
  await page.screenshot({path:`${out}/withdraw-${theme}-${width}.png`,fullPage:true,animations:'disabled'})
 }
 await bank.fill('');await bank.click();await page.screenshot({path:`${out}/bank-list.png`,animations:'disabled'})
 assert.deepEqual(results.errors,[])
 console.log('PASS: bank selection, keyboard search, custom names, unchanged withdrawal payload, primary CTA, light/dark 320/390/1440; all writes intercepted')
} finally {await browser.close()}
