import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
const { chromium } = createRequire(import.meta.url)(process.env.HOMEJI_PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.HOMEJI_TEST_BASE_URL || 'http://127.0.0.1:5511'
if (!['localhost','127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local fixture only')
const out = 'output/verification/rental-draft-tool'
await mkdir(out,{recursive:true})
await writeFile(out+'/fixture.html','<!doctype html><html lang="vi"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./fixture.tsx"></script></html>')
await writeFile(out+'/fixture.tsx',`
import React,{useState} from 'react';import{createRoot}from'react-dom/client';
import{RentalDraftAssistant}from'/src/components/ai/RentalDraftAssistant.tsx';
import{LiquidGlassEffects}from'/src/components/ui/LiquidGlassEffects.tsx';
import '/src/index.css';import '/src/product-ui.css';import '/src/ai-spectrum.css';import '/src/liquid-glass.css';import '/src/glass-controls.css';
function Fixture(){const[title,setTitle]=useState('Tin hiện tại');const[description,setDescription]=useState('Mô tả hiện tại');return <main style={{maxWidth:1000,margin:'40px auto',padding:16}}><LiquidGlassEffects/><RentalDraftAssistant facts={{typeLabel:'Pass phòng',address:'Thủ Đức',rent:'3000000',area:'25',amenities:[],imageCount:3}} title={title} description={description} disabled={false} onApply={draft=>{setTitle(draft.title);setDescription(draft.description)}}/><label>Tiêu đề<input aria-label="Tiêu đề" value={title} onChange={e=>setTitle(e.target.value)}/></label></main>};createRoot(document.getElementById('root')).render(<Fixture/>);`)
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const page=await browser.newPage({viewport:{width:1280,height:800}})
await page.addInitScript(()=>localStorage.setItem('homeji_access_token','draft-tool-fixture'))
let requests=0
await page.route('**/*',route=>{
 const url=new URL(route.request().url())
 if(url.origin!==new URL(base).origin)return route.abort()
 if(url.pathname==='/api/ai/rental-draft'){requests++;return route.fulfill({json:{title:'Phòng 25 m² tại Thủ Đức',description:'Mô tả được đề xuất',missing:['Kiểm tra tiền cọc']}})}
 return route.continue()
})
try{
 await page.goto(base+'/'+out+'/fixture.html')
 const tool=page.getByRole('region',{name:'Trợ lý soạn tin'})
 const toggle=tool.getByRole('button',{name:'Mở trợ lý',exact:true})
 await toggle.waitFor()
 assert.equal(await tool.locator('summary').count(),0)
 assert.equal(await tool.locator('h3').first().evaluate(e=>getComputedStyle(e).backdropFilter),'none')
 assert.equal(await toggle.getAttribute('data-glass-face'),null)
 assert.equal(await tool.getByRole('button',{name:'Tạo bản gợi ý bằng Gemini',exact:true}).isVisible(),false)
 for(const[theme,width]of[['light',1280],['dark',390]]){
  await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);await page.setViewportSize({width,height:800})
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
  await tool.screenshot({path:out+'/closed-'+theme+'.png'})
 }
 await toggle.click();assert.equal(requests,0,'Opening only reveals controls; it does not call AI')
 await tool.getByRole('button',{name:'Tạo bản gợi ý bằng Gemini',exact:true}).click()
 await tool.getByText('Phòng 25 m² tại Thủ Đức',{exact:true}).waitFor()
 const apply=tool.getByRole('button',{name:'Xác nhận thay tiêu đề và mô tả trong biểu mẫu',exact:true})
 await apply.click();assert.equal(await page.getByRole('textbox',{name:'Tiêu đề',exact:true}).inputValue(),'Phòng 25 m² tại Thủ Đức')
 await tool.getByRole('button',{name:'Tạo bản gợi ý bằng Gemini',exact:true}).click()
 await tool.getByText('Phòng 25 m² tại Thủ Đức',{exact:true}).first().waitFor()
 await page.getByRole('textbox',{name:'Tiêu đề',exact:true}).fill('Thông tin đã đổi')
 assert.equal(await apply.isDisabled(),true)
 await tool.getByRole('button',{name:'Thu gọn',exact:true}).click()
 assert.equal(await toggle.getAttribute('aria-expanded'),'false')
 assert.equal(requests,2)
 console.log('PASS draft tool: clear compact header, mobile/dark, explicit opening, preview/apply and stale protection')
}finally{await browser.close()}
