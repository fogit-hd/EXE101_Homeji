import assert from 'node:assert/strict'
import {mkdir,writeFile} from 'node:fs/promises'
import {chromium} from 'playwright'
const base=process.env.HOMEJI_TEST_BASE_URL||'http://127.0.0.1:5541'
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local fixtures only')
const out='output/verification/conversation-order';await mkdir(out,{recursive:true})
await writeFile(out+'/index.html','<html><meta charset="utf-8"><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
await writeFile(out+'/scene.tsx',`import React,{useState}from'react';import{createRoot}from'react-dom/client';import{MemoryRouter}from'react-router-dom';import{MapMessagesPanel}from'/src/components/map/MapMessagesPanel.tsx';import{ToastProvider}from'/src/components/toast/ToastProvider.tsx';import'/src/index.css';function Scene(){const[id,setId]=useState('thread-a');return <><button onClick={()=>setId('thread-c')}>Contact C</button><MapMessagesPanel embedded initialConversationId={id}/></>}createRoot(document.getElementById('root')).render(<MemoryRouter><ToastProvider><Scene/></ToastProvider></MemoryRouter>);`)
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'})
try{
 const page=await browser.newPage();await page.clock.install({time:new Date('2026-11-01T08:00:00Z')});await page.addInitScript(()=>{localStorage.setItem('homeji_access_token','fixture');localStorage.setItem('homeji_user_id','me')})
 await page.route('**/src/contexts/AuthContext.tsx*',r=>r.fulfill({contentType:'application/javascript',body:'export const useAuth=()=>({isAuthenticated:true,profile:{id:"me",displayName:"Fixture"}})'}))
 const conversations=['thread-b','thread-a','thread-c'].map((id,i)=>({id,otherParticipantId:'peer-'+id,otherParticipantName:'Peer '+id.at(-1).toUpperCase(),subjectType:0,subjectId:'item',updatedAt:`2026-11-01T0${7-i}:00:00Z`,unreadCount:0,lastMessage:'Old '+id}));const messages={};let messageId=0
 const errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async r=>{const path=new URL(r.request().url()).pathname;if(!path.startsWith('/api/'))return r.continue();if(path==='/api/conversations')return r.fulfill({json:conversations});const match=path.match(/^\/api\/conversations\/(.+)\/messages$/);if(match){const id=match[1];if(r.request().method()==='POST'){const msg={id:String(++messageId),conversationId:id,senderId:'me',body:r.request().postDataJSON().body,sentAt:await page.evaluate(()=>new Date().toISOString())};(messages[id]??=[]).push(msg);Object.assign(conversations.find(c=>c.id===id),{updatedAt:msg.sentAt,lastMessage:msg.body,lastMessageSenderId:'me'});return r.fulfill({json:msg})}return r.fulfill({json:messages[id]??[]})}return r.fulfill({json:[]})})
 const rows=page.locator('.map-messages__row');const first=()=>rows.first().locator('strong').textContent()
 await page.goto(base+'/'+out+'/index.html');await rows.first().waitFor();assert.equal(await first(),'Peer A','The contact selected to message should be first')
 await page.clock.fastForward(1000);const newer=await page.evaluate(()=>new Date().toISOString());Object.assign(conversations[0],{updatedAt:newer,lastMessage:'Incoming latest'});await page.evaluate(()=>window.dispatchEvent(new CustomEvent('homeji:notification-received',{detail:{ownerId:'me',notification:{type:10,relatedEntityId:'thread-b'}}})));await page.waitForTimeout(350);assert.equal(await first(),'Peer B','Latest received message should rise above the selected contact')
 await page.clock.fastForward(1000);await page.getByRole('button',{name:'Contact C',exact:true}).click();await page.waitForTimeout(200);assert.equal(await first(),'Peer C','A newly chosen recipient should be first')
 await page.clock.fastForward(1000);await rows.filter({hasText:'Peer A'}).click();await page.getByRole('textbox',{name:'Nội dung tin nhắn'}).fill('Newest sent');await page.getByRole('button',{name:'Gửi',exact:true}).click();await page.waitForTimeout(250);assert.equal(await first(),'Peer A','Latest sent message should be first')
 await page.clock.fastForward(20200);await page.waitForTimeout(200);assert.equal(await first(),'Peer A','Refreshing an unordered API response must retain newest-first order')
 assert.deepEqual(errors,[]);await page.screenshot({path:out+'/newest-first.png'});console.log('PASS chosen recipient, newest received, newest sent and background refresh ordering')
}finally{await browser.close()}
