import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {mkdir,writeFile} from 'node:fs/promises'
const {chromium}=createRequire(import.meta.url)(process.env.HOMEJI_PLAYWRIGHT_MODULE||'playwright')
const base=process.env.HOMEJI_TEST_BASE_URL||'http://127.0.0.1:5518'
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local fixtures only')
const out='output/verification/tab-refraction';await mkdir(out,{recursive:true})
await writeFile(out+'/index.html','<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
await writeFile(out+'/scene.tsx',`import React,{useState}from'react';import{createRoot}from'react-dom/client';import{LiquidTabList}from'/src/components/ui/LiquidTabList.tsx';import{LiquidGlassEffects}from'/src/components/ui/LiquidGlassEffects.tsx';import'/src/index.css';import'/src/liquid-glass.css';import'/src/components/theme/dark-theme.css';import'/src/product-ui.css';import'/src/glass-controls.css';import'/src/home-refinement.css';function Scene(){const[t,setT]=useState(0);return <main style={{padding:24}}><LiquidGlassEffects/><LiquidTabList aria-label="Kiểm tra khúc xạ" style={{background:'repeating-linear-gradient(90deg,#bcd8d3 0 15px,#f3faf8 15px 30px)',borderRadius:32}}>{['Mua sắm','Quản lý cửa hàng'].map((label,i)=><button key={label} role="tab" aria-selected={t===i} onClick={()=>setT(i)}>{label}</button>)}</LiquidTabList></main>}createRoot(document.getElementById('root')).render(<Scene/>);`)
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),page=await browser.newPage({viewport:{width:650,height:220},reducedMotion:'no-preference'}),errors=[];page.on('pageerror',e=>errors.push(e.message))
try{
 await page.goto(base+'/'+out+'/index.html');await page.evaluate(()=>document.fonts.ready)
 const rail=page.getByRole('tablist'),lens=rail.locator('.liquid-tabs__lens');
 await page.waitForFunction(()=>document.querySelector('.liquid-tabs__lens')?.style.getPropertyValue('--glass-lens-filter').includes('url('));await page.waitForTimeout(700)
 for(const theme of['light','dark']){
  await page.evaluate(t=>document.documentElement.dataset.theme=t,theme)
  await rail.getByRole('tab',{name:'Quản lý cửa hàng',exact:true}).click();await page.waitForTimeout(800)
  assert.ok(await lens.evaluate(e=>+getComputedStyle(e).zIndex<+getComputedStyle(e.parentElement.querySelector('[aria-selected=true]')).zIndex));
  assert.equal(await rail.getByRole('tab',{name:'Quản lý cửa hàng'}).evaluate(e=>getComputedStyle(e).filter),'none');
  const bent=await rail.screenshot({path:out+'/'+theme+'-refraction.png'});
  const original=await lens.evaluate(e=>{const old=e.style.cssText;e.style.setProperty('backdrop-filter','none','important');e.style.setProperty('-webkit-backdrop-filter','none','important');return old});
  const flat=await rail.screenshot({path:out+'/'+theme+'-flat.png'});
  assert.notDeepEqual(bent,flat,'The patterned background must visibly refract, rather than only receive a drawn border');
  await lens.evaluate((e,css)=>e.style.cssText=css,original);
 }
 assert.deepEqual(errors,[]);console.log('PASS real background refraction with crisp foreground labels; light/dark')
}finally{await browser.close()}
