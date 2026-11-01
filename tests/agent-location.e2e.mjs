import assert from 'node:assert/strict'
import { mkdir,writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'
// The existing fixture imports the real chat component and validates posting/confirmation.
// This scenario exercises location consent, continuation and nearby results using the same application seam.
const base=process.env.HOMEJI_TEST_BASE_URL||'http://127.0.0.1:5541'
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local fixtures only')
const out='output/verification/agent-location'
await mkdir(out,{recursive:true})
await writeFile(out+'/index.html','<html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
await writeFile(out+'/scene.tsx',`import React from'react';import{createRoot}from'react-dom/client';import{MemoryRouter}from'react-router-dom';import{MapChatbot}from'/src/components/map/MapChatbot.tsx';import'/src/index.css';createRoot(document.getElementById('root')).render(<MemoryRouter><MapChatbot/></MemoryRouter>);`)
const browser=await chromium.launch({headless:true,channel:'msedge'})
const context=await browser.newContext({viewport:{width:1100,height:1000},permissions:['geolocation'],geolocation:{latitude:10.84,longitude:106.8,accuracy:15},reducedMotion:'reduce'})
const page=await context.newPage();const requests=[],errors=[]
page.on('pageerror',error=>errors.push(error.message))
await page.addInitScript(()=>{localStorage.setItem('homeji_access_token','fixture');window.__locationCalls=0;const original=navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);navigator.geolocation.getCurrentPosition=(...args)=>{window.__locationCalls++;return original(...args)}})
await page.route('**/src/contexts/AuthContext.tsx*',route=>route.fulfill({contentType:'application/javascript',body:'export const useAuth=()=>({isAuthenticated:true,needsProfileSetup:false,profile:{id:"me"}})'}))
await page.route('**/src/contexts/AuthModalContext.logic.tsx*',route=>route.fulfill({contentType:'application/javascript',body:'export const useAuthModal=()=>({openAuthModal:()=>{},isOpen:false})'}))
await page.route('**/api/**',route=>{
 const path=new URL(route.request().url()).pathname
 if(!path.startsWith('/api/'))return route.continue()
 if(path==='/api/subscriptions/me')return route.fulfill({json:{isPremium:true,premiumExpiresAt:'2099-01-01T00:00:00Z'}})
 if(path==='/api/chatbot/popup-config')return route.fulfill({json:{enabled:true,title:'Homeji',greeting:'Chào bạn',suggestedPrompts:[]}})
 if(path==='/api/chatbot/messages'){
  const body=route.request().postDataJSON();requests.push(body)
  const nearby=body.location?{status:'results',summary:'Tìm được phòng quanh vị trí bạn chia sẻ.',radiusKm:3,items:[{id:'5a871a2c-a2e7-4d74-a16a-10805bb824c9',imported:true,title:'Phòng gần Lê Văn Việt',address:'Lê Văn Việt',price:2500000,area:26,distanceKm:0.42}]}:{status:'locationRequired',summary:'Chia sẻ vị trí để tìm quanh bạn.',radiusKm:3,items:[]}
  const now=new Date().toISOString();return route.fulfill({json:{conversationId:'session',userMessage:{id:'u'+requests.length,sender:1,content:body.message,createdAt:now},assistantMessage:{id:'a'+requests.length,sender:2,content:nearby.summary,createdAt:now},searchUpdate:null,actions:[],nearbyRooms:nearby}})
 }
 return route.fulfill({json:[]})
})
try{
 await page.goto(base+'/'+out+'/index.html');await page.locator('#homeji-ai-conversation').waitFor({state:'attached'})
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('homeji-ai:toggle',{detail:{open:true,anchor:null}})))
 const input=page.getByRole('textbox',{name:'Nhập tin nhắn cho Homeji'})
 assert.equal(await page.evaluate(()=>window.__locationCalls),0,'Location must not be read on opening chat')
 await page.waitForFunction(()=>!document.querySelector('[aria-label="Agent · Premium"]').disabled)
 await page.getByRole('button',{name:'Agent · Premium',exact:true}).click()
 await input.fill('Tìm phòng gần tôi dưới 3 triệu');await input.press('Enter')
 await page.getByText('Chia sẻ vị trí để tìm quanh bạn.',{exact:true}).waitFor();assert.equal(requests.length,1);assert.equal(requests[0].location,undefined)
 await page.locator('.chatbot-location-control summary').click();await page.getByRole('button',{name:'Dùng vị trí hiện tại',exact:true}).click()
 await page.getByRole('region',{name:'Phòng quanh vị trí của bạn'}).waitFor();assert.equal(await page.locator('.chatbot-location-control').getAttribute('open'),null);const box=await page.locator('.chatbot-location-control').boundingBox();assert.ok(box.height<45);assert.equal(await page.locator('.homeji-agent-context').count(),0);assert.equal(await page.locator('.agent-mode-switch__spark').count(),0)
 assert.equal(requests.length,2,'Continue the waiting read request automatically after explicit location sharing')
 assert.equal(requests[1].message,requests[0].message);assert.equal(requests[1].location.latitude,10.84);assert.equal(requests[1].location.longitude,106.8)
 assert.match(await page.getByRole('link',{name:/Phòng gần Lê Văn Việt/}).getAttribute('href'),/source=5a871/)
 assert.equal(await page.evaluate(()=>window.__locationCalls),1)
 await page.screenshot({path:out+'/desktop.png'})
 await page.setViewportSize({width:390,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
 await page.locator('.chatbot-location-control summary').click();await page.getByRole('button',{name:'Ngừng dùng vị trí',exact:true}).click()
 await page.getByText('Chọn vị trí',{exact:true}).waitFor();await input.fill('Tìm phòng gần tôi');await Promise.all([page.waitForResponse(r=>r.url().endsWith('/api/chatbot/messages')),input.press('Enter')])
 await page.getByText('Chia sẻ vị trí để tìm quanh bạn.',{exact:true}).last().waitFor();assert.equal(requests.at(-1).location,undefined)
 await page.screenshot({path:out+'/mobile.png'})
 assert.deepEqual(errors,[]);console.log('PASS explicit GPS consent, nearby agent dispatch, automatic continuation, internal room link, forget location and mobile layout')
}finally{await browser.close()}
