import assert from 'node:assert/strict'
import {mkdir,writeFile} from 'node:fs/promises'
import {chromium} from 'playwright'
const base=process.env.HOMEJI_TEST_BASE_URL||'http://127.0.0.1:5544'
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local fixtures only')
const out='output/verification/flashlight-click-only';await mkdir(out,{recursive:true})
await writeFile(out+'/index.html','<html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
// Real styles and icon, with the same state wiring as both detail panels.
await writeFile(out+'/scene.tsx',`import React,{useState}from'react';import{createRoot}from'react-dom/client';import{ContactFlashlightIcon}from'/src/components/profile/ContactFlashlightIcon.tsx';import'/src/index.css';import'/src/components/map/listings/RoomDetailModal.css';import'/src/components/map/listings/SourceRoomDetail.css';
function Owner(){const[on,set]=useState(false);return <div id="owner" style={{width:320,margin:24}} className={'room-detail__owner-phone'+(on?' is-revealed':'')}><div><span>{on?'0941234567':'094•••••••'}</span></div><button type="button" aria-label="owner" className={'room-detail__flashlight'+(on?' is-lit':'')} aria-pressed={on} onClick={()=>set(v=>!v)}><ContactFlashlightIcon/></button></div>}
function Source(){const[on,set]=useState(false);return <button id="source" type="button" aria-label="source" style={{position:'relative',width:320,margin:24}} className="source-room-detail__phone" aria-pressed={on} onClick={()=>set(v=>!v)}><ContactFlashlightIcon/><span>{on?'0941234567':'094•••••••'}</span></button>}
createRoot(document.getElementById('root')).render(<><Owner/><Source/></>)`)
const browser=await chromium.launch({headless:true,channel:'msedge'})
const light=(page,host,icon)=>page.evaluate(([host,icon])=>{const h=document.querySelector(host),i=document.querySelector(icon);return{before:+getComputedStyle(h,'::before').opacity,beam:+getComputedStyle(i.querySelector('.room-detail__flashlight-beam')).opacity,rays:+getComputedStyle(i.querySelector('.room-detail__flashlight-rays')).opacity}},[host,icon])
try{
 const page=await browser.newPage({viewport:{width:800,height:500},reducedMotion:'reduce'}),errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.goto(base+'/'+out+'/index.html')
 for(const [name,host,control] of [['owner','#owner','#owner button'],['source','#source','#source']]){
  await page.locator(control).waitFor()
  const off=value=>assert.deepEqual(value,{before:0,beam:0,rays:0},name+' stays dark')
  await page.mouse.move(790,490);await page.waitForTimeout(450);off(await light(page,host,control))
  await page.locator(control).hover();await page.waitForTimeout(450);off(await light(page,host,control))
  await page.locator(control).focus();await page.keyboard.press('Shift+Tab');await page.keyboard.press('Tab');await page.waitForTimeout(450)
  off(await light(page,host,control))
  assert.notEqual(await page.locator(control).evaluate(el=>getComputedStyle(el).outlineStyle),'none',name+' keeps a keyboard focus ring')
  assert.ok((await page.locator(host).innerText()).includes('•'),name+' number stays masked before the click')
  await page.locator(control).click();await page.mouse.move(790,490);await page.waitForTimeout(1100)
  const on=await light(page,host,control)
  assert.ok(on.before>0&&on.beam>0&&on.rays>0,name+' lights after the click: '+JSON.stringify(on))
  assert.ok((await page.locator(host).innerText()).includes('0941234567'),name+' number shows after the click')
  await page.locator(control).click();await page.mouse.move(790,490);await page.waitForTimeout(450);off(await light(page,host,control))
 }
 assert.deepEqual(errors,[])
 console.log('PASS flashlight stays dark on hover and focus, lights and reveals the number only after a click; both panels')
}finally{await browser.close()}
