import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {mkdir,writeFile} from 'node:fs/promises'
const {chromium}=createRequire(import.meta.url)(process.env.HOMEJI_PLAYWRIGHT_MODULE||'playwright')
const base=process.env.HOMEJI_TEST_BASE_URL||'http://127.0.0.1:5511'
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local fixtures only')
const fixturePage=base+'/output/verification/session-refresh/fixture.html'
const providerPage=base+'/output/verification/session-refresh/provider.html'
await mkdir('output/verification/session-refresh',{recursive:true})
await writeFile('output/verification/session-refresh/fixture.html','<!doctype html><title>Session fixture</title>')
await writeFile('output/verification/session-refresh/provider.html',`<!doctype html><div id="root"></div><script type="module">import React from 'react';import{createRoot}from'react-dom/client';import{AuthProvider,useAuth}from'/src/contexts/AuthContext.tsx';function Probe(){window.auditAuth=useAuth();return null}createRoot(document.getElementById('root')).render(React.createElement(AuthProvider,null,React.createElement(Probe)));</script>`)

const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const jwt=(exp,sub='user-A')=>['header',Buffer.from(JSON.stringify({exp,sub})).toString('base64url'),'signature'].join('.')
const inSeconds=seconds=>Math.floor(Date.now()/1000)+seconds
const old=jwt(inSeconds(-10)),fresh=jwt(inSeconds(3600))
const checks=[]

/** The API's cookies are HttpOnly and invisible here; the fixture only plays the readable hint. */
const setHint=page=>page.evaluate(()=>{document.cookie='homeji_session_hint=1; path=/'})
const seedLegacy=(page,access=old)=>page.evaluate(access=>{localStorage.setItem('homeji_access_token',access);localStorage.setItem('homeji_session_anchor',access);localStorage.setItem('homeji_refresh_token','refresh-A');localStorage.setItem('homeji_user_id','user-A');localStorage.setItem('homeji_email','a@example.test')},access)
const legacyKeys=page=>page.evaluate(()=>Object.keys(localStorage).filter(key=>/homeji_(access_token|refresh_token|session_anchor|user_id|email)/.test(key)))

async function scenario(name,run){
 const context=await browser.newContext()
 const state={session:[],adopt:[],signOut:0,mode:'success',adoptMode:'success',signOutMode:'success',finish:null}
 await context.route('**/*',async route=>{
  const request=route.request(),u=new URL(request.url());if(u.origin!==new URL(base).origin)return route.abort()
  if(u.pathname==='/api/account/session/adopt'){
   state.adopt.push(request.postDataJSON());assert.equal(request.headers()['x-homeji-session'],'cookie')
   if(state.adoptMode==='outage')return route.fulfill({status:503,json:{}})
   if(state.adoptMode==='invalid')return route.fulfill({status:401,json:{}})
   return route.fulfill({status:204,headers:{'Set-Cookie':'homeji_session_hint=1; Path=/'}})
  }
  if(u.pathname==='/api/account/session'&&request.method()==='DELETE'){
   state.signOut++;if(state.signOutMode==='outage')return route.abort()
   return route.fulfill({status:204,headers:{'Set-Cookie':'homeji_session_hint=; Path=/; Max-Age=0'}})
  }
  if(u.pathname==='/api/account/session'){
   state.session.push(request.postDataJSON());assert.equal(request.headers()['x-homeji-session'],'cookie');assert.equal(request.headers().authorization,undefined)
   if(state.mode==='hold')await new Promise(resolve=>state.finish=resolve)
   if(state.mode==='outage')return route.fulfill({status:503,json:{}})
   if(state.mode==='forbidden')return route.fulfill({status:403,json:{}})
   if(state.mode==='invalid')return route.fulfill({status:401,headers:{'Set-Cookie':'homeji_session_hint=; Path=/; Max-Age=0'},json:{}})
   return route.fulfill({json:{accessToken:fresh,refreshToken:null,userId:'user-A',email:'a@example.test'}})
  }
  if(u.pathname==='/api/profile/me')return route.fulfill({json:{id:'user-A',displayName:'Tài khoản thử nghiệm',role:1}})
  if(u.pathname.startsWith('/api/test')){
   if(u.pathname==='/api/test/reject'&&request.headers().authorization!==`Bearer ${fresh}`)return route.fulfill({status:401,json:{}})
   return route.fulfill({json:{ok:true}})
  }
  return route.continue()
 })
 const page=await context.newPage();await page.goto(fixturePage)
 try{await run({page,context,state});checks.push(name)}finally{await context.close()}
}

