import assert from 'node:assert/strict'
import test from 'node:test'
import React,{act} from 'react'
import {JSDOM} from 'jsdom'
import {MemoryRouter} from 'react-router-dom'
import {reactDomModule} from './helpers/react-dom-module.mjs'
const {ProfileOverview}=await import(reactDomModule('src/components/profile/ProfileOverview.tsx'))
test('account overview shows saved data, optional roommate setup and edits the intended section',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost'});
 const saved=new Map(['window','document','IS_REACT_ACT_ENVIRONMENT'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 Object.assign(globalThis,{window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true});
 const {createRoot}=await import('react-dom/client');const root=createRoot(document.getElementById('root'));const edits=[];
 const profile={displayName:'Tên đã lưu',phone:'',school:'Đại học kiểm thử',contactAddress:'',role:1,onboardingCompleted:false,isPremium:false};
 try {
  await act(()=>root.render(React.createElement(MemoryRouter,null,React.createElement(ProfileOverview,{profile,verificationStatus:0,onEdit:s=>edits.push(s)}))));
  assert.match(document.body.textContent,/Tên đã lưu/); assert.match(document.body.textContent,/Tùy chọn/);assert.match(document.body.textContent,/Chưa thêm/);
  assert.equal(document.querySelectorAll('input,select,textarea').length,0);
  const buttons=[...document.querySelectorAll('button')];await act(()=>buttons.find(b=>b.textContent.includes('Chỉnh sửa')).click());await act(()=>buttons.find(b=>b.textContent.includes('Thêm nhu cầu')).click());assert.deepEqual(edits,['basic','lifestyle']);
  assert.equal(document.querySelector('a[href="/referrals"]').textContent.includes('voucher'),true);
  assert.equal(document.body.textContent.includes('Xác minh chủ nhà'),false);
  await act(()=>root.render(React.createElement(MemoryRouter,null,React.createElement(ProfileOverview,{profile:{...profile,role:2},verificationStatus:0,onEdit:s=>edits.push(s)}))));
  await act(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Xem yêu cầu')).click());assert.equal(edits.at(-1),'verify');
 } finally {await act(()=>root.unmount());dom.window.close();for(const [k,d]of saved){if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k]}}
})
