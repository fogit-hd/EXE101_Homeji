import test from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import React, { act } from 'react'
import { choicePickerModule } from './helpers/choice-picker-module.mjs'
import { reactDomModule } from './helpers/react-dom-module.mjs'
import { fileURLToPath } from 'node:url'

const { ChoicePicker } = await import(choicePickerModule)
globalThis.IS_REACT_ACT_ENVIRONMENT = true

async function environment() {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { pretendToBeVisual: true, url: 'https://fixture.local' })
  const keys = ['window','document','HTMLElement','HTMLDialogElement','HTMLSelectElement','HTMLButtonElement','Element','Node','Event','MouseEvent','KeyboardEvent','FocusEvent','MutationObserver']
  const previous = new Map(keys.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]))
  for(const key of keys) Object.defineProperty(globalThis,key,{configurable:true,writable:true,value:key==='window'?dom.window:dom.window[key]})
  const extras = ['getComputedStyle','requestAnimationFrame','cancelAnimationFrame']
  for(const key of extras){previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,writable:true,value:dom.window[key].bind(dom.window)})}
  dom.window.HTMLElement.prototype.scrollIntoView = ()=>{}
  dom.window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}})
  dom.window.HTMLElement.prototype.getBoundingClientRect = ()=>({left:20,right:220,top:30,bottom:74,width:200,height:44,x:20,y:30,toJSON(){return this}})
  const {createRoot}=await import('react-dom/client')
  const root=createRoot(document.getElementById('root'))
  return {root,dom,async cleanup(){await act(()=>root.unmount());dom.window.close();for(const [key,descriptor] of previous){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key]}}}
}
const option=(value,label,disabled=false)=>React.createElement('option',{value,disabled},label)
const click=async element=>act(()=>element.dispatchEvent(new MouseEvent('click',{bubbles:true})))

test('option panel remains inside its owning modal and commits the real select value',async()=>{
  const env=await environment();let selected
  try{
    await act(()=>env.root.render(React.createElement('dialog',{open:true,'data-owner':'true'},
      React.createElement('form',null,React.createElement(ChoicePicker,{name:'area',defaultValue:'a','aria-label':'Khu vực',onChange:e=>{selected=e.target.value}},option('a','Thủ Đức'),option('b','Bình Thạnh'),option('c','Không chọn được',true))))))
    await click(document.querySelector('.choice-picker__trigger'))
    const owner=document.querySelector('[data-owner]'),panel=document.querySelector('.choice-picker__panel')
    assert.ok(owner.contains(panel),'Options escaped their modal and can become inert behind it')
    assert.equal(panel.parentElement.tagName,'DIALOG')
    assert.equal(panel.parentElement.open,true)
    await click([...panel.querySelectorAll('[role=option]')].find(node=>node.textContent.includes('Bình Thạnh')))
    assert.equal(selected,'b')
    assert.equal(new window.FormData(document.querySelector('form')).get('area'),'b')
    assert.equal(document.querySelector('.choice-picker__panel'),null)
    assert.equal(document.activeElement,document.querySelector('.choice-picker__trigger'))
  }finally{await env.cleanup()}
})

test('picker Escape closes its own layer, disabled options stay disabled and the owner remains open',async()=>{
  const env=await environment()
  try {
    await act(()=>env.root.render(React.createElement('dialog',{open:true,'data-owner':'true'},React.createElement(ChoicePicker,{'aria-label':'Khu vực'},option('a','A'),option('b','B',true)))))
    await click(document.querySelector('.choice-picker__trigger'))
    assert.equal(document.querySelector('[role=option][aria-disabled=true]').disabled,true)
    await act(()=>document.querySelector('.choice-picker__search-wrap input').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true})))
    assert.equal(document.querySelector('.choice-picker__panel'),null)
    assert.equal(document.querySelector('[data-owner]').open,true)
  }finally {await env.cleanup()}
})

