import {darkTextIssues} from './helpers/darkReadability.mjs'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.HOMEJI_PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.HOMEJI_TEST_BASE_URL || 'http://127.0.0.1:5518'
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('Local fixtures only');
const output = 'output/verification/dark-project'
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
  localStorage.setItem('homeji_theme','dark');localStorage.setItem('homeji_analytics_consent_v1','rejected');sessionStorage.setItem('hj-intro-seen','1')
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
let page=await context.newPage()
page.on('pageerror',e=>errors.push({url:page.url(),message:e.message}))
async function ready(){
  const skip=page.getByRole('button',{name:'Bỏ qua',exact:true});if(await skip.isVisible())await skip.click().catch(()=>{})
  await page.locator('.hj-intro').waitFor({state:'hidden',timeout:15000})
  await page.waitForTimeout(650)
}

async function scan(label) {
 await page.waitForTimeout(1200);
 const failures=await darkTextIssues(page);
 const prior=results.findIndex(r=>r.label===label);if(prior>=0)results.splice(prior,1);results.push({label,width:await page.evaluate(()=>innerWidth),failures});
 await page.screenshot({path:output+'/'+label+'.png',fullPage:true});console.log(label,failures.length,'potential contrast issues');
}
async function visit(name,path,width){if(completed.has(name+'-'+width))return;if(!page.isClosed())await page.close();page=await context.newPage();page.on('pageerror',e=>errors.push({url:page.url(),message:e.message}));await page.setViewportSize({width,height:950});if(!auth)await page.addInitScript(()=>{localStorage.removeItem('homeji_access_token');localStorage.removeItem('homeji_user_id');sessionStorage.setItem('qa-guest','1')});await page.goto(base+path,{waitUntil:'domcontentloaded'});await ready();await page.evaluate(()=>{document.documentElement.style.colorScheme='dark'});await scan(name+'-'+width);if(name==='home'&&width<600){const overlaps=await page.locator('.hub-rooms li a').evaluateAll(links=>links.some(a=>{const photo=a.querySelector('.hub-room__photo')?.getBoundingClientRect(),copy=a.querySelector('.hub-room__copy')?.getBoundingClientRect();return photo&&copy&&photo.right>copy.left+1}));assert.equal(overlaps,false,'Mobile room photos must not cover text')}}
const routes=[['home','/'],['listings','/?section=listings&view=list'],['saved','/?section=saved'],['profile','/?section=profile'],['food','/?section=marketplace&market=food'],['goods','/?section=marketplace&market=browse'],['explore-market','/?section=listings&catalog=market&view=list'],['wallet','/?section=marketplace&market=wallet&wallet=deposit'],['orders','/?section=marketplace&market=purchases'],['inventory','/?section=marketplace&market=mine'],['payments','/?section=payments'],['messages','/?section=messages'],['appointments','/?section=appointments'],['notifications','/?section=notifications'],['roommates','/?section=invitations'],['wanted','/?section=wanted'],['activities','/?section=activities'],['my-posts','/?section=myPosts'],['create-post','/posts/new'],['edit-post','/posts/22222222-2222-4222-8222-222222222221/edit'],['receipts','/receipts'],['sell','/?section=marketplace&market=sell'],['seller-orders','/?section=marketplace&market=sales'],['wallet-withdraw','/?section=marketplace&market=wallet&wallet=withdraw'],['wallet-history','/?section=marketplace&market=wallet&wallet=history'],['storefront','/?section=marketplace&market=browse&seller=seller-c'],['item-details','/?section=marketplace&market=browse&seller=seller-c&item=chair']]
const completed=new Set();
try {
 for(const width of[1440,390])for(const[name,path]of routes)await visit(name,path,width);
 role=3;for(const width of[1440,390])await visit('admin','/admin',width);role=1;
 for(const width of[1440,390]){
  await visit('search','/?section=listings&view=list',width);
  const ai=page.getByRole('button',{name:'Gợi ý AI',exact:true});if(await ai.count()){await ai.click();await page.getByRole('dialog',{name:'Gợi ý AI tìm phòng',exact:true}).waitFor();await scan('ai-search-popup-'+width)}
  await page.goto(base+'/?section=profile');await ready();await page.getByRole('button',{name:'Menu tài khoản',exact:true}).click();await scan('account-menu-'+width);
 }
 auth=false;await page.evaluate(()=>{localStorage.removeItem('homeji_access_token');localStorage.removeItem('homeji_user_id');sessionStorage.setItem('qa-guest','1')});
 for(const width of[1440,390])for(const[name,path]of[['guest','/'],['login','/login'],['register','/register'],['forgot','/forgot-password'],['privacy','/privacy'],['terms','/terms']])await visit(name,path,width);
 console.log('AUDITED',results.length,'views; runtime errors',errors.length);assert.deepEqual(errors,[]);assert.deepEqual(results.filter(r=>r.failures.length),[]);
} finally {await writeFile(output+'/contrast.json',JSON.stringify({results,errors},null,2));await browser.close()}
