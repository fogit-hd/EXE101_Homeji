import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {mkdir,writeFile} from 'node:fs/promises'
const {chromium}=createRequire(import.meta.url)(process.env.HOMEJI_PLAYWRIGHT_MODULE||'playwright')
const base=process.env.HOMEJI_AUTH_TEST_URL||'http://127.0.0.1:5498'
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('Local fixtures only')
const out=new URL('../output/verification/gamma-login/',import.meta.url);await mkdir(out,{recursive:true})
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const context=await browser.newContext({viewport:{width:1440,height:960},colorScheme:'light',reducedMotion:'no-preference'})
const requests=[],errors=[]
await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!==new URL(base).origin)return route.abort();if(!u.pathname.startsWith('/api/'))return route.continue();if(u.pathname==='/api/account/login'){requests.push(route.request().postDataJSON());return route.fulfill({status:401,json:{detail:'Email hoặc mật khẩu không đúng.'}})}return route.fulfill({json:u.pathname.includes('popup-config')?{enabled:false}:[]})})
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message))
const shots=[]
try{
 await page.goto(base+'/login');await page.getByLabel('Email',{exact:true}).waitFor();await page.waitForFunction(()=>[...document.querySelectorAll('.auth-home-gallery img')].every(i=>i.complete&&i.naturalWidth>0))
 assert.equal(await page.locator('.auth-home-gallery__track').count(),3)
 assert.ok(await page.evaluate(()=>document.querySelector('.auth-cinema__stage').getBoundingClientRect().right<=document.querySelector('.auth-home-gallery').getBoundingClientRect().left+1),'Form occupies the left pane, photo wall the right')
 const initial=await page.locator('.auth-home-gallery__track').first().evaluate(e=>{const s=getComputedStyle(e);return{transform:s.transform,duration:parseFloat(s.animationDuration)}})
 assert.ok(initial.duration>=80,'Photo drift is intentionally slow')
 await page.waitForFunction(t=>getComputedStyle(document.querySelector('.auth-home-gallery__track')).transform!==t,initial.transform)
 await page.getByRole('button',{name:'Tạm dừng chuyển động',exact:true}).click();assert.equal(await page.locator('.auth-home-gallery__track').first().evaluate(e=>getComputedStyle(e).animationPlayState),'paused');await page.getByRole('button',{name:'Tiếp tục chuyển động',exact:true}).click()
 for(const theme of ['light','dark']){
  if(theme==='dark')await page.getByRole('switch',{name:'Chế độ tối',exact:true}).click()
  await page.waitForFunction(t=>document.documentElement.dataset.theme===t&&!document.documentElement.dataset.themeTransition,theme)
  for(const width of [1440,1024,768,390,320]){await page.setViewportSize({width,height:960});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),theme+' overflow '+width);const field=await page.getByLabel('Email',{exact:true}).boundingBox();assert.ok(field.x>=0&&field.x+field.width<=width);await page.screenshot({path:new URL(theme+'-'+width+'.png',out).pathname.slice(1),fullPage:true,animations:'disabled'});shots.push({theme,width})}
 }
 await page.getByLabel('Email',{exact:true}).fill('fixture@example.com');await page.getByLabel('Mật khẩu',{exact:true}).fill('fixture-password')
 await page.getByRole('button',{name:'Hiện mật khẩu',exact:true}).click();assert.equal(await page.getByLabel('Mật khẩu',{exact:true}).getAttribute('type'),'text');await page.getByRole('button',{name:'Ẩn mật khẩu',exact:true}).click()
 await page.getByLabel('Mật khẩu',{exact:true}).press('Enter');await page.getByText('Email hoặc mật khẩu không đúng.',{exact:true}).waitFor();assert.equal(requests.length,1);assert.equal(requests[0].email,'fixture@example.com');assert.equal(requests[0].password,'fixture-password');assert.equal(await page.getByLabel('Email',{exact:true}).inputValue(),'fixture@example.com')
 await page.getByRole('link',{name:'Quên mật khẩu?',exact:true}).click();await page.waitForURL('**/forgot-password')
 await page.goto(base+'/login');await page.getByRole('button',{name:'Đăng ký',exact:true}).click();await page.waitForURL('**/register');await page.getByLabel('Xác nhận mật khẩu',{exact:true}).waitFor();assert.equal(await page.locator('.auth-home-gallery').count(),0)
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto(base+'/login');await page.getByLabel('Email',{exact:true}).waitFor();assert.equal(await page.locator('.auth-home-gallery__track').first().evaluate(e=>getComputedStyle(e).animationName),'none')
 assert.deepEqual(errors,[]);await writeFile(new URL('results.json',out),JSON.stringify({checks:['split layout','existing local images decoded','slow continuous motion','pause/resume','light/dark at five widths','password reveal','login payload and error','forgot-password and register routes','reduced motion'],shots,errors},null,2));console.log('PASS: Gamma-style actual login, slow local house gallery, pause/reduced motion, responsive 320–1440, password reveal, login failure contract and navigation')
}finally{await browser.close()}
