import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { reactDomModule } from './helpers/react-dom-module.mjs'
import { JSDOM } from 'jsdom'

const noop='data:text/javascript;base64,'+Buffer.from('export const RentalConsiderationToggle=()=>null').toString('base64')
const {RentalPostCard}=await import(reactDomModule('src/components/RentalPostCard.tsx',{'./ai/RentalConsiderationToggle':noop}))
const {MapListingCard}=await import(reactDomModule('src/components/MapListingCard.tsx'))
const {mapBackendListingToListingViewModel,mapMarketplacePostToListingViewModel}=await import(reactDomModule('src/components/map/listings/listingAdapters.ts'))
const {createRentalPinContent,createPricePillPinContent}=await import(reactDomModule('src/components/map/mapLocationPins.ts'))
const post={id:'room',title:'Phòng gần trường',type:1,price:3000000,area:22,address:'Thủ Đức',latitude:10.8,longitude:106.7,thumbnailPath:null,viewCount:0,saveCount:0,ownerBadge:'Premium'}

test('premium treatment follows the server entitlement, never an author badge or viewer subscription',()=>{
 for(const flag of [undefined,false,true,'true']){
  const candidate={...post,isOwnerPremium:flag}
  assert.equal(mapBackendListingToListingViewModel(candidate).isPremium,flag===true)
  for(const Card of [RentalPostCard,MapListingCard]){
   const html=renderToStaticMarkup(React.createElement(MemoryRouter,null,React.createElement(Card,{post:candidate})))
   assert.equal(html.includes('premium-listing'),flag===true)
   assert.equal(html.includes('premium-badge'),flag===true)
   assert.equal(html.includes('premium-stars'),flag===true)
   assert.match(html,/Phòng gần trường/)
  }
 }
})

test('both rental pin types decorate only strict Premium and preserve safe labels, selection and disposal',()=>{
 const dom=new JSDOM('');const previous=globalThis.document;globalThis.document=dom.window.document
 try {
  for(const premium of [undefined,false,true,'true']) for(const create of [createRentalPinContent,createPricePillPinContent]) {
   const handle=create({kind:'vacant',title:'<img src=x onerror=alert(1)>',label:'3,5 tr',selected:true,premium})
   assert.equal(handle.element.classList.contains('is-premium'),premium===true)
   assert.equal(handle.element.querySelectorAll('.premium-stars__frame').length,premium===true?12:0)
   assert.ok(handle.element.classList.contains('is-selected'))
   assert.equal(handle.element.querySelector('img'),null)
   if(create===createPricePillPinContent)assert.match(handle.element.textContent,/3,5 tr/)
   dom.window.document.body.append(handle.element);handle.dispose();assert.equal(dom.window.document.body.childElementCount,0)
  }
 } finally {globalThis.document=previous;dom.window.close()}
})

test('a marketplace seller name cannot accidentally grant a rental Premium treatment',()=>{
 const view=mapMarketplacePostToListingViewModel({...post,sellerDisplayName:'Premium',mediaUrls:[]})
 assert.equal(view.isPremium,false)
})
