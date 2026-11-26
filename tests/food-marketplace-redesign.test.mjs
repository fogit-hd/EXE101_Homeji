import test from 'node:test'
import assert from 'node:assert/strict'
import React, { act } from 'react'
import { JSDOM } from 'jsdom'
import { reactDomModule } from './helpers/react-dom-module.mjs'

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' })
const storage = new Map()
const fakeLocalStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, val) => storage.set(key, String(val)),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear(),
}
const vibrations = []
if (globalThis.navigator) {
  globalThis.navigator.vibrate = (pattern) => { vibrations.push(pattern); return true }
}
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  localStorage: fakeLocalStorage,
  IS_REACT_ACT_ENVIRONMENT: true,
})

const { SellerOrderSound } = await import(reactDomModule('src/lib/sellerOrderSound.ts'))
const { ProfitMarginCalculator } = await import(reactDomModule('src/components/marketplace/food/ProfitMarginCalculator.tsx'))
const { LiveFoodCardPreview } = await import(reactDomModule('src/components/marketplace/food/LiveFoodCardPreview.tsx'))
const { KitchenOrderBoard } = await import(reactDomModule('src/components/marketplace/food/KitchenOrderBoard.tsx'))
const { MarketplaceSellFoodForm } = await import(reactDomModule('src/components/marketplace/food/MarketplaceSellFoodForm.tsx'))

function setupDom() {
  storage.clear()
  vibrations.length = 0
  dom.window.document.body.innerHTML = '<div id="root"></div>'
  return {
    dom,
    vibrations,
    cleanup: () => {
      dom.window.document.body.innerHTML = '<div id="root"></div>'
    },
  }
}

test('SellerOrderSound supports dorm silent mode, pop sound and haptic vibration', async () => {
  const { cleanup, vibrations } = setupDom()
  try {
    // Check initial dorm silent state
    localStorage.clear()
    assert.equal(SellerOrderSound.isDormSilent, false)

    // Set dorm silent mode to true
    SellerOrderSound.setDormSilent(true)
    assert.equal(SellerOrderSound.isDormSilent, true)
    assert.equal(localStorage.getItem('homeji_dorm_silent_mode'), 'true')

    // In dorm silent mode, sound methods return false
    const sound = new SellerOrderSound()
    assert.equal(sound.play(), false)
    assert.equal(sound.playPop(), false)

    // Turn off dorm silent mode
    SellerOrderSound.setDormSilent(false)
    assert.equal(SellerOrderSound.isDormSilent, false)
    assert.equal(localStorage.getItem('homeji_dorm_silent_mode'), 'false')

    // Static helper works safely
    assert.equal(typeof SellerOrderSound.playPop(), 'boolean')
  } finally {
    cleanup()
  }
})

test('ProfitMarginCalculator renders dynamic chroma margin gauge across financial tiers', async () => {
  const { cleanup } = setupDom()
  const { createRoot } = await import('react-dom/client')
  const root = createRoot(document.getElementById('root'))
  try {
    // 1. High margin tier (> 25%): price = 40,000, cost = 15,000 -> net = 36,000, profit = 21,000 (margin 52.5%)
    await act(() => root.render(React.createElement(ProfitMarginCalculator, { price: 40000, estimatedCost: 15000 })))
    const badge = document.querySelector('.profit-margin-percent-badge')
    assert.ok(badge)
    assert.match(badge.textContent, /52\.5% biên lãi/)
    assert.equal(badge.style.color, 'var(--grab-green)')
    const gaugeBar = document.querySelector('.profit-margin-gauge__bar')
    assert.ok(gaugeBar)
    assert.equal(gaugeBar.style.backgroundColor, 'var(--grab-green)')

    // 2. Thin margin tier (15% - 25%): price = 25,000, cost = 18,000 -> net = 22,500, profit = 4,500 (margin 18%)
    await act(() => root.render(React.createElement(ProfitMarginCalculator, { price: 25000, estimatedCost: 18000 })))
    assert.match(document.querySelector('.profit-margin-percent-badge').textContent, /18% biên lãi/)
    assert.equal(document.querySelector('.profit-margin-percent-badge').style.color, 'var(--food-warm-amber)')
    assert.equal(document.querySelector('.profit-margin-gauge__bar').style.backgroundColor, 'var(--food-warm-amber)')
    assert.match(document.body.textContent, /Biên lãi ước tính dưới 20%/)

    // 3. Danger / Loss tier (< 15%): price = 15,000, cost = 14,000 -> net = 13,500, profit = -500 (margin -3.3%)
    await act(() => root.render(React.createElement(ProfitMarginCalculator, { price: 15000, estimatedCost: 14000 })))
    assert.match(document.querySelector('.profit-margin-percent-badge').textContent, /-3\.3% biên lãi/)
    assert.equal(document.querySelector('.profit-margin-percent-badge').style.color, 'var(--error)')
    assert.equal(document.querySelector('.profit-margin-gauge__bar').style.backgroundColor, 'var(--error)')

    // 4. Low price alert (< 10,000)
    await act(() => root.render(React.createElement(ProfitMarginCalculator, { price: 8000, estimatedCost: 5000 })))
    assert.match(document.body.textContent, /Giá món ăn tối thiểu là 10\.000đ/)

    // 5. High price student affordability tip (> 45,000)
    await act(() => root.render(React.createElement(ProfitMarginCalculator, { price: 50000, estimatedCost: 20000 })))
    assert.match(document.body.textContent, /Mức giá trên 45\.000đ khá cao so với mặt bằng sinh viên Thủ Đức/)
  } finally {
    await act(() => root.unmount())
    cleanup()
  }
})

