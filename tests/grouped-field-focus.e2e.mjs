import assert from'node:assert/strict'
import{createRequire}from'node:module'
import{mkdir,writeFile}from'node:fs/promises'
const{chromium}=createRequire(import.meta.url)(process.env.HOMEJI_PLAYWRIGHT_MODULE||'playwright')
const base=process.env.HOMEJI_TEST_BASE_URL||'http://127.0.0.1:5515'
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('Local fixture only')
const out='output/verification/grouped-field-focus'
await mkdir(out,{recursive:true})
await writeFile(out+'/index.html','<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
await writeFile(out+'/scene.tsx',[
"import React from'react';import{createRoot}from'react-dom/client';import{MemoryRouter,useLocation}from'react-router-dom';",
"import{NaturalRentalSearch}from'/src/components/ai/NaturalRentalSearch.tsx';import{MapListingsWorkspace}from'/src/components/map/listings/MapListingsWorkspace.tsx';import{LiquidGlassEffects}from'/src/components/ui/LiquidGlassEffects.tsx';",
"import'/src/index.css';import'/src/liquid-glass.css';import'/src/components/theme/dark-theme.css';import'/src/product-ui.css';import'/src/glass-controls.css';import'/src/content-surfaces.css';",
"function Scene(){return <><NaturalRentalSearch/><output id='query'>{useLocation().search}</output><div style={{height:'80dvh'}}><MapListingsWorkspace posts={[]} selectedListingId={null} hoveredListingId={null} loading={false} error='' mapNode={<div/>} onHoverListing={()=>{}} onLeaveListing={()=>{}} onSelectListing={()=>{}} onResetFilters={()=>{}}/></div></>};createRoot(document.getElementById('root')).render(<MemoryRouter initialEntries={['/?view=split']}><LiquidGlassEffects/><Scene/></MemoryRouter>);"
].join('\n'))
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const page=await browser.newPage({reducedMotion:'reduce'})
await page.route('**/src/contexts/AuthContext.tsx*',r=>r.fulfill({contentType:'application/javascript',body:'export const useAuth=()=>({isAuthenticated:true,profile:{id:"fixture",role:1}})'}))
await page.route('**/src/contexts/AuthModalContext.logic.tsx*',r=>r.fulfill({contentType:'application/javascript',body:'export const useAuthModal=()=>({openAuthModal:()=>{}})'}))
const errors=[];page.on('pageerror',e=>errors.push(e.message))
async function noInnerFrame(field){
 await field.focus()
 const c=await field.evaluate(e=>({outline:getComputedStyle(e).outlineStyle,shadow:getComputedStyle(e).boxShadow,glass:e.hasAttribute('data-glass-field'),border:getComputedStyle(e).borderWidth}))
 assert.equal(c.outline,'none','Grouped input must not add an inner focus frame')
 assert.equal(c.shadow,'none','Grouped input must not add a halo')
 assert.equal(c.glass,false,'Only the enclosing field owns its border')
 assert.equal(c.border,'0px')
}
try{
 for(const width of[1440,390])for(const theme of['light','dark']){
  await page.setViewportSize({width,height:900});await page.goto(base+'/'+out+'/index.html')
  await page.evaluate(t=>document.documentElement.dataset.theme=t,theme)
  await page.getByRole('button',{name:'Gợi ý AI',exact:true}).click()
  const text=page.locator('#natural-rental-query');await text.waitFor()
  await noInnerFrame(text)
  const form=page.locator('.natural-rental-search__form')
  assert.equal(await form.evaluate(e=>getComputedStyle(e).boxShadow),'none','AI field must not paint a green outer halo')
  const activeBorder=await form.evaluate(e=>getComputedStyle(e).borderColor)
  await text.fill('2 người, dưới 4 triệu');assert.equal(await text.inputValue(),'2 người, dưới 4 triệu')
  await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');assert.ok(await text.evaluate(e=>e===document.activeElement))
  await page.screenshot({path:out+'/'+theme+'-'+width+'-ai.png'})
  await page.keyboard.press('Escape');await page.getByRole('dialog',{name:'Gợi ý AI tìm phòng',exact:true}).waitFor({state:'hidden'})
  await page.getByRole('button',{name:'Lọc',exact:true}).click()
  const filter=page.getByRole('dialog',{name:'Bộ lọc tìm kiếm',exact:true})
  await filter.waitFor()
  const fields=filter.locator('.map-listings__range-inputs input')
  assert.equal(await fields.count(),4)
  for(let i=0;i<4;i++)await noInnerFrame(fields.nth(i))
  const before=await fields.first().locator('..').evaluate(e=>getComputedStyle(e).borderColor)
  await fields.first().focus()
  const focused=await fields.first().locator('..').evaluate(e=>getComputedStyle(e).borderColor)
  assert.notEqual(focused,before,'Keyboard focus remains visible on the single enclosing border')
  for(const[i,value]of['500000','2000000','15','40'].entries())await fields.nth(i).fill(value)
  await page.screenshot({path:out+'/'+theme+'-'+width+'-filter.png'})
  await filter.locator('button[type=submit]').click()
  await filter.waitFor({state:'detached'});await page.waitForFunction(()=>document.querySelector('#query')?.textContent.includes('minPrice=500000'))
  assert.match(await page.locator('#query').textContent(),/minPrice=500000/)
  assert.match(await page.locator('#query').textContent(),/maxArea=40/)
 }
 assert.deepEqual(errors,[]);console.log('PASS grouped AI/range fields: one border, no nested glass/focus halo, keyboard focus/Tab, editing and applied filter values; light/dark 390/1440. No AI request sent.')
}finally{await browser.close()}

