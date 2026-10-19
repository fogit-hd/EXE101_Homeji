import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
import vm from 'node:vm'

test('current hub event and reconnect announce reconciliation; obsolete session cannot',async()=>{
 const source=readFileSync('src/hooks/useNotificationHub.ts','utf8')
 let token='seller-token',reconnected
 const callbacks=new Map(),effects=[],events=[]
 const connection={on:(name,cb)=>callbacks.set(name,cb),off:()=>{},onreconnected:cb=>{reconnected=cb},start:async()=>{},stop:async()=>{},state:0}
 class Builder{withUrl(){return this}withAutomaticReconnect(){return this}configureLogging(){return this}build(){return connection}}
 const output={}
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{
  exports:output,CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail}},Event:class{constructor(type){this.type=type}},
  window:{addEventListener(){},removeEventListener(){},dispatchEvent:event=>events.push(event)},
  require:name=>name==='react'?{useEffect:cb=>effects.push(cb),useRef:value=>({current:value})}:name==='@microsoft/signalr'?{HubConnectionBuilder:Builder,HubConnectionState:{Disconnected:0},LogLevel:{None:0}}:name==='../api/client'?{getApiBaseUrl:()=>'',getStoredSession:()=>({accessToken:token,userId:'seller'})}:name==='../api/authSession'?{AUTH_EXPIRED_EVENT:'expired'}:name==='../lib/sellerOrderAlerts'?{NOTIFICATION_RECEIVED:'received',NOTIFICATION_CONNECTED:'connected'}:{requireNotificationHubAccessToken:cb=>cb(),createNotificationHubRetryPolicy:()=>({}),NotificationHubAuthenticationError:class extends Error{},isUnauthorizedHubError:()=>false}
 })
 output.useNotificationHub({enabled:true});effects.forEach(cb=>cb());await new Promise(r=>setTimeout(r,0))
 callbacks.get('notificationReceived')({type:13,id:'n1'});reconnected()
 assert.deepEqual(events.map(e=>e.type),['connected','received','connected'])
 assert.equal(events[1].detail.ownerId,'seller')
 token='replacement';callbacks.get('notificationReceived')({type:13});reconnected()
 assert.equal(events.length,3)
})
