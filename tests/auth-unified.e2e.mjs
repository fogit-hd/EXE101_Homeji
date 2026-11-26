import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
const base = process.env.HOMEJI_AUTH_TEST_URL || 'http://localhost:5192'
if (!['localhost','127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local fixtures only')
const out = 'output/verification/auth-unified'
await mkdir(out,{recursive:true})
const browser = await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const context = await browser.newContext({viewport:{width:1440,height:960},reducedMotion:'no-preference'})
const requests=[],errors=[],checks=[]
let registerMode='error', googleMode='error', loginMode='error'
const gsi = `window.google={accounts:{id:{initialize(o){window.__authGoogle=o.callback},renderButton(e,o){e.innerHTML='';e.style.width=(o.width||380)+'px';e.style.maxWidth='100%';const b=document.createElement('button');b.type='button';b.textContent=o.text==='signup_with'?'Đăng ký bằng Google':'Đăng nhập bằng Google';b.style.cssText='width:100%;height:40px;border:1px solid #dadce0;border-radius:20px;background:white;color:#1f1f1f';b.onclick=()=>window.__authGoogle({credential:'fixture-google'});e.append(b)},cancel(){}}}};`
await context.addInitScript(()=>{localStorage.setItem('homeji_theme','light');sessionStorage.setItem('homeji_intro_seen','1')})
await context.route('**/*',async route=>{
 const request=route.request(),url=new URL(request.url())
 if(url.hostname==='accounts.google.com'&&url.pathname==='/gsi/client')return route.fulfill({contentType:'application/javascript',body:gsi})
 if(url.origin!==new URL(base).origin)return route.abort()
 if(!url.pathname.startsWith('/api/')&&!url.pathname.startsWith('/hubs/'))return route.continue()
 const path=url.pathname
 if(request.method()==='POST')requests.push({path,body:request.postDataJSON()})
 if(path==='/api/account/register'){
  await new Promise(resolve=>setTimeout(resolve,400))
  return route.fulfill(registerMode==='error'?{status:400,json:{detail:'Fixture: thử lại sau.'}}:{json:{emailConfirmationRequired:true,confirmationMethod:registerMode==='otp'?'otp':'link',email:'fixture@example.com',message:'Vui lòng xác nhận email trước khi đăng nhập.'}})
 }
 if(path==='/api/account/login')return route.fulfill(loginMode==='error'?{status:401,json:{detail:'Email hoặc mật khẩu không đúng.'}}:{json:{accessToken:'fixture',userId:'fixture',email:'fixture@example.com'}})
 if(path==='/api/profile/me')return route.fulfill({json:{id:'fixture',displayName:'Người kiểm thử',role:1,onboardingCompleted:true}})
 if(path==='/api/account/google/id-token')return route.fulfill(googleMode==='error'?{status:401,json:{detail:'Fixture: Google chưa xác thực.'}}:{json:{accessToken:'fixture',userId:'fixture',email:'fixture@example.com'}})
 if(path==='/api/account/request-password-otp')return route.fulfill({json:{message:'Mã OTP đã được gửi.'}})
 if(path==='/api/account/reset-password-otp')return route.fulfill({json:{message:'Đã đổi mật khẩu.'}})
 return route.fulfill({json:path.includes('popup-config')?{enabled:false}:[]})
})
const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message))
const section=()=>new URL(page.url()).searchParams.get('section')
async function ready(name){await page.locator(`.auth-unified__section[data-auth-section="${name}"]:not([inert])`).waitFor();await page.waitForTimeout(400)}
async function sameShowcase(){assert.equal(await page.locator('.homie-scene, .homie-scene canvas').count(),0,'Mascot must not render');assert.ok(await page.evaluate(()=>window.__authGallery===document.querySelector('.auth-home-gallery')),'Gallery must remain mounted')}
try{
 await page.goto(base+'/login?ref=friend#form');await page.waitForURL('**/auth?ref=friend&section=login#form');await ready('login');await page.evaluate(()=>{window.__authGallery=document.querySelector('.auth-home-gallery')})
 assert.equal(await page.locator('.auth-character').count(),0,'The old registration robot must not render')
 await page.getByLabel('Email',{exact:true}).fill('fixture@example.com');
 await page.getByLabel('Mật khẩu',{exact:true}).fill('Fixture-pass-123');
 await page.getByRole('button',{name:'Hiện mật khẩu',exact:true}).click();assert.equal(await page.getByLabel('Mật khẩu',{exact:true}).getAttribute('type'),'text')
 await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await page.getByRole('alert').filter({hasText:'Email hoặc mật khẩu không đúng.'}).waitFor();assert.equal(await page.getByLabel('Email',{exact:true}).inputValue(),'fixture@example.com')
 checks.push('legacy login redirect preserves query/hash; login payload, error, password reveal without mascot')
 await page.getByRole('button',{name:'Đăng ký',exact:true}).click();await ready('register');assert.equal(section(),'register');await sameShowcase();assert.equal(await page.getByLabel('Email',{exact:true}).inputValue(),'fixture@example.com')
 await page.goBack();await ready('login');await sameShowcase();await page.goForward();await ready('register');await sameShowcase()
 await page.getByLabel('Họ tên',{exact:true}).fill('Nguyễn Văn An');await page.getByLabel('Mật khẩu',{exact:true}).fill('Fixture-pass-123');await page.getByLabel('Xác nhận mật khẩu',{exact:true}).fill('different-123')
 const before=requests.filter(r=>r.path.endsWith('/register')).length
 await page.getByRole('button',{name:'Đăng ký',exact:true}).click();await page.getByRole('alert').filter({hasText:'Mật khẩu xác nhận chưa khớp.'}).waitFor();assert.equal(requests.filter(r=>r.path.endsWith('/register')).length,before)
 await page.getByLabel('Xác nhận mật khẩu',{exact:true}).fill('Fixture-pass-123');await page.getByRole('button',{name:'Đăng ký',exact:true}).click();await page.getByRole('alert').filter({hasText:'Fixture: thử lại sau.'}).waitFor();assert.equal(await page.getByLabel('Mật khẩu',{exact:true}).inputValue(),'Fixture-pass-123')
 registerMode='link';await page.getByRole('button',{name:'Đăng ký',exact:true}).click();await page.getByRole('status').filter({hasText:'Vui lòng xác nhận email'}).waitFor();await sameShowcase()
 const registration=requests.filter(r=>r.path.endsWith('/register')).at(-1).body;assert.equal(registration.displayName,'Nguyễn Văn An');assert.equal(Object.hasOwn(registration,'confirmPassword'),false);assert.ok(registration.redirectTo.endsWith('/auth/callback'))
 checks.push('register validation, API failure/retry, preserved payload, success; Back/Forward keeps gallery without mascot')
 await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await ready('login');await page.getByRole('link',{name:'Quên mật khẩu?',exact:true}).click();await ready('forgot-password');await sameShowcase()
 await page.getByLabel('Email',{exact:true}).fill('fixture@example.com');await page.getByRole('button',{name:'Gửi mã OTP',exact:true}).click();await page.getByLabel('Mã OTP (6 chữ số)').waitFor();assert.ok(await page.getByLabel('Email',{exact:true}).getAttribute('readonly')!==null);assert.ok(await page.getByRole('button',{name:/Gửi lại sau/}).isDisabled())
 await page.getByLabel('Mã OTP (6 chữ số)').fill('a12b34');assert.equal(await page.getByLabel('Mã OTP (6 chữ số)').inputValue(),'1234');await page.getByLabel('Mã OTP (6 chữ số)').fill('123456')
 await page.getByLabel('Mật khẩu mới',{exact:true}).fill('Fixture-new-123');await page.getByLabel('Xác nhận mật khẩu mới',{exact:true}).fill('different-123');await page.getByRole('button',{name:'Đổi mật khẩu',exact:true}).click();await page.getByRole('alert').filter({hasText:'Mật khẩu xác nhận không khớp.'}).waitFor();assert.equal(requests.filter(r=>r.path.endsWith('/reset-password-otp')).length,0)
 await page.getByLabel('Xác nhận mật khẩu mới',{exact:true}).fill('Fixture-new-123');await page.getByRole('button',{name:'Đổi mật khẩu',exact:true}).click();await page.getByRole('heading',{name:'Đã đổi mật khẩu',exact:true}).waitFor();await sameShowcase()
 checks.push('OTP payload, numeric code, 60s resend cooldown, readonly email, mismatch validation and reset success')
 await page.goto(base+'/auth?section=login');await ready('login');await page.evaluate(()=>{window.__authGallery=document.querySelector('.auth-home-gallery')})
 for(const theme of['light','dark'])for(const width of[1440,1024,768,390,320]){
  await page.setViewportSize({width,height:960});await page.evaluate(t=>{localStorage.setItem('homeji_theme',t);window.dispatchEvent(new StorageEvent('storage',{key:'homeji_theme'}))},theme);await page.waitForFunction(t=>document.documentElement.dataset.theme===t,theme)
  for(const next of['login','register','forgot-password']){
   if(section()!=='login'){await page.getByRole('button',{name:/^(Quay lại đăng nhập|Đăng nhập)$/}).click();await ready('login')}
   if(next==='register'){await page.getByRole('button',{name:'Đăng ký',exact:true}).click();await ready(next)}
   if(next==='forgot-password'){await page.getByRole('link',{name:'Quên mật khẩu?',exact:true}).click();await ready(next)}
   await sameShowcase();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),theme+' overflow '+width+' '+next)
   for(const tag of ['h2','p'])assert.equal(await page.locator('.auth-showcase__copy '+tag).evaluate(e=>getComputedStyle(e).color),'rgb(255, 255, 255)',theme+' gallery '+tag+' must retain white text')
   assert.equal(await page.locator('.auth-cinema__card').count(),1)
   await page.screenshot({path:`${out}/${next}-${width}-${theme}.png`,fullPage:true,animations:'disabled'})
  }
 }
 checks.push('three unified sections and stable model at 320/390/768/1024/1440 in light/dark')
 await page.emulateMedia({reducedMotion:'reduce'});await page.getByRole('button',{name:'Quay lại đăng nhập',exact:true}).click();await ready('login');await sameShowcase()
 await page.getByRole('button',{name:'Đăng nhập bằng Google',exact:true}).click();await page.getByRole('alert').filter({hasText:'Fixture: Google chưa xác thực.'}).waitFor();assert.deepEqual(requests.filter(r=>r.path.endsWith('/google/id-token')).at(-1).body,{idToken:'fixture-google'})
 checks.push('reduced motion and Google ID-token API preserve existing contracts')
 for(const[legacy,target]of[['/register','register'],['/forgot-password','forgot-password'],['/auth/?section=register','register']]){await page.goto(base+legacy);await ready(target);assert.equal(new URL(page.url()).pathname,'/auth');assert.equal(section(),target)}
 // A protected route supplies its destination in location.state, which legacy redirects must retain.
 await page.goto(base+'/posts/new');await ready('login');loginMode='success';await page.getByLabel('Email',{exact:true}).fill('fixture@example.com');await page.getByLabel('Mật khẩu',{exact:true}).fill('Fixture-pass-123');await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await page.waitForURL('**/posts/new')
 checks.push('legacy register/recovery redirects and protected-route return destination')
 assert.deepEqual(errors,[])
 await writeFile(`${out}/results.json`,JSON.stringify({checks,errors,apiWritesIntercepted:requests.length},null,2))
 console.log('PASS auth-unified:',checks.length,'scenario groups, 30 responsive screenshots, no real API writes')
}catch(error){await page.screenshot({path:`${out}/failure.png`,fullPage:true});console.log('FAILURE BODY',(await page.locator('body').innerText()).slice(0,1600));throw error}finally{await context.close();await browser.close()}
