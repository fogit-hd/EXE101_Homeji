import assert from 'node:assert/strict'
import test from 'node:test'
import { reactDomModule } from './helpers/react-dom-module.mjs'
const { readSourceCatalogPins, safeCatalogSource } = await import(reactDomModule('src/lib/sourceCatalog.ts'))
const base = { id:'room', title:'Phòng trên Hoàng Diệu 2', name:'Quán cơm', address:'Thủ Đức', latitude:10.85, longitude:106.76, sourceUrl:'https://phongtro123.com/phong-pr123.html', price:3000000, imageUrls:['https://pt123.cdn.static123.com/uploads/cover.jpg'] }

test('only sourced records with actual numeric coordinates become pins', () => {
  assert.equal(readSourceCatalogPins([base], 'rental').length, 1)
  for (const location of [{latitude:null}, {longitude:undefined}, {latitude:'10.85'}, {latitude:0,longitude:0}, {latitude:10.85,longitude:106.95}, {latitude:NaN}]) {
    assert.equal(readSourceCatalogPins([{...base,...location}], 'rental').length, 0)
  }
})

test('expired advertisements stay off the map and real source images are preserved', () => {
  const now = Date.parse('2026-10-30T00:00:00Z')
  assert.equal(readSourceCatalogPins([{...base,sourceExpiresAt:'2026-10-29T00:00:00Z'}], 'rental',now).length, 0)
  assert.equal(readSourceCatalogPins([{...base,sourceExpiresAt:'invalid'}], 'rental',now).length, 0)
  const pin = readSourceCatalogPins([{...base,sourceExpiresAt:'2026-11-01T00:00:00Z'}], 'rental',now)[0]
  assert.equal(pin.imageUrl,base.imageUrls[0]); assert.equal(pin.price,3000000)
})

test('source links reject executable URLs, impersonating domains and arbitrary Google paths', () => {
  for (const url of ['javascript:alert(1)','http://phongtro123.com/x','https://phongtro123.com.evil.example/x','https://u:p@phongtro123.com/x','https://www.google.com/accounts','https://www.google.com:8443/maps/place/x']) assert.equal(safeCatalogSource(url),null)
  assert.ok(safeCatalogSource('https://www.google.com/maps/place/Quan-com'))
  assert.equal(readSourceCatalogPins([{...base,sourceUrl:'https://evil.example'}],'food').length,0)
  assert.equal(readSourceCatalogPins([{...base,imageUrls:['https://evil.example/fake.jpg']}],'rental')[0].imageUrl,null)
})

test('venue references do not invent order stock or prices', () => {
  const pin = readSourceCatalogPins([base], 'food')[0]
  assert.equal(pin.title,'Quán cơm'); assert.equal(pin.price,null); assert.equal('availableQuantity' in pin,false)
})
