import assert from 'node:assert/strict'
import test from 'node:test'
import { reactDomModule } from './helpers/react-dom-module.mjs'
const { notificationDayGroup, notificationDisplayMessage, notificationGroups } = await import(reactDomModule('src/lib/notificationInbox.ts'))
const now = new Date(2026,9,23,0,15).getTime()
test('inbox day sections follow calendar dates rather than elapsed 24 hours', () => {
  assert.equal(notificationDayGroup(new Date(2026,9,23,0,1).toISOString(),now),'Hôm nay')
  assert.equal(notificationDayGroup(new Date(2026,9,22,23,55).toISOString(),now),'Hôm qua')
  assert.equal(notificationDayGroup(new Date(2026,9,21,23,55).toISOString(),now),'Trước đó')
  assert.equal(notificationDayGroup('invalid',now),'Trước đó')
})
test('grouping retains distinct events with matching titles and never mutates the source', () => {
  const items=[{id:'a',title:'Tiền bán hàng đã về ví',createdAt:new Date(2026,9,21).toISOString()},
    {id:'b',title:'Tiền bán hàng đã về ví',createdAt:new Date(2026,9,21).toISOString()},
    {id:'c',createdAt:new Date(2026,9,23).toISOString()}]
  const before=structuredClone(items),groups=notificationGroups(items,now)
  assert.deepEqual(groups.map(g=>g.label),['Hôm nay','Trước đó'])
  assert.deepEqual(groups.flatMap(g=>g.items).map(i=>i.id),['c','a','b'])
  assert.deepEqual(items,before)
})
test('historic enum statuses use the existing Vietnamese order labels without rewriting arbitrary text', () => {
  assert.equal(notificationDisplayMessage('Đơn hàng hiện ở trạng thái Requested.'),'Đơn hàng hiện ở trạng thái Chờ người bán phản hồi.')
  assert.equal(notificationDisplayMessage('Trạng thái Rejected.'),'Trạng thái Người bán đã từ chối.')
  assert.equal(notificationDisplayMessage('Trạng thái Delivered.'),'Trạng thái Đã giao.')
  for(const text of ['Requested là tên riêng','trạng thái Unknown','trạng thái constructor','Tiền đã về ví']) assert.equal(notificationDisplayMessage(text),text)
})
