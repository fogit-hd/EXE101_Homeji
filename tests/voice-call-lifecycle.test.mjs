import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import test from 'node:test'
import ts from 'typescript'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { JSDOM } from 'jsdom'

const require = createRequire(import.meta.url)
const url = code => `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
const compile = source => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } }).outputText
const reactImports = source => source.replaceAll("'react'", JSON.stringify(pathToFileURL(require.resolve('react')).href)).replaceAll('"react/jsx-runtime"', JSON.stringify(pathToFileURL(require.resolve('react/jsx-runtime')).href))
const contextUrl = url(reactImports(compile(await readFile(new URL('../src/contexts/voice-call.ts', import.meta.url), 'utf8'))))
const mocksUrl = url(`
export const useAuth=()=>({isAuthenticated:true,profile:{id:'me'}});
export const apiRequest=async()=>({available:true,iceServers:[]});
export const getApiBaseUrl=()=>'';
export const getStoredSession=()=>({accessToken:'fixture'});
export const ensureFreshSession=async()=>{};
export const getErrorMessage=e=>e.message;
export const LogLevel={None:0};export const HubConnectionState={Connected:'Connected'};
export class HubConnectionBuilder{withUrl(){return this}withAutomaticReconnect(){return this}configureLogging(){return this}build(){return globalThis.__voiceTest.hub}}
`)
let source = await readFile(new URL('../src/contexts/VoiceCallContext.tsx', import.meta.url), 'utf8')
source = source.replace("import './VoiceCallContext.css'", '')
for (const name of ['@microsoft/signalr', '../api/client', '../api/sessionRefresh', './AuthContext', '../lib/errors']) source = source.replaceAll(`'${name}'`, JSON.stringify(mocksUrl))
source = source.replace("'./voice-call'", JSON.stringify(contextUrl))
const { VoiceCallProvider } = await import(url(reactImports(compile(source))))
const { useVoiceCalls } = await import(contextUrl)

async function fixture(media) {
  const dom = new JSDOM('<div id="root"></div>', { url:'http://localhost' })
  globalThis.window = dom.window; globalThis.document = dom.window.document
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  Object.defineProperty(globalThis, 'navigator', { configurable:true, value:{mediaDevices:{getUserMedia:media}} })
  const events = {}, invokes = [], peers = []
  const hub = { state:'Connected', connectionId:'device', on:(name,handler)=>{events[name]=handler}, onclose(){}, onreconnected(){}, onreconnecting(){}, start:async()=>{}, stop:async()=>{}, invoke:async(name,...args)=>{invokes.push([name,...args]);return name==='StartCall'?'call-1':undefined} }
  globalThis.__voiceTest = {hub}
  globalThis.RTCPeerConnection = class {
    constructor(){peers.push(this);this.connectionState='new';this.candidates=[]}
    addTrack(){} close(){this.closed=true}
    async createOffer(){return {type:'offer',sdp:'offer'}}
    async createAnswer(){return {type:'answer',sdp:'answer'}}
    async setLocalDescription(value){this.localDescription=value}
    async setRemoteDescription(value){this.remoteDescription=value}
    async addIceCandidate(value){this.candidates.push(value)}
  }
  function Controls(){const voice=useVoiceCalls();return React.createElement('button',{id:'start',disabled:!voice.ready,onClick:()=>voice.startCall('conversation','Người nhận')},'Call')}
  const root = createRoot(document.getElementById('root'))
  await act(async()=>{root.render(React.createElement(VoiceCallProvider,null,React.createElement(Controls)))})
  return {events,invokes,peers,click:async(selector)=>act(async()=>document.querySelector(selector).click()), close:async()=>{await act(async()=>root.unmount());dom.window.close()}}
}
const localStream = () => {const track={enabled:true,stopped:false,stop(){this.stopped=true}};return {track,stream:{getTracks:()=>[track],getAudioTracks:()=>[track]}}}

test('cancelling while microphone permission is pending stops the late stream without placing a call', async()=>{
  let resolveMedia
  const local=localStream(), f=await fixture(()=>new Promise(resolve=>{resolveMedia=resolve}))
  try {
    await f.click('#start')
    assert.match(document.body.textContent,/Đang chuẩn bị micro/)
    await f.click('[aria-label="Đóng thông báo cuộc gọi"]')
    await act(async()=>resolveMedia(local.stream))
    assert.equal(local.track.stopped,true)
    assert.equal(f.invokes.some(([name])=>name==='StartCall'),false)
  } finally {await f.close()}
})

test('outgoing call connects only after RTC reports connected, drains ICE, mutes and cleans up on unmount', async()=>{
  const local=localStream(), f=await fixture(async()=>local.stream)
  try {
    await f.click('#start')
    assert.match(document.body.textContent,/Đang chờ người nhận/)
    await act(async()=>f.events.callAccepted('call-1'))
    assert.equal(f.invokes.some(([name,,kind])=>name==='Signal'&&kind==='offer'),true)
    await act(async()=>f.events.callSignal({callId:'call-1',kind:'candidate',payload:'{"candidate":"candidate"}'}))
    assert.equal(f.peers[0].candidates.length,0)
    await act(async()=>f.events.callSignal({callId:'call-1',kind:'answer',payload:'{"type":"answer","sdp":"answer"}'}))
    assert.equal(f.peers[0].candidates.length,1)
    await act(async()=>{f.peers[0].connectionState='connected';f.peers[0].onconnectionstatechange()})
    assert.match(document.body.textContent,/0:00/)
    await f.click('[aria-pressed="false"]')
    assert.equal(local.track.enabled,false)
  } finally {await f.close()}
  assert.equal(local.track.stopped,true)
  assert.equal(f.peers[0].closed,true)
})

test('incoming calls can be declined before microphone access', async()=>{
  let requested=0
  const f=await fixture(async()=>{requested++;return localStream().stream})
  try {
    await act(async()=>f.events.incomingCall({callId:'incoming',conversationId:'conversation',callerName:'Bạn A'}))
    assert.match(document.body.textContent,/Cuộc gọi thoại đến/)
    await f.click('.voice-call__end')
    assert.equal(requested,0)
    assert.deepEqual(f.invokes.at(-1),['EndCall','incoming'])
  } finally {await f.close()}
})
