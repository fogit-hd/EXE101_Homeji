import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
const { chromium } = createRequire(import.meta.url)(process.env.HOMEJI_PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.HOMEJI_TEST_BASE_URL || 'http://127.0.0.1:5515'
if (!['127.0.0.1','localhost'].includes(new URL(base).hostname)) throw Error('Local fixtures only')
const out = 'output/verification/workspace-readability'
await mkdir(out,{recursive:true})
await writeFile(out+'/index.html','<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
await writeFile(out+'/scene.tsx',`
import{ToastProvider}from'/src/components/toast/ToastProvider.tsx';import React,{useState}from'react';import{createRoot}from'react-dom/client';import{MemoryRouter}from'react-router-dom';
import{MapMessagesPanel}from'/src/components/map/MapMessagesPanel.tsx';import{RoommateWorkspace}from'/src/components/roommates/RoommateWorkspace.tsx';import{WalletPage}from'/src/components/marketplace/wallet/WalletPage.tsx';import{SearchInterestCenter}from'/src/components/ai/SearchInterestCenter.tsx';import{PhoneAction}from'/src/components/ui/PhoneAction.tsx';import{ChoicePicker}from'/src/components/ui/ChoicePicker.tsx';import{LiquidGlassEffects}from'/src/components/ui/LiquidGlassEffects.tsx';
import'/src/index.css';import'/src/ui-consistency.css';import'/src/liquid-glass.css';import'/src/components/theme/dark-theme.css';import'/src/product-ui.css';import'/src/glass-controls.css';import'/src/content-surfaces.css';import'/src/workspace-readability.css';
const mode=new URLSearchParams(location.search).get('scene');
function Scene(){const[tab,setTab]=useState('deposit');const[view,setView]=useState('map');return <MemoryRouter initialEntries={['/?section=invitations&roommateTab=']}><LiquidGlassEffects/>{mode==='chat'?<div style={{height:'95dvh'}}><MapMessagesPanel embedded initialConversationId="conversation" userLocation={{lat:10.8,lng:106.7}}/></div>:mode==='interest'?<SearchInterestCenter/>:mode==='roommate'?<RoommateWorkspace/>:mode==='wallet'?<WalletPage tab={tab} wallet={{balance:3187900,isActivated:true,minimumTopUp:100000,maximumTopUp:5000000,minimumWithdrawalReserve:20000}} transactions={[{id:'tx',kind:9,amount:-780000,balanceAfter:3187900,description:'Gói Tối Ưu · 365 ngày',createdAt:new Date().toISOString(),referenceId:'abcdef12-3456-7890-1234-123456789012'}]} withdrawals={[]} onTabChange={setTab} onDeposit={()=>{}} onWithdraw={()=>{}}/>:<><PhoneAction phone="0901234567">Gọi điện</PhoneAction><label>Chế độ xem<ChoicePicker value={view} onChange={e=>setView(e.target.value)}><option value="map">Bản đồ</option><option value="split">Chia đôi</option><option value="list">Danh sách</option></ChoicePicker></label></>}</MemoryRouter>};createRoot(document.getElementById('root')).render(<ToastProvider><Scene/></ToastProvider>);`)
const browser = await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const context = await browser.newContext({viewport:{width:1440,height:1000}})
await context.addInitScript(()=>{localStorage.setItem('homeji_access_token','fixture');localStorage.setItem('homeji_user_id','me')})
await context.route('**/src/contexts/AuthContext.tsx*',r=>r.fulfill({contentType:'application/javascript',body:'export const useAuth=()=>({isAuthenticated:true,profile:{id:"me",role:1,displayName:"Thử nghiệm",onboardingCompleted:true},refreshProfile:async()=>{}})'}))
let sends=0, ranks=0, aiEnabled=false
const overview=()=>({settings:{enabled:true,aiEnabled,historyEnabled:false},following:[],suggestions:[],rooms:[{post:{id:'new-room',title:'Phòng mới'},reason:'Khớp ngân sách'}]});
const invitations=[{id:'received',senderId:'peer',receiverId:'me',senderDisplayName:'Nguyễn Hà',status:1,createdAt:new Date().toISOString()},{id:'sent',senderId:'me',receiverId:'peer2',receiverDisplayName:'Trần An',status:1,createdAt:new Date().toISOString()}]
await context.route('**/api/**',async r=>{
 const url=new URL(r.request().url());const path=url.pathname;if(!path.startsWith('/api/'))return r.continue();let json=[]
 if(path==='/api/search-interests')json=overview();
 if(path==='/api/search-interests/ai-ranking'){ranks++;json=overview()}
 if(path==='/api/conversations')json=[{id:'conversation',otherParticipantId:'peer',otherParticipantName:'Trần An',subjectType:2,subjectId:'product',updatedAt:new Date().toISOString(),unreadCount:0}]
 if(path==='/api/marketplace-posts/product')json={id:'product',title:'Motor máy may công nghiệp',sellerId:'peer',listingType:1,price:400000,mediaUrls:[]}
 if(path==='/api/roommate-invitations/mine')json=invitations
 if(path.endsWith('/accept'))json={...invitations[0],status:2,conversationId:'conversation'}
 if(path.endsWith('/messages')&&r.request().method()==='POST'){sends++;await new Promise(resolve=>setTimeout(resolve,120));json={id:'message-'+sends,conversationId:'conversation',senderId:'me',body:r.request().postDataJSON().body,sentAt:new Date().toISOString()}}
 return r.fulfill({json})
})
const page=await context.newPage();const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.message)})
page.on('console',m=>{if(m.type()==='error')console.error(m.text())});page.on('requestfailed',r=>console.error(r.url(),r.failure()?.errorText));
const open=mode=>page.goto(base+'/'+out+'/index.html?scene='+mode)
try{
 await open('chat');await page.getByRole('textbox',{name:'Nội dung tin nhắn'}).fill('Một lần gửi')
 await page.locator('.map-messages__composer').evaluate(e=>{e.requestSubmit();e.requestSubmit()})
 await page.locator('.map-messages__bubble').waitFor();assert.match(await page.locator('.map-messages__ctx-card').getAttribute('href'),/item=product/);assert.equal(sends,1);assert.equal(await page.locator('.map-messages__bubble').count(),1)
 await page.getByRole('button',{name:'Đính kèm vị trí hoặc địa chỉ'}).click()
 const gps=page.getByRole('menuitem').filter({hasText:'Gửi vị trí hiện tại'})
 await gps.evaluate(e=>{e.click();e.click()});await page.waitForFunction(()=>document.querySelectorAll('.map-messages__bubble').length===2);assert.equal(sends,2)
 for(const theme of['light','dark']){await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);await page.waitForTimeout(800);await page.screenshot({path:out+'/chat-'+theme+'.png'});if(theme==='dark'){const bg=await page.locator('.map-messages__bubbles').evaluate(e=>getComputedStyle(e).backgroundColor);assert.notEqual(bg,'rgb(255, 255, 255)')}}
 await open('roommate');await page.getByText('Nguyễn Hà',{exact:true}).waitFor();assert.equal(await page.locator('.roommate-card').count(),2)
 await page.getByRole('button',{name:'Cần phản hồi',exact:true}).click();assert.equal(await page.locator('.roommate-card').count(),1)
 await page.getByRole('button',{name:'Chấp nhận',exact:true}).click();await page.getByText('Không có lời mời trong mục này').waitFor()
 await page.getByRole('button',{name:'Đã kết nối',exact:true}).click();await page.getByRole('button',{name:'Nhắn tin',exact:true}).waitFor()
 for(const width of[1440,390])for(const theme of['light','dark']){await page.setViewportSize({width,height:1000});await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:out+'/roommate-'+theme+'-'+width+'.png'})}
 await open('wallet');for(const width of[1440,390])for(const theme of['light','dark']){await page.setViewportSize({width,height:1000});await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);const field=page.locator('.wallet-deposit__amount input');await field.focus();assert.equal(await field.evaluate(e=>getComputedStyle(e).boxShadow),'none');await page.screenshot({path:out+'/wallet-'+theme+'-'+width+'.png'})}
 await page.getByRole('tab',{name:'Lịch sử',exact:false}).click();await page.screenshot({path:out+'/history-dark-390.png'})
 await open('interest');await page.waitForTimeout(600);assert.equal(ranks,0,'AI must respect disabled consent');aiEnabled=true;await open('interest');await page.waitForFunction(()=>performance.now()>600);await page.waitForTimeout(500);assert.equal(ranks,1,'Opted-in new rooms are ranked automatically once');
 await open('phone');await page.getByRole('link',{name:'Gọi điện',exact:true}).click();await page.getByText('0901234567',{exact:true}).waitFor()
 await page.getByRole('combobox',{name:'Chế độ xem',exact:true}).click();await page.getByRole('option',{name:'Danh sách',exact:true}).click();assert.equal(await page.getByRole('combobox',{name:'Chế độ xem',exact:true}).innerText(),'Danh sách')
 const mobile=await browser.newContext({isMobile:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile',viewport:{width:390,height:844}});const mp=await mobile.newPage();await mp.goto(base+'/'+out+'/index.html?scene=phone');await mp.getByRole('link',{name:'Gọi điện',exact:true}).waitFor();assert.equal(await mp.getByRole('link',{name:'Gọi điện',exact:true}).evaluate(e=>{let prevented;document.addEventListener('click',event=>{prevented=event.defaultPrevented;event.preventDefault()},{once:true});e.click();return prevented}),false);await mobile.close();assert.deepEqual(errors,[]);console.log('PASS: single text/GPS writes, invitation default/filter/accept, desktop phone reveal, simple choices, wallet single border; responsive light/dark screenshots. All writes mocked.')
}catch(e){console.error(await page.locator('body').innerText());await page.screenshot({path:out+'/failure.png'});throw e}finally{await browser.close()}
