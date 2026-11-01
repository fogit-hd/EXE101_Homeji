import assert from 'node:assert/strict'
import {mkdir,writeFile} from 'node:fs/promises'
import {chromium} from 'playwright'
const base=process.env.HOMEJI_TEST_BASE_URL||'http://127.0.0.1:5541'
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local fixture only')
const out='output/verification/chat-block';await mkdir(out,{recursive:true})
await writeFile(out+'/index.html','<html><meta charset="utf-8"><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
await writeFile(out+'/scene.tsx',`import React,{useState}from'react';import{createRoot}from'react-dom/client';import{MemoryRouter}from'react-router-dom';import{MapMessagesPanel}from'/src/components/map/MapMessagesPanel.tsx';import{ToastProvider}from'/src/components/toast/ToastProvider.tsx';import'/src/index.css';function Scene(){const[id,setId]=useState(null);return location.search.includes('floating')?<><MapMessagesPanel layout="floating-inbox" onPickConversation={setId}/>{id&&<MapMessagesPanel layout="floating-thread" initialConversationId={id}/>}</>:<MapMessagesPanel embedded initialConversationId="thread-a"/>}createRoot(document.getElementById('root')).render(<MemoryRouter><ToastProvider><Scene/></ToastProvider></MemoryRouter>);`)
const browser=await chromium.launch({headless:true,channel:'msedge'})
try{
 const page=await browser.newPage({viewport:{width:1200,height:850}})
 await page.addInitScript(()=>{localStorage.setItem('homeji_access_token','fixture');localStorage.setItem('homeji_user_id','me')})
 await page.route('**/src/contexts/AuthContext.tsx*',r=>r.fulfill({contentType:'application/javascript',body:'export const useAuth=()=>({isAuthenticated:true,profile:{id:"me",displayName:"Fixture"}})'}))
 let blocked=false,otherBlocked=false,failBlock=false,inboxReads=0,messageReads=0,blockWrites=0
 const errors=[];page.on('pageerror',error=>errors.push(error.message))
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;if(!path.startsWith('/api/'))return route.continue()
  if(path==='/api/conversations'){inboxReads++;return route.fulfill({json:['thread-a','thread-b'].map(id=>({id,otherParticipantId:'peer',otherParticipantName:id,subjectType:0,subjectId:'room',updatedAt:'2026-11-01T07:00:00Z',isBlockedByMe:blocked,isBlockedByOther:otherBlocked,unreadCount:0}))})}
  if(path.endsWith('/block')){blockWrites++;if(failBlock)return route.fulfill({status:503,json:{detail:'Chưa cập nhật được trạng thái chặn'}});blocked=route.request().method()==='PUT';return route.fulfill({json:{otherParticipantId:'peer',isBlockedByMe:blocked,isBlockedByOther:otherBlocked}})}
  const match=path.match(/^\/api\/conversations\/(.+)\/messages$/)
  if(match){messageReads++;return route.fulfill({json:[{id:'saved',conversationId:match[1],senderId:'peer',body:'Lịch sử được giữ',sentAt:'2026-11-01T07:00:00Z'}]})}
  return route.fulfill({json:[]})
 })
 await page.goto(base+'/'+out+'/index.html');await page.getByText('Lịch sử được giữ',{exact:true}).waitFor();await page.waitForTimeout(250)
 assert.equal(inboxReads,1,'Opening history must not duplicate the initial inbox request')
 const composer=page.getByRole('textbox',{name:'Nội dung tin nhắn'});await composer.fill('Bản nháp giữ nguyên')
 page.once('dialog',dialog=>dialog.dismiss());await page.getByRole('button',{name:'Chặn người dùng',exact:true}).click();assert.equal(blockWrites,0)
 page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Chặn người dùng',exact:true}).click()
 await page.getByRole('button',{name:'Bỏ chặn người dùng',exact:true}).waitFor();assert.equal(blockWrites,1);assert.equal(await composer.isDisabled(),true);assert.equal(await composer.inputValue(),'Bản nháp giữ nguyên');assert.equal(await page.getByRole('button',{name:'Gửi',exact:true}).isDisabled(),true)
 await page.getByText('Lịch sử được giữ',{exact:true}).waitFor();await page.getByRole('button',{name:'Bỏ chặn người dùng',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('textarea[aria-label="Nội dung tin nhắn"]').disabled)
 failBlock=true;page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Chặn người dùng',exact:true}).click();await page.getByText('Chưa cập nhật được trạng thái chặn',{exact:true}).waitFor();assert.equal(await composer.isDisabled(),false);assert.equal(await composer.inputValue(),'Bản nháp giữ nguyên')
 failBlock=false;otherBlocked=true;await page.reload();await page.getByText('Hiện không thể gửi tin nhắn hoặc gọi thoại trong cuộc trò chuyện này.',{exact:true}).waitFor();assert.equal(await composer.isDisabled(),true)
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:out+'/blocked-mobile.png'})
 otherBlocked=false;messageReads=0;await page.goto(base+'/'+out+'/index.html?floating');await page.locator('.map-messages__row').first().click();await page.getByText('Lịch sử được giữ',{exact:true}).waitFor();await page.waitForTimeout(200);assert.equal(messageReads,1,'Opening a floating thread must fetch history once')
 assert.deepEqual(errors,[]);console.log('PASS confirmation, block/unblock, retained draft/history, API failure, remote block, single inbox request and single floating history request')
}finally{await browser.close()}
