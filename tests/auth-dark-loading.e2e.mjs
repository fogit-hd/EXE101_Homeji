import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'

const { chromium }=createRequire(import.meta.url)(process.env.HOMEJI_PLAYWRIGHT_MODULE||'playwright')
const base=process.env.HOMEJI_TEST_BASE_URL||'http://127.0.0.1:5515'
if(!['localhost','127.0.0.1','homeji.onrender.com'].includes(new URL(base).hostname))throw Error('Known Homeji origin with intercepted APIs')
const out='output/verification/auth-dark-loading';await mkdir(out,{recursive:true})
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const results=[]
const luminance=color=>{
 const rgb=color.startsWith('#')?color.slice(1).match(/../g).map(x=>parseInt(x,16)):color.match(/[\d.]+/g).slice(0,3).map(Number)
 const v=rgb.map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4)
 return v.reduce((sum,x,i)=>sum+x*[.2126,.7152,.0722][i],0)
}
const contrast=(a,b)=>(Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05)
async function setup(theme,width){
 const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'})
 await context.addInitScript(theme=>localStorage.setItem('homeji_theme',theme),theme)
 await context.route('**/*',route=>{
  const u=new URL(route.request().url())
  if(u.hostname==='accounts.google.com'&&u.pathname==='/gsi/client')return route.fulfill({contentType:'application/javascript',body:`window.google={accounts:{id:{initialize(){},renderButton(e,options){e.innerHTML='';const button=document.createElement('div');button.setAttribute('role','button');button.tabIndex=0;button.textContent='Đăng nhập bằng Google';button.dataset.googleTheme=options.theme;button.style.cssText='height:40px;border-radius:20px;display:grid;place-items:center;'+(options.theme==='filled_black'?'background:#202124;color:white':'background:white;color:#1f1f1f');e.append(button)},cancel(){}}}}`})
  if(u.origin!==new URL(base).origin)return route.abort()
  if(u.pathname.startsWith('/api/'))return route.fulfill({json:u.pathname==='/api/chatbot/popup-config'?{enabled:false}:[]})
  if(u.pathname.startsWith('/hubs/'))return route.fulfill({status:503,body:''})
  return route.continue()
 })
 return context
}
async function primaryReadable(button){
 const s=await button.evaluate(e=>{const s=getComputedStyle(e);return{ink:s.color,fill:s.backgroundColor,filter:s.filter}})
 assert.match(s.fill,/^rgb\(/,'Auth primary action needs an opaque semantic fill')
 assert.ok(contrast(s.ink,s.fill)>=4.5,JSON.stringify(s))
 assert.equal(s.filter,'none','Do not blur or distort auth labels')
 return s
}
try{
 const production=new URL(base).hostname==='homeji.onrender.com'
 if(process.env.HOMEJI_AUTH_LOADING!=='skip')for(const width of [1440,320])for(const theme of ['dark','light'])for(const path of production?['/login','/register']:['/login','/register','/verify-email']){
  const context=await setup(theme,width),page=await context.newPage()
  let release;const gate=new Promise(resolve=>release=resolve)
  const modulePattern=production?/\/assets\/AuthPage-[\w-]+\.js(?:\?.*)?$/:('**/src/pages/'+(path==='/verify-email'?'VerifySignupPage':'AuthPage')+'.tsx*')
  await page.route(modulePattern,async route=>{await gate;await route.continue()})
  try{
   await page.goto(base+path,{waitUntil:'domcontentloaded'})
   const skeleton=page.locator('[data-skeleton="auth"]');await skeleton.waitFor()
   assert.equal(await skeleton.locator('.sk-auth__layout').count(),1,'Auth loading must reflect the login/register screen, not a generic centered card')
   const sample=await skeleton.locator('.sk').first().evaluate(e=>({base:getComputedStyle(e).getPropertyValue('--sk-base').trim(),under:getComputedStyle(e.closest('.sk-auth')).backgroundColor}))
   if(theme==='dark'){
    assert.ok(luminance(sample.base)<.35,'Dark loading blocks must not flash light-theme gray')
    assert.ok(contrast(sample.base,sample.under)>=1.5,'Loading blocks must separate visibly from the dark background')
   }
   assert.equal(await skeleton.getAttribute('aria-busy'),'true')
   assert.equal(await skeleton.locator('input,button,a').count(),0,'Loading placeholders must not receive focus or submit')
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
   await page.screenshot({path:out+'/'+theme+'-'+width+'-'+path.slice(1)+'-loading.png'})
   release();await skeleton.waitFor({state:'detached'})
  }finally{release();await context.close()}
 }
 for(const theme of ['dark','light'])for(const width of [1440,390,320]){
  const context=await setup(theme,width),page=await context.newPage(),errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  try{
   await page.goto(base+'/login')
   await page.locator('#auth-email').waitFor();await page.evaluate(()=>document.fonts.ready)
   const login=await primaryReadable(page.locator('.auth-cinema__submit'))
   await page.locator('#auth-password').fill('Example-password!')
   await page.getByRole('button',{name:'Hiện mật khẩu',exact:true}).click()
   assert.equal(await page.locator('#auth-password').getAttribute('type'),'text')
   await page.getByRole('button',{name:'Ẩn mật khẩu',exact:true}).click()
   const google=page.locator('[data-google-theme]')
   if(await page.locator('.google-signin').count()){
    await google.waitFor()
    assert.equal(await google.getAttribute('data-google-theme'),theme==='dark'?'filled_black':'outline','Use Google SDK theme instead of filtering a provider iframe')
    assert.ok(await page.locator('.google-signin').evaluate(e=>e.hasAttribute('data-glass-exclude')))
    if(width===1440){
     await page.getByRole('switch',{name:'Chế độ tối',exact:true}).click()
     await page.waitForFunction(t=>document.documentElement.dataset.theme!==t,theme)
     await page.waitForFunction(t=>document.querySelector('[data-google-theme]')?.dataset.googleTheme===(t==='dark'?'outline':'filled_black'),theme)
     await page.getByRole('switch',{name:'Chế độ tối',exact:true}).click()
     await page.waitForFunction(t=>document.documentElement.dataset.theme===t,theme)
     await page.waitForFunction(t=>document.querySelector('[data-google-theme]')?.dataset.googleTheme===(t==='dark'?'filled_black':'outline'),theme)
    }
   }
   await page.screenshot({path:out+'/'+theme+'-'+width+'-login.png',fullPage:true})
   await page.goto(base+'/register')
   await page.locator('#auth-reg-password').waitFor()
   await page.locator('#auth-reg-password').fill('Example-password!')
   await page.getByRole('button',{name:'Hiện mật khẩu',exact:true}).click()
   assert.equal(await page.locator('#auth-reg-password').getAttribute('type'),'text')
   const register=await primaryReadable(page.locator('.auth-cinema__submit'))
   const toggle=page.locator('.auth-cinema__password-toggle')
   assert.ok((await toggle.boundingBox()).height>=44)
   assert.ok(await toggle.evaluate(e=>e.hasAttribute('data-glass-exclude')))
   await page.screenshot({path:out+'/'+theme+'-'+width+'-register.png',fullPage:true})
   await page.goto(base+'/verify-email');await page.getByLabel('Email đăng ký',{exact:true}).fill('fixture@example.test')
   await page.getByLabel('Mã OTP (6 chữ số)',{exact:true}).fill('a12345')
   assert.equal(await page.getByLabel('Mã OTP (6 chữ số)',{exact:true}).inputValue(),'12345')
   await page.getByLabel('Mã OTP (6 chữ số)',{exact:true}).fill('123456')
   assert.equal(await page.getByLabel('Mã OTP (6 chữ số)',{exact:true}).inputValue(),'123456')
   const otp=await primaryReadable(page.getByRole('button',{name:'Xác thực và hoàn tất đăng ký',exact:true}))
   if(theme==='dark'){
    assert.ok(await page.locator('.auth-page').evaluate(e=>!getComputedStyle(e,'::before').backgroundImage.includes('238, 246, 241')),'OTP backdrop must not reuse a light-theme wash')
    const input=await page.locator('.form-input').first().evaluate(e=>{const s=getComputedStyle(e);return{ink:s.color,fill:s.backgroundColor,border:s.borderTopColor}})
    assert.ok(contrast(input.ink,input.fill)>=4.5)
    assert.ok(contrast(input.border,input.fill)>=3,'Input boundaries need a visible contrast edge')
   }
   await page.waitForTimeout(450)
   await page.screenshot({path:out+'/'+theme+'-'+width+'-otp.png',fullPage:true})
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
   assert.deepEqual(errors,[])
   results.push({theme,width,login,register,otp})
  }finally{await context.close()}
 }
 await writeFile(out+'/results.json',JSON.stringify({base,googleSdkStub:true,noAuthRequests:true,results},null,2))
 console.log('PASS: auth route skeletons, readable primary/input contrast, native password/OTP, Google theme, dark/light 320/390/1440 layouts; no sign-in or OTP request sent')
}finally{await browser.close()}
