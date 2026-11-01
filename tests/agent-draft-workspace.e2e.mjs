import assert from 'node:assert/strict'
import { mkdir,writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'
const base=process.env.HOMEJI_TEST_BASE_URL||'http://127.0.0.1:5541'
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local workspace fixtures only')
const out='output/verification/agent-draft-workspace';await mkdir(out,{recursive:true})
await writeFile(out+'/index.html','<html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
await writeFile(out+'/scene.tsx',`import React from'react';import{createRoot}from'react-dom/client';import{MemoryRouter}from'react-router-dom';import{MapChatbot}from'/src/components/map/MapChatbot.tsx';import'/src/index.css';createRoot(document.getElementById('root')).render(<MemoryRouter><MapChatbot/></MemoryRouter>);`)
const browser=await chromium.launch({headless:true,channel:'msedge'})
const page=await browser.newPage({viewport:{width:1366,height:768},reducedMotion:'reduce'});let approvals=0
const errors=[];page.on('pageerror',e=>errors.push(e.message))
await page.addInitScript(()=>localStorage.setItem('homeji_access_token','fixture'))
await page.route('**/src/contexts/AuthContext.tsx*',r=>r.fulfill({contentType:'application/javascript',body:'export const useAuth=()=>({isAuthenticated:true,needsProfileSetup:false,profile:{id:"me"}})'}))
await page.route('**/src/contexts/AuthModalContext.logic.tsx*',r=>r.fulfill({contentType:'application/javascript',body:'export const useAuthModal=()=>({openAuthModal:()=>{},isOpen:false})'}))
await page.route('**/api/**',route=>{
 const path=new URL(route.request().url()).pathname
 if(!path.startsWith('/api/'))return route.continue()
 if(path==='/api/subscriptions/me')return route.fulfill({json:{isPremium:true,premiumExpiresAt:'2099-01-01T00:00:00Z'}})
 if(path==='/api/chatbot/popup-config')return route.fulfill({json:{enabled:true,greeting:'Chào bạn',suggestedPrompts:[]}})
 if(path.endsWith('/confirm')){approvals++;return route.fulfill({json:{postId:'published-id'}})}
 if(path==='/api/chatbot/messages'){
  const body=route.request().postDataJSON(),now=new Date().toISOString()
  return route.fulfill({json:{conversationId:'chat',userMessage:{id:'user',sender:1,content:body.message,createdAt:now},assistantMessage:{id:'assistant',sender:2,content:'Mình đã soạn bản nháp. Kiểm tra ảnh, nội dung, giá và địa chỉ trước khi xác nhận.',createdAt:now},actions:[],agentRequested:true,agentDraft:{id:'draft',images:['/landing/bloom-hero-bg2.jpg'],expiresAt:'2099-01-01T00:00:00Z',publishedPostId:null,details:{title:'Ghế sofa dài kèm bàn trà',description:'Ghế sofa và bàn trà như trong ảnh. Người mua kiểm tra tình trạng khi nhận, trao đổi thời gian và địa điểm trước khi đến.',price:500000,condition:'Đã sử dụng',category:'Nội thất',address:'Lê Văn Việt, Thủ Đức',latitude:10.84,longitude:106.8}}}})
 }
 return route.fulfill({json:[]})
})
try{
 await page.goto(base+'/'+out+'/index.html');await page.locator('#homeji-ai-conversation').waitFor({state:'attached'})
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('homeji-ai:toggle',{detail:{open:true,anchor:null}})))
 const chat=page.getByRole('textbox',{name:'Nhập tin nhắn cho Homeji'})
 await chat.fill('đăng pass lại cái ghế này 500k.');await chat.press('Enter')
 const workspace=page.getByRole('complementary',{name:'Bản nháp đang duyệt'})
 await workspace.waitFor();assert.equal(approvals,0)
 await workspace.getByLabel('Giá bán (đ)').fill('650000')
 const confirm=workspace.getByRole('button',{name:'Xác nhận đăng bài',exact:true})
 for(const viewport of[{width:1366,height:768},{width:1024,height:700},{width:390,height:844},{width:320,height:640}]){
  await page.setViewportSize(viewport)
  await workspace.getByLabel('Tiêu đề').waitFor()
  await workspace.locator('.agent-post-preview__editor').evaluate(element=>element.scrollTop=0)
  const layout=await workspace.evaluate(root=>{const photo=root.querySelector('.agent-post-preview__images'),fields=root.querySelector('fieldset');return {position:getComputedStyle(photo).position,photoBottom:photo.getBoundingClientRect().bottom,fieldsTop:fields.getBoundingClientRect().top}})
  if(viewport.width<=900) assert.ok(layout.photoBottom<=layout.fieldsTop,'Mobile photographs must not overlap the form: '+JSON.stringify(layout))
  const box=await confirm.boundingBox(),pane=await workspace.boundingBox()
  assert.ok(box.y>=pane.y&&box.y+box.height<=viewport.height,'Confirmation stays visible without scrolling chat')
  assert.ok(pane.height>=viewport.height*.7,'Draft uses most of the viewport height')
  assert.equal(await workspace.getByLabel('Giá bán (đ)').inputValue(),'650.000','Resize must keep edits')
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
  if(viewport.width>900){
   const conversation=await page.locator('.homeji-assistant__conversation').boundingBox();assert.ok(conversation.x+conversation.width<=pane.x+2,'Chat and draft have separate columns')
   assert.ok(conversation.width>300)
   if(viewport.width>=1280){const address=await workspace.locator('fieldset label').filter({hasText:'Địa chỉ giao dịch'}).locator('input').boundingBox();assert.ok(address.y+address.height<=box.y,'Desktop should show address above approval: '+JSON.stringify({address,footer:box}))}
  }else{assert.equal(await page.locator('textarea[aria-label="Nhập tin nhắn cho Homeji"]').evaluate(element=>Boolean(element.closest('[inert]'))),true,'Mobile draft isolates the composer')}
  await page.screenshot({path:out+'/'+viewport.width+'.png'})
  await workspace.getByRole('button',{name:'Về hội thoại',exact:true}).click();await workspace.waitFor({state:'hidden'})
  assert.equal(await chat.isEditable(),true)
  await page.getByRole('button',{name:/Mở bản nháp để xem và chỉnh sửa/}).click();await workspace.waitFor()
  assert.equal(await workspace.getByLabel('Giá bán (đ)').inputValue(),'650.000','Close/reopen must preserve edits')
 }
 await confirm.click();await workspace.getByText('Đã đăng lên Chợ đồ',{exact:true}).waitFor();assert.equal(approvals,1)
 assert.deepEqual(errors,[]);console.log('PASS separate desktop workspace, full-height mobile draft, visible approval footer, edits preserved on resize/close and one explicit publication')
}finally{await browser.close()}
