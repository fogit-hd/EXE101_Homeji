import assert from 'node:assert/strict'
import{mkdir,readFile,writeFile}from'node:fs/promises'
import{chromium}from'playwright'
const out='output/verification/filter-live-count';await mkdir(out,{recursive:true})
let scene=await readFile('output/verification/filter-reset/scene.tsx','utf8')
scene=scene.replace('&catalog=apartments','')
await writeFile(out+'/scene.tsx',scene)
await writeFile(out+'/index.html','<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
const rows=[{id:'a',price:2000000,area:20,amenities:['WIFI']},{id:'b',price:4000000,area:30,amenities:['WIFI']},{id:'c',price:6000000,area:40,amenities:[]},{id:'d',price:4000000,area:30,amenities:[]},{id:'e',price:8000000,area:60,amenities:['WIFI'],apartment:true}]
const source={id:'source',title:'Phòng trọ gần trường',address:'Thủ Đức',price:4000000,area:28,imageUrls:[],source:'mogi',sourceUrl:'https://mogi.vn',collectedAt:'2026-11-27',sourceUpdatedAt:null}
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'})
try{for(const width of[1440,390]){
 const p=await b.newPage({viewport:{width,height:1000},reducedMotion:'reduce'})
 await p.route('**/src/contexts/AuthContext.tsx*',r=>r.fulfill({contentType:'application/javascript',body:'export const useAuth=()=>({isAuthenticated:true,profile:{id:"fixture",role:1}})'}))
 await p.route('**/src/contexts/AuthModalContext.logic.tsx*',r=>r.fulfill({contentType:'application/javascript',body:'export const useAuthModal=()=>({openAuthModal:()=>{}})'}))
 let slow=false,requests=0,slowStarted=false,fail=false
 await p.route('**/api/**',async route=>{
  const u=new URL(route.request().url()),q=u.searchParams
  if(u.pathname==='/api/rental-source-listings'){await route.fulfill({json:[source]});return}
  if(u.pathname!=='/api/rental-posts'){if(u.pathname.startsWith('/api/'))await route.fulfill({json:[]});else await route.continue();return}
  requests++
  const isSlow=slow&&q.get('maxPrice')==='3000000';if(isSlow){slowStarted=true;await new Promise(r=>setTimeout(r,1100))}
  if(fail){await route.fulfill({status:503,json:{title:'fixture failure'}}).catch(()=>{});return}
  let data=rows.filter(row=>(q.get('propertyCategory')==='apartment'?row.apartment:!row.apartment)&&(!q.has('minPrice')||row.price>=+q.get('minPrice'))&&(!q.has('maxPrice')||row.price<=+q.get('maxPrice'))&&(!q.has('minArea')||row.area>=+q.get('minArea'))&&(!q.has('maxArea')||row.area<=+q.get('maxArea'))&&q.getAll('amenities').every(v=>row.amenities.includes(v)))
  await route.fulfill({json:data}).catch(()=>{})
 })
 await p.goto(`http://localhost:5194/${out}/index.html?workspace=1&view=list`)
 await p.waitForFunction(()=>getComputedStyle(document.body).margin==='0px')
 await p.getByRole('button',{name:/^Bộ lọc/}).click()
 const sheet=width<768?p.locator('dialog.m-filter-sheet[open]'):p.locator('.map-listings__filter-sheet')
 const apply=sheet.locator('.map-listings__sheet-apply'),reset=sheet.getByRole('button',{name:'Đặt lại',exact:true})
 const expectCount=async n=>{await p.waitForFunction(({n,mobile})=>document.querySelector(mobile?'dialog.m-filter-sheet[open] .map-listings__sheet-apply':'.map-listings__filter-sheet .map-listings__sheet-apply')?.textContent.trim()===`Xem ${n} kết quả`,{n,mobile:width<768},{timeout:5000})}
 await expectCount(5)
 const initialQuery=await p.evaluate(()=>window.querySnapshot)
 const catalog=sheet.getByRole('group',{name:'Loại tin',exact:true})
 const apartment=catalog.getByRole('button',{name:'Căn hộ',exact:true}),rooms=catalog.getByRole('button',{name:'Phòng trọ',exact:true})
 await apartment.hover()
 await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))
 assert.equal(await apartment.evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)','Tab hover stays transparent')
 await apartment.click();assert.ok(await sheet.isVisible(),'Changing catalog must not close filters')
 await expectCount(1);assert.equal(await apartment.getAttribute('aria-pressed'),'true')
 assert.equal(await p.evaluate(()=>window.querySnapshot),initialQuery,'Catalog remains draft before Apply')
 await rooms.click();await expectCount(5)

 const prices=sheet.getByRole('group',{name:'Mức giá nhanh'}).getByRole('button')
 await prices.nth(1).click();await expectCount(3)
 await sheet.locator('.map-listings__range-inputs').nth(1).locator('input').nth(1).fill('25');await expectCount(0)
 assert.equal(await p.evaluate(()=>window.querySnapshot),initialQuery,'Counting must not apply draft filters')
 await reset.click();await expectCount(5)
 await sheet.getByRole('checkbox',{name:'Wifi',exact:true}).check();await expectCount(2)
 await reset.click();await expectCount(5)
 slow=true
 await prices.nth(0).click()
 for(let i=0;i<100&&!slowStarted;i++)await new Promise(r=>setTimeout(r,10))
 assert.ok(slowStarted,'Slow older request started')
 await prices.nth(2).click();await expectCount(1)
 await new Promise(r=>setTimeout(r,1200));assert.equal((await apply.innerText()).trim(),'Xem 1 kết quả','Late older response cannot replace latest draft count')
 assert.equal(await p.evaluate(()=>window.querySnapshot),initialQuery)
 fail=true
 await prices.nth(1).click()
 await p.waitForFunction(m=>document.querySelector(m?'dialog.m-filter-sheet[open] .map-listings__sheet-apply':'.map-listings__filter-sheet .map-listings__sheet-apply')?.textContent.trim()==='Xem kết quả',width<768)
 assert.equal(await apply.getAttribute('aria-busy'),'false')
 assert.match(await apply.getAttribute('title'),/Chưa tải được/)
 assert.ok(await apply.isEnabled(),'Network failure does not prevent applying draft')
 assert.ok(requests<=16,'Debounced input avoids a request per keystroke')
 fail=false;await apartment.click();await reset.click();await expectCount(1)
 assert.equal(await apartment.getAttribute('aria-pressed'),'true','Reset preserves draft catalog')
 await apply.click();await sheet.waitFor({state:'hidden'})
 await p.waitForFunction(()=>new URLSearchParams(window.querySnapshot).get('catalog')==='apartments',{},{timeout:3000})
 assert.equal(new URLSearchParams(await p.evaluate(()=>window.querySnapshot)).get('catalog'),'apartments','Apply commits catalog')
 await p.close()
}console.log('PASS draft count 5→3→0, amenity count, reset, server pages independent of loaded cards, unchanged query, stale-response cancellation, failure fallback; desktop/mobile')}finally{await b.close()}
