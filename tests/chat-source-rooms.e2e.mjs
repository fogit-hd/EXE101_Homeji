import assert from 'node:assert/strict'
import {mkdir,writeFile} from 'node:fs/promises'
import {chromium} from 'playwright'
const base=process.env.HOMEJI_TEST_BASE_URL||'http://127.0.0.1:5544'
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local fixtures only')
const out='output/verification/chat-source-rooms';await mkdir(out,{recursive:true})
await writeFile(out+'/index.html','<html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
await writeFile(out+'/scene.tsx',`import React from'react';import{createRoot}from'react-dom/client';import{MemoryRouter,useLocation}from'react-router-dom';import{MapChatbot}from'/src/components/map/MapChatbot.tsx';import'/src/index.css';import'/src/components/theme/dark-theme.css';document.documentElement.dataset.theme=new URLSearchParams(location.search).get('theme')||'light';function ReadLocation(){const l=useLocation();return <output id="fixture-location" hidden>{l.pathname+l.search}</output>}createRoot(document.getElementById('root')).render(<MemoryRouter><MapChatbot/><ReadLocation/></MemoryRouter>);`)
const criteria={location:null,keyword:null,priceMin:null,priceMax:3000000,areaMin:null,areaMax:null,criteria:[],requiredAmenities:[],excludedAmenities:[],unknown:[],budgetBasis:'rent'}
const room=i=>({id:`00000000-0000-4000-8000-00000000000${i}`,title:`Phòng trọ đường số ${i}, có gác và cửa sổ thoáng`,address:`Đường số ${i}, Tăng Nhơn Phú, Quận 9`,price:2000000+i*100000,area:20+i,amenities:['Máy lạnh','Bếp','Wi-Fi','Giờ tự do'],depositLabel:'Cọc 1 tháng',excerpt:'Mô tả ngắn'})
const browser=await chromium.launch({headless:true,channel:'msedge'})
try{
for(const width of [320,390,1366]){
 const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'}),requests=[],errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.addInitScript(()=>localStorage.setItem('homeji_access_token','fixture'))
 await page.route('**/src/contexts/AuthContext.tsx*',r=>r.fulfill({contentType:'application/javascript',body:'export const useAuth=()=>({isAuthenticated:true,needsProfileSetup:false,profile:{id:"me"}})'}))
 await page.route('**/src/contexts/AuthModalContext.logic.tsx*',r=>r.fulfill({contentType:'application/javascript',body:'export const useAuthModal=()=>({openAuthModal:()=>{},isOpen:false})'}))
 await page.route('**/api/**',r=>{
  const path=new URL(r.request().url()).pathname;if(!path.startsWith('/api/'))return r.continue()
  if(path==='/api/subscriptions/me')return r.fulfill({json:{isPremium:false}})
  if(path==='/api/chatbot/popup-config')return r.fulfill({json:{enabled:true,greeting:'Chào bạn',suggestedPrompts:[]}})
  if(path==='/api/chatbot/messages'){
   const body=r.request().postDataJSON();requests.push(body);const now=new Date().toISOString(),first=requests.length===1
   return r.fulfill({json:{conversationId:'chat',userMessage:{id:'u'+requests.length,sender:1,content:body.message,createdAt:now},assistantMessage:{id:'a'+requests.length,sender:2,content:first?'Có 91 phòng khớp điều kiện của bạn, mình hiện trước 3 phòng.':'Phòng 1 rẻ nhất, giá 2.100.000 đồng/tháng.',createdAt:now},
    searchUpdate:first?{criteria,posts:[],highlightTag:'Test',mapFocusLabel:null,mapFocusLatitude:null,mapFocusLongitude:null}:null,sourceRooms:first?{total:91,rooms:[room(1),room(2),room(3)]}:null,
    actions:first?[{id:'all-rooms',kind:2,target:'/?section=listings&view=list',label:'Xem toàn bộ danh sách phòng',description:'Mở danh sách'}]:[]}})
  }
  return r.fulfill({json:[]})
 })
 await page.goto(base+'/'+out+'/index.html')
 await page.locator('#homeji-ai-conversation').waitFor({state:'attached'})
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('homeji-ai:toggle',{detail:{open:true,anchor:null}})))
 const chat=page.getByRole('textbox',{name:'Nhập tin nhắn cho Homeji'})
 await chat.fill('Tìm phòng dưới 3 triệu');await chat.press('Enter')
 const results=page.getByRole('region',{name:'Phòng khớp yêu cầu của bạn'})
 await results.waitFor()
 assert.equal(await results.getByRole('link').count(),3)
 assert.equal(await page.getByText('Chưa có tin phù hợp',{exact:false}).count(),0,'Source rooms are not reported as an empty result')
 assert.equal(await page.getByText('0 tin',{exact:true}).count(),0,'No zero count beside listed rooms')
 assert.equal(await page.getByRole('button',{name:'Áp dụng lên bản đồ'}).count(),0,'Nothing to apply when only source rooms matched')
 assert.match(await results.getByRole('link').first().innerText(),/^1\. /,'Cards are numbered so "phòng 2" is unambiguous')
 assert.equal(await results.getByRole('link').nth(1).getAttribute('href'),'/?source='+room(2).id,'Cards open the source room')
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)
 assert.ok(overflow<=0,'No horizontal overflow at '+width)
 const box=await results.getByRole('link').first().boundingBox();assert.ok(box.height>=44,'Card is a usable touch target')
 await page.screenshot({path:out+'/results-'+width+'.png'})
 await page.getByRole('button',{name:'Phòng nào rẻ nhất?',exact:true}).click()
 await page.getByText('Phòng 1 rẻ nhất',{exact:false}).waitFor()
 assert.equal(requests.length,2);assert.equal(requests[1].previousCriteria.priceMax,3000000,'Follow-up keeps the criteria that produced the list')
 assert.equal(await page.getByRole('button',{name:'Phòng nào rẻ nhất?',exact:true}).count(),0,'Suggestions leave once the list is no longer the latest reply')
 assert.equal(await results.getByRole('link').count(),3,'The list stays visible for reference')
 assert.deepEqual(errors,[])
 await page.close()
}
console.log('PASS chat shows numbered source rooms at 320, 390 and 1366 px, follow-up keeps criteria; APIs mocked')
}finally{await browser.close()}