test('small visual viewport leaves every option in a scrollable panel within its bounds',async()=>{
  const env=await environment()
  try {
    Object.defineProperty(window,'visualViewport',{configurable:true,value:{width:390,height:140,offsetTop:12,offsetLeft:0,addEventListener(){},removeEventListener(){}}})
    await act(()=>env.root.render(React.createElement(ChoicePicker,{'aria-label':'Khu vực'},...Array.from({length:40},(_,i)=>option(String(i),'Khu vực '+i)))))
    await click(document.querySelector('.choice-picker__trigger'))
    const panel=document.querySelector('.choice-picker__panel')
    assert.ok(parseFloat(panel.style.maxHeight)<=116)
    assert.ok(parseFloat(panel.style.minHeight)<=parseFloat(panel.style.maxHeight))
    assert.equal(panel.dataset.compact,'true')
    assert.equal(panel.querySelectorAll('[role=option]').length,40)
  }finally{await env.cleanup()}
})

test('closing or hiding the owner cannot leave an orphaned top-layer picker',async()=>{
  const env=await environment()
  try{
    await act(()=>env.root.render(React.createElement('div',{role:'dialog','aria-modal':true},React.createElement(ChoicePicker,{'aria-label':'Khu vực'},option('a','A')))))
    await click(document.querySelector('.choice-picker__trigger'))
    await act(async()=>{document.querySelector('[aria-modal]').setAttribute('inert','');await Promise.resolve()})
    assert.equal(document.querySelector('.choice-picker__panel'),null)
  }finally{await env.cleanup()}
})

test('fieldset disable closes an open picker and form reset restores the initial value',async()=>{
  const env=await environment()
  try{
    await act(()=>env.root.render(React.createElement('form',null,React.createElement('fieldset',null,React.createElement(ChoicePicker,{name:'area',defaultValue:'a','aria-label':'Khu vực'},option('a','A'),option('b','B'))))))
    await click(document.querySelector('.choice-picker__trigger'))
    await act(async()=>{document.querySelector('fieldset').disabled=true;await Promise.resolve()})
    assert.equal(document.querySelector('.choice-picker__panel'),null)
    document.querySelector('fieldset').disabled=false
    await click(document.querySelector('.choice-picker__trigger'))
    await click([...document.querySelectorAll('[role=option]')].find(node=>node.textContent==='B'))
    assert.equal(document.querySelector('select').value,'b')
    await act(async()=>{document.querySelector('form').reset();await new Promise(resolve=>setTimeout(resolve,5))})
    assert.equal(document.querySelector('select').value,'a')
    assert.equal(document.querySelector('.choice-picker__value').textContent,'A')
  }finally{await env.cleanup()}
})

test('a rejected native dialog enhancement still leaves selectable options',async()=>{
  const env=await environment()
  try{
    window.HTMLDialogElement.prototype.showModal=()=>{throw new Error('Top layer unavailable')}
    await act(()=>env.root.render(React.createElement(ChoicePicker,{'aria-label':'Khu vực'},option('a','A'),option('b','B'))))
    await click(document.querySelector('.choice-picker__trigger'))
    assert.equal(document.querySelector('.choice-picker-layer').open,true)
    await click([...document.querySelectorAll('[role=option]')].find(node=>node.textContent==='B'))
    assert.equal(document.querySelector('select').value,'b')
  }finally{await env.cleanup()}
})

test('required choice validation focuses the visible control and valid selection clears it',async()=>{
  const env=await environment()
  try{
    await act(()=>env.root.render(React.createElement('form',null,React.createElement(ChoicePicker,{required:true,defaultValue:'',name:'area','aria-label':'Khu vực'},option('','Chọn khu vực',true),option('b','B')))))
    await act(()=>assert.equal(document.querySelector('form').checkValidity(),false))
    assert.equal(document.activeElement,document.querySelector('.choice-picker__trigger'))
    assert.equal(document.querySelector('.choice-picker__trigger').getAttribute('aria-invalid'),'true')
    await click(document.querySelector('.choice-picker__trigger'))
    await click([...document.querySelectorAll('[role=option]')].find(node=>node.textContent==='B'))
    assert.equal(document.querySelector('form').checkValidity(),true)
    assert.equal(document.querySelector('.choice-picker__error'),null)
  }finally{await env.cleanup()}
})

