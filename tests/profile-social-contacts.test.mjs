import assert from 'node:assert/strict'
import test from 'node:test'
import {facebookContactHref,memberTenure,normalizeZaloPhone} from '../src/lib/profileContacts.ts'
test('Facebook contacts reject foreign hosts, redirects, credentials and unsafe protocols',()=>{
 for(const value of ['javascript:alert(1)','https://facebook.com.evil.test/name','https://a:b@facebook.com/name','https://facebook.com:8443/name','https://facebook.com/l.php?u=https://evil.test','http://facebook.com/name']) assert.equal(facebookContactHref(value),null)
 assert.equal(facebookContactHref('https://www.facebook.com/homeji.test'),'https://www.facebook.com/homeji.test')
})
test('Zalo contacts retain leading zero and normalize Vietnam country code',()=>{
 assert.equal(normalizeZaloPhone('+84 901 234 567'),'0901234567');assert.equal(normalizeZaloPhone('0901234567'),'0901234567');assert.equal(normalizeZaloPhone('1234567890'),'');assert.equal(normalizeZaloPhone('090123456789'),'')
})
test('membership duration comes from complete calendar years/months in Vietnam',()=>{
 const now=Date.parse('2026-11-01T00:00:00Z');assert.equal(memberTenure('2022-06-01T00:00:00Z',now),'Đã tham gia 4 năm 5 tháng');assert.equal(memberTenure('2026-10-28T00:00:00Z',now),'Đã tham gia 4 ngày');assert.equal(memberTenure('2026-11-01T00:00:00Z',now),'Vừa tham gia Homeji');assert.equal(memberTenure('2026-12-01T00:00:00Z',now),'Chưa có ngày tham gia');assert.equal(memberTenure('invalid',now),'Chưa có ngày tham gia')
})
