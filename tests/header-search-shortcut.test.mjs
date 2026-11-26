import assert from 'node:assert/strict'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { JSDOM } from 'jsdom'
import { reactDomModule } from './helpers/react-dom-module.mjs'

const stub = code => 'data:text/javascript;base64,' + Buffer.from(code).toString('base64')
const { ContextualSearch } = await import(reactDomModule(fileURLToPath(new URL('../src/components/shell/ContextualSearch.tsx', import.meta.url)), {
  '../../hooks/useBackButtonClose': stub('export const useBackButtonClose = () => {}'),
  '../../lib/useDismissOnOutside': stub('export const useDismissOnOutside = () => {}'),
  '../../contexts/SearchContext': stub(`export const useSearch = () => ({ query: '', placeholder: 'Tìm kiếm', suggestions: [], recentSearches: [], context: 'marketplace', setQuery() {}, submit() {}, clear() {}, pickSuggestion() {} })`),
  '../../lib/placeAutocomplete': stub('export const NEARBY_PLACE_CATEGORY_OPTIONS = []'),
  '../ai/NaturalRentalSearch': stub('export const NaturalRentalSearch = () => null'),
  '../../lib/aiFeatureFlags': stub('export const aiFeatureFlags = { naturalSearch: false }'),
  '../../hooks/useStreetSearchPlaceholder': stub('export const useStreetSearchPlaceholder = (_, placeholder) => placeholder'),
}))

for (const narrow of [false, true]) test(`slash ${narrow ? 'opens mobile search' : 'focuses desktop search'} and respects editing and modals`, async () => {
  const dom = new JSDOM('<div id="root"></div><textarea></textarea><div role="dialog" aria-modal="true" hidden></div>', { url: 'http://localhost/' })
  const keys = ['window', 'document', 'HTMLElement', 'IS_REACT_ACT_ENVIRONMENT']
  const previous = keys.map(key => Object.getOwnPropertyDescriptor(globalThis, key))
  keys.forEach(key => Object.defineProperty(globalThis, key, { configurable: true, writable: true, value: key === 'IS_REACT_ACT_ENVIRONMENT' ? true : dom.window[key] }))
  dom.window.matchMedia = () => ({ matches: narrow, addEventListener() {}, removeEventListener() {} })
  dom.window.HTMLElement.prototype.attachEvent = () => {}
  dom.window.HTMLElement.prototype.detachEvent = () => {}
  const root = createRoot(document.getElementById('root'))
  const slash = () => {
    const event = new dom.window.KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true })
    document.activeElement.dispatchEvent(event)
    return event
  }
  try {
    await act(async () => root.render(React.createElement(ContextualSearch)))
    const editor = document.querySelector('textarea')
    editor.focus()
    await act(async () => assert.equal(slash().defaultPrevented, false))
    editor.blur()
    const modal = document.querySelector('[role="dialog"]')
    modal.hidden = false
    modal.getClientRects = () => [{ width: 100, height: 100 }]
    await act(async () => assert.equal(slash().defaultPrevented, false))
    modal.hidden = true
    await act(async () => assert.equal(slash().defaultPrevented, true))
    assert.equal(document.activeElement, document.querySelector('.hj-search__input'))
    assert.equal(document.activeElement.getAttribute('aria-keyshortcuts'), '/')
    assert.equal(document.activeElement.value, '')
    if (narrow) assert.ok(document.querySelector('.hj-search-sheet'))
  } finally {
    await act(async () => root.unmount())
    dom.window.close()
    keys.forEach((key, index) => previous[index] ? Object.defineProperty(globalThis, key, previous[index]) : delete globalThis[key])
  }
})
