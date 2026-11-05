// All endpoints are intercepted; no real email or admin mutation occurs.
import assert from 'node:assert/strict'
import {mkdir} from 'node:fs/promises'
import {chromium} from 'playwright'
const base=process.env.HOMEJI_TEST_BASE_URL||'http://127.0.0.1:5541'
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local fixtures only')
const out='output/verification/admin-reporting';await mkdir(out,{recursive:true})
const browser=await chromium.launch({headless:true,channel:'msedge'})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1050},reducedMotion:'reduce'})
 const user='11111111-1111-4111-8111-111111111111',stamp='2026-11-01T07:00:00Z'
 await page.addInitScript(user=>{localStorage.setItem('homeji_access_token','fixture');localStorage.setItem('homeji_user_id',user);sessionStorage.setItem('hj-intro-seen','1');localStorage.setItem('homeji_analytics_consent_v1','rejected')},user)
 const accounts=[{userId:'account-a',displayName:'Nguyễn Minh An',email:'an@example.invalid',role:1,registeredAt:stamp,emailConfirmed:true,profileCompleted:true,isPremium:true,premiumExpiresAt:'2026-12-01T07:00:00Z'}, {userId:'account-b',displayName:'Chưa cập nhật hồ sơ',email:'new@example.invalid',role:null,registeredAt:stamp,emailConfirmed:false,profileCompleted:false,isPremium:false,premiumExpiresAt:null}]
 const members=[{id:'member-a',userId:'account-a',displayName:'Nguyễn Minh An',email:'an@example.invalid',packageName:'Premium 30 ngày',packageCode:'premium-30',startedAt:stamp,expiresAt:'2026-12-01T07:00:00Z',registeredAt:stamp,state:'active',paymentId:'payment-a',amount:100000,paymentStatus:1,paymentMethod:3}]
 const exports=[],writes=[],errors=[];let failOnce=true
 page.on('pageerror',error=>{errors.push(error.message);console.log('Fixture page error',error.message)})
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url()),path=url.pathname
  if(path.startsWith('/hubs/'))return route.fulfill({status:503,body:''})
  if(!path.startsWith('/api/'))return url.origin===base?route.continue():route.abort()
  if(path==='/api/profile/me')return route.fulfill({json:{id:user,displayName:'Quản trị Homeji',role:3,onboardingCompleted:true,isPremium:false}})
  if(path==='/api/subscriptions/me')return route.fulfill({json:{tier:1,isPremium:false}})
  if(path==='/api/admin/analytics/product')return route.fulfill({json:{generatedAt:stamp,periodDays:30,kpis:{totalUsers:2,newUsers:2,activeListings:0,newListings:0,medianMonthlyPrice:0,averagePricePerSquareMeter:0,searches:0,listingViews:0,saves:0,viewingRequests:0,saveToViewRate:0,viewingRequestToSaveRate:0},trend:[],areas:[]}})
  if(path==='/api/admin/analytics/traffic')return route.fulfill({json:{generatedAt:stamp,periodDays:30,trackingStartedAt:null,pageViews:0,sessions:0,activeSessions:0,trend:[],topPages:[]}})
  if(path==='/api/admin/reporting/accounts'){const keyword=url.searchParams.get('keyword')??'';const rows=accounts.filter(row=>(row.displayName+' '+row.email).includes(keyword));return route.fulfill({json:{items:rows,totalCount:rows.length,page:1,pageSize:25}})}
  if(path==='/api/admin/reporting/members')return route.fulfill({json:{items:members,totalCount:1,page:1,pageSize:25}})
  if(path==='/api/admin/reporting/exports'){
   if(route.request().method()==='POST'){
    const body=route.request().postDataJSON();writes.push(body);let report=exports.find(row=>row.requestId===body.requestId)
    if(!report){report={id:'report-a',requestId:body.requestId,fileName:'Homeji-bao-cao-fixture.xlsx',periodDays:body.days,createdAt:stamp,recipient:'duongduy12314@gmail.com',emailStatus:'queued',emailAcceptedAt:null,attempts:0,lastErrorCode:null};exports.unshift(report)}
    await new Promise(resolve=>setTimeout(resolve,150))
    if(failOnce){failOnce=false;return route.fulfill({status:503,json:{detail:'Chưa xác định kết quả tạo báo cáo. Thử lại cùng mã yêu cầu.'}})}
    return route.fulfill({json:report})
   }
   return route.fulfill({json:exports})
  }
  if(path.endsWith('/download'))return route.fulfill({contentType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',body:Buffer.from('fixture transport only')})
  if(path==='/api/search-interests')return route.fulfill({json:{settings:{enabled:false},suggestions:[],following:[],rooms:[]}})
  return route.fulfill({json:[]})
 })
 await page.goto(base+'/admin');await page.locator('.admin-nav').waitFor();const skip=page.getByRole('button',{name:'Bỏ qua',exact:true});if(await skip.isVisible())await skip.click()
 const nav=page.getByRole('navigation',{name:'Mục quản trị'})
 async function open(name){const toggle=nav.locator('.admin-nav__toggle');if(await toggle.isVisible()&&await toggle.getAttribute('aria-expanded')==='false')await toggle.click();await nav.getByRole('button',{name,exact:true}).click()}
 assert.equal(await nav.locator('.admin-nav__icon').count(),0)
 await open('Tài khoản & thành viên');await page.getByText('an@example.invalid',{exact:true}).waitFor();await page.getByText('new@example.invalid',{exact:true}).waitFor();await page.screenshot({path:out+'/accounts-desktop.png'})
 await page.getByRole('button',{name:'Gói Premium',exact:true}).click();await page.getByText('Premium 30 ngày',{exact:true}).waitFor();await page.getByText('Chờ thanh toán',{exact:true}).waitFor();await page.locator('.admin-state').filter({hasText:'Đang có hiệu lực'}).waitFor()
 await open('Báo cáo Excel');await page.getByText('Chưa có báo cáo Excel nào được tạo.',{exact:true}).waitFor();assert.equal(writes.length,0,'Navigation does not send email')
 const create=page.getByRole('button',{name:'Tạo báo cáo & gửi email',exact:true})
 await create.evaluate(button=>{button.click();button.click()});await page.getByText(/Chưa xác định kết quả tạo báo cáo/).waitFor();assert.equal(writes.length,1)
 await create.click();await page.getByText('Homeji-bao-cao-fixture.xlsx',{exact:true}).waitFor();assert.equal(writes.length,2);assert.equal(writes[0].requestId,writes[1].requestId);assert.equal(exports.length,1)
 const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'Tải Excel Homeji-bao-cao-fixture.xlsx',exact:true}).click();assert.equal((await downloaded).suggestedFilename(),'Homeji-bao-cao-fixture.xlsx');assert.equal(writes.length,2,'Download must not resend email')
 exports[0].emailStatus='accepted';exports[0].emailAcceptedAt=stamp;await page.getByRole('button',{name:'Cập nhật trạng thái',exact:true}).click();await page.getByText('Nhà cung cấp đã tiếp nhận',{exact:true}).waitFor()
 await page.screenshot({path:out+'/exports-desktop.png'})
 for(const width of [390,320]){await page.setViewportSize({width,height:1000});await open('Báo cáo Excel');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:out+`/exports-mobile-${width}.png`});await open('Tài khoản & thành viên');await page.getByText('an@example.invalid',{exact:true}).waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:out+`/accounts-mobile-${width}.png`})}
 assert.deepEqual(errors,[]);console.log('PASS text navigation, account/member lists, separate payment status, no email on navigation/download, idempotent retry, double-click guard, download and mobile layout')
}finally{await browser.close()}
