import assert from 'node:assert/strict'
import {mkdir,writeFile} from 'node:fs/promises'
import {chromium} from 'playwright'
const out='output/verification/split-performance'
await mkdir(out,{recursive:true})
await writeFile(out+'/index.html','<!doctype html><html><div id="root"></div><script type="module" src="./probe.tsx"></script></html>')
await writeFile(out+'/probe.tsx',`import React from 'react';import{createRoot}from'react-dom/client';import{useListingSplit}from'/src/components/map/listings/useListingSplit.ts';function Probe(){window.probeRenders=(window.probeRenders||0)+1;const {stageRef,style,dragging,separatorProps}=useListingSplit();return <div ref={stageRef} style={{...style,width:1200,height:600,display:'flex'}} data-resizing={dragging||undefined}><div style={{flex:'0 0 var(--ml-split-width)',background:'#eee'}}><div data-grid style={{display:'grid',gap:16,gridTemplateColumns:'repeat(var(--ml-split-columns),minmax(0,1fr))'}}>{[0,1,2,3,4,5].map(i=><div key={i} style={{height:100,background:'#ccc'}}>Phòng {i}</div>)}</div></div><div {...separatorProps} style={{width:12,flex:'0 0 12px',cursor:'col-resize',touchAction:'none'}}/><div style={{flex:1}}/></div>};createRoot(document.getElementById('root')).render(<Probe/>);`)
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'})
try {
 const p=await b.newPage({viewport:{width:1440,height:900}})
 await p.goto('http://localhost:5194/'+out+'/index.html')
 const h=p.getByRole('separator'),grid=p.locator('[data-grid]')
 await h.waitFor()
 const cols=()=>grid.evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length)
 const start=async()=>{const r=await h.boundingBox();await p.mouse.move(r.x+6,r.y+150);await p.mouse.down()}
 const move=async(x,n)=>{await p.mouse.move(x,158,{steps:15});await p.waitForFunction(n=>getComputedStyle(document.querySelector('[data-grid]')).gridTemplateColumns.split(' ').length===n,n,{timeout:1500});assert.equal(await cols(),n,'Columns must respond before pointerup')}
 await start()
 const before=await p.evaluate(()=>window.probeRenders)
 await move(860,3)
 await move(300,1)
 await move(620,2)
 const renders=await p.evaluate(()=>window.probeRenders)-before
 assert.ok(renders<=1,'Live columns must not re-render the results tree')
 await p.mouse.up()
 await start();await move(300,1);await p.mouse.up()
 await start();await move(860,3);await p.screenshot({path:out+'/one-to-three-held.png'});await p.mouse.up()
 await start();await move(300,1);await p.screenshot({path:out+'/three-to-one-held.png'})
 await h.dispatchEvent('pointercancel',{pointerId:1,pointerType:'mouse'})
 await p.mouse.up()
 assert.equal(await cols(),3,'Cancel restores both pane width and column count')
 console.log('PASS live 1↔3 columns while pointer held, cancel restores layout; React renders during 45 drag steps:',renders)
}finally{await b.close()}
