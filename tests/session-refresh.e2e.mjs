import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {mkdir,writeFile} from 'node:fs/promises'
const {chromium}=createRequire(import.meta.url)(process.env.HOMEJI_PLAYWRIGHT_MODULE||'playwright')
const base=process.env.HOMEJI_TEST_BASE_URL||'http://127.0.0.1:5511'
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local fixtures only')
await mkdir('output/verification/session-refresh',{recursive:true})
await writeFile('output/verification/session-refresh/fixture.html','<!doctype html><title>Session fixture</title>')
await writeFile('output/verification/session-refresh/provider.html',`<!doctype html><div id="root"></div><script type="module">import React from 'react';import{createRoot}from'react-dom/client';import{AuthProvider,useAuth}from'/src/contexts/AuthContext.tsx';function Probe(){window.auditAuth=useAuth();return null}createRoot(document.getElementById('root')).render(React.createElement(AuthProvider,null,React.createElement(Probe)));</script>`)

const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const jwt=exp=>['header',Buffer.from(JSON.stringify({exp,sub:'user-A'})).toString('base64url'),'signature'].join('.')
const old=jwt(Math.floor(Date.now()/1000)-10),fresh=jwt(Math.floor(Date.now()/1000)+3600)
const checks=[]
async function scenario(name,run){
 const context=await browser.newContext();let refreshCalls=0,mode='success',finish=null
 await context.route('**/*',async route=>{
  const u=new URL(route.request().url());if(u.origin!==new URL(base).origin)return route.abort()
  if(u.pathname==='/api/account/refresh'){
   refreshCalls++;const body=route.request().postDataJSON();assert.equal(body.sessionToken,old)
   if(mode==='hold')await new Promise(resolve=>finish=resolve)
   if(mode==='outage')return route.fulfill({status:503,json:{}})
   if(mode==='invalid')return route.fulfill({status:401,json:{}})
   return route.fulfill({json:{accessToken:fresh,refreshToken:'refresh-B',userId:'user-A',email:'a@example.test'}})
  }
  if(u.pathname==='/api/profile/me')return route.fulfill({json:{id:'user-A',displayName:'Tài khoản thử nghiệm',role:1}})
  if(u.pathname.startsWith('/api/test')){
   if(u.pathname==='/api/test/reject'&&route.request().headers().authorization!==`Bearer ${fresh}`)return route.fulfill({status:401,json:{}})
   return route.fulfill({json:{ok:true}})
  }
  return route.continue()
 })
 const page=await context.newPage();await page.goto(base+'/output/verification/session-refresh/fixture.html')
 await page.evaluate(({old})=>{localStorage.setItem('homeji_access_token',old);localStorage.setItem('homeji_session_anchor',old);localStorage.setItem('homeji_refresh_token','refresh-A');localStorage.setItem('homeji_user_id','user-A')},{old})
 try{await run({page,context,calls:()=>refreshCalls,setMode:value=>mode=value,release:()=>finish?.()});checks.push(name)}finally{await context.close()}
}
try{
 await scenario('expired token refreshes once for parallel APIs and two tabs',async({page,context,calls})=>{
  const second=await context.newPage();await second.goto(base+'/output/verification/session-refresh/fixture.html')
  const invoke=p=>p.evaluate(async()=>{const api=await import('/src/api/client.ts');return Promise.all(Array.from({length:8},()=>api.apiRequest('/api/test')))});
  await Promise.all([invoke(page),invoke(second)]);assert.equal(calls(),1)
  assert.equal(await page.evaluate(()=>localStorage.getItem('homeji_refresh_token')),'refresh-B')
  assert.equal(await page.evaluate(()=>localStorage.getItem('homeji_session_anchor')),old)
  assert.equal(await page.evaluate(()=>localStorage.getItem('homeji_access_token')),fresh)
 })
 await scenario('temporary outage retains the whole session and retry succeeds',async({page,setMode,calls})=>{
  setMode('outage');assert.equal(await page.evaluate(async()=>{try{await(await import('/src/api/client.ts')).apiRequest('/api/test');return 0}catch(e){return e.status}}),503)
  assert.equal(await page.evaluate(()=>localStorage.getItem('homeji_refresh_token')),'refresh-A')
  setMode('success');await page.evaluate(async()=>await(await import('/src/api/client.ts')).apiRequest('/api/test'));assert.equal(calls(),2)
 })
 await scenario('AuthProvider survives expired reload and temporary refresh outage',async({page,setMode})=>{
  setMode('outage');await page.goto(base+'/output/verification/session-refresh/provider.html');
  await page.waitForFunction(()=>window.auditAuth?.isAuthenticated===true);
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(()=>window.auditAuth.isAuthenticated),true);
  assert.equal(await page.evaluate(()=>localStorage.getItem('homeji_refresh_token')),'refresh-A');
  setMode('success');await page.evaluate(()=>window.dispatchEvent(new Event('online')));
  await page.waitForFunction(()=>window.auditAuth?.profile?.id==='user-A');
  await page.reload();await page.waitForFunction(()=>window.auditAuth?.profile?.id==='user-A');
  assert.equal(await page.evaluate(()=>window.auditAuth.isAuthenticated),true);
  await page.evaluate(()=>window.auditAuth.logout());
  assert.equal(await page.evaluate(()=>localStorage.getItem('homeji_refresh_token')),null);
 })
 await scenario('invalid refresh clears session once',async({page,setMode})=>{
  setMode('invalid');await page.evaluate(async()=>{try{await(await import('/src/api/client.ts')).apiRequest('/api/test')}catch{}})
  assert.equal(await page.evaluate(()=>localStorage.getItem('homeji_access_token')),null)
  assert.equal(await page.evaluate(()=>localStorage.getItem('homeji_refresh_token')),null)
 })
 for(const replace of [false,true])await scenario('late refresh cannot restore logout or replace another account '+replace,async({page,setMode,calls,release})=>{
  setMode('hold');const pending=page.evaluate(async()=>{try{return await(await import('/src/api/sessionRefresh.ts')).ensureFreshSession()}catch{return null}})
  while(!calls())await new Promise(resolve=>setTimeout(resolve,10))
  await page.evaluate(replace=>{localStorage.clear();if(replace){localStorage.setItem('homeji_access_token','account-B');localStorage.setItem('homeji_user_id','user-B')}},replace)
  release();await pending;assert.equal(await page.evaluate(()=>localStorage.getItem('homeji_access_token')),replace?'account-B':null)
 })
 await scenario('401 renews before one retry for JSON upload and download',async({page,calls})=>{
  await page.evaluate(token=>localStorage.setItem('homeji_access_token',token),jwt(Math.floor(Date.now()/1000)+1800));
  const result=await page.evaluate(async()=>{const api=await import('/src/api/client.ts');await Promise.all([api.apiRequest('/api/test/reject'),api.apiUpload('/api/test/reject',new FormData()),api.apiDownload('/api/test/reject')]);return true});assert.equal(result,true);assert.equal(calls(),1)
 })
 await writeFile('output/verification/session-refresh/result.json',JSON.stringify({passed:true,checks},null,2));console.log('PASS session refresh:',checks.join('; '))
}finally{await browser.close()}
