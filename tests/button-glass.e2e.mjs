import assert from 'node:assert/strict'
import {mkdir,writeFile} from 'node:fs/promises'
import {chromium} from 'playwright'
const base=process.env.HOMEJI_TEST_BASE_URL||'http://127.0.0.1:5543'
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local glass fixture only')
const out='output/verification/button-glass';await mkdir(out,{recursive:true})
await writeFile(out+'/index.html','<html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
await writeFile(out+'/scene.tsx',`import React,{useState}from'react';import{createRoot}from'react-dom/client';import{createPortal}from'react-dom';import{WebglButtonGlassEffects}from'/src/components/ui/WebglButtonGlassEffects.tsx';import{LiquidGlassEffects}from'/src/components/ui/LiquidGlassEffects.tsx';import'/src/index.css';import'/src/liquid-glass.css';import'/src/glass-controls.css';import'/src/components/theme/dark-theme.css';import'./scene.css';document.documentElement.dataset.theme=new URLSearchParams(location.search).get('theme')||'light';function Scene(){const[n,setN]=useState(0),[selected,setSelected]=useState(false),[open,setOpen]=useState(false);return <><WebglButtonGlassEffects/><LiquidGlassEffects/><main><h1>Nút kính Homeji</h1><p>Chữ và biểu tượng nằm trên vật liệu.</p><section className="paper"><button className="demo-btn" data-glass-position="relative" onClick={()=>setN(n+1)}>Xem phòng & liên hệ</button><button className="demo-btn primary" onClick={()=>setN(n+1)}>Nhắn tin ngay</button><button className="demo-btn danger" onClick={()=>setN(n+1)}>Xóa tin</button><button className="demo-btn" disabled>Đang xử lý…</button><button className="demo-btn icon" aria-label="Đóng">×</button><button className={'demo-btn '+(selected?'primary':'')} aria-pressed={selected} onClick={()=>setSelected(!selected)}>Chọn phòng</button><a className="btn demo-btn" href="#detail">Xem chi tiết</a></section><section className="paper white"><h2>Nền trắng trong giao diện tối</h2><button className="demo-btn white-action" onClick={()=>setN(n+1)}>Lưu phòng</button></section><section className="paper"><button className="demo-btn" onClick={()=>setOpen(!open)}>Mở hộp thoại</button><output>{n} lần bấm</output></section><section className="paper"><div style={{backgroundImage:"linear-gradient(90deg,#d4f0ed,#a9c5f0)",padding:10}}><button className="demo-btn" style={{backgroundColor:"rgba(255,255,255,.1)",color:"#18343e"}}>Trên nền nhiều màu</button></div><button className="demo-btn" data-glass-exclude>Giữ thiết kế riêng</button><button className="listing__card"><h3>Thẻ nội dung không phải nút kính</h3></button><input aria-label="Nhập ngân sách" placeholder="Ngân sách"/></section>{open?createPortal(<section className="portal"><button className="demo-btn primary" onClick={()=>setOpen(false)}>Xác nhận</button></section>,document.body):null}</main></>};createRoot(document.getElementById('root')).render(<Scene/>);`)
await writeFile(out+'/scene.css',`html,body{background:var(--surface-muted)}main{max-width:800px;padding:24px;margin:auto}.paper{padding:24px;margin:20px 0;border:1px solid var(--border);border-radius:20px;background:var(--surface-elevated);display:flex;gap:16px;align-items:center;flex-wrap:wrap}.paper.white{background:#fff;color:#18343e}.paper h2{width:100%;font-size:17px}.paper.white h2{color:#18343e}.demo-btn{min-height:44px;padding:10px 20px;border-radius:999px;cursor:pointer;font:600 14px system-ui}.icon{min-width:44px;padding:0;font-size:23px}html #root .paper>.primary,.portal>.primary{background:#087b86;color:#fff}html #root .paper>.danger{background:#9d2639;color:#fff}.portal{position:fixed;bottom:20px;right:20px;padding:24px;background:#fff;border:1px solid #ccc;border-radius:20px}button:disabled{opacity:.5}.listing__card{padding:12px}h1{font-size:28px}@media(max-width:440px){main{padding:14px}.paper{padding:18px}}`)
const browser=await chromium.launch({headless:true,channel:'msedge'});const results=[]
try{
 for(const [width,theme] of [[1280,'light'],[1280,'dark'],[390,'light'],[320,'dark']]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];let contexts=0
  page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{window.buttonContexts=[];window.buttonDraws=0;const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){const result=get.call(this,kind,...args);if(kind==='webgl2'&&result){window.buttonContexts.push(result);const draw=result.drawArrays.bind(result);result.drawArrays=(...args)=>{window.buttonDraws++;return draw(...args)}}return result}})
  await page.goto(base+'/'+out+'/index.html?theme='+theme)
  const first=page.getByRole('button',{name:'Xem phòng & liên hệ'});await page.waitForFunction(()=>document.querySelector('[data-glass-button-ready]'))
  await page.waitForTimeout(150)
  assert.equal(await first.locator('canvas').count(),1)
  assert.equal(await first.getAttribute('data-glass-control'),null,'SVG optics must not stack with WebGL')
  assert.equal(await page.getByRole('button',{name:'Trên nền nhiều màu'}).getAttribute('data-glass-button-ready'),null,'Unknown scenery must keep authored paint');
  const paints=await page.locator('[data-glass-button-ready]').evaluateAll(elements=>elements.map(e=>{
   const s=getComputedStyle(e);return {label:e.textContent,ink:s.color,base:s.getPropertyValue('--button-glass-base'),filter:s.filter,backdrop:s.backdropFilter,canvasZ:getComputedStyle(e.querySelector('canvas')).zIndex,pointer:getComputedStyle(e.querySelector('canvas')).pointerEvents}
  }))
  const luminance=c=>c.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0)
  for(const paint of paints){const a=luminance(paint.ink.match(/[\d.]+/g).slice(0,3).map(Number)),b=luminance(paint.base.match(/[\d.]+/g).slice(0,3).map(Number));assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.45,JSON.stringify(paint));assert.equal(paint.filter,'none');assert.equal(paint.backdrop,'none');assert.equal(paint.canvasZ,'-1');assert.equal(paint.pointer,'none')}
  await first.click();await page.getByText('1 lần bấm',{exact:true}).waitFor();await first.press('Enter');await page.getByText('2 lần bấm',{exact:true}).waitFor()
  assert.equal(await page.getByRole('button',{name:'Đang xử lý…'}).locator('canvas').count(),0)
  assert.equal(await page.getByRole('button',{name:'Giữ thiết kế riêng'}).locator('canvas').count(),0)
  assert.equal(await page.locator('.listing__card canvas').count(),0)
  const select=page.getByRole('button',{name:'Chọn phòng'});await select.click();await page.waitForTimeout(150);assert.equal(await select.getAttribute('aria-pressed'),'true')
  await page.getByRole('button',{name:'Mở hộp thoại'}).click();await page.getByRole('button',{name:'Xác nhận'}).locator('canvas').waitFor();await page.getByRole('button',{name:'Xác nhận'}).click();await page.locator('.portal').waitFor({state:'detached'})
  await first.evaluate(e=>{e.textContent='Xem phòng & liên hệ'})
  await first.locator('canvas').waitFor()
  await first.evaluate(e=>{e.style.backgroundColor='#2461ac';e.style.color='#fff'})
  await page.waitForFunction(()=>document.querySelector('button.demo-btn')?.style.getPropertyValue('--button-glass-base')==='rgb(36 97 172)')
  await first.evaluate(e=>{e.style.removeProperty('background-color');e.style.removeProperty('color')})
  await page.waitForTimeout(100)
  const geometry=await page.locator('[data-glass-button-ready]').evaluateAll(es=>es.map(e=>{const b=e.getBoundingClientRect(),c=e.querySelector('canvas').getBoundingClientRect();return{width:b.width,height:b.height,canvasWidth:c.width,canvasHeight:c.height,delta:Math.abs(c.left-(b.left-12))}}))
  for(const g of geometry){assert.ok(g.canvasWidth<=g.width+25&&g.canvasHeight<=g.height+25&&g.delta<=2,'Canvas must remain attached to its button and never cover content')}
  const centerColors=await page.locator('[data-glass-button-ready]').evaluateAll(es=>es.map(e=>{const c=e.querySelector('canvas'),s=getComputedStyle(e),rgba=[...c.getContext('2d').getImageData(Math.floor(c.width/2),Math.floor(c.height/2),1,1).data];return{ink:s.color.match(/[\d.]+/g).slice(0,3).map(Number),rgba}}))
  for(const {ink,rgba}of centerColors){const a=luminance(ink),b=luminance(rgba.slice(0,3));assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5,'Actual shader crown must preserve readable label contrast')}
  const island=await page.locator('.white-action').evaluate(e=>getComputedStyle(e).getPropertyValue('--button-glass-base'))
  assert.ok(island.match(/[\d.]+/g).slice(0,3).every(v=>Number(v)>230),'Neutral controls on white paper must not become black in dark mode')
  await page.screenshot({path:out+'/'+theme+'-'+width+'.png'})
  await page.waitForTimeout(650);const idleDraws=await page.evaluate(()=>window.buttonDraws);await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>window.buttonDraws),idleDraws,'Idle buttons must not consume GPU frames');
  contexts=await page.evaluate(()=>window.buttonContexts.length);assert.equal(contexts,1,'All buttons share one GPU context')
  await page.evaluate(()=>window.buttonContexts[0].getExtension('WEBGL_lose_context').loseContext());await page.waitForFunction(()=>document.querySelector('[data-glass-button-fallback]'))
  await first.click();await page.getByText('3 lần bấm',{exact:true}).waitFor()
  assert.deepEqual(errors,[]);results.push({width,theme,painted:paints.length,contexts,contrastPass:true,portal:true,keyboard:true,contextLossFallback:true});await page.close()
 }
 const fallback=await browser.newPage();await fallback.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return kind==='webgl2'?null:get.call(this,kind,...args)}});await fallback.goto(base+'/'+out+'/index.html?theme=dark');await fallback.waitForFunction(()=>document.querySelector('[data-glass-button-fallback]'));await fallback.getByRole('button',{name:'Xem phòng & liên hệ'}).click();await fallback.getByText('1 lần bấm',{exact:true}).waitFor();assert.equal(await fallback.locator('[data-glass-button-ready]').count(),0);const neutral=await fallback.locator('.white-action').evaluate(e=>getComputedStyle(e).backgroundColor);assert.ok(neutral.match(/[\d.]+/g).slice(0,3).every(v=>Number(v)>230));await fallback.close();
 console.log(JSON.stringify(results,null,2))
}finally{await writeFile(out+'/results.json',JSON.stringify(results,null,2));await browser.close()}
