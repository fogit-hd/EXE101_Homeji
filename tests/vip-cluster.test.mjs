import assert from 'node:assert/strict'
import test from 'node:test'
import { JSDOM } from 'jsdom'
import { reactDomModule } from './helpers/react-dom-module.mjs'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
const { createMapClusterContent } = await import(reactDomModule('src/components/map/mapLocationPins.ts'))
const { createClusterListings } = await import(reactDomModule('src/components/map/clusterListings.ts'))
const markerClustererUrl = pathToFileURL(createRequire(import.meta.url).resolve('@googlemaps/markerclusterer')).href
const clustererInterop = 'data:text/javascript;base64,' + Buffer.from(`import pkg from '${markerClustererUrl}';export const SuperClusterAlgorithm=pkg.SuperClusterAlgorithm;`).toString('base64')
const { ListingClusterAlgorithm } = await import(reactDomModule('src/components/map/listingClusterAlgorithm.ts', { '@googlemaps/markerclusterer': clustererInterop }))

test('listing changes invalidate cached cluster metadata even when marker coordinates stay the same', () => {
  const base = Object.getPrototypeOf(ListingClusterAlgorithm.prototype)
  const calculate = base.calculate
  try {
    base.calculate = () => ({ clusters: [], changed: false })
    const algorithm = new ListingClusterAlgorithm({ radius: 96, maxZoom: 22 })
    assert.equal(algorithm.calculate({}).changed, false)
    algorithm.invalidateListings()
    assert.equal(algorithm.calculate({}).changed, true)
    assert.equal(algorithm.calculate({}).changed, false)
  } finally { base.calculate = calculate }
})

test('mixed cluster preserves total, shows exact Premium count and filters without losing entries', () => {
  const dom = new JSDOM('', { url: 'http://localhost/' })
  globalThis.window = dom.window; globalThis.document = dom.window.document
  let selected = null, zoomed = false
  const entries = Array.from({ length: 17 }, (_, i) => ({ id: String(i), kind: 'vacant', title: i === 0 ? '<script>unsafe</script>' : `Phòng ${i}`, address: 'Lê Văn Việt', priceLabel: '3.000.000 đ / tháng', premium: i === 1 || i === 16, imageUrl: 'javascript:alert(1)', open: () => { selected = i } }))
  const marker = createMapClusterContent({ count: 17, kindCounts: { vacant: 17, roommate: 0, marketplace: 0 }, premiumCount: 2 })
  assert.equal(marker.querySelector('.map-pin-cluster__count').textContent, '17')
  assert.equal(marker.querySelector('.map-pin-cluster__vip').textContent, '★ 2 Premium')
  assert.match(marker.title, /17 tin.*2 tin Premium/)
  const list = createClusterListings(entries, () => { zoomed = true })
  assert.equal(list.querySelectorAll('script,img').length, 0)
  assert.equal(list.querySelectorAll('.map-cluster-listings__vip').length, 2)
  const filter = list.querySelector('.map-cluster-listings__filter')
  filter.click()
  assert.equal(filter.getAttribute('aria-pressed'), 'true')
  const visible = [...list.querySelectorAll('.map-cluster-listings__card')].filter(card => !card.hidden)
  assert.equal(visible.length, 2)
  visible[1].click(); assert.equal(selected, 16)
  filter.click()
  assert.equal(list.querySelectorAll('.map-cluster-listings__card:not([hidden])').length, 17)
  list.querySelector('.map-cluster-listings__toolbar button:last-child').click(); assert.equal(zoomed, true)
  const plain = createMapClusterContent({ count: 17, kindCounts: { vacant: 17, roommate: 0, marketplace: 0 } })
  assert.equal(plain.querySelector('.map-pin-cluster__vip'), null)
  assert.equal(createClusterListings(entries.map(row => ({ ...row, premium: false })), () => {}).querySelector('.map-cluster-listings__filter'), null)
  dom.window.close()
})
