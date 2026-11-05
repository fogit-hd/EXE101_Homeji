import assert from 'node:assert/strict'
import test from 'node:test'
import { reactDomModule } from './helpers/react-dom-module.mjs'

const calls=[];let failPageTwo=false
globalThis.__sourceCatalogTestRequest=async(_path,{params})=>{calls.push(params.page);if(failPageTwo&&params.page===2)throw Error('page two failed');return Array.from({length:params.page<3?50:20},(_,index)=>({id:`${params.page}:${index}`}))}
const client = 'data:text/javascript;base64,' + Buffer.from('export const apiRequest=(...args)=>globalThis.__sourceCatalogTestRequest(...args)').toString('base64')
const {getRentalSourceCatalog}=await import(reactDomModule('src/api/rentalSources.ts', { './client': client }))

test('map and sidebar share all pages instead of only the first fifty',async()=>{
 const [map,list]=await Promise.all([getRentalSourceCatalog(),getRentalSourceCatalog()])
 assert.equal(map.length,120);assert.strictEqual(map,list);assert.deepEqual(calls,[1,2,3]);assert.equal(map.at(-1).id,'3:19')
})
test('failed later pages are not presented or cached as a complete catalog',async context=>{
 const future=Date.now()+61000;context.mock.method(Date,'now',()=>future)
 failPageTwo=true;await assert.rejects(getRentalSourceCatalog(),/page two failed/)
 failPageTwo=false;assert.equal((await getRentalSourceCatalog()).length,120)
})
