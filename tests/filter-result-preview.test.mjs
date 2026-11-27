import assert from 'node:assert/strict'
import test from 'node:test'
import { reactDomModule } from './helpers/react-dom-module.mjs'
const moduleUrl = code=>'data:text/javascript;base64,'+Buffer.from(code).toString('base64')
let nativeRequest,sourceRequest,marketRequest
const nativeApi=moduleUrl('export const searchRentalPosts=(...args)=>globalThis.__countNative(...args)')
globalThis.__countNative=(...args)=>nativeRequest(...args)
globalThis.__countSources=()=>sourceRequest()
globalThis.__countMarket=(...args)=>marketRequest(...args)
const {countFilterResults}=await import(reactDomModule('src/components/map/listings/filterResultPreview.ts',{
 '../../../api':moduleUrl('export const searchMarketplacePosts=(...args)=>globalThis.__countMarket(...args)'),
 '../api':nativeApi,
 '../../../api/rentalSources':moduleUrl('export const getRentalSourceCatalog=()=>globalThis.__countSources()'),
}))
const query=()=>({catalog:'rooms',keyword:'',amenities:[],page:1,bounds:null,searchOnMove:false,view:'list'})
const signal=()=>new AbortController().signal
const row=id=>({id,title:'Phòng trọ gần trường',address:'Thủ Đức',price:4000000,area:25})
test('count reads every native page and removes source/native duplicates',async()=>{
 const pages=[]
 nativeRequest=async p=>{pages.push(p.page);return p.page===1?Array.from({length:100},(_,i)=>row('n'+i)):[row('n99'),row('n100'),row('n101')]}
 sourceRequest=async()=>[row('n0'),row('s1')]
 assert.equal(await countFilterResults(query(),signal()),103)
 assert.deepEqual(pages,[1,2])
})
test('draft criteria reach backend and unsupported source amenities are not falsely counted',async()=>{
 let received;nativeRequest=async p=>{received=p;return[row('one')]}
 sourceRequest=()=>assert.fail('Sources cannot verify amenity filters')
 assert.equal(await countFilterResults({...query(),catalog:'apartments',minPrice:3000000,maxArea:30,amenities:['WIFI']},signal()),1)
 assert.equal(received.propertyCategory,'apartment');assert.equal(received.minPrice,3000000);assert.equal(received.maxArea,30);assert.deepEqual(received.amenities,['WIFI'])
})
test('source list uses the same price/area/category filter as rendered results',async()=>{
 nativeRequest=async()=>[];sourceRequest=async()=>[row('a'),{...row('b'),price:6000000},{...row('c'),area:10}]
 assert.equal(await countFilterResults({...query(),maxPrice:5000000,minArea:20},signal()),1)
})
test('failed later pages never produce a partial count',async()=>{
 nativeRequest=async p=>{if(p.page===2)throw Error('offline');return Array.from({length:100},(_,i)=>row(String(i)))}
 sourceRequest=async()=>[]
 await assert.rejects(countFilterResults(query(),signal()),/offline/)
})
test('aborted requests cannot publish a count',async()=>{
 const c=new AbortController();nativeRequest=async()=>{c.abort();return[]};sourceRequest=async()=>[]
 await assert.rejects(countFilterResults(query(),c.signal),e=>e.name==='AbortError')
})
test('marketplace results are paginated without adding rental sources',async()=>{
 const pages=[];marketRequest=async p=>{pages.push(p.page);return p.page===1?Array.from({length:100},(_,i)=>row(String(i))):[row('100')]}
 sourceRequest=()=>assert.fail('No rental sources in market count')
 assert.equal(await countFilterResults({...query(),catalog:'market'},signal()),101);assert.deepEqual(pages,[1,2])
})
