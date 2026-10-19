import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.HOMEJI_PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.HOMEJI_TEST_BASE_URL || 'http://127.0.0.1:5589'
const output = process.env.HOMEJI_UI_OUTPUT || 'output/verification/product-ui'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true, executablePath: process.env.HOMEJI_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const user = '11111111-1111-4111-8111-111111111111'
const stamp = '2026-10-19T00:00:00Z'
const rentals = [1, 2, 3].map(i => ({ id: `22222222-2222-4222-8222-22222222222${i}`, ownerId: user, ownerRole: 2, type: 1, status: 3,
  title: `Phòng sáng thoáng tại Thủ Đức ${i}`, description: 'Phòng có cửa sổ, bếp riêng. Gần trường học và tuyến xe buýt.', price: 2500000 + i * 500000,
  deposit: 3000000, area: 22 + i * 3, address: 'Linh Trung, Thủ Đức', latitude: 10.85, longitude: 106.8, maxOccupants: 2, availableSlots: 2,
  amenities: ['KITCHEN','WIFI'], media: [], createdAt: stamp, updatedAt: stamp, viewCount: 24, saveCount: 3, isOwnerPremium: false }))
const food = [['rice','seller-a','Cơm gà xối mỡ',40000],['bread','seller-a','Bánh mì chả cá nóng',22000],['soup','seller-b','Bún bò Huế',35000]].map(([id,sellerId,title,price]) => ({ id,sellerId,title,price,sellerDisplayName:sellerId==='seller-a'?'Bếp nhà Khánh Linh':'Bếp cô An',listingType:2,status:1,description:'Món ăn nấu trong ngày, nhận tại bếp.',category:'Cơm nhà',address:'Linh Trung, Thủ Đức',latitude:10.85,longitude:106.8,mediaUrls:[],availableQuantity:5,reservedQuantity:0,preparationMinutes:20,unit:'phần',createdAt:stamp }))
const goods = [['chair','seller-c','Ghế làm việc còn tốt'],['lamp','seller-c','Đèn bàn LED'],['fan','seller-d','Quạt đứng']].map(([id,sellerId,title])=>({...food[0],id,sellerId,sellerDisplayName:'Cửa hàng Minh',title,unit:'món',description:'Đồ đã qua sử dụng, còn hoạt động tốt. Hẹn nhận hàng trực tiếp với người bán.',listingType:1,price:150000,condition:'Đã sử dụng',category:'Nội thất'}))
const results = [], errors = [], writes = []
function contrast(a,b){
 const luminance=color=>{const c=color.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});return c[0]*.2126+c[1]*.7152+c[2]*.0722}
 const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)
}
let auth = true, role = 1, failWallet = false, failMarket = false, failOrder = false
const orderRequests = []
const context = await browser.newContext({ viewport:{width:1440,height:1000},reducedMotion:'reduce' })
await context.addInitScript(({user}) => {
  if (!sessionStorage.getItem('qa-guest')) { localStorage.setItem('homeji_access_token','ui-only-fixture');localStorage.setItem('homeji_user_id',user) }
  sessionStorage.setItem('hj-intro-seen','1')
}, {user})
await context.route('**/*', async route => {
  const request=route.request(), u=new URL(request.url())
  if (u.origin!==new URL(base).origin) return route.abort()
  if(!u.pathname.startsWith('/api/')&&!u.pathname.startsWith('/hubs/')) return route.continue()
  if(request.method()!=='GET') writes.push(u.pathname)
  if(u.pathname.startsWith('/hubs/')) return route.fulfill({status:503,body:''})
  let json=[]
  if(u.pathname==='/api/profile/me') {
    if(!auth) return route.fulfill({status:401,json:{message:'Guest fixture'}})
    json={id:user,displayName:'Nguyễn Minh Anh',email:'ui-fixture@example.test',phoneNumber:'0900000000',role,onboardingCompleted:true,isPremium:false,landlordVerificationStatus:0}
  } else if(u.pathname==='/api/rental-posts'||u.pathname==='/api/saved-posts'||u.pathname==='/api/rental-posts/mine') json=rentals
  else if(u.pathname.startsWith('/api/rental-posts/')) json=rentals[0]
  else if(u.pathname==='/api/marketplace-posts') {
    if(failMarket)return route.fulfill({status:503,json:{message:'Tạm thời chưa tải được danh sách món.'}})
    json=[...food,...goods].filter(post=>(!u.searchParams.has('sellerId')||post.sellerId===u.searchParams.get('sellerId'))&&(!u.searchParams.has('listingType')||post.listingType===Number(u.searchParams.get('listingType'))))
  } else if(/^\/api\/marketplace-posts\/[^/]+\/orders$/.test(u.pathname)&&request.method()==='POST') {
    orderRequests.push({path:u.pathname,body:request.postDataJSON()})
    if(failOrder)return route.fulfill({status:400,json:{detail:'Số dư không đủ để mua sản phẩm này.'}})
    json={id:'order-fixture',marketplacePostId:'chair',buyerId:user,sellerId:'seller-c',quantity:1,agreedPrice:150000,unitPrice:150000,status:1,pickupAt:stamp,createdAt:stamp,updatedAt:stamp,postTitle:'Ghế làm việc còn tốt',platformFeeAmount:0,platformFeeRate:0,sellerNetAmount:150000}
  } else if(u.pathname.startsWith('/api/marketplace-posts/')&&!u.pathname.endsWith('/mine')) json=[...food,...goods].find(post=>post.id===u.pathname.split('/').at(-1))??null
  else if(u.pathname.startsWith('/api/conversations/marketplace-posts/')) json={id:'conversation-fixture',otherUserId:'seller-c',otherUserDisplayName:'Cửa hàng Minh'}
  else if(u.pathname==='/api/wallet') {
    if(failWallet)return route.fulfill({status:503,json:{message:'Chưa thể tải số dư ví.'}})
    json={userId:user,balance:350000,totalDeposited:600000,totalSpent:250000,totalEarned:0,isActivated:true,minimumTopUp:10000,maximumTopUp:10000000,minimumWithdrawalReserve:20000,updatedAt:stamp}
  } else if(u.pathname==='/api/subscriptions/packages') json=[{code:'free',name:'Miễn phí',tier:1,price:0,durationMonths:0,description:'Khám phá Homeji'},{code:'premium-monthly',name:'Premium',tier:2,price:49000,durationMonths:1,description:'Tiện ích tìm phòng'}]
  else if(u.pathname==='/api/subscriptions/me') json={tier:1,isPremium:false,packageCode:'free'}
  else if(u.pathname==='/api/chatbot/popup-config') json={enabled:false}
  else if(u.pathname==='/api/search-interests') json={settings:{enabled:false,emailEnabled:false,aiEnabled:false},following:[],suggestions:[],rooms:[]}
  else if(u.pathname==='/api/admin/analytics/product')return route.fulfill({status:503,json:{message:'Dữ liệu tổng quan chưa sẵn sàng.'}})
  return route.fulfill({json})
})
const page=await context.newPage()
page.on('pageerror',e=>errors.push({url:page.url(),message:e.message}))
async function ready(){
  const skip=page.getByRole('button',{name:'Bỏ qua',exact:true});if(await skip.isVisible())await skip.click().catch(()=>{})
  await page.locator('.hj-intro').waitFor({state:'hidden',timeout:15000})
  await page.waitForTimeout(650)
}
async function inspect(name, path, theme, width){
 await page.setViewportSize({width,height:950})
 await page.goto(base+path,{waitUntil:'domcontentloaded'}); await ready()
 await page.evaluate(theme=>{document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme;localStorage.setItem('homeji_theme',theme);window.scrollTo(0,0)},theme)
 await page.waitForTimeout(200)
 const metrics=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,
   text:document.body.innerText.slice(0,90),errorBoundary:!!document.querySelector('.error-boundary'),
   fields:[...document.querySelectorAll('.form-input,.auth-cinema__field input')].filter(e=>e.getBoundingClientRect().width>0).map(e=>({font:parseFloat(getComputedStyle(e).fontSize),height:e.getBoundingClientRect().height})),
   primary:[...document.querySelectorAll('.btn-primary,.auth-cinema__submit,.pay-btn--primary,.food-rail__checkout')].filter(e=>!e.disabled&&e.getBoundingClientRect().width>0).slice(0,5).map(e=>({background:getComputedStyle(e).backgroundColor,color:getComputedStyle(e).color}))}))
 results.push({name,path,theme,width,...metrics})
 assert.ok(metrics.scroll<=metrics.width+1,`${name} ${theme} ${width}: page overflow ${metrics.scroll}/${metrics.width}`)
 assert.equal(metrics.errorBoundary,false,`${name}: rendered error boundary`)
 for(const f of metrics.fields)assert.ok(f.font>=16,`${name}: input text below 16px`)
 for(const p of metrics.primary)assert.ok(contrast(p.background,p.color)>=4.5,`${name} ${theme}: primary action contrast below 4.5:1`)
 await page.screenshot({path:`${output}/${name}-${theme}-${width}.png`,fullPage:false})
 console.log(`Checked ${name} ${theme} ${width}`)
}
const routes=[['home','/'],['listings','/?section=listings&view=list'],['saved','/?section=saved'],['profile','/?section=profile'],['food','/?section=marketplace&market=food'],['goods','/?section=marketplace&market=browse'],['explore-market','/?section=listings&catalog=market&view=list'],['wallet','/?section=marketplace&market=wallet&wallet=deposit'],['orders','/?section=marketplace&market=purchases'],['inventory','/?section=marketplace&market=mine'],['payments','/?section=payments'],['messages','/?section=messages'],['appointments','/?section=appointments'],['notifications','/?section=notifications'],['roommates','/?section=invitations'],['wanted','/?section=wanted'],['activities','/?section=activities'],['my-posts','/?section=myPosts'],['create-post','/posts/new'],['edit-post','/posts/22222222-2222-4222-8222-222222222221/edit'],['receipts','/receipts'],['sell','/?section=marketplace&market=sell'],['seller-orders','/?section=marketplace&market=sales'],['wallet-withdraw','/?section=marketplace&market=wallet&wallet=withdraw'],['wallet-history','/?section=marketplace&market=wallet&wallet=history'],['storefront','/?section=marketplace&market=browse&seller=seller-c'],['item-details','/?section=marketplace&market=browse&seller=seller-c&item=chair']]
try{
 if(!process.env.HOMEJI_UI_FLOWS_ONLY) for(const theme of ['light','dark']) for(const width of [1440,390]) for(const [name,path] of routes)await inspect(name,path,theme,width)
 role=3
 if(!process.env.HOMEJI_UI_FLOWS_ONLY) for(const theme of ['light','dark'])for(const width of [1440,390])await inspect('admin','/admin',theme,width)
 role=1
 await page.setViewportSize({width:1440,height:1000})
 await page.goto(base+'/?section=listings&catalog=market&view=list');await ready()
 const sellerGroup=page.locator('.seller-catalog__shop').filter({hasText:'Cửa hàng Minh'}).first()
 assert.equal(await sellerGroup.locator('li').count(),2,'Same seller products are one shop in Explore')
 await sellerGroup.getByRole('link',{name:/Xem cửa hàng/}).click()
 await page.locator('.seller-store-header').waitFor()
 await page.locator('.marketplace-card').first().waitFor()
 assert.equal(new URL(page.url()).searchParams.get('seller'),'seller-c')
 assert.equal(await page.locator('.marketplace-card').count(),2)
 await page.screenshot({path:output+'/storefront-desktop.png',fullPage:true})
 await page.locator('.marketplace-card__main').first().click()
 const detail=page.getByRole('dialog',{name:'Ghế làm việc còn tốt',exact:true})
 await detail.waitFor()
 assert.equal(new URL(page.url()).searchParams.get('item'),'chair')
 await page.reload();await detail.waitFor()
 await detail.getByRole('button',{name:'Mua bằng số dư',exact:true}).click()
 assert.equal(orderRequests.length,0,'Confirmation stage does not charge the wallet')
 await page.screenshot({path:output+'/item-confirmation.png',fullPage:false})
 failOrder=true
 await detail.getByRole('button',{name:/Xác nhận mua ·/}).click()
 await detail.getByRole('alert').filter({hasText:'Số dư không đủ'}).waitFor()
 assert.equal(orderRequests.length,1)
 failOrder=false
 await detail.getByRole('button',{name:/Xác nhận mua ·/}).click()
 await page.locator('.marketplace-purchase-receipt').waitFor()
 await page.getByRole('button',{name:'Xem đơn',exact:true}).click()
 await page.waitForURL('**market=purchases**')
 assert.equal(orderRequests.length,2)
 assert.equal(orderRequests[1].body.quantity,1)
 await page.goto(base+'/?section=marketplace&market=browse&seller=seller-c&item=lamp');await ready()
 const lamp=page.getByRole('dialog',{name:'Đèn bàn LED',exact:true});await lamp.waitFor()
 await lamp.getByRole('button',{name:'Nhắn người bán',exact:true}).click()
 await page.waitForURL('**conversation=conversation-fixture**')
 await page.setViewportSize({width:390,height:844}); await page.goto(base+'/?section=marketplace&market=food');await ready()
 await page.locator('.food-seller').first().waitFor()
 assert.equal(await page.locator('.food-seller').count(),2)
 const menu=page.locator('.food-seller').first();assert.equal(await menu.locator('.food-card').count(),2)
 await menu.locator('.food-card__cart-btn').first().click();await menu.locator('.food-card__cart-btn').nth(1).click()
 assert.equal(await menu.getByRole('button',{name:'Trong giỏ',exact:true}).count(),2)
 for(const button of await menu.locator('.food-qty__btn,.food-card__cart-btn').all()){const box=await button.boundingBox();assert.ok(box.height>=44)}
 await page.getByRole('button',{name:/Mở giỏ hàng/}).click()
 await page.locator('.food-cart-sheet__panel').waitFor({state:'visible'})
 await page.getByRole('button',{name:/Đặt món · nhận tại bếp/}).last().click()
 await page.getByRole('heading',{name:'Xác nhận đặt món'}).waitFor()
 await page.getByRole('button',{name:'Quay lại giỏ',exact:true}).click()
 await page.goto(base+'/?section=profile');await ready()
 assert.equal(await page.locator('.interest-launch').count(),0,'Room recommendations must not cover profile inputs')
 await page.getByRole('button',{name:'Menu tài khoản',exact:true}).click()
 await page.getByRole('menuitem',{name:'Phòng mới phù hợp',exact:true}).click()
 await page.getByRole('dialog').filter({hasText:'Phòng mới phù hợp với bạn'}).waitFor({state:'visible'})
 await page.getByRole('button',{name:'Đóng gợi ý phòng mới',exact:true}).click()
 failMarket=true;await inspect('food-error','/?section=marketplace&market=food','dark',390);failMarket=false
 failWallet=true;await inspect('wallet-error','/?section=marketplace&market=wallet&wallet=deposit','light',390);failWallet=false
 auth=false;await page.evaluate(()=>{localStorage.removeItem('homeji_access_token');localStorage.removeItem('homeji_user_id');sessionStorage.setItem('qa-guest','1')})
 if(!process.env.HOMEJI_UI_FLOWS_ONLY) for(const theme of ['light','dark'])for(const width of [1440,390])for(const [name,path] of [['guest','/'],['login','/login'],['register','/register'],['forgot','/forgot-password'],['privacy','/privacy'],['terms','/terms']])await inspect(name,path,theme,width)
 assert.deepEqual(errors,[])
 console.log(`PASS ${results.length} responsive/theme views; cart controls and confirmation preserved; API fixture traffic only`)
}finally{
 await page.screenshot({path:output+'/flow-final.png',fullPage:false}).catch(()=>{})
 await writeFile(`${output}/results.json`,JSON.stringify({base,fixtureData:true,results,errors,writes},null,2));await browser.close()
}
