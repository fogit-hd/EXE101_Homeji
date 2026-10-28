import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { reactDomModule } from './helpers/react-dom-module.mjs'

const noop='data:text/javascript;base64,'+Buffer.from('export const RentalConsiderationToggle=()=>null').toString('base64')
const {RentalPostCard}=await import(reactDomModule('src/components/RentalPostCard.tsx',{'./ai/RentalConsiderationToggle':noop}))
const {MapListingCard}=await import(reactDomModule('src/components/MapListingCard.tsx'))
const {mapBackendListingToListingViewModel,mapMarketplacePostToListingViewModel}=await import(reactDomModule('src/components/map/listings/listingAdapters.ts'))
const post={id:'room',title:'Phòng gần trường',type:1,price:3000000,area:22,address:'Thủ Đức',latitude:10.8,longitude:106.7,thumbnailPath:null,viewCount:0,saveCount:0,ownerBadge:'Premium'}

test('premium treatment follows the server entitlement, never an author badge or viewer subscription',()=>{
 for(const flag of [undefined,false,true,'true']){
  const candidate={...post,isOwnerPremium:flag}
  assert.equal(mapBackendListingToListingViewModel(candidate).isPremium,flag===true)
  for(const Card of [RentalPostCard,MapListingCard]){
   const html=renderToStaticMarkup(React.createElement(MemoryRouter,null,React.createElement(Card,{post:candidate})))
   assert.equal(html.includes('premium-listing'),flag===true)
   assert.equal(html.includes('premium-badge'),flag===true)
   assert.match(html,/Phòng gần trường/)
  }
 }
})

test('a marketplace seller name cannot accidentally grant a rental Premium treatment',()=>{
 const view=mapMarketplacePostToListingViewModel({...post,sellerDisplayName:'Premium',mediaUrls:[]})
 assert.equal(view.isPremium,false)
})
