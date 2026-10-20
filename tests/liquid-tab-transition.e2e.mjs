import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'

const { chromium } = createRequire(import.meta.url)(process.env.HOMEJI_PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.HOMEJI_TEST_BASE_URL || 'http://127.0.0.1:5515'
if (!['localhost','127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local fixture only')
const out = 'output/verification/liquid-tab-transition'
await mkdir(out,{recursive:true})
await writeFile(`${out}/index.html`,'<!doctype html><html lang="vi" data-theme="light"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
await writeFile(`${out}/scene.tsx`, `
import React,{useState}from'react';import{createRoot}from'react-dom/client';import{LiquidTabList}from'/src/components/ui/LiquidTabList.tsx';import{LiquidGlassEffects}from'/src/components/ui/LiquidGlassEffects.tsx';import'/src/index.css';import'/src/liquid-glass.css';import'/src/components/theme/dark-theme.css';import'/src/glass-controls.css';
function Scene(){const[tab,setTab]=useState(0);return <><LiquidGlassEffects/><main style={{padding:'32px 12px',background:'var(--surface-muted)',minHeight:'100dvh'}}><h1 style={{fontSize:24}}>Ví Homeji</h1><LiquidTabList aria-label="Quản lý số dư">{['Nạp tiền','Rút tiền','Lịch sử'].map((name,i)=><button key={name} type="button" role="tab" aria-selected={tab===i} onClick={()=>setTab(i)}>{name}</button>)}</LiquidTabList><p role="tabpanel">{['Thêm tiền vào ví','Rút tiền về ngân hàng','Lịch sử giao dịch'][tab]}</p></main></>};createRoot(document.getElementById('root')).render(<Scene/>);
`)
const browser=await chromium.launch({headless:true,executablePath:process.env.HOMEJI_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const page=await browser.newPage({viewport:{width:900,height:420},reducedMotion:'no-preference'})
const errors=[];page.on('pageerror',e=>errors.push(e.message))
try{
 await page.goto(`${base}/${out}/index.html`)
 const rail=page.getByRole('tablist'), lens=rail.locator('.liquid-tabs__lens')
 await page.waitForFunction(()=>document.querySelector('.liquid-tabs')?.hasAttribute('data-lens-ready'))
 await page.evaluate(()=>document.fonts.ready)
 const identity=await lens.elementHandle()
 const frames=await rail.evaluate(async root=>{
  const lens=root.querySelector('.liquid-tabs__lens'), target=root.querySelectorAll('button')[2]
  const frames=[],started=performance.now();target.click()
  await new Promise(resolve=>{
   const sample=()=>{
    const box=lens.getBoundingClientRect(),style=getComputedStyle(lens)
    frames.push({time:performance.now()-started,x:box.x,width:box.width,strain:box.width/parseFloat(style.width),lensPlane:+style.zIndex,labelPlane:+getComputedStyle(target).zIndex,selected:target.getAttribute('aria-selected')})
    if(performance.now()-started<850)requestAnimationFrame(sample);else resolve()
   };requestAnimationFrame(sample)
  });return frames
 })
 const metrics={peakStrain:Math.max(...frames.map(f=>f.strain)),positions:new Set(frames.map(f=>Math.round(f.x))).size,opticalCrossing:frames.some(f=>f.lensPlane>f.labelPlane),frames}
 await writeFile(`${out}/motion.json`,JSON.stringify(metrics,null,2))
 console.log(JSON.stringify({peakStrain:metrics.peakStrain,positions:metrics.positions,opticalCrossing:metrics.opticalCrossing}))
 assert.ok(metrics.positions>=5,'The lens must visibly travel through intermediate positions')
 assert.ok(metrics.peakStrain>1.12,'Tab changes need a visible fluid stretch, rather than a nearly rigid 2% scale')
 assert.ok(metrics.opticalCrossing,'While traveling, the lens must refract the label plane it passes over')
 assert.equal(frames[0].selected,'true','Panel selection must not wait for the optical animation')
 assert.equal(await identity.evaluate(e=>e.isConnected),true)
 assert.equal(await page.getByRole('tabpanel').textContent(),'Lịch sử giao dịch')
 assert.ok(await lens.evaluate(e=>+getComputedStyle(e).zIndex<+getComputedStyle(e.parentElement.querySelector('[aria-selected=true]')).zIndex),'At rest foreground ink stays above the lens')
 const aligned=async()=>assert.ok(await rail.evaluate(e=>{const a=e.querySelector('[aria-selected=true]').getBoundingClientRect(),b=e.querySelector('.liquid-tabs__lens').getBoundingClientRect();return Math.abs(a.x-b.x)<2&&Math.abs(a.width-b.width)<2}),'Lens settles on the selected tab')
 await aligned()
 // Freeze a real transition across a word on a uniform rail. Only background
 // glyph refraction can change this crop when the displacement is disabled.
 await rail.getByRole('tab',{name:'Nạp tiền',exact:true}).click()
 await page.waitForFunction(()=>document.querySelector('.liquid-tabs').hasAttribute('data-lens-travel'))
 await lens.evaluate(e=>e.getAnimations({subtree:true}).forEach(a=>{a.pause();a.currentTime=160}))
 await page.waitForTimeout(60)
 const word=await rail.getByRole('tab',{name:'Rút tiền',exact:true}).evaluate(e=>{const range=document.createRange();range.selectNodeContents(e);const b=range.getBoundingClientRect();return{x:Math.floor(b.x),y:Math.floor(b.y),width:Math.ceil(b.width),height:Math.ceil(b.height)}})
 const optical=await page.screenshot({clip:word})
 const filter=await lens.evaluate(e=>{const id=getComputedStyle(e).backdropFilter.match(/#([^"\)]+)/)[1];const warp=document.getElementById(id).querySelector('feDisplacementMap');const scale=warp.getAttribute('scale');warp.setAttribute('scale','0');return{id,scale}})
 const unbent=await page.screenshot({clip:word})
 assert.notDeepEqual(optical,unbent,'Letters passing through the moving glass must actually refract')
 await page.evaluate(({id,scale})=>document.getElementById(id).querySelector('feDisplacementMap').setAttribute('scale',scale),filter)
 await lens.evaluate(e=>e.getAnimations({subtree:true}).forEach(a=>a.finish()))
 await page.waitForFunction(()=>!document.querySelector('.liquid-tabs').hasAttribute('data-lens-travel'))
 for(const width of[900,390,320])for(const theme of['light','dark']){
  await page.setViewportSize({width,height:420});await page.evaluate(t=>document.documentElement.dataset.theme=t,theme)
  await rail.getByRole('tab',{name:'Nạp tiền',exact:true}).click()
  await rail.getByRole('tab',{name:'Lịch sử',exact:true}).click()
  await rail.getByRole('tab',{name:'Rút tiền',exact:true}).click()
  await page.waitForFunction(()=>!document.querySelector('.liquid-tabs').hasAttribute('data-lens-travel'))
  await page.waitForTimeout(200);await aligned()
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
  await rail.screenshot({path:`${out}/${theme}-${width}-settled.png`})
 }
 await rail.getByRole('tab',{name:'Nạp tiền',exact:true}).click()
 await page.waitForFunction(()=>!document.querySelector('.liquid-tabs').hasAttribute('data-lens-travel'))
 const first=rail.getByRole('tab',{name:'Nạp tiền',exact:true}),last=rail.getByRole('tab',{name:'Lịch sử',exact:true})
 const from=await first.boundingBox(),to=await last.boundingBox()
 await page.mouse.move(from.x+from.width/2,from.y+from.height/2);await page.mouse.down()
 await page.mouse.move(to.x+to.width/2,to.y+to.height/2,{steps:8})
 assert.equal(await first.getAttribute('aria-selected'),'true','Dragging previews before committing selection')
 assert.equal(await rail.getAttribute('data-lens-dragging'),'true')
 assert.ok(await lens.evaluate(e=>+getComputedStyle(e).zIndex>+getComputedStyle(e.parentElement.querySelector('button')).zIndex))
 await page.mouse.up()
 assert.equal(await last.getAttribute('aria-selected'),'true')
 await page.waitForFunction(()=>!document.querySelector('.liquid-tabs').hasAttribute('data-lens-travel'))
 await page.waitForTimeout(200);await aligned()
 await page.emulateMedia({forcedColors:'active'})
 await first.click()
 assert.equal(await lens.evaluate(e=>getComputedStyle(e).backdropFilter),'none')
 assert.ok(await lens.evaluate(e=>+getComputedStyle(e).zIndex<+getComputedStyle(e.parentElement.querySelector('button')).zIndex),'High contrast labels remain above the opaque fallback even in motion')
 await page.emulateMedia({forcedColors:'none'})
 await page.emulateMedia({reducedMotion:'reduce'})
 await rail.getByRole('tab',{name:'Nạp tiền',exact:true}).focus();await page.keyboard.press('End')
 assert.equal(await rail.getByRole('tab',{name:'Lịch sử',exact:true}).getAttribute('aria-selected'),'true')
 assert.equal(await rail.getAttribute('data-lens-travel'),null)
 await aligned()
 assert.equal(await lens.evaluate(e=>e.getAnimations().length),0,'Reduced motion selects immediately without a bounce')
 assert.deepEqual(errors,[])
 console.log('PASS: visible fluid travel, optical label crossing with crisp resting ink, rapid retargeting, 320/390/900 light/dark fit, immediate reduced-motion keyboard navigation')
}finally{await browser.close()}
