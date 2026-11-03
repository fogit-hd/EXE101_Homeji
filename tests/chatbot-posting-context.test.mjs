import assert from 'node:assert/strict'
import test from 'node:test'
import {reactDomModule}from'./helpers/react-dom-module.mjs'
const {recoverPostingImages}=await import(reactDomModule('src/lib/chatbotPostingContext.ts'))
const file={id:'sofa',name:'th.jpeg',mimeType:'image/jpeg',data:'AA==',preview:'data:image/jpeg;base64,AA==',bytes:1}
const user=(content,attachments=[])=>({sender:1,content,attachments})
const assistant=content=>({sender:2,content})
const history=[user('đăng pas lại cái ghế giá 500k',[file]),assistant('Để đăng bán đồ cũ…'),user('tình trạng mới, kick thước 500mm*200mm, chất liệu da'),assistant('Tin đã được gửi vào hệ thống')]
test('recover the actual local photo for the reported details and numeric followup',()=>{
 for(const message of ['1. tình trạng mới, kick thước 500mm*200mm, chất liệu da','1'])assert.deepEqual(recoverPostingImages(message,history,false),[file])
})
test('do not replay photos already owned by a draft or after a new topic',()=>{
 assert.deepEqual(recoverPostingImages('1',history,true),[])
 assert.deepEqual(recoverPostingImages('tìm trọ dưới 3 triệu',history,false),[])
 assert.deepEqual(recoverPostingImages('1',[...history,user('thời tiết hôm nay')],false),[])
 assert.deepEqual(recoverPostingImages('đăng bán cái bàn 300k',history,false),[])
 assert.deepEqual(recoverPostingImages('1',[user('đăng pas cái ghế 500k')],false),[])
})
