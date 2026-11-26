import assert from 'node:assert/strict'
import {chromium} from 'playwright'
import {mkdir,writeFile,readFile} from 'node:fs/promises'
const base=process.env.HOMEJI_AUTH_TEST_URL||'http://localhost:5192'
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local fixtures only')
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const fixture=await readFile('tests/auth-unified.e2e.mjs','utf8');const gsi=fixture.match(/const gsi = `([\s\S]*?)`/)[1]
const reports=[];await mkdir('tmp/auth-unified/section-motion',{recursive:true})
try{for(const reduced of[false,true])for(const width of[1440,390,320]){
 const c=await b.newContext({viewport:{width,height:width===320?568:width===390?844:900},reducedMotion:reduced?'reduce':'no-preference'})
 await c.addInitScript(()=>{localStorage.setItem('homeji_theme','light');sessionStorage.setItem('homeji_intro_seen','1')})
 await c.route('**/*',r=>{const u=new URL(r.request().url());if(u.hostname==='accounts.google.com'&&u.pathname==='/gsi/client')return r.fulfill({contentType:'application/javascript',body:gsi});if(u.origin!==base)return r.abort();if(u.pathname.startsWith('/api/'))return r.fulfill({json:[]});if(u.pathname.startsWith('/hubs/'))return r.fulfill({status:503,body:''});return r.continue()})
 const p=await c.newPage();await p.goto(base+'/auth?section=login',{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(400)
 await p.evaluate(()=>window.__gallery=document.querySelector('.auth-home-gallery'))
 for(const[to,action]of[['register',()=>p.getByRole('button',{name:'Đăng ký',exact:true}).click()],['login',()=>p.goBack()],['forgot-password',()=>p.getByRole('link',{name:'Quên mật khẩu?',exact:true}).click()],['login',()=>p.getByRole('button',{name:'Quay lại đăng nhập',exact:true}).click()]]){
  await p.evaluate(()=>{window.__motionFrames=[];const start=performance.now();function frame(t){const e=document.querySelector('.auth-unified__viewport'),panel=e.querySelector('section:not([inert])'),s=getComputedStyle(panel),matrix=new DOMMatrixReadOnly(s.transform);window.__motionFrames.push({t:t-start,h:e.getBoundingClientRect().height,opacity:+s.opacity,x:matrix.m41,scaleX:matrix.m11,scaleY:matrix.m22,brandTop:document.querySelector(".auth-login-brand").getBoundingClientRect().top,legalTop:document.querySelector(".auth-account-notice").getBoundingClientRect().top});if(t-start<550)requestAnimationFrame(frame)}requestAnimationFrame(frame)})
  await action();await p.waitForTimeout(650)
  const frames=await p.evaluate(()=>window.__motionFrames);assert.ok(frames.length>6)
  assert.ok(frames.every(f=>Math.abs(f.scaleX-1)<.001&&Math.abs(f.scaleY-1)<.001),'Text and inputs must never scale')
  const heights=new Set(frames.map(f=>Math.round(f.h)))
  for(const key of ['h','brandTop','legalTop'])assert.ok(Math.max(...frames.map(f=>f[key]))-Math.min(...frames.map(f=>f[key]))<1,`${key} must stay fixed during section changes`)
  assert.ok(frames.every(f=>Math.abs(f.x)<.1),'Crossfade must not slide the form')
  if(!reduced)assert.ok(frames.some(f=>f.opacity>0&&f.opacity<.99),'Form must crossfade')
  assert.equal(await p.locator('.auth-unified__section').count(),1);assert.equal(await p.locator('.auth-unified__section').getAttribute('data-auth-section'),to)
  assert.ok(await p.evaluate(()=>window.__gallery===document.querySelector('.auth-home-gallery')))
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow')
  reports.push({width,reduced,to,distinctHeights:heights.size,frames})
 }
 await p.screenshot({path:`tmp/auth-unified/section-motion/${width}-${reduced?'reduced':'animated'}.png`});await c.close()
}await writeFile('tmp/auth-unified/section-motion/results.json',JSON.stringify(reports,null,2));console.log('PASS 24 transitions: fixed logo/legal/viewport positions, crossfade, no text scaling, stable gallery, Back and reduced motion')}
finally{await b.close()}
