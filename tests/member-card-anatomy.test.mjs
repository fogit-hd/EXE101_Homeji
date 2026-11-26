import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import React, { act } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { JSDOM } from 'jsdom'
import { reactDomModule } from './helpers/react-dom-module.mjs'

const noop = 'data:text/javascript,export const RentalConsiderationToggle=()=>null'
const { RentalPostCard } = await import(reactDomModule('src/components/RentalPostCard.tsx', { './ai/RentalConsiderationToggle': noop }))
const { MapListingCard } = await import(reactDomModule('src/components/MapListingCard.tsx'))
const { MapExploreListingCard } = await import(reactDomModule('src/components/map/explore/MapExploreListingCard.tsx'))
const post = { id: 'room', title: 'Phòng có ban công', price: 6500000, area: 25, address: 'Linh Trung, Thủ Đức, Hồ Chí Minh 75300, Việt Nam', isOwnerPremium: true, type: 1, viewCount: 99, saveCount: 88 }
const render = (Card, props = {}) => renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(Card, { post, ...props })))

test('saved and map cards expose only price, full title and short area/address in reading order', () => {
  for (const Card of [RentalPostCard, MapListingCard, MapExploreListingCard]) {
    const dom = new JSDOM(render(Card))
    const card = dom.window.document.querySelector('article')
    const text = card.textContent
    assert.ok(text.indexOf('6,5 triệu/tháng') < text.indexOf(post.title))
    assert.ok(text.indexOf(post.title) < text.indexOf('25 m² · Linh Trung, Thủ Đức'))
    assert.equal(card.querySelectorAll('.premium-badge').length, 1)
    assert.doesNotMatch(text, /75300|Việt Nam|lượt xem|lượt lưu|Thông tin công khai/)
    assert.equal(card.querySelectorAll('h3, .map-explore-card__title').length, 1)
    dom.window.close()
  }
})

test('missing card measurements/address omit separators and unknown rent omits the monthly suffix', () => {
  for (const Card of [RentalPostCard, MapListingCard, MapExploreListingCard]) {
    const html = render(Card, { post: { ...post, area: 0, address: '', price: 0 } })
    assert.doesNotMatch(html, / · |\/tháng/)
    const addressOnly = render(Card, { post: { ...post, area: 0 } })
    assert.ok(addressOnly.includes('Linh Trung, Thủ Đức'))
    assert.doesNotMatch(addressOnly, / · /)
  }
})

test('heart controls retain accessible save states and saved-card busy state', () => {
  for (const [Card, props] of [
    [RentalPostCard, { showSave: true, isSaved: true, saveBusy: true }],
    [MapListingCard, { onToggleSave() {}, isSaved: true }],
    [MapExploreListingCard, { onToggleSave() {}, saved: true, saveBusy: true }],
  ]) {
    const dom = new JSDOM(render(Card, props))
    const button = dom.window.document.querySelector('button')
    assert.equal(button.getAttribute('aria-label'), 'Bỏ lưu')
    assert.equal(button.getAttribute('aria-pressed'), 'true')
    assert.ok(button.querySelector('svg[aria-hidden="true"]'))
    if (props.saveBusy) assert.equal(button.disabled, true)
    dom.window.close()
  }
})

test('map hearts do not activate the room selection with click or keyboard', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://fixture.local/' })
  const keys = ['window', 'document', 'HTMLElement', 'Element', 'Node', 'IS_REACT_ACT_ENVIRONMENT']
  const previous = new Map(keys.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
  for (const key of keys) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value: key === 'IS_REACT_ACT_ENVIRONMENT' ? true : key === 'window' ? dom.window : dom.window[key] })
  const { createRoot } = await import('react-dom/client')
  const root = createRoot(document.getElementById('root'))
  try {
    for (const Card of [MapListingCard, MapExploreListingCard]) {
      let saves = 0
      let selects = 0
      await act(async () => root.render(React.createElement(Card, { post, onToggleSave: () => saves++, onSelect: () => selects++ })))
      const button = document.querySelector('button')
      await act(async () => {
        button.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
        button.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: ' ', bubbles: true }))
        button.click()
      })
      assert.equal(saves, 1)
      assert.equal(selects, 0)
    }
  } finally {
    await act(async () => root.unmount())
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else delete globalThis[key]
    }
    dom.window.close()
  }
})

test('wanted move-in dates show day/month and safely omit missing or invalid values', () => {
  const source = readFileSync(new URL('../src/pages/WantedPostsPage.tsx', import.meta.url), 'utf8')
  const formatter = source.match(/function moveInDayMonth[\s\S]*?\n\}/)?.[0]
  assert.ok(formatter)
  const code = ts.transpileModule(formatter, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  const format = vm.runInNewContext(`${code}; moveInDayMonth`)
  assert.equal(format('2026-11-15'), '15/11')
  assert.equal(format('2026-01-02T00:00:00Z'), '02/01')
  assert.equal(format(null), '')
  assert.equal(format(''), '')
  assert.equal(format('invalid'), '')
})