test('liquid tabs keep keyboard selection without ResizeObserver',async()=>{
  const env=await environment()
  try{
    const {LiquidTabList}=await import(reactDomModule(fileURLToPath(new URL('../src/components/ui/LiquidTabList.tsx',import.meta.url))))
    let selected='a'
    const render=()=>React.createElement(LiquidTabList,null,...['a','b'].map(id=>React.createElement('button',{key:id,role:'tab','aria-selected':selected===id,onClick:()=>{selected=id;env.root.render(render())}},id)))
    await act(()=>env.root.render(render()))
    await act(()=>{document.querySelector('[role=tab]').focus();document.querySelector('[role=tab]').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}))})
    assert.equal(selected,'b')
    assert.equal(document.activeElement.textContent,'b')
  }finally{await env.cleanup()}
})

for(const behavior of ['throw','stall']) test(`popup lifecycle survives animations that ${behavior}`,async()=>{
  const env=await environment()
  try{
    window.HTMLElement.prototype.animate=behavior==='throw'?()=>{throw new Error('Animation blocked')}:()=>({finished:new Promise(()=>{}),cancel(){}})
    const stub='data:text/javascript;base64,'+Buffer.from(behavior==='throw'?'export const animate=()=>{throw Error("Animation blocked")};':'export const animate=()=>({stop(){},then(){}});').toString('base64')
    const {useMotionPresence}=await import(reactDomModule(fileURLToPath(new URL('../src/components/motion/useMotionPresence.ts',import.meta.url)),{'motion/react':stub}))
    function Surface({open}){const {present,...presence}=useMotionPresence(open);return present?React.createElement('div',{...presence,'data-surface':'true'},'content'):null}
    await act(()=>env.root.render(React.createElement(Surface,{open:true})))
    await act(()=>env.root.render(React.createElement(Surface,{open:false})))
    const retained=document.querySelector('[data-surface]')
    if(retained)assert.ok(retained.hasAttribute('inert'))
    await act(()=>new Promise(resolve=>setTimeout(resolve,400)))
    assert.equal(document.querySelector('[data-surface]'),null)
  }finally{await env.cleanup()}
})

test('scroll reveals cannot hide interactive cards when IntersectionObserver is unavailable',async()=>{
  const env=await environment()
  try{
    const stub='data:text/javascript;base64,'+Buffer.from('export const animate=()=>({stop(){},then(resolve){resolve()}});').toString('base64')
    const {InteractionMotion}=await import(reactDomModule(fileURLToPath(new URL('../src/components/motion/InteractionMotion.tsx',import.meta.url)),{'motion/react':stub}))
    window.HTMLElement.prototype.getBoundingClientRect=()=>({top:2000,bottom:2100,left:0,right:100,width:100,height:100})
    await act(()=>env.root.render(React.createElement(React.Fragment,null,React.createElement(InteractionMotion),React.createElement('article',{className:'hub-card'},React.createElement('button',null,'Mở phòng')))))
    assert.equal(document.querySelector('.hub-card').classList.contains('hj-pre-reveal'),false)
    let called=false;document.querySelector('button').addEventListener('click',()=>{called=true})
    await click(document.querySelector('button'))
    assert.equal(called,true)
  }finally{await env.cleanup()}
})

test('shared measurement recovers when ResizeObserver is blocked and releases its resize listener',async()=>{
  const env=await environment()
  const original=Object.getOwnPropertyDescriptor(globalThis,'ResizeObserver')
  try{
    Object.defineProperty(globalThis,'ResizeObserver',{configurable:true,writable:true,value:class {constructor(){throw new Error('Observer blocked')}}})
    const {observeElementResize}=await import(reactDomModule(fileURLToPath(new URL('../src/lib/observeElementResize.ts',import.meta.url))))
    let calls=0;const stop=observeElementResize([document.getElementById('root')],()=>{calls++})
    window.dispatchEvent(new Event('resize'));assert.equal(calls,1)
    stop();window.dispatchEvent(new Event('resize'));assert.equal(calls,1)
  }finally{if(original)Object.defineProperty(globalThis,'ResizeObserver',original);else delete globalThis.ResizeObserver;await env.cleanup()}
})

test('map host readiness remains bounded without ResizeObserver',async()=>{
  const env=await environment()
  try{
    const {waitForMapHostSize}=await import(reactDomModule(fileURLToPath(new URL('../src/lib/mapWebGL.ts',import.meta.url))))
    const size=await waitForMapHostSize(document.getElementById('root'),10)
    assert.deepEqual(size,{width:0,height:0})
  }finally{await env.cleanup()}
})
