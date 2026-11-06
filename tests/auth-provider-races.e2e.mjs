// The harness is a committed file because writing an .html file under Vite's root makes Vite reload the page,
// which wiped window.auditAuth mid-test whenever the event arrived after the page had loaded.
import assert from 'node:assert/strict';import{createRequire}from'node:module';
const{chromium}=createRequire(import.meta.url)(process.env.HOMEJI_PLAYWRIGHT_MODULE||'playwright');const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{for(const status of [200,401]){
 const context=await browser.newContext();await context.addInitScript(()=>{localStorage.setItem('homeji_access_token','A');localStorage.setItem('homeji_user_id','A')});let releaseA,sawA=false,bCalls=0;const gate=new Promise(r=>releaseA=r)
 await context.route('**/api/profile/me',async route=>{if(route.request().headers().authorization==='Bearer A'){sawA=true;await gate;return route.fulfill({status,json:status===200?{id:'A',displayName:'Account A',role:3}:{detail:'A expired'}})}bCalls++;return route.fulfill({json:{id:'B',displayName:'Account B',role:1}})})
 const page=await context.newPage();await page.goto((process.env.HOMEJI_TEST_BASE_URL||'http://127.0.0.1:5511')+'/tests/fixtures/auth-audit-harness.html');await page.waitForFunction(()=>window.auditAuth);await page.waitForTimeout(100);assert.ok(sawA)
 await page.evaluate(()=>{window.switchPromise=window.auditAuth.setSessionFromAuth({accessToken:'B',userId:'B',email:'b@example.test'})});await page.waitForTimeout(200);releaseA();await page.evaluate(()=>window.switchPromise);await page.waitForTimeout(200)
 const result=await page.evaluate(async()=>({token:(await import('/src/api/client.ts')).getStoredSession()?.accessToken,profile:window.auditAuth.profile?.id}));console.log('Delayed A status',status,{...result,bCalls});assert.equal(result.token,'B');assert.equal(result.profile,'B');assert.equal(bCalls,1);await context.close()
}console.log('PASS auth provider ignores stale profile success/401 and loads replacement profile')}finally{await browser.close()}
