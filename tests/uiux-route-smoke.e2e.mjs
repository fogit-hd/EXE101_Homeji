import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'

const {chromium} = createRequire(import.meta.url)(process.env.HOMEJI_PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.HOMEJI_GLASS_TEST_URL || 'http://127.0.0.1:5493'
if (!['localhost','127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local fixtures only')
const out = 'output/verification/uiux-followup'
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
  for(const section of ['listings&view=list','saved','marketplace&market=food','marketplace&market=browse','profile','payments','wanted','activities','notifications']){
   await page.setViewportSize({width:1440,height:1000})
   await page.goto(base+'/?section='+section)
   await page.locator('.hj-header').waitFor()
   await page.locator('.hj-intro').waitFor({state:'hidden'})
   await page.waitForTimeout(500)
   assert.ok(!(await page.locator('body').innerText()).includes('Unexpected Application Error'),'Route must render: '+section)
   for(const width of [1440,320]){
    await page.setViewportSize({width,height:width===320?740:1000})
    await page.waitForTimeout(150)
    const overflow=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth}))
    results.viewports.push({theme,section,width,overflow})
    await page.screenshot({path:`${out}/${theme}-${section.split('&')[0]}-${section.includes('browse')?'goods-':''}${width}.png`,animations:'disabled'})
   }
  }
 }
 await writeFile(`${out}/results.json`,JSON.stringify(results,null,2))
 assert.ok(results.viewports.every(r=>r.overflow.document<=r.width),'Routes must fit their viewports')
 assert.deepEqual(results.errors,[])
 console.log(JSON.stringify({screens:results.viewports.length,overflow:results.viewports.filter(r=>r.overflow.document>r.width),errors:results.errors},null,2))
} finally {await browser.close()}
