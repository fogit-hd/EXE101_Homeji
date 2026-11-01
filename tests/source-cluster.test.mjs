import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import ts from 'typescript'
import {JSDOM} from 'jsdom'
import React,{act,useEffect,useMemo,useState} from 'react'
import{createRoot}from'react-dom/client'
const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/?view=split'});Object.assign(globalThis,{window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true})
let options,popup,opened
const pins=Array.from({length:17},(_,i)=>({id:'rental:'+crypto.randomUUID(),kind:'rental',title:'Phòng '+i,address:'Lê Văn Việt',price:2000000+i*10000,lat:10.84,lng:106.78,publisherName:'Người đăng '+i}))
class Marker{constructor(values){Object.assign(this,values)}addListener(){return{remove(){}}}}
class Popup{constructor(){popup=this}setContent(value){this.content=value}setPosition(){}open(){this.opened=true}close(){}}
const params=new URLSearchParams()
globalThis.google={maps:{InfoWindow:Popup}}
globalThis.__clusterFixture={useCatalogRefresh:()=>0,useEffect,useMemo,useState,useNavigate:()=>id=>{opened=id},useSearchParams:()=>[params],parseFiltersFromURL:()=>({}),filterRentalSources:rows=>rows,apiRequest:async()=>[],getRentalSourceCatalog:async()=>pins,sourceRoomHref:id=>'?source='+id,MarkerClusterer:class{constructor(config){options=config}clearMarkers(){}setMap(){}},SuperClusterAlgorithm:class{},readSourceCatalogPins:(rows,kind)=>kind==='rental'?rows:[],createMapClusterContent:()=>document.createElement('div'),createMarketplacePinContent:()=>({element:document.createElement('div'),dispose(){}}),createPricePillPinContent:()=>({element:document.createElement('div'),dispose(){}}),createRentalPinContent:()=>({element:document.createElement('div'),dispose(){}}),formatCompactPriceTr:String}
let source=await readFile('src/components/map/useSourceCatalogMap.ts','utf8');source=source.replace(/^import .*$/gm,'');const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText
const bindings='const {'+Object.keys(globalThis.__clusterFixture).join(',')+'}=globalThis.__clusterFixture;\n'
const{useSourceCatalogMap}=await import('data:text/javascript;base64,'+Buffer.from(bindings+js).toString('base64'))
const mapRef={current:{}},libraryRef={current:{AdvancedMarkerElement:Marker}};function Scene(){useSourceCatalogMap(mapRef,libraryRef,true,true,{marketplace:false,vacant:true},'price-pill');return null}
const root=createRoot(document.getElementById('root'));await act(async()=>{root.render(React.createElement(Scene));await new Promise(resolve=>setTimeout(resolve,0))});assert.equal(options.markers.length,17)
let zoomed=false;options.onClusterClick({}, {count:17,markers:options.markers,position:{lat:10.84,lng:106.78},bounds:{}},{fitBounds(){zoomed=true}})
assert.equal(popup.content.querySelectorAll('.source-catalog-popup').length,17);assert.equal(popup.content.querySelectorAll('a').length,17);assert.match(popup.content.textContent,/Phòng 16/);assert.equal(zoomed,false);popup.content.querySelectorAll('a')[16].click();assert.equal(opened,'?source='+pins[16].id.slice(7));popup.content.querySelector('button').click();assert.equal(zoomed,true);await act(async()=>root.unmount());console.log('PASS cluster of 17 exposes all 17 real room entries with internal detail and optional zoom')