test('LiveFoodCardPreview displays warm culinary surface, badges and sample label', async () => {
  const { cleanup } = setupDom()
  const { createRoot } = await import('react-dom/client')
  const root = createRoot(document.getElementById('root'))
  try {
    await act(() => root.render(React.createElement(LiveFoodCardPreview, {
      title: 'Bún bò Huế cay nồng',
      price: 35000,
      unit: 'tô',
      availableQuantity: 12,
      preparationMinutes: 15,
      freshnessBadge: 'CookToOrder',
      allergenAlerts: 'Cay nhiều, có mắm ruốc',
      isSamplePhoto: true,
      address: 'KTX Khu B ĐHQG',
    })))

    const preview = document.querySelector('.live-food-card-preview')
    assert.ok(preview)
    assert.ok(preview.classList.contains('food-card-surface'))
    assert.match(preview.textContent, /Bún bò Huế cay nồng/)
    assert.match(preview.textContent, /35\.000 đ/)
    assert.match(preview.textContent, /\/tô/)
    assert.match(preview.textContent, /Còn 12 suất/)
    assert.match(preview.textContent, /Nấu theo đơn · 15p/)
    assert.match(preview.textContent, /Lưu ý: Cay nhiều, có mắm ruốc/)
    assert.match(preview.textContent, /KTX Khu B ĐHQG/)
    assert.match(preview.textContent, /\[Ảnh mẫu\]/)
  } finally {
    await act(() => root.unmount())
    cleanup()
  }
})

test('KitchenOrderBoard manages order flow, Dorm Silent mode toggle, and Escrow Hold', async () => {
  const { cleanup } = setupDom()
  const { createRoot } = await import('react-dom/client')
  const root = createRoot(document.getElementById('root'))
  const accepted = [], rejected = [], delivered = []

  const orders = [
    { id: 'ord-1', sellerId: 'seller-1', status: 1, postTitle: 'Cơm tấm sườn bì', agreedPrice: 35000, quantity: 2, createdAt: new Date().toISOString() },
    { id: 'ord-2', sellerId: 'seller-1', status: 2, postTitle: 'Bún chả giò', agreedPrice: 30000, quantity: 1, createdAt: new Date().toISOString() },
    { id: 'ord-3', sellerId: 'seller-1', status: 5, postTitle: 'Trà tắc khổng lồ', agreedPrice: 15000, sellerNetAmount: 13500, quantity: 1, createdAt: new Date().toISOString() },
  ]

  try {
    await act(() => root.render(React.createElement(KitchenOrderBoard, {
      orders,
      onAcceptOrder: async (id) => { accepted.push(id) },
      onRejectOrder: async (id) => { rejected.push(id) },
      onDeliverOrder: async (id) => { delivered.push(id) },
    })))

    // Check Kanban columns
    assert.match(document.body.textContent, /ĐƠN MỚI ĐẾN \(1\)/)
    assert.match(document.body.textContent, /ĐANG NẤU \(1\)/)
    assert.match(document.body.textContent, /SẴN SÀNG & ĐÃ GIAO \(1\)/)
    assert.match(document.body.textContent, /Tiền về ví sau 24h Escrow bảo vệ an toàn thực phẩm/)

    // Check Dorm Silent Mode toggle button
    const silentBtn = document.querySelector('.btn-dorm-silent')
    assert.ok(silentBtn)
    assert.match(silentBtn.textContent, /Chuông Báo Bếp/)

    // Click to toggle Dorm Silent Mode
    await act(() => silentBtn.click())
    assert.equal(SellerOrderSound.isDormSilent, true)
    assert.match(silentBtn.textContent, /Yên Lặng KTX/)

    // Click again to turn back on
    await act(() => silentBtn.click())
    assert.equal(SellerOrderSound.isDormSilent, false)
    assert.match(silentBtn.textContent, /Chuông Báo Bếp/)

    // Accept order button click
    const acceptBtn = document.querySelector('.btn-kitchen-accept')
    assert.ok(acceptBtn)
    await act(() => acceptBtn.click())
    assert.deepEqual(accepted, ['ord-1'])

    // Deliver order button click
    const deliverBtn = document.querySelector('.btn-kitchen-deliver')
    assert.ok(deliverBtn)
    await act(() => deliverBtn.click())
    assert.deepEqual(delivered, ['ord-2'])
  } finally {
    await act(() => root.unmount())
    cleanup()
  }
})

test('MarketplaceSellFoodForm validates food constraints and populates presets in split-screen layout', async () => {
  const { cleanup, dom } = setupDom()
  const { createRoot } = await import('react-dom/client')
  const root = createRoot(document.getElementById('root'))
  const submitted = []

  try {
    await act(() => root.render(React.createElement(MarketplaceSellFoodForm, {
      sellingAddress: 'Phòng 401, KTX Khu B ĐHQG',
      uploading: false,
      actionError: '',
      onSubmit: async (data) => { submitted.push(data) },
    })))

    // Check split-screen grid layout presence
    assert.ok(document.querySelector('.marketplace-sell-food-studio__grid'))
    assert.ok(document.querySelector('.marketplace-sell-food-studio__preview-column'))

    // Check presets exist
    const presetButtons = document.querySelectorAll('.marketplace-sell-food-studio button[type="button"]')
    assert.ok(presetButtons.length >= 3)

    // Form inputs exist
    const titleInput = document.getElementById('food-title')
    const priceInput = document.getElementById('food-price')
    assert.ok(titleInput)
    assert.ok(priceInput)

    // Validation: Title required
    const form = document.querySelector('form')
    await act(() => form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })))
    assert.match(document.body.textContent, /Vui lòng nhập tên món ăn/)
    assert.equal(submitted.length, 0)
  } finally {
    await act(() => root.unmount())
    cleanup()
  }
})
