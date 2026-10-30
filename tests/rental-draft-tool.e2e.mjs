import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
const base = process.env.HOMEJI_TEST_BASE_URL || 'http://127.0.0.1:5202'
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local fixture only')
const out = 'output/verification/rental-draft-tool'
await mkdir(out, {recursive: true})
await writeFile(out+'/fixture.html', '<!doctype html><html lang="vi"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./fixture.tsx"></script></html>')
await writeFile(out+'/fixture.tsx', `
import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
import {RentalDraftAssistant} from '/src/components/ai/RentalDraftAssistant.tsx';
import {LiquidGlassEffects} from '/src/components/ui/LiquidGlassEffects.tsx';
import '/src/index.css';import '/src/liquid-glass.css';import '/src/glass-controls.css';
function Fixture(){
 const [title,setTitle]=useState('Tin hiện tại'),[description,setDescription]=useState('Mô tả hiện tại');
 const facts={typeLabel:'Nhượng phòng',address:'Linh Trung, Thủ Đức',rent:'3000000',area:'25',amenities:['Bếp'],imageCount:3,priceBasis:'room'};
 return <main style={{maxWidth:720,margin:'30px auto',padding:20}}><LiquidGlassEffects/>
 <div className="form-group"><label htmlFor="title">Tiêu đề</label><input id="title" className="form-input" value={title} onChange={e=>setTitle(e.target.value)}/><RentalDraftAssistant field="title" facts={facts} title={title} description={description} disabled={false} onApply={setTitle}/></div>
 <div className="form-group"><label htmlFor="description">Mô tả</label><textarea id="description" className="form-textarea" value={description} onChange={e=>setDescription(e.target.value)}/><RentalDraftAssistant field="description" facts={facts} title={title} description={description} disabled={false} onApply={setDescription}/></div>
 </main>
};createRoot(document.getElementById('root')).render(<Fixture/>);`)
const browser = await chromium.launch({channel: 'msedge', headless: true})
const page = await browser.newPage({viewport:{width:1280,height:900},reducedMotion:'reduce'})
let requests = 0, delay = 0
const errors=[]
page.on('pageerror', e=>errors.push(e.message))
await page.addInitScript(()=>localStorage.setItem('homeji_access_token','draft-tool-fixture'))
await page.route('**/*', async route=>{
 const url=new URL(route.request().url())
 if(url.origin!==new URL(base).origin)return route.abort()
 if(url.pathname==='/api/ai/rental-draft') {
  requests++
  if(delay)await new Promise(r=>setTimeout(r,delay))
  return route.fulfill({json:{title:'Nhượng phòng, 25 m², 3.000.000 đồng/phòng/tháng',description:'Phòng ở Linh Trung, Thủ Đức.\n\nDiện tích 25 m², có bếp. Tiền thuê 3.000.000 đồng/phòng/tháng.',missing:['Tiền cọc và hợp đồng']}}).catch(()=>{})
 }
 return route.continue()
})
try {
 await page.goto(base+'/'+out+'/fixture.html')
 const title=page.getByLabel('Tiêu đề',{exact:true}), description=page.getByLabel('Mô tả',{exact:true})
 const titleTool=page.getByRole('region',{name:'AI gợi ý tiêu đề',exact:true}), descriptionTool=page.getByRole('region',{name:'AI gợi ý mô tả',exact:true})
 await titleTool.waitFor()
 for(const field of [title,description])assert.equal(await field.evaluate(e=>e.nextElementSibling?.classList.contains('rental-draft-tool')),true)
 assert.equal(requests,0)
 assert.equal(await page.getByText('✦',{exact:true}).count(),0)
 await titleTool.getByRole('button',{name:'AI gợi ý tiêu đề',exact:true}).click()
 await titleTool.getByRole('button',{name:'Dùng tiêu đề này',exact:true}).click()
 assert.match(await title.inputValue(),/Nhượng phòng, 25 m²/)
 assert.equal(await description.inputValue(),'Mô tả hiện tại')
 const savedTitle=await title.inputValue()
 await descriptionTool.getByRole('button',{name:'AI gợi ý mô tả',exact:true}).click()
 await descriptionTool.getByRole('button',{name:'Dùng mô tả này',exact:true}).click()
 assert.match(await description.inputValue(),/Phòng ở Linh Trung/)
 assert.equal(await title.inputValue(),savedTitle)
 await titleTool.getByRole('button',{name:'AI gợi ý tiêu đề',exact:true}).click()
 const apply=titleTool.getByRole('button',{name:'Dùng tiêu đề này',exact:true});await apply.waitFor()
 await title.fill('Tiêu đề tôi vừa sửa');assert.equal(await apply.isDisabled(),true)
 await titleTool.getByRole('button',{name:'Bỏ qua',exact:true}).click()
 delay=700
 await titleTool.getByRole('button',{name:'AI gợi ý tiêu đề',exact:true}).click()
 await titleTool.getByRole('button',{name:'Hủy',exact:true}).click()
 await page.waitForTimeout(800)
 assert.equal(await titleTool.getByRole('button',{name:'Dùng tiêu đề này',exact:true}).count(),0)
 assert.equal(await title.inputValue(),'Tiêu đề tôi vừa sửa')
 delay=0
 await descriptionTool.getByRole('button',{name:'AI gợi ý mô tả',exact:true}).click();await descriptionTool.getByRole('button',{name:'Dùng mô tả này',exact:true}).waitFor()
 for(const [theme,width]of [['light',1280],['dark',390]]){
  await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);await page.setViewportSize({width,height:900})
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
  await page.screenshot({path:out+'/inline-'+theme+'.png',fullPage:true})
 }
 assert.deepEqual(errors,[])
 console.log('PASS: AI below each field, independent apply, stale protection, cancel, mobile/dark, no decorative icon')
} finally { await browser.close() }
