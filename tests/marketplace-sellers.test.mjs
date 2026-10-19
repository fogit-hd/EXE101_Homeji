import assert from 'node:assert/strict'
import test from 'node:test'
import { reactDomModule } from './helpers/react-dom-module.mjs'
const {groupMarketplaceBySeller,marketplaceStoreUrl,marketplaceItemUrl}=await import(reactDomModule('src/lib/marketplaceSellers.ts'))
test('seller identity groups non-adjacent products without merging identical names',()=>{
 const items=[{id:'lamp',sellerId:'a',sellerDisplayName:'An'},{id:'fan',sellerId:'b',sellerDisplayName:'An'},{id:'chair',sellerId:'a',sellerDisplayName:'An'}]
 const result=groupMarketplaceBySeller(items)
 assert.deepEqual(result.map(s=>s.posts.map(p=>p.id)),[['lamp','chair'],['fan']])
 assert.deepEqual(items.map(p=>p.id),['lamp','fan','chair'])
 assert.equal(groupMarketplaceBySeller([]).length,0)
})
test('posts missing seller identity remain separate and shop links encode identifiers',()=>{
 assert.equal(groupMarketplaceBySeller([{id:'a',sellerId:''},{id:'b',sellerId:''}]).length,2)
 const url=new URL(marketplaceStoreUrl('a&item=forged'), 'https://fixture.test')
 assert.equal(url.searchParams.get('seller'),'a&item=forged')
 assert.equal(url.searchParams.has('item'),false)
 const item=new URL(marketplaceItemUrl({id:'lamp',sellerId:'a',listingType:1}),url)
 assert.equal(item.searchParams.get('market'),'browse');assert.equal(item.searchParams.get('item'),'lamp')
})

test('discovery URL normalization preserves the room recommendation dialog deep link',async()=>{
 const {parseFiltersFromURL,serializeFiltersToQuery}=await import(reactDomModule('src/components/map/listings/listingAdapters.ts'))
 const incoming=new URLSearchParams('section=listings&view=list&interest=manage')
 assert.equal(serializeFiltersToQuery(parseFiltersFromURL(incoming),incoming).get('interest'),'manage')
})
