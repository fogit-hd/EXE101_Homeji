import assert from 'node:assert/strict'
import test from 'node:test'
import { JSDOM } from 'jsdom'
import { countActiveListingFilters, listingResultCount } from '../src/components/map/listings/listingCounts.ts'
import { reactDomModule } from './helpers/react-dom-module.mjs'
import { THEMES, tokenContrast } from './helpers/theme-tokens.mjs'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const { isPendingReceivedInvitation } = await import(reactDomModule('src/lib/roommateInvitations.ts'))
const { RoommateInvitationStatus: Status } = await import(reactDomModule('src/api/types.ts'))
const { createPricePillPinContent } = await import(reactDomModule('src/components/map/mapLocationPins.ts'))
const defaults = { catalog: 'rooms', keyword: '', amenities: [], page: 1, bounds: null, searchOnMove: false, view: 'split' }

test('active criteria count ranges once and ignore presentation and pagination', () => {
  assert.equal(countActiveListingFilters(defaults), 0)
  assert.equal(countActiveListingFilters({ ...defaults, page: 3, view: 'map' }), 0)
  assert.equal(countActiveListingFilters({ ...defaults, minPrice: 0, maxPrice: 5000000, minArea: 20, maxArea: 40 }), 2)
  assert.equal(countActiveListingFilters({ ...defaults, amenities: ['LOFT', 'LOFT', 'PET_FRIENDLY'], excludedAmenities: ['AIR_CONDITIONER'], excludeRoommateShare: true, minAvailableSlots: 2 }), 5)
  assert.equal(countActiveListingFilters({ ...defaults, keyword: 'Metro', catalog: 'apartments', ids: ['a'], placeId: 'campus' }), 4)
  assert.equal(countActiveListingFilters({ ...defaults, keyword: ' ', bounds: {}, searchOnMove: true }), 1)
})

test('all result labels use the combined inventory count; market ignores rental sources', () => {
  assert.equal(listingResultCount(99, 14, false), 113)
  assert.equal(listingResultCount(99, null, false), 99)
  assert.equal(listingResultCount(0, 14, false), 14)
  assert.equal(listingResultCount(7, 14, true), 7)
  assert.equal(listingResultCount(0, 0, false), 0)
})

test('pending invitation count includes only the current receiver', () => {
  const invitations = [
    { receiverId: 'me', status: Status.Pending },
    { receiverId: 'other', status: Status.Pending },
    ...[Status.Accepted, Status.Cancelled, Status.Rejected].map(status => ({ receiverId: 'me', status })),
  ]
  assert.equal(invitations.filter(inv => isPendingReceivedInvitation(inv, 'me')).length, 1)
  assert.equal(invitations.filter(inv => isPendingReceivedInvitation(inv, undefined)).length, 0)
  assert.equal(invitations.slice(1).filter(inv => isPendingReceivedInvitation(inv, 'me')).length, 0)
})

test('price pin content participates in layout and stays visible to marker accessibility', () => {
  const dom = new JSDOM('')
  globalThis.document = dom.window.document
  const handle = createPricePillPinContent({ title: 'Phòng', label: '8,5tr', selected: true })
  const root = handle.element
  assert.notEqual(root.style.width, '0px')
  assert.notEqual(root.style.height, '0px')
  assert.notEqual(root.getAttribute('aria-hidden'), 'true')
  assert.equal(root.textContent, '8,5tr')
  assert.ok(root.classList.contains('is-selected'))
  document.body.append(root)
  handle.dispose()
  assert.equal(document.body.children.length, 0)
  dom.window.close()
})

test('clusterer compatibility routes gmp-click through DOM events and removes the listener', () => {
  const source = readFileSync(new URL('../src/components/map/RentalMap.tsx', import.meta.url), 'utf8')
  const start = source.indexOf('          const addMapsListener = marker.addListener.bind(marker)')
  assert.ok(start > 0)
  const bridge = source.slice(start, source.indexOf('          return marker', start))
  const install = new Function('marker', ts.transpileModule(bridge, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText)
  const marker = new EventTarget()
  const legacyCalls = []
  marker.addListener = name => { legacyCalls.push(name); return { remove() {} } }
  install(marker)
  let clicks = 0
  const handle = marker.addListener('gmp-click', () => clicks++)
  marker.dispatchEvent(new Event('gmp-click'))
  assert.equal(clicks, 1)
  assert.deepEqual(legacyCalls, [])
  handle.remove()
  marker.dispatchEvent(new Event('gmp-click'))
  assert.equal(clicks, 1)
  marker.addListener('position_changed', () => {})
  assert.deepEqual(legacyCalls, ['position_changed'])
})

test('chip, cluster, pin and popup token pairs meet AA in both themes', () => {
  for (const theme of THEMES) {
    for (const [fg, bg] of [['on-brand', 'grab-green'], ['text-primary', 'surface'], ['text-heading', 'surface-elevated'], ['text-secondary', 'surface']]) {
      assert.ok(tokenContrast(fg, bg, theme) >= 4.5, `${theme}: ${fg} on ${bg}`)
    }
  }
})
