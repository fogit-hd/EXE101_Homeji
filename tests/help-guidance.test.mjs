import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { filterHelpFaq, helpFaq } from '../src/content/helpFaq.ts'
import ts from 'typescript'
import { documentTitleFor } from '../src/lib/documentTitle.ts'
import { followedInterestSearch, interestDraftFromSearch } from '../src/components/ai/SearchInterestCenter.logic.ts'
import { fileURLToPath } from 'node:url'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { JSDOM } from 'jsdom'
import { reactDomModule } from './helpers/react-dom-module.mjs'
import { THEMES, tokenContrast } from './helpers/theme-tokens.mjs'

const sectionSource = await readFile(new URL('../src/components/map/MapAppPanel.logic.tsx', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(sectionSource, { compilerOptions: { module: ts.ModuleKind.ESNext } })
const { isWideMapSection } = await import(`data:text/javascript,${encodeURIComponent(outputText)}`)

test('Help renders native disclosures, grouped h2s and a polite count under its frame heading', async () => {
  const { HelpPage } = await import(reactDomModule(fileURLToPath(new URL('../src/pages/HelpPage.tsx', import.meta.url))))
  const html = renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(HelpPage)))
  const dom = new JSDOM(html)
  const doc = dom.window.document
  assert.equal(doc.querySelectorAll('h1').length, 0, 'PageFrame owns the single h1')
  assert.equal(doc.querySelectorAll('h2').length, 5)
  assert.equal(doc.querySelectorAll('details > summary').length, 11)
  assert.equal(doc.querySelector('[role=status]').getAttribute('aria-live'), 'polite')
  assert.ok(doc.querySelector('label[for="help-search"]'))
  assert.ok([...doc.querySelectorAll('a')].some(link => link.getAttribute('href') === '/?section=marketplace&wallet=deposit'))
  dom.window.close()
})

test('Help and tips use readable token pairs in both themes', () => {
  for (const theme of THEMES) {
    for (const background of ['--surface', '--surface-muted']) {
      for (const foreground of ['--text-primary', '--text-secondary', '--text-heading', '--maps-blue']) {
        assert.ok(tokenContrast(foreground, background, theme) >= 4.5, `${foreground} on ${background} in ${theme}`)
      }
    }
  }
})

test('FAQ search matches Vietnamese accents, đ, case and whitespace', () => {
  assert.ok(filterHelpFaq('dat lich').some(item => item.id === 'appointments'))
  assert.ok(filterHelpFaq(' ĐẶT   LỊCH ').some(item => item.id === 'appointments'))
  assert.equal(filterHelpFaq('').length, helpFaq.length)
  assert.deepEqual(filterHelpFaq('khongcochuoinay'), [])
  assert.ok(filterHelpFaq('đặt cọc').some(item => item.id === 'safety'))
})

test('help is registered in routing, lazy workspace, title, skeleton and entry points', async () => {
  assert.equal(isWideMapSection('help'), true)
  assert.equal(documentTitleFor('/', '?section=help'), 'Trợ giúp · Homeji')
  for (const [file, pattern] of [
    ['src/pages/HomePage.tsx', /'help'/],
    ['src/pages/deferredPages.ts', /export const HelpPage = lazy/],
    ['src/components/layout/FeatureWorkspace.tsx', /section === 'help' \? <HelpPage/],
    ['src/components/skeletons/RouteSkeleton.tsx', /case 'help':/],
    ['src/components/shell/GlobalHeader.tsx', /id: 'help'/],
    ['src/components/layout/SiteFooter.tsx', /mapSectionUrl\('help'\)/],
  ]) assert.match(await readFile(new URL('../' + file, import.meta.url), 'utf8'), pattern)
})

test('followed search restores criteria without inheriting another search', () => {
  const params = followedInterestSearch({ area: 'Thủ Đức', minPrice: 0, maxPrice: 5000000, minArea: 20, maxArea: 40, amenities: ['LOFT', 'PET_FRIENDLY'], excludedAmenities: ['SHARED_BATHROOM'], occupants: 2, maxDeposit: 1000000, excludeRoommateShare: true, latitude: 10.8, longitude: 106.7, radiusKm: 3 })
  assert.equal(params.get('section'), 'listings')
  assert.equal(params.get('keyword'), 'Thủ Đức')
  assert.equal(params.get('minPrice'), '0')
  assert.equal(params.get('maxPrice'), '5000000')
  assert.equal(params.get('minArea'), '20')
  assert.deepEqual(params.getAll('amenities'), ['LOFT', 'PET_FRIENDLY'])
  assert.deepEqual(params.getAll('excludedAmenities'), ['SHARED_BATHROOM'])
  assert.equal(params.get('minAvailableSlots'), '2')
  assert.equal(params.get('radiusKm'), '3')
  assert.equal(params.has('interest'), false)
  assert.deepEqual([...followedInterestSearch({ area: 'Quận 9' }).keys()], ['section', 'view', 'keyword'])
})

test('saved search draft uses current filters even before choosing an area', () => {
  const search = '?section=listings&maxPrice=4000000&minArea=20&amenities=LOFT&excludedAmenities=PET_FRIENDLY'
  const draft = interestDraftFromSearch(search)
  assert.equal(draft.area, '')
  assert.equal(draft.maxPrice, 4000000)
  assert.equal(draft.minArea, 20)
  assert.deepEqual(draft.amenities, ['LOFT'])
  assert.deepEqual(draft.excludedAmenities, ['PET_FRIENDLY'])
  assert.equal(interestDraftFromSearch(search + '&placeName=Thủ+Đức').area, 'Thủ Đức')
})

test('tips use persisted dismissal and survive blocked storage for the session', async () => {
  // Separate module instances model fresh tabs without exposing a production reset API.
  const source = await readFile(new URL('../src/components/map/listings/listingsTips.ts', import.meta.url), 'utf8')
  const ts = await import('typescript')
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } })
  const load = suffix => import(`data:text/javascript,${encodeURIComponent(outputText)}#${suffix}`)
  const tips = await load('persisted')
  const values = new Map()
  const storage = () => ({ getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) })
  assert.equal(tips.listingsTipsDismissed(storage), false)
  tips.dismissListingsTips(storage)
  assert.equal(values.get('homeji_tips_listings_v1'), '1')
  assert.equal((await load('reload')).listingsTipsDismissed(storage), true)
  const blocked = () => { throw new Error('Storage blocked') }
  const fallback = await load('blocked')
  assert.equal(fallback.listingsTipsDismissed(blocked), false)
  fallback.dismissListingsTips(blocked)
  assert.equal(fallback.listingsTipsDismissed(blocked), true)
  const sessionValues = new Map()
  const session = () => ({ getItem: key => sessionValues.get(key) ?? null, setItem: (key, value) => sessionValues.set(key, value) })
  const quota = await load('quota')
  quota.dismissListingsTips(blocked, session)
  assert.equal((await load('session-reload')).listingsTipsDismissed(() => ({ getItem: () => null }), session), true)
})
