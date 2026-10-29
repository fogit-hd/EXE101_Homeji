import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

const source = (await readFile(new URL('../src/lib/giphyClient.ts', import.meta.url), 'utf8')).replace("import { apiRequest } from '../api/client'", "const apiRequest = async () => ({apiKey: 'fixture-key'})")
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const { readGiphyItem, searchChatGifs, resolveChatGif } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
const gif = { id:'hello123',title:'Xin chào',rating:'g',images:{fixed_height:{url:'https://media1.giphy.com/media/hello123/200.gif?cid=unchanged'}} }

test('search goes directly to GIPHY without caching, preserving order, query and media URL',async t=>{
  let request
  t.mock.method(globalThis,'fetch',async(input,options)=>{request={url:new URL(input),options};return Response.json({data:[gif,{...gif,id:'second'}]})})
  const result=await searchChatGifs('xin chào & @home',new AbortController().signal)
  assert.equal(request.url.origin,'https://api.giphy.com')
  assert.equal(request.url.pathname,'/v1/gifs/search')
  assert.equal(request.url.searchParams.get('q'),'xin chào & @home')
  assert.equal(request.url.searchParams.get('rating'),'g')
  assert.equal(request.options.cache,'no-store')
  assert.deepEqual(result.map(item=>item.id),['hello123','second'])
  assert.equal(result[0].url,gif.images.fixed_height.url)
})

test('untrusted URLs, deleted content and non-general ratings cannot render as GIFs',()=>{
  for(const url of ['javascript:alert(1)','https://evil.example/x','https://evil.giphy.com/x','https://media.giphy.com.evil.example/x','https://user:pass@media.giphy.com/x','http://media.giphy.com/x','https://media.giphy.com:444/x']) assert.throws(()=>readGiphyItem({...gif,images:{fixed_height:{url}}}))
  assert.throws(()=>readGiphyItem({...gif,rating:'r'}))
  assert.throws(()=>readGiphyItem(null))
})

test('resolving a persisted ID rechecks provider content rather than trusting a stored URL',async t=>{
  let requests=0
  t.mock.method(globalThis,'fetch',async(input)=>{requests++;assert.equal(new URL(input).pathname,'/v1/gifs/hello123');return Response.json({data:gif})})
  assert.equal((await resolveChatGif('hello123',new AbortController().signal)).id,'hello123')
  assert.equal(requests,1)
})

test('aborted requests and oversized input do not reach the provider',async t=>{
  let requests=0
  t.mock.method(globalThis,'fetch',async()=>{requests++;return Response.json({data:[]})})
  const controller=new AbortController();controller.abort()
  await assert.rejects(()=>searchChatGifs('hello',controller.signal))
  await assert.rejects(()=>searchChatGifs('x'.repeat(51),new AbortController().signal))
  assert.equal(requests,0)
})
