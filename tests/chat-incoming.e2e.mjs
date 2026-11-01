import assert from 'node:assert/strict'
import {mkdir,writeFile} from 'node:fs/promises'
import {chromium} from 'playwright'
const base=process.env.HOMEJI_TEST_BASE_URL||'http://127.0.0.1:5541'
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local fixtures only')
const out='output/verification/chat-incoming';await mkdir(out,{recursive:true})
await writeFile(out+'/index.html','<html><meta charset="utf-8"><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
await writeFile(out+'/scene.tsx',`import React from'react';import{createRoot}from'react-dom/client';import{MemoryRouter}from'react-router-dom';import{MapMessagesPanel}from'/src/components/map/MapMessagesPanel.tsx';import{ToastProvider}from'/src/components/toast/ToastProvider.tsx';import'/src/index.css';createRoot(document.getElementById('root')).render(<MemoryRouter><ToastProvider><MapMessagesPanel embedded initialConversationId="thread-a"/></ToastProvider></MemoryRouter>);`)
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'})
try{
 const context=await browser.newContext();await context.addInitScript(()=>{localStorage.setItem('homeji_access_token','fixture');localStorage.setItem('homeji_user_id','me')})
 await context.route('**/src/contexts/AuthContext.tsx*',r=>r.fulfill({contentType:'application/javascript',body:'export const useAuth=()=>({isAuthenticated:true,profile:{id:"me",displayName:"Fixture"}})'}))
 const messages={'thread-a':[{id:'old',conversationId:'thread-a',senderId:'peer',body:'Old message',sentAt:'2026-11-01T04:00:00Z'}],'thread-b':[]};let reads=0,inboxReads=0,holdA=false,releaseA,failMessages=false;let markStarted;const started=new Promise(resolve=>{markStarted=resolve})
 const errors=[];const page=await context.newPage();await page.clock.install();page.on('pageerror',e=>errors.push(e.message))
 await context.route('**/api/**',async r=>{
  const path=new URL(r.request().url()).pathname;if(!path.startsWith('/api/'))return r.continue()
  if(path==='/api/conversations'){inboxReads++;return r.fulfill({json:['thread-a','thread-b'].map((id,i)=>({id,otherParticipantId:'peer',otherParticipantName:i?'Peer B':'Peer A',subjectType:0,subjectId:'item',updatedAt:'2026-11-01T04:00:00Z',unreadCount:0,lastMessage:messages[id].at(-1)?.body??''}))})}
  const match=path.match(/^\/api\/conversations\/(.+)\/messages$/);if(match){reads++;if(failMessages)return r.fulfill({status:503,json:{title:'Fixture offline'}});if(holdA&&match[1]==='thread-a'){const snapshot=[...messages['thread-a']];markStarted();await new Promise(resolve=>{releaseA=resolve});return r.fulfill({json:snapshot})}return r.fulfill({json:messages[match[1]]})}
  return r.fulfill({json:[]})
 })
 await page.goto(base+'/'+out+'/index.html');await page.locator('.map-messages__bubble-body').getByText('Old message',{exact:true}).waitFor()
 const composer=page.getByRole('textbox',{name:'Nội dung tin nhắn'});await composer.fill('Draft stays intact')
 const incoming={id:'incoming-1',conversationId:'thread-a',senderId:'peer',body:'New incoming message',sentAt:'2026-11-01T04:01:00Z'};messages['thread-a'].push(incoming)
 const notify=(ownerId='me',thread='thread-a')=>page.evaluate(({ownerId,thread})=>window.dispatchEvent(new CustomEvent('homeji:notification-received',{detail:{ownerId,notification:{type:10,relatedEntityId:thread,isRead:false}}})),{ownerId,thread})
 await notify();await page.locator('.map-messages__bubble-body').getByText(incoming.body,{exact:true}).waitFor({timeout:2500})
 assert.equal(await composer.inputValue(),'Draft stays intact')
 await notify();await page.waitForTimeout(250);assert.equal(await page.locator('.map-messages__bubble-body').getByText(incoming.body,{exact:true}).count(),1)
 const before=reads;await notify('other-account');await page.waitForTimeout(250);assert.equal(reads,before)
 messages['thread-a'].push({...incoming,id:'reconnected',body:'Recovered after reconnect'});await page.evaluate(()=>window.dispatchEvent(new Event('homeji:notification-connected')));await page.locator('.map-messages__bubble-body').getByText('Recovered after reconnect',{exact:true}).waitFor({timeout:2500})
 failMessages=true;await notify();await page.waitForTimeout(300);assert.equal(await page.locator('.map-messages__bubble-body').getByText(incoming.body,{exact:true}).count(),1);assert.equal(await composer.inputValue(),'Draft stays intact');failMessages=false
 messages['thread-a'].push({...incoming,id:'online',body:'Recovered on return'});await page.evaluate(()=>window.dispatchEvent(new Event('online')));await page.locator('.map-messages__bubble-body').getByText('Recovered on return',{exact:true}).waitFor({timeout:2500})
 messages['thread-a'].push({...incoming,id:'polled',body:'Recovered by fallback poll'});await page.clock.fastForward(20200);await page.locator('.map-messages__bubble-body').getByText('Recovered by fallback poll',{exact:true}).waitFor({timeout:2500})
 const beforeHidden=reads;await page.evaluate(()=>Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'}));messages['thread-a'].push({...incoming,id:'hidden',body:'Received while hidden'});await notify();await page.waitForTimeout(250);assert.equal(reads,beforeHidden,'Hidden tabs must not mark a new message as read');await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});document.dispatchEvent(new Event('visibilitychange'))});await page.locator('.map-messages__bubble-body').getByText('Received while hidden',{exact:true}).waitFor({timeout:2500})
 holdA=true;await notify();await Promise.race([started,new Promise((_,reject)=>setTimeout(()=>reject(Error('No refresh request')),3000))]);await page.locator('.map-messages__row').filter({hasText:'Peer B'}).click();await page.waitForFunction(()=>document.querySelector('.map-messages__peer-name')?.textContent?.trim()==='Peer B');await composer.fill('Draft for B');releaseA();await page.waitForTimeout(200);assert.equal(await page.locator('.map-messages__bubble-body').getByText(incoming.body,{exact:true}).count(),0);assert.equal(await composer.inputValue(),'Draft for B')
 assert.deepEqual(errors,[]);await page.screenshot({path:out+'/incoming.png'});console.log(JSON.stringify({incomingVisible:true,draftPreserved:true,duplicatesPrevented:true,otherAccountIgnored:true,reconnectRecovered:true,pollRecovered:true,hiddenTabPreservedUnread:true,lateThreadReplyIgnored:true,reads,inboxReads}))
}finally{await browser.close()}
