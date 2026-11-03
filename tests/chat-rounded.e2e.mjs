import assert from 'node:assert/strict'
import {mkdir,writeFile} from 'node:fs/promises'
import {chromium} from 'playwright'
const base=process.env.HOMEJI_TEST_BASE_URL||'http://127.0.0.1:5544'
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local fixtures only')
const out='output/verification/chat-rounded';await mkdir(out,{recursive:true})
await writeFile(out+'/index.html','<html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
await writeFile(out+'/scene.tsx',`import React from'react';import{createRoot}from'react-dom/client';import{MemoryRouter}from'react-router-dom';import{MapMessagesPanel}from'/src/components/map/MapMessagesPanel.tsx';import{ToastProvider}from'/src/components/toast/ToastProvider.tsx';import{WebglButtonGlassEffects}from'/src/components/ui/WebglButtonGlassEffects.tsx';import{LiquidGlassEffects}from'/src/components/ui/LiquidGlassEffects.tsx';import'/src/index.css';import'/src/ui-consistency.css';import'/src/ai-spectrum.css';import'/src/liquid-glass.css';import'/src/components/theme/dark-theme.css';import'/src/product-ui.css';import'/src/glass-controls.css';import'/src/auth-appearance.css';import'/src/content-surfaces.css';import'/src/workspace-readability.css';import'/src/home-refinement.css';document.documentElement.dataset.theme=new URLSearchParams(location.search).get('theme')||'dark';createRoot(document.getElementById('root')).render(<MemoryRouter><ToastProvider><WebglButtonGlassEffects/><LiquidGlassEffects/><MapMessagesPanel embedded initialConversationId="thread"/></ToastProvider></MemoryRouter>);`)
const browser=await chromium.launch({headless:true,channel:'msedge'})
try{
for(const width of [1366,390])for(const theme of ['dark','light']){
 const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'}),errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.addInitScript(()=>{localStorage.setItem('homeji_access_token','fixture');localStorage.setItem('homeji_user_id','me')})
 await page.route('**/src/contexts/AuthContext.tsx*',r=>r.fulfill({contentType:'application/javascript',body:'export const useAuth=()=>({isAuthenticated:true,profile:{id:"me",role:1,displayName:"Khách kiểm thử"}})'}))
 await page.route('**/api/**',r=>{
  const path=new URL(r.request().url()).pathname;if(!path.startsWith('/api/'))return r.continue()
  if(path==='/api/conversations')return r.fulfill({json:[{id:'thread',otherParticipantId:'owner',otherParticipantName:'Chủ phòng kiểm thử',subjectType:0,updatedAt:'2026-11-03T08:00:00Z',unreadCount:0},{id:'other',otherParticipantId:'peer',otherParticipantName:'Khách kiểm thử',subjectType:0,updatedAt:'2026-11-03T07:00:00Z',unreadCount:1}]})
  if(path==='/api/conversations/thread/messages')return r.fulfill({json:['Phòng còn trống nhé','Bạn muốn xem lúc mấy giờ?','Chiều mai mình ghé được không?','Khoảng 5 giờ nhé'].map((body,i)=>({id:'m'+i,conversationId:'thread',senderId:i<2?'owner':'me',body,sentAt:`2026-11-03T08:0${i}:00Z`}))})
  return r.fulfill({json:[]})
 })
 await page.goto(base+'/'+out+'/index.html?theme='+theme)
 await page.locator('.map-messages__bubble-body').first().waitFor()
 const geometry=await page.locator('.map-messages__bubble').evaluateAll(es=>es.map(e=>{const s=getComputedStyle(e),b=getComputedStyle(e.querySelector('.map-messages__bubble-body'));return{outer:s.backgroundColor,outerBorder:s.borderWidth,shadow:s.boxShadow,inner:b.backgroundColor,radii:[b.borderTopLeftRadius,b.borderTopRightRadius,b.borderBottomLeftRadius,b.borderBottomRightRadius].map(parseFloat)}}))
 for(const g of geometry){assert.equal(g.outer,'rgba(0, 0, 0, 0)');assert.equal(g.shadow,'none');assert.ok(g.radii.every(v=>v>=6)&&g.radii.some(v=>v>=16),'Grouped message body stays rounded')}
 const rows=await page.locator('.map-messages__row').evaluateAll(es=>es.map(e=>({radius:parseFloat(getComputedStyle(e).borderRadius),glass:e.hasAttribute('data-glass-button')})))
 assert.equal(rows.length,2)
 for(const row of rows){assert.ok(row.radius>=12,'Conversation cells must have rounded corners: '+JSON.stringify(row));assert.equal(row.glass,false)}
 assert.deepEqual(errors,[])
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
 await page.screenshot({path:out+'/'+theme+'-'+width+'.png'})
 await page.close()
}
console.log('PASS actual messaging panel, complete CSS and optical engines: received/sent/grouped bubbles and inbox cells at mobile/desktop in both themes; no live message sent')
}finally{await browser.close()}
