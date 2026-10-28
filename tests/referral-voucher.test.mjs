import assert from 'node:assert/strict'
import test from 'node:test'
import React, { act } from 'react'
import { JSDOM } from 'jsdom'
import { reactDomModule } from './helpers/react-dom-module.mjs'
const api = 'data:text/javascript,' + encodeURIComponent(`export const getReferrals=()=>globalThis.referralTest.get(); export const quoteVoucher=(...args)=>globalThis.referralTest.quote(...args);`)
const { VoucherPicker } = await import(reactDomModule('src/components/marketplace/VoucherPicker.tsx', {'../../api/referrals':api,'../../lib/errors':'data:text/javascript,export const getErrorMessage=e=>e.message'}))
test('voucher selection filters used or wrong-purpose vouchers and ignores a stale quote after deselection', async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost'});
 const saved=new Map(['window','document','IS_REACT_ACT_ENVIRONMENT','referralTest'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 let finish; const selected=[];
 const base={rate:.05,maximumDiscount:10000,minimumSpend:100000,expiresAt:'2099-01-01',used:false,purpose:'food'};
 Object.assign(globalThis,{window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true,referralTest:{get:async()=>({vouchers:[{...base,id:'valid'},{...base,id:'used',used:true},{...base,id:'vip',purpose:'vip'}]}),quote:()=>new Promise(resolve=>{finish=resolve})}});
 const {createRoot}=await import('react-dom/client');const root=createRoot(document.getElementById('root'));
 try {
  await act(async()=>root.render(React.createElement(VoucherPicker,{purpose:'food',amount:120000,onChange:v=>selected.push(v)})));
  const select=document.querySelector('select');assert.equal(select.options.length,2);
  await act(async()=>{select.value='valid';select.dispatchEvent(new dom.window.Event('change',{bubbles:true}))});
  assert.equal(selected.at(-1).pending,true);
  await act(async()=>{select.value='';select.dispatchEvent(new dom.window.Event('change',{bubbles:true}))});
  await act(async()=>finish({discount:6000})); assert.equal(selected.at(-1),null);
 } finally {await act(()=>root.unmount());dom.window.close();for(const [k,d] of saved){if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k]}}
})
