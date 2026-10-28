import assert from 'node:assert/strict'
import {mkdir,writeFile} from 'node:fs/promises'
import {chromium} from 'playwright'
const base=process.env.HOMEJI_TEST_BASE_URL||'http://127.0.0.1:5595'
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('Local fixtures only')
const out='output/verification/premium-listing';await mkdir(out,{recursive:true})
const browser=await chromium.launch({channel:'chrome',headless:true})
const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'})
const id='11111111-1111-4111-8111-111111111111'
const packages=[{code:'BASIC',name:'Standard',tier:1,price:0,durationDays:0,benefits:['Tìm và lưu phòng']},{code:'PREMIUM_MONTHLY',name:'Gói Trải Nghiệm',tier:2,price:99000,durationDays:30,benefits:['Hiển thị nhãn Premium trên tin đăng','Tin đăng được ưu tiên hiển thị','Khung viền nổi bật cho tin phòng']}]
const room={id:'room-basic',title:'Phòng thoáng gần trường',type:1,price:3000000,area:22,address:'Linh Trung, Thủ Đức',latitude:10.8,longitude:106.7,thumbnailPath:null,viewCount:3,saveCount:1,isOwnerPremium:false,ownerBadge:null}
let premium=true
await context.addInitScript(id=>{localStorage.setItem('homeji_access_token','fixture');localStorage.setItem('homeji_user_id',id);sessionStorage.setItem('hj-intro-seen','1')},id)
await context.route('**/*',async route=>{
 const u=new URL(route.request().url());if(u.origin!==new URL(base).origin)return route.abort()
 if(u.pathname.startsWith('/hubs/'))return route.fulfill({status:503,body:''})
 if(!u.pathname.startsWith('/api/'))return route.continue()
 let json=[]
 if(u.pathname==='/api/profile/me')json={id,displayName:'Chủ nhà Homeji',role:2,onboardingCompleted:true,isPremium:false}
 else if(u.pathname==='/api/subscriptions/packages')json=packages
 else if(u.pathname==='/api/subscriptions/me')json={tier:1,isPremium:false}
 else if(u.pathname==='/api/wallet')json={balance:0,isActivated:true}
 else if(u.pathname==='/api/chatbot/popup-config')json={enabled:false}
 else if(u.pathname==='/api/search-interests')json={settings:{enabled:false},following:[],suggestions:[],rooms:[]}
 else if(u.pathname==='/api/rental-posts'||u.pathname==='/api/saved-posts')json=[room,{...room,id:'room-premium',title:'Phòng có gói Premium',isOwnerPremium:premium,ownerBadge:premium?'Premium':null}]
 return route.fulfill({json})
})
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message))
try{
 await page.goto(base+'/?section=payments')
 await page.locator('.pay-premium-value').waitFor()
 assert.equal(await page.locator('.pay-listing-preview.premium-listing').count(),1)
 assert.equal(await page.locator('.pay-listing-preview.premium-listing').evaluate(e=>getComputedStyle(e).animationName),'none')
 assert.ok((await page.locator('.pay-premium-value').innerText()).includes('Tìm phòng, lưu tin và so sánh vẫn dùng được miễn phí'))
 for(const theme of ['light','dark'])for(const width of [390,1440]){
  await page.setViewportSize({width,height:1000});await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme)
  assert.equal(await page.locator('.pay-premium-value').evaluate(e=>e.scrollWidth>e.clientWidth+1),false)
  await page.locator('.pay-premium-value').screenshot({path:`${out}/preview-${theme}-${width}.png`})
 }
 await page.emulateMedia({reducedMotion:'no-preference'})
 assert.equal(await page.locator('.pay-listing-preview.premium-listing').evaluate(e=>getComputedStyle(e).animationName),'premium-edge')
 await page.goto(base+'/?section=listings&view=list')
 await page.locator('.map-listings__card').first().waitFor()
 assert.equal(await page.locator('.map-listings__card').count(),2)
 assert.equal(await page.locator('.map-listings__card.premium-listing').count(),1)
 await page.emulateMedia({reducedMotion:'reduce'})
 for(const theme of ['light','dark'])for(const width of [390,1440]){
  await page.setViewportSize({width,height:1000});await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme)
  const card=page.locator('.map-listings__card.premium-listing')
  assert.equal(await card.evaluate(e=>getComputedStyle(e).borderTopColor),theme==='dark'?'rgb(194, 155, 85)':'rgb(170, 121, 43)','The real workspace skin must preserve the Premium border')
  assert.equal(await card.evaluate(e=>e.scrollWidth>e.clientWidth+1),false)
  await card.screenshot({path:`${out}/listing-${theme}-${width}.png`})
 }
 premium=false;await page.reload();await page.locator('.map-listings__card').first().waitFor()
 assert.equal(await page.locator('.map-listings__card.premium-listing').count(),0,'Expired server entitlement removes paid treatment')
 assert.deepEqual(errors,[])
 await writeFile(out+'/result.json',JSON.stringify({passed:true,fixtureData:true,errors},null,2))
 console.log('PASS Premium preview, authoritative entitlement and expiry, reduced motion, light/dark mobile/desktop')
}finally{await page.screenshot({path:out+'/final.png'}).catch(()=>{});await browser.close()}
