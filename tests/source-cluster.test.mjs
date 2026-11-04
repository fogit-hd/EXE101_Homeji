import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import ts from 'typescript'
import {JSDOM} from 'jsdom'
import React,{act,useEffect,useLayoutEffect,useRef,useMemo,useState} from 'react'
import{createRoot}from'react-dom/client'
const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/?view=split'});Object.assign(globalThis,{window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true})
let entries=[],popup,opened
const pins=Array.from({length:17},(_,i)=>({id:'rental:'+crypto.randomUUID(),kind:'rental',title:'Phòng '+i,address:'Lê Văn Việt',price:2000000+i*10000,lat:10.84,lng:106.78,publisherName:'Người đăng '+i,area:25,amenityHighlights:[],sourceUpdatedAt:null}))
class Marker extends EventTarget{constructor(values){super();Object.assign(this,values)}addListener(name){assert.notEqual(name,'gmp-click','Advanced-marker DOM events must not use the deprecated Maps event API');return{remove(){}}}}
class Popup{constructor(){popup=this}setContent(value){this.content=value}setPosition(){}open(){this.opened=true}close(){}}
const params=new URLSearchParams()
globalThis.google={maps:{InfoWindow:Popup}}
globalThis.__clusterFixture={useCatalogRefresh:()=>0,useEffect,useLayoutEffect,useRef,useMemo,useState,useNavigate:()=>id=>{opened=id},useListingSearchParams:()=>[params],parseFiltersFromURL:()=>({}),filterRentalSources:rows=>rows,apiRequest:async()=>[],getRentalSourceCatalog:async()=>pins,sourceRoomHref:id=>'?source='+id,MarkerClusterer:class{constructor(config){options=config}clearMarkers(){}setMap(){}},SuperClusterAlgorithm:class{},readSourceCatalogPins:(rows,kind)=>kind==='rental'?rows:[],createMapClusterContent:()=>document.createElement('div'),createMarketplacePinContent:()=>({element:document.createElement('div'),dispose(){}}),createPricePillPinContent:()=>({element:document.createElement('div'),dispose(){}}),createRentalPinContent:()=>({element:document.createElement('div'),dispose(){}}),formatCompactPriceTr:String}
globalThis.__clusterFixture.createSourceCatalogPopup=(await import((await import('./helpers/react-dom-module.mjs')).reactDomModule('src/components/map/sourceCatalogPopup.ts'))).createSourceCatalogPopup
let source=await readFile('src/components/map/useSourceCatalogMap.ts','utf8');source=source.replace(/^import .*$/gm,'');const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText
const bindings='const {'+Object.keys(globalThis.__clusterFixture).join(',')+'}=globalThis.__clusterFixture;\n'
const{useSourceCatalogMap}=await import('data:text/javascript;base64,'+Buffer.from(bindings+js).toString('base64'))
const onChange=value=>{entries=value};const mapRef={current:{}},libraryRef={current:{AdvancedMarkerElement:Marker}};function Scene(){useSourceCatalogMap(mapRef,libraryRef,true,true,{marketplace:false,vacant:true},'price-pill',onChange);return null}
const root=createRoot(document.getElementById('root'));await act(async()=>{root.render(React.createElement(Scene));await new Promise(resolve=>setTimeout(resolve,0))});assert.equal(entries.length,17)
const {createClusterListings}=await import((await import('./helpers/react-dom-module.mjs')).reactDomModule('src/components/map/clusterListings.ts'))
assert.equal(entries.every(entry=>entry.listing.premium===false),true)
let zoomed=false
const list=createClusterListings(entries.map(entry=>entry.listing),()=>{zoomed=true})
assert.equal(list.querySelectorAll('.map-cluster-listings__card').length,17)
list.querySelectorAll('.map-cluster-listings__card')[16].click()
assert.equal(popup.opened,true)
popup.content.querySelector('a.source-catalog-popup__action').click()
assert.equal(opened,'?source='+pins[16].id.slice(7))
list.querySelector('button').click();assert.equal(zoomed,true)
await act(async()=>root.unmount());assert.equal(entries.length,0)
console.log('PASS 17 sources join shared clusters, remain non-VIP, open correct details and clean up')

let selectedPin
function SharedScene(){useSourceCatalogMap(mapRef,libraryRef,true,true,{marketplace:false,vacant:true},'price-pill',onChange,pin=>{selectedPin=pin});return null}
const sharedRoot=createRoot(document.getElementById('root'))
await act(async()=>{sharedRoot.render(React.createElement(SharedScene));await new Promise(resolve=>setTimeout(resolve,0))})
entries[16].marker.dispatchEvent(new Event('gmp-click'));assert.equal(selectedPin.id,pins[16].id)
const retiredMarker=entries[16].marker
assert.equal(selectedPin.title,pins[16].title)
await act(async()=>sharedRoot.unmount())
selectedPin=null;retiredMarker.dispatchEvent(new Event('gmp-click'));assert.equal(selectedPin,null,'Unmount removes DOM marker listeners')
console.log('PASS source cluster selection delegates to shared React preview')
