import test from 'node:test'
import assert from 'node:assert/strict'
import {reactDomModule} from './helpers/react-dom-module.mjs'
const {sellerOrderAlerts, alertNeedsSound, sellerOrderUrl}=await import(reactDomModule('src/lib/sellerOrderAlerts.ts'))
const order=(id,patch={})=>({id,checkoutId:'checkout-a',sellerId:'seller',buyerId:'buyer',buyerDisplayName:'Khách A',postTitle:'Cơm gà',quantity:1,agreedPrice:40000,status:1,pickupAt:'2026-10-19T12:00:00Z',createdAt:'2026-10-19T10:00:00Z',...patch})
test('cart lines form one actionable order and never include buyer or closed orders',()=>{
 const alerts=sellerOrderAlerts([order('a'),order('b',{postTitle:'Bánh mì',agreedPrice:22000}),order('c',{sellerId:'other'}),order('d',{status:7}),order('e',{status:5})],'seller')
 assert.equal(alerts.length,1);assert.equal(alerts[0].quantity,2);assert.equal(alerts[0].total,62000)
 assert.match(alerts[0].title,/Cơm gà/);assert.match(alerts[0].title,/Bánh mì/)
})
test('acknowledging a stage survives refresh but cannot hide a new order or handoff',()=>{
 const [pending]=sellerOrderAlerts([order('a')],'seller')
 const ack={[pending.key]:pending.version}
 assert.equal(alertNeedsSound(pending,ack),false)
 assert.equal(alertNeedsSound(sellerOrderAlerts([order('a',{updatedAt:'later'})],'seller')[0],ack),false)
 const [accepted]=sellerOrderAlerts([order('a',{status:2})],'seller')
 assert.equal(alertNeedsSound(accepted,ack),true)
 const [newCartLine]=sellerOrderAlerts([order('a'),order('b')],'seller');assert.equal(alertNeedsSound(newCartLine,ack),true)
 assert.equal(sellerOrderAlerts([order('a',{status:7})],'seller').length,0)
})
test('seller links target the sale without changing buyer focus',()=>{
 const url=new URL(sellerOrderUrl('a&purchase=evil'),'https://fixture.test')
 assert.equal(url.searchParams.get('market'),'sales');assert.equal(url.searchParams.get('sale'),'a&purchase=evil');assert.equal(url.searchParams.has('purchase'),false)
})
