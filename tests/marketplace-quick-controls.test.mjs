import assert from 'node:assert/strict'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { JSDOM } from 'jsdom'
import { reactDomModule } from './helpers/react-dom-module.mjs'

const stub = code => 'data:text/javascript;base64,' + Buffer.from(code).toString('base64')
const { FoodMarketplaceView } = await import(reactDomModule(fileURLToPath(new URL('../src/components/marketplace/food/FoodMarketplaceView.tsx', import.meta.url)), {
  '../../motion/pointerSpot': stub('export const attachPointerSpot = () => () => {}'),
  '../../MarketplaceLoadingSkeleton': stub('export const FoodCatalogSkeleton = () => null'),
  '../../skeletons/Skeleton': stub('export const Sk = () => null'),
  './FoodCard': stub('export const FoodCard = () => null'),
  './FoodSourceDirectory': stub('export const FoodSourceDirectory = () => null'),
  './FoodUtilityRail': stub('export const FoodUtilityRail = () => null'),
}))

test('meal and radius controls share the header slot and retain roving keyboard selection', async () => {
  const dom = new JSDOM('<div id="toolbar"></div><div id="root"></div>', { url: 'http://localhost/' })
  const keys = ['window', 'document', 'HTMLElement', 'SVGElement', 'Element', 'IS_REACT_ACT_ENVIRONMENT']
  const previous = keys.map(key => Object.getOwnPropertyDescriptor(globalThis, key))
  keys.forEach(key => Object.defineProperty(globalThis, key, { configurable: true, writable: true, value: key === 'IS_REACT_ACT_ENVIRONMENT' ? true : dom.window[key] }))
  const root = createRoot(document.getElementById('root'))
  const toolbar = document.getElementById('toolbar')
  try {
    await act(async () => root.render(React.createElement(FoodMarketplaceView, {
      quickControlsTarget: toolbar, posts: [], sellerGroups: [], kitchens: [], quantities: {},
      cartItems: [], cartItemCount: 0, cartTotal: 0, cartOpen: false, cartBusy: false,
      cartNote: '', loading: false, error: null, locating: false, hasUserLocation: false,
      locationLabel: '', locationSecondary: '', minimumCartTotal: 25000,
    })))
    const tabs = [...toolbar.querySelectorAll('[role="tab"]')]
    assert.ok(tabs.length > 1)
    assert.ok(toolbar.querySelector('select[aria-label="Lọc theo khoảng cách"]'))
    assert.equal(document.querySelector('.food-catalog .food-meal-filter-bar'), null)
    tabs[0].focus()
    for (const [key, expected] of [['ArrowLeft', tabs.length - 1], ['ArrowRight', 0], ['End', tabs.length - 1], ['Home', 0]]) {
      await act(async () => document.activeElement.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })))
      assert.equal(document.activeElement, tabs[expected])
      assert.equal(tabs.filter(tab => tab.tabIndex === 0).length, 1)
      assert.equal(tabs[expected].getAttribute('aria-selected'), 'true')
    }
  } finally {
    await act(async () => root.unmount())
    dom.window.close()
    keys.forEach((key, index) => previous[index] ? Object.defineProperty(globalThis, key, previous[index]) : delete globalThis[key])
  }
})
