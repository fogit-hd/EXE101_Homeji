import test from 'node:test'
import assert from 'node:assert/strict'
import React, { act } from 'react'
import { JSDOM } from 'jsdom'
import { reactDomModule } from './helpers/react-dom-module.mjs'

const emptyComponent = 'data:text/javascript,export const FoodSourceDirectory=()=>null;export const FoodUtilityRail=()=>null'
const { FoodMarketplaceView } = await import(reactDomModule('src/components/marketplace/food/FoodMarketplaceView.tsx', {
  './FoodSourceDirectory': emptyComponent,
  './FoodUtilityRail': emptyComponent,
}))

test('seller menus contain separate dishes and retain each dish purchase and map actions', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' })
  const previous = new Map(['window', 'document', 'IS_REACT_ACT_ENVIRONMENT'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true })
  const { createRoot } = await import('react-dom/client')
  const root = createRoot(document.getElementById('root'))
  const posts = [
    { id: 'rice', sellerId: 'a', title: 'Cơm gà xối mỡ', price: 40000, availableQuantity: 5 },
    { id: 'bread', sellerId: 'a', title: 'Bánh mì chả cá nóng', price: 22000, availableQuantity: 3 },
    { id: 'sold', sellerId: 'b', title: 'Món hết hàng', price: 20000, availableQuantity: 0 },
  ].map(post => ({ ...post, sellerDisplayName: 'Bùi Khánh Linh', mediaUrls: [], distanceKm: null }))
  const sellerGroups = ['a', 'b'].map(sellerId => ({ sellerId, sellerName: 'Bùi Khánh Linh', address: '', distanceKm: null, posts: posts.filter(post => post.sellerId === sellerId) }))
  const added = [], quantities = [], mapped = []
  try {
    await act(() => root.render(React.createElement(FoodMarketplaceView, {
      posts, sellerGroups, kitchens: [], quantities: { bread: 2 }, cartItems: [{ postId: 'rice' }],
      cartItemCount: 1, cartTotal: 40000, cartBusy: false, cartNote: '', cartOpen: false,
      loading: false, error: null, locating: false, hasUserLocation: false,
      onQuantityChange: (...args) => quantities.push(args), onAddToCart: post => added.push(post.id),
      onShowOnMap: post => mapped.push(post.id),
    })))
    const menus = document.querySelectorAll('.food-seller')
    assert.equal(menus.length, 2, 'different seller IDs with the same name stay separate')
    assert.equal(menus[0].querySelectorAll('.food-card').length, 2)
    assert.equal(menus[1].querySelectorAll('.food-card').length, 1)
    assert.match(menus[0].querySelector('header').textContent, /2 món/)
    assert.equal(menus[0].querySelectorAll('.food-card__seller')[0].textContent, 'Còn 5 phần')
    const [rice, bread, sold] = document.querySelectorAll('.food-card')
    assert.equal(rice.querySelector('.food-card__cart-btn').textContent, 'Trong giỏ')
    assert.equal(sold.querySelector('.food-card__cart-btn').disabled, true)
    await act(() => bread.querySelector('.food-card__cart-btn').click())
    await act(() => bread.querySelector('.food-card__media').click())
    await act(() => bread.querySelector('[aria-label="Tăng Số lượng Bánh mì chả cá nóng"]').click())
    assert.deepEqual(quantities, [['bread', 3]])
    assert.deepEqual(added, ['bread'])
    assert.deepEqual(mapped, ['bread'])
    assert.match(bread.textContent, /22\.000/)
  } finally {
    await act(() => root.unmount())
    dom.window.close()
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else delete globalThis[key]
    }
  }
})
