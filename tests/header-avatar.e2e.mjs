import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile, readFile } from 'node:fs/promises'

const {chromium} = createRequire(import.meta.url)(process.env.HOMEJI_PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.HOMEJI_GLASS_TEST_URL || 'http://127.0.0.1:5493'
if (!['localhost','127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local fixtures only')
const out = 'output/verification/header-avatar'
await mkdir(out,{recursive:true})
const browser = await chromium.launch({headless:true,executablePath:process.env.HOMEJI_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const results = {checks:[],viewports:[],errors:[]}
const id = '11111111-1111-4111-8111-111111111111'
const food = [1,2,3].map(i=>({id:`food-${i}`,sellerId:'seller-fixture',sellerDisplayName:'Bếp kiểm thử',title:`Cơm nhà ${i}`,description:'Món ăn dữ liệu kiểm thử local.',price:35000,availableQuantity:10,reservedQuantity:0,unit:'phần',condition:'Mới',category:'Cơm',latitude:10.85,longitude:106.8,listingType:2,status:1,mediaUrls:['/brand/homeji-logo2.png'],address:'Thủ Đức',distanceKm:null,preparationMinutes:20,createdAt:'2026-10-19T00:00:00Z',updatedAt:'2026-10-19T00:00:00Z'}))
let avatar=null,uploads=0
try {
 const context = await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'})
 await context.addInitScript(id=>{localStorage.setItem('homeji_access_token','fixture');localStorage.setItem('homeji_user_id',id);sessionStorage.setItem('hj-intro-seen','1')},id)
 await context.route('**/*',route=>{
  const u=new URL(route.request().url()),p=u.pathname
  if(u.origin!==new URL(base).origin)return route.abort()
  if(!p.startsWith('/api/')&&!p.startsWith('/hubs/'))return route.continue()
  if(p.startsWith('/hubs/'))return route.fulfill({status:503,body:''})
  let json=[]
  if(p==='/api/profile/me'){
   if(route.request().method()==='PUT')avatar=route.request().postDataJSON().avatarPath
   json={id,displayName:'Nguyễn Văn An',role:1,onboardingCompleted:true,isPremium:false,avatarPath:avatar}
  }
  if(p==='/api/upload/image')json=[{url:'/brand/homeji-logo2.png?avatar='+ ++uploads}]

  if(p==='/api/search-interests')json={settings:{enabled:false,emailEnabled:false,aiEnabled:false},following:[],suggestions:[],rooms:[],notice:null}
  if(p==='/api/wallet')json={userId:id,balance:3785600,isActivated:true}
  if(p==='/api/subscriptions/me')json={tier:1,isPremium:false,packageCode:'free'}
  if(p==='/api/chatbot/popup-config')json={enabled:false}
  if(p==='/api/marketplace-posts')json=u.searchParams.get('listingType')==='1'?food.map(p=>({...p,title:'Ghế kiểm thử',listingType:1,category:'Nội thất'})):food
  return route.fulfill({json})
 })
 const page=await context.newPage()
 page.on('pageerror',e=>results.errors.push(e.message))

 await page.goto(base+'/?section=profile')
 await page.getByRole('textbox',{name:'Họ tên',exact:true}).waitFor()
 await page.locator('.hj-intro').waitFor({state:'hidden'})
 const mark=page.locator('.hj-profile__mark')
 assert.match(await mark.innerText(),/NA/)
 const upload=async()=>{
  await page.locator('.profile-hero__avatar-wrap input[type="file"]').setInputFiles({name:'avatar.png',mimeType:'image/png',buffer:await readFile('public/brand/homeji-logo2.png')})
  await page.getByText('Đã cập nhật ảnh đại diện.',{exact:true}).waitFor()
 }
 await upload()
 await page.screenshot({path:`${out}/${process.env.GLASS_PHASE||'after'}-upload.png`})
 assert.equal(await mark.locator('img').count(),1,'Header must render the uploaded profile avatar without reloading')
 await mark.locator('img').evaluate(img=>img.decode())
 assert.match(await mark.locator('img').getAttribute('src'),/avatar=1/)
 await page.setViewportSize({width:390,height:844})
 await page.screenshot({path:`${out}/mobile.png`})
 await page.reload()
 await page.locator('.hj-intro').waitFor({state:'hidden'})
 await mark.locator('img').waitFor()
 assert.match(await mark.locator('img').getAttribute('src'),/avatar=1/)
 avatar='/missing-avatar.png'
 await page.reload();await page.locator('.hj-intro').waitFor({state:'hidden'})
 await page.waitForFunction(()=>document.querySelector('.hj-profile__mark')?.textContent==='NA')
 assert.equal(await mark.locator('img').count(),0,'Failed avatar falls back to initials')
 await upload()
 await page.waitForFunction(()=>document.querySelector('.hj-profile__mark img')?.getAttribute('src')?.includes('avatar=2'))
 assert.deepEqual(results.errors,[])
 console.log('PASS: avatar upload updates header immediately, survives reload, falls back on image error, and recovers on a new upload')
} finally {await browser.close()}
