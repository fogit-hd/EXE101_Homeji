import assert from 'node:assert/strict'
import {mkdir,writeFile} from 'node:fs/promises'
import {chromium} from 'playwright'
const base=process.env.HOMEJI_TEST_BASE_URL||'http://127.0.0.1:5544'
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local fixtures only')
const out='output/verification/normal-chat-guidance';await mkdir(out,{recursive:true})
await writeFile(out+'/index.html','<html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
await writeFile(out+'/scene.tsx',`import React from'react';import{createRoot}from'react-dom/client';import{MemoryRouter,useLocation}from'react-router-dom';import{MapChatbot}from'/src/components/map/MapChatbot.tsx';import'/src/index.css';import'/src/components/theme/dark-theme.css';document.documentElement.dataset.theme=new URLSearchParams(location.search).get('theme')||'light';function ReadLocation(){const l=useLocation();return <output id="fixture-location" hidden>{l.pathname+l.search}</output>}createRoot(document.getElementById('root')).render(<MemoryRouter><MapChatbot/><ReadLocation/></MemoryRouter>);`)
const browser=await chromium.launch({headless:true,channel:'msedge'})
try{
for(const premium of [false,true])for(const width of [390,1366]){
 const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'}),requests=[],errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.addInitScript(()=>localStorage.setItem('homeji_access_token','fixture'))
 await page.route('**/src/contexts/AuthContext.tsx*',r=>r.fulfill({contentType:'application/javascript',body:'export const useAuth=()=>({isAuthenticated:true,needsProfileSetup:false,profile:{id:"me"}})'}))
 await page.route('**/src/contexts/AuthModalContext.logic.tsx*',r=>r.fulfill({contentType:'application/javascript',body:'export const useAuthModal=()=>({openAuthModal:()=>{},isOpen:false})'}))
 await page.route('**/api/**',r=>{
  const path=new URL(r.request().url()).pathname;if(!path.startsWith('/api/'))return r.continue()
  if(path==='/api/subscriptions/me')return r.fulfill({json:{isPremium:premium,premiumExpiresAt:premium?'2099-01-01T00:00:00Z':null}})
  if(path==='/api/chatbot/popup-config')return r.fulfill({json:{enabled:true,greeting:'Chào bạn',suggestedPrompts:[]}})
  if(path==='/api/chatbot/messages'){
   const body=r.request().postDataJSON();requests.push(body);const now=new Date().toISOString()
   return r.fulfill({json:{conversationId:'chat',userMessage:{id:'u',sender:1,content:body.message,createdAt:now},assistantMessage:{id:'a',sender:2,content:'Bạn có thể đăng chiếc ghế giá **500.000đ** trên Chợ đồ. Ghi rõ tình trạng, kích thước và nơi nhận.\n\n'+(premium?'Bạn đã có Premium. Hãy chuyển sang Agent nếu muốn Homeji điền mẫu giúp.':'Bạn có thể nâng cấp Premium để Homeji điền mẫu và đăng sau khi bạn duyệt.'),createdAt:now},agentRequested:false,upgradeRequired:!premium,actions:[{id:'manual-post',kind:2,target:'/?section=marketplace',label:'Tự đăng bài',description:'Mở biểu mẫu'}]}})
  }
  return r.fulfill({json:[]})
 })
 await page.goto(base+'/'+out+'/index.html?theme='+(width===390?'dark':'light'))
 await page.locator('#homeji-ai-conversation').waitFor({state:'attached'})
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('homeji-ai:toggle',{detail:{open:true,anchor:null}})))
 await page.locator('input[type=file]').setInputFiles('public/landing/bloom-hero-bg2.jpg')
 await page.getByRole('img',{name:/bloom-hero/}).waitFor()
 const chat=page.getByRole('textbox',{name:'Nhập tin nhắn cho Homeji'})
 await chat.fill('tôi muốn pass lại cái ghế này với giá 500k');await chat.press('Enter')
 await page.getByText('Bạn có thể đăng chiếc ghế giá',{exact:false}).waitFor()
 assert.equal(requests.length,1);assert.notEqual(requests[0].postingAgent,true);assert.equal(requests[0].attachments.length,1)
 assert.equal(await page.getByRole('button',{name:'Chat',exact:true}).getAttribute('aria-pressed'),'true')
 assert.equal(await page.getByRole('complementary',{name:'Bản nháp đang duyệt'}).count(),0)
 assert.equal(await page.getByRole('button',{name:'Tự đăng bài',exact:true}).count(),1,'Manual action is not duplicated')
 assert.equal(await page.getByRole('button',{name:'Khám phá Premium',exact:true}).count(),premium?0:1)
 assert.equal(await page.getByRole('button',{name:'Xác nhận đăng bài',exact:true}).count(),0)
 assert.deepEqual(errors,[])
 await page.screenshot({path:out+'/'+(premium?'premium':'basic')+'-'+width+'.png'})
 await page.getByRole('button',{name:'Tự đăng bài',exact:true}).click()
 assert.equal(await page.locator('#fixture-location').textContent(),'/?section=marketplace')
 await page.close()
}
console.log('PASS normal Chat stays advisory for Basic/Premium with photos, one manual action, optional Basic upsell and no Agent draft or publish action; APIs mocked')
}finally{await browser.close()}