try{
 await scenario('a reload restores from the cookie session once for parallel APIs and two tabs',async({page,context,state})=>{
  await setHint(page)
  const second=await context.newPage();await second.goto(fixturePage)
  const invoke=p=>p.evaluate(async()=>{const api=await import('/src/api/client.ts');return Promise.all(Array.from({length:8},()=>api.apiRequest('/api/test')))})
  await Promise.all([invoke(page),invoke(second)])
  assert.equal(state.session.length,2,'one restore per tab, none per request')
  assert.deepEqual(await legacyKeys(page),[])
  assert.deepEqual(state.session[0],{forceRotate:false})
 })
 await scenario('a guest makes no session call',async({page,state})=>{
  const result=await page.evaluate(async()=>{try{await(await import('/src/api/client.ts')).apiRequest('/api/test');return 0}catch(e){return e.status}})
  assert.equal(result,401);assert.equal(state.session.length,0)
 })
 await scenario('temporary outage keeps the session and retry succeeds',async({page,state})=>{
  await setHint(page);state.mode='outage'
  assert.equal(await page.evaluate(async()=>{try{await(await import('/src/api/client.ts')).apiRequest('/api/test');return 0}catch(e){return e.status}}),503)
  assert.equal(await page.evaluate(()=>document.cookie.includes('homeji_session_hint')),true)
  state.mode='success';await page.evaluate(async()=>await(await import('/src/api/client.ts')).apiRequest('/api/test'));assert.equal(state.session.length,2)
 })
 await scenario('a refused origin cannot sign everyone out',async({page,state})=>{
  await setHint(page);state.mode='forbidden'
  assert.equal(await page.evaluate(async()=>{try{await(await import('/src/api/client.ts')).apiRequest('/api/test');return 0}catch(e){return e.status}}),503)
  assert.equal(await page.evaluate(()=>document.cookie.includes('homeji_session_hint')),true)
 })
 await scenario('AuthProvider survives reload and temporary outage, then signs out through the API',async({page,state})=>{
  await setHint(page);state.mode='outage';await page.goto(providerPage)
  await page.waitForFunction(()=>window.auditAuth?.isAuthenticated===true);await page.waitForTimeout(150)
  assert.equal(await page.evaluate(()=>window.auditAuth.isAuthenticated),true)
  state.mode='success';await page.evaluate(()=>window.dispatchEvent(new Event('online')))
  await page.waitForFunction(()=>window.auditAuth?.profile?.id==='user-A')
  await page.reload();await page.waitForFunction(()=>window.auditAuth?.profile?.id==='user-A')
  await page.evaluate(()=>window.auditAuth.logout())
  await page.waitForFunction(()=>window.auditAuth?.isAuthenticated===false)
  await page.waitForFunction(()=>!document.cookie.includes('homeji_session_hint'))
  assert.equal(state.signOut,1)
  await page.reload();await page.waitForFunction(()=>window.auditAuth?.isLoading===false)
  assert.equal(await page.evaluate(()=>window.auditAuth.isAuthenticated),false)
 })
 await scenario('AuthProvider treats a refused session as signed out',async({page,state})=>{
  await setHint(page);state.mode='invalid';await page.goto(providerPage)
  await page.waitForFunction(()=>window.auditAuth?.isAuthenticated===false&&window.auditAuth?.isLoading===false)
  assert.equal(state.signOut,0)
 })
 await scenario('an unreachable sign-out is retried and the session is not restored meanwhile',async({page,state})=>{
  await setHint(page);state.signOutMode='outage';await page.goto(providerPage)
  await page.waitForFunction(()=>window.auditAuth?.profile?.id==='user-A')
  const restores=state.session.length
  await page.evaluate(()=>window.auditAuth.logout());await page.waitForFunction(()=>window.auditAuth?.isAuthenticated===false)
  await page.waitForFunction(()=>localStorage.getItem('homeji_sign_out_pending')==='1')
  await page.reload();await page.waitForFunction(()=>window.auditAuth?.isLoading===false)
  assert.equal(await page.evaluate(()=>window.auditAuth.isAuthenticated),false);assert.equal(state.session.length,restores)
  state.signOutMode='success';await page.evaluate(()=>window.dispatchEvent(new Event('online')))
  await page.waitForFunction(()=>localStorage.getItem('homeji_sign_out_pending')===null)
 })
 await scenario('a localStorage session moves into cookies and its tokens are removed',async({page,state})=>{
  await seedLegacy(page);await page.goto(providerPage)
  await page.waitForFunction(()=>window.auditAuth?.profile?.id==='user-A')
  assert.deepEqual(state.adopt,[{sessionToken:old,accessToken:old,refreshToken:'refresh-A'}])
  assert.deepEqual(await legacyKeys(page),[])
 })
 await scenario('migration during an outage keeps the old session for the next attempt',async({page,state})=>{
  await seedLegacy(page,fresh);state.adoptMode='outage';await page.goto(providerPage)
  await page.waitForFunction(()=>window.auditAuth?.profile?.id==='user-A')
  assert.equal(await page.evaluate(()=>window.auditAuth.isAuthenticated),true,'a still-valid token keeps working')
  assert.equal((await legacyKeys(page)).includes('homeji_refresh_token'),true)
  state.adoptMode='success';await page.reload();await page.waitForFunction(()=>window.auditAuth?.profile?.id==='user-A')
  await page.waitForFunction(()=>localStorage.getItem('homeji_refresh_token')===null)
 })
 await scenario('migration refused by the API clears the old session',async({page,state})=>{
  await seedLegacy(page);state.adoptMode='invalid';await page.goto(providerPage)
  await page.waitForFunction(()=>window.auditAuth?.isAuthenticated===false&&window.auditAuth?.isLoading===false)
  assert.deepEqual(await legacyKeys(page),[])
 })
 await scenario('a session without a refresh token moves to memory and leaves storage',async({page,state})=>{
  await page.evaluate(token=>{localStorage.setItem('homeji_access_token',token);localStorage.setItem('homeji_user_id','user-A')},fresh)
  await page.evaluate(async()=>await(await import('/src/api/client.ts')).apiRequest('/api/test'))
  assert.deepEqual(await legacyKeys(page),[]);assert.equal(state.adopt.length,0);assert.equal(state.session.length,0)
 })
 await scenario('sign-in links are adopted instead of kept in the page',async({page,state})=>{
  await page.evaluate(async token=>{const api=await import('/src/api/client.ts');api.persistSession(token,null,null,'refresh-link');await api.apiRequest('/api/test')},fresh)
  assert.deepEqual(state.adopt,[{sessionToken:fresh,accessToken:fresh,refreshToken:'refresh-link'}])
  assert.deepEqual(await legacyKeys(page),[])
 })
 await scenario('successful in-flight API survives rotation in the same session',async({page})=>{
  let release,received=false
  await page.route('**/api/test/slow',async route=>{received=true;await new Promise(resolve=>release=resolve);return route.fulfill({json:{ok:true}})})
  await page.evaluate(async token=>{const api=await import('/src/api/client.ts');api.persistSession(token,'user-A',null,null)},fresh)
  const request=page.evaluate(async()=>await(await import('/src/api/client.ts')).apiRequest('/api/test/slow'))
  while(!received)await new Promise(resolve=>setTimeout(resolve,10))
  await page.evaluate(async token=>{(await import('/src/api/authSession.ts')).applyIssuedToken(token,'user-A',null)},jwt(inSeconds(3700)))
  release();assert.equal((await request).ok,true)
 })
 await scenario('invalid session clears memory once',async({page,state})=>{
  await setHint(page);state.mode='invalid'
  await page.evaluate(async token=>{(await import('/src/api/client.ts')).persistSession(token,'user-A',null,null)},old)
  await page.evaluate(async()=>{try{await(await import('/src/api/client.ts')).apiRequest('/api/test')}catch{}})
  assert.equal(await page.evaluate(async()=>(await import('/src/api/client.ts')).getStoredSession()),null)
  assert.equal(state.session.length,1)
 })
 for(const replace of [false,true])await scenario('late refresh cannot restore logout or replace another account '+replace,async({page,state})=>{
  await setHint(page);state.mode='hold'
  const pending=page.evaluate(async()=>{try{return await(await import('/src/api/sessionRefresh.ts')).ensureFreshSession()}catch{return null}})
  while(!state.session.length)await new Promise(resolve=>setTimeout(resolve,10))
  await page.evaluate(async replace=>{const api=await import('/src/api/client.ts');if(replace)api.persistSession('account-B','user-B',null,null);else api.clearSession()},replace)
  state.finish();await pending
  assert.equal(await page.evaluate(async()=>(await import('/src/api/client.ts')).getStoredSession()?.accessToken??null),replace?'account-B':null)
 })
 await scenario('401 forces one rotation before one retry for JSON upload and download',async({page,state})=>{
  await setHint(page)
  await page.evaluate(async token=>{(await import('/src/api/client.ts')).persistSession(token,'user-A',null,null)},jwt(inSeconds(1800)))
  const result=await page.evaluate(async()=>{const api=await import('/src/api/client.ts');await Promise.all([api.apiRequest('/api/test/reject'),api.apiUpload('/api/test/reject',new FormData()),api.apiDownload('/api/test/reject')]);return true})
  assert.equal(result,true);assert.deepEqual(state.session,[{forceRotate:true}])
 })
 await scenario('signing out in one tab signs out the others',async({page,context})=>{
  await setHint(page);await page.goto(providerPage);await page.waitForFunction(()=>window.auditAuth?.profile?.id==='user-A')
  const second=await context.newPage();await second.goto(providerPage);await second.waitForFunction(()=>window.auditAuth?.profile?.id==='user-A')
  await page.evaluate(()=>window.auditAuth.logout())
  await second.waitForFunction(()=>window.auditAuth?.isAuthenticated===false)
  assert.equal(await second.evaluate(async()=>(await import('/src/api/client.ts')).getStoredSession()),null)
 })
 await scenario('administrator termination ends the cookie session too',async({page,state})=>{
  await setHint(page);await page.goto(providerPage);await page.waitForFunction(()=>window.auditAuth?.profile?.id==='user-A')
  await page.evaluate(async()=>(await import('/src/api/authSession.ts')).terminateStoredAuth('Đã kết thúc'))
  await page.waitForFunction(()=>window.auditAuth?.isAuthenticated===false)
  await page.waitForFunction(()=>!document.cookie.includes('homeji_session_hint'))
  assert.equal(state.signOut,1)
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('homeji_session_termination_message')),'Đã kết thúc')
 })
 await writeFile('output/verification/session-refresh/result.json',JSON.stringify({passed:true,checks},null,2));console.log(`PASS session cookies (${checks.length}):`,checks.join('; '))
}finally{await browser.close()}
