import assert from 'node:assert/strict'
import test from 'node:test'
import {reactDomModule} from './helpers/react-dom-module.mjs'
const {filterRentalSources,filterRentalSourcesForList}=await import(reactDomModule('src/lib/rentalSourceFilters.ts'))
const {listingReference}=await import(reactDomModule('src/lib/listingReference.ts'))
const query={catalog:'rooms',keyword:'',amenities:[],page:1,bounds:null,view:'split',searchOnMove:false}
const room={id:'source',source:'mogi',sourceId:'123',title:'Phòng Lê Văn Việt',address:'Hiệp Phú, Quận 9',price:2500000,area:25,latitude:null,longitude:null}
test('unlocated rooms remain visible while price and area filters are applied honestly',()=>{
 assert.equal(filterRentalSources([room],query).length,1)
 assert.equal(filterRentalSources([room],{...query,minPrice:3000000}).length,0)
 assert.equal(filterRentalSources([room],{...query,minArea:30}).length,0)
 assert.equal(filterRentalSources([room],{...query,keyword:'le van viet'}).length,1)
 const bounds={minLatitude:10.8,maxLatitude:10.85,minLongitude:106.76,maxLongitude:106.80}
 assert.equal(filterRentalSources([room],{...query,bounds}).length,1)
 assert.equal(filterRentalSources([{...room,latitude:10.89,longitude:106.82}],{...query,bounds}).length,0)
})
test('unknown amenities, private AI IDs and expired advertisements do not become matches',()=>{
 for(const extra of [{amenities:['AIR_CONDITIONER']},{ids:['00000000-0000-0000-0000-000000000000']},{minAvailableSlots:2},{catalog:'market'}])assert.equal(filterRentalSources([room],{...query,...extra}).length,0)
 assert.equal(filterRentalSources([{...room,sourceExpiresAt:'2020-01-01'}],query).length,0)
})
test('visible references use original source IDs or a stable encoding of the actual database UUID',()=>{
 assert.equal(listingReference('unused','mogi','22865432'),'MG-22865432')
 const id='cccccccc-cccc-4ccc-8ccc-cccccccccccc',code=listingReference(id)
 assert.ok(code.startsWith('HJ-'));assert.equal(code,listingReference(id));assert.equal(code.includes('ccccccc'),false)
 assert.equal(listingReference('00000000-0000-0000-0000-000000000000'),null)
 assert.equal(listingReference('not-an-id'),null)
})

test('the full list keeps located listings outside the current map viewport',()=>{
 const bounds={minLatitude:10.8,maxLatitude:10.85,minLongitude:106.76,maxLongitude:106.80}
 const outside={...room,latitude:10.89,longitude:106.82}
 assert.equal(filterRentalSources([outside],{...query,bounds}).length,0)
 assert.equal(filterRentalSourcesForList([outside],{...query,bounds}).length,1)
 assert.equal(filterRentalSourcesForList([outside],{...query,bounds,maxPrice:2000000}).length,0)
})

test('apartment tabs keep an individual room within an apartment in the room category',()=>{
 const apartment={...room,title:'Căn hộ Sky9 2PN'}
 const individual={...room,title:'Cho thuê phòng Master khép kín trong căn hộ 2PN'}
 assert.deepEqual(filterRentalSourcesForList([apartment,individual],{...query,catalog:'apartments'}).map(row=>row.title),[apartment.title])
 assert.deepEqual(filterRentalSourcesForList([apartment,individual],query).map(row=>row.title),[individual.title])
})
