import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
const source=(await readFile(new URL('../src/api/client.ts',import.meta.url),'utf8')).replaceAll('import.meta.env.DEV','true').replaceAll('import.meta.env.VITE_API_BASE_URL','undefined')
for(const operation of ['request','upload','download'])for(const replace of [false,true])for(const status of [200,401])test(`${status} from ${operation}: replacement session=${replace}`,async()=>{
 let token='session-A',expired=0,finish
 const exports={}
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText
 const storage={getItem:()=>token,removeItem:()=>{token=null}}
 vm.runInNewContext(code,{exports,require:name=>name==='./authSession'?{readAuthTokenState:()=>({token,expired:false}),expireStoredAuth:()=>{expired++;token=null}}:{},localStorage:storage,AbortController,DOMException,URL,window:{location:{origin:'https://fixture.test'},setTimeout,clearTimeout},navigator:{onLine:true},fetch:()=>new Promise(resolve=>{finish=resolve})})
 const result=operation==='request'?exports.apiRequest('/api/profile/me'):operation==='upload'?exports.apiUpload('/api/upload',{}):exports.apiDownload('/api/file')
 if(replace)token='session-B';finish({status,ok:status===200,text:async()=>'{"detail":"Account A response"}',blob:async()=>new Blob(['Account A'])})
 if(status===401)await assert.rejects(result,e=>e.status===401);else if(replace)await assert.rejects(result,e=>e.name==='AbortError');else await result
 assert.equal(token,replace?'session-B':status===401?null:'session-A');assert.equal(expired,!replace&&status===401?1:0)
})
