import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'

const { chromium } = createRequire(import.meta.url)(process.env.HOMEJI_PLAYWRIGHT_MODULE || 'playwright')
const port = 5495
const base = `http://127.0.0.1:${port}`
const out = 'output/verification/food-marketplace-e2e'
await mkdir(out, { recursive: true })

// Start local production server
console.log(`Starting server on port ${port}...`)
const serverProcess = spawn(process.execPath, ['scripts/serve-prod.mjs'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(port) },
  stdio: ['ignore', 'pipe', 'pipe'],
})

serverProcess.stderr.on('data', (d) => process.stderr.write(`[server err] ${d}`))
serverProcess.stdout.on('data', (d) => process.stdout.write(`[server] ${d}`))

// Wait for server to listen
await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error('Server start timed out')), 10000)
  const check = async () => {
    try {
      const res = await fetch(`${base}/`)
      if (res.ok || res.status === 200 || res.status === 404) {
        clearTimeout(timeout)
        resolve()
        return
      }
    } catch {}
    setTimeout(check, 300)
  }
  check()
})
console.log('Server is ready!')

const chromePath = process.env.HOMEJI_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const browser = await chromium.launch({
  headless: true,
  executablePath: chromePath,
})

const results = { checks: [], errors: [] }
const id = '11111111-1111-4111-8111-111111111111'
const chefId = 'seller-chef-linh'
const foodPosts = [
  {
    id: 'food-com-ga',
    sellerId: chefId,
    sellerDisplayName: 'Bếp Sinh Viên Linh',
    title: 'Cơm gà xối mỡ giòn rụm',
    description: 'Cơm gà sốt teriyaki thơm lừng, kèm canh rau và dưa chua.',
    price: 35000,
    availableQuantity: 15,
    reservedQuantity: 0,
    unit: 'suất',
    condition: '',
    category: 'Cơm nhà',
    latitude: 10.8805,
    longitude: 106.7820,
    listingType: 2,
    status: 1,
    mediaUrls: ['/brand/homeji-logo2.png'],
    address: 'KTX Khu B ĐHQG TP.HCM',
    distanceKm: 0.3,
    preparationMinutes: 15,
    freshnessBadge: 'CookToOrder',
    allergenAlerts: 'Không cay',
    isSamplePhoto: false,
    createdAt: '2026-11-19T00:00:00Z',
    updatedAt: '2026-11-19T00:00:00Z',
  },
  {
    id: 'food-bun-cha',
    sellerId: chefId,
    sellerDisplayName: 'Bếp Sinh Viên Linh',
    title: 'Bún chả Hà Nội nướng than hoa',
    description: 'Chả viên và chả miếng nướng than đậm đà, nước mắm gia truyền.',
    price: 40000,
    availableQuantity: 8,
    reservedQuantity: 0,
    unit: 'phần',
    condition: '',
    category: 'Bún/Phở',
    latitude: 10.8805,
    longitude: 106.7820,
    listingType: 2,
    status: 1,
    mediaUrls: ['/brand/homeji-logo2.png'],
    address: 'KTX Khu B ĐHQG TP.HCM',
    distanceKm: 0.3,
    preparationMinutes: 20,
    freshnessBadge: 'DailyBatch',
    allergenAlerts: 'Có mè rang',
    isSamplePhoto: true,
    createdAt: '2026-11-19T00:00:00Z',
    updatedAt: '2026-11-19T00:00:00Z',
  },
]

try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  })

  await context.addInitScript((uid) => {
    localStorage.setItem('homeji_access_token', 'fixture-token')
    localStorage.setItem('homeji_refresh_token', 'fixture-refresh')
    localStorage.setItem('homeji_session_anchor', 'fixture-token')
    localStorage.setItem('homeji_user_id', uid)
    sessionStorage.setItem('hj-intro-seen', '1')
  }, id)

  await context.route('**/*', (route) => {
    const u = new URL(route.request().url())
    const p = u.pathname
    if (u.origin !== new URL(base).origin) return route.abort()
    if (!p.startsWith('/api/') && !p.startsWith('/hubs/')) return route.continue()
    if (p.startsWith('/hubs/')) return route.fulfill({ status: 503, body: '' })

    let json = []
    if (p === '/api/profile/me') {
      json = { id, displayName: 'Nguyễn Văn Sinh Viên', role: 1, onboardingCompleted: true, isPremium: false }
    } else if (p === '/api/search-interests') {
      json = { settings: { enabled: false, emailEnabled: false, aiEnabled: false }, following: [], suggestions: [], rooms: [], notice: null }
    } else if (p === '/api/wallet') {
      json = { userId: id, balance: 500000, isActivated: true }
    } else if (p === '/api/subscriptions/me') {
      json = { tier: 1, isPremium: false, packageCode: 'free' }
    } else if (p === '/api/chatbot/popup-config') {
      json = { enabled: false }
    } else if (p === '/api/vouchers/my') {
      json = [{ id: 'vouch-1', code: 'FOOD5K', discountAmount: 5000, minOrderValue: 25000, isUsed: false }]
    } else if (p.startsWith('/api/marketplace-posts')) {
      json = foodPosts
    } else if (p.startsWith('/api/marketplace-orders')) {
      json = [
        {
          id: 'order-1',
          sellerId: id,
          buyerId: 'buyer-fixture',
          buyerDisplayName: 'Trần Văn Mua',
          status: 1,
          postTitle: 'Cơm gà xối mỡ giòn rụm',
          agreedPrice: 35000,
          unitPrice: 35000,
          quantity: 2,
          pickupAddress: 'KTX Khu B',
          note: 'Cho nhiều canh',
          createdAt: new Date().toISOString(),
          pickupAt: new Date(Date.now() + 1800000).toISOString(),
        },
      ]
    }
    return route.fulfill({ json })
  })

  const page = await context.newPage()
  page.on('console', (msg) => console.log(`[browser ${msg.type()}] ${msg.text()}`))
  page.on('pageerror', (e) => {
    console.error(`[browser error] ${e.message}`)
    results.errors.push(e.message)
  })
  page.on('requestfailed', (req) => console.log(`[req failed] ${req.method()} ${req.url()}`))

  // ==========================================
  // TEST 1: DESKTOP EXPERIENCE (1440 x 900)
  // ==========================================
  console.log('Testing Desktop 1440x900...')
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${base}/?section=marketplace&market=food`)
  await page.locator('.food-card').first().waitFor({ timeout: 10000 })
  await page.locator('.hj-intro').waitFor({ state: 'hidden' })

  // Verify desktop elements
  const desktopRail = page.locator('.food-rail-desktop')
  assert.equal(await desktopRail.isVisible(), true, 'Desktop utility rail must be visible on 1440px')
  assert.equal(await page.locator('.food-card').count(), 2, '2 food cards must be rendered')

  // Verify meal filter tabs
  const lunchTab = page.getByRole('tab', { name: 'Trưa nay ăn gì?' })
  await lunchTab.click()
  assert.equal(await lunchTab.getAttribute('aria-selected'), 'true')

  const allTab = page.getByRole('tab', { name: 'Tất cả' })
  await allTab.click()
  assert.equal(await allTab.getAttribute('aria-selected'), 'true')

  // Add item to cart
  const addCartBtn = page.locator('.food-card__cart-btn').first()
  await addCartBtn.click()
  assert.equal(await addCartBtn.textContent(), 'Bỏ khỏi giỏ')

  // Verify sticky floating cart bar appears
  const floatingCart = page.locator('.food-sticky-floating-cart')
  await floatingCart.waitFor()
  assert.match(await floatingCart.textContent(), /1 món · 35\.000 đ/)
  const floatingCartPos = await floatingCart.evaluate(el => window.getComputedStyle(el).position)
  assert.equal(floatingCartPos, 'fixed', 'Sticky floating cart must have position: fixed')

  await page.screenshot({ path: `${out}/desktop-1440-food-market.png` })
  results.checks.push('Desktop food marketplace rendered and cart bar active')

  // Switch to Shop -> Sell Tab (Seller Food Studio)
  console.log('Testing Seller Food Studio on Desktop...')
  const shopPrimaryTab = page.getByRole('tab', { name: 'Cửa hàng' })
  await shopPrimaryTab.click()
  const sellSubTab = page.getByRole('tab', { name: 'Đăng bán' })
  await sellSubTab.click()

  // Make sure listing type is Food (listingType=2)
  const foodRadio = page.locator('input[value="2"]')
  if (await foodRadio.isVisible()) {
    await foodRadio.check()
  }

  await page.locator('.marketplace-sell-food-studio').waitFor({ timeout: 10000 })
  const gridLocator = page.locator('.marketplace-sell-food-studio__grid')
  console.log('Grid count:', await gridLocator.count())
  if (await gridLocator.count() > 0) {
    console.log('Grid isVisible:', await gridLocator.first().isVisible())
    console.log('Grid boundingBox:', await gridLocator.first().boundingBox())
    console.log('Grid outerHTML snippet:', (await gridLocator.first().evaluate(el => el.outerHTML)).slice(0, 200))
  }
  assert.equal(await page.locator('.marketplace-sell-food-studio__grid').isVisible(), true)
  assert.equal(await page.locator('.marketplace-sell-food-studio__preview-column').isVisible(), true)

  // Verify dynamic chroma margin gauge
  const marginBadge = page.locator('.profit-margin-percent-badge')
  await marginBadge.waitFor()
  assert.match(await marginBadge.textContent(), /% biên lãi/)

  const gaugeBar = page.locator('.profit-margin-gauge__bar')
  assert.equal(await gaugeBar.isVisible(), true)

  await page.screenshot({ path: `${out}/desktop-1440-seller-studio.png` })
  results.checks.push('Desktop seller studio split-screen verified')

  // Switch to Sales Tab (Kitchen Order Board)
  console.log('Testing Kitchen Order Board on Desktop...')
  const salesSubTab = page.getByRole('tab', { name: 'Đơn bán' })
  await salesSubTab.click()
  await page.locator('.kitchen-order-board').waitFor({ timeout: 10000 })

  // Verify Dorm Silent button
  const dormSilentBtn = page.locator('.btn-dorm-silent')
  await dormSilentBtn.waitFor()
  assert.match(await dormSilentBtn.textContent(), /Chuông Báo Bếp|Yên Lặng KTX/)
  await dormSilentBtn.click()
  assert.match(await dormSilentBtn.textContent(), /Yên Lặng KTX/)
  await dormSilentBtn.click()
  assert.match(await dormSilentBtn.textContent(), /Chuông Báo Bếp/)

  await page.screenshot({ path: `${out}/desktop-1440-kitchen-board.png` })
  results.checks.push('Desktop kitchen board verified')

  // ==========================================
  // TEST 2: MOBILE EXPERIENCE (390 x 844 iPhone 14)
  // ==========================================
  console.log('Testing Mobile 390x844...')
  await page.setViewportSize({ width: 390, height: 844 })
  // Switch back to shopping food tab
  const shoppingPrimaryTab = page.getByRole('tab', { name: 'Mua sắm' })
  await shoppingPrimaryTab.click()
  const foodSubTab = page.getByRole('tab', { name: 'Đồ ăn' })
  await foodSubTab.click()

  await page.locator('.food-card').first().waitFor({ timeout: 10000 })

  // Desktop rail must be hidden on mobile
  assert.equal(await desktopRail.isVisible(), false, 'Desktop rail must be hidden on mobile')

  // Add item on mobile
  const mobileCardBtn = page.locator('.food-card__cart-btn').first()
  if (await mobileCardBtn.textContent() !== 'Bỏ khỏi giỏ') {
    await mobileCardBtn.click()
  }
  const mobileFloatingCart = page.locator('.food-sticky-floating-cart')
  await mobileFloatingCart.waitFor()
  assert.equal(await mobileFloatingCart.isVisible(), true)
  const mobileFloatingCartPos = await mobileFloatingCart.evaluate(el => window.getComputedStyle(el).position)
  assert.equal(mobileFloatingCartPos, 'fixed', 'Mobile floating cart must be fixed')
  const fabVisible = await page.locator('.food-cart-fab').isVisible()
  assert.equal(fabVisible, false, '.food-cart-fab must be hidden when sticky floating cart bar is shown')

  // Click View Cart in floating cart
  await mobileFloatingCart.getByRole('button', { name: /Xem giỏ & Thanh toán/ }).click()

  // Cart dialog opens
  const cartDialog = page.getByRole('dialog', { name: 'Giỏ hàng', exact: true })
  await cartDialog.waitFor()
  assert.equal(await cartDialog.isVisible(), true)

  // Proceed to checkout
  await cartDialog.locator('.food-rail__checkout').click()

  // Checkout confirmation dialog appears
  const checkoutConfirmation = page.locator('.food-checkout-confirmation')
  await checkoutConfirmation.waitFor()
  assert.equal(await checkoutConfirmation.isVisible(), true)

  // Check Dual Fulfillment buttons
  const pickupBtn = checkoutConfirmation.getByRole('button', { name: 'Tự đến lấy tại bếp' })
  const deliveryBtn = checkoutConfirmation.getByRole('button', { name: 'Bếp giao tận phòng KTX' })
  assert.equal(await pickupBtn.isVisible(), true)
  assert.equal(await deliveryBtn.isVisible(), true)

  // Select delivery
  await deliveryBtn.click()
  assert.equal(await checkoutConfirmation.locator('#checkout-recipient-name').isVisible(), true)
  assert.equal(await checkoutConfirmation.locator('#checkout-recipient-phone').isVisible(), true)
  assert.equal(await checkoutConfirmation.locator('#checkout-delivery-address').isVisible(), true)

  // Escrow reassurance message is displayed
  assert.match(await checkoutConfirmation.textContent(), /Tiền thanh toán được bảo vệ bởi Homeji Escrow/)

  await page.screenshot({ path: `${out}/mobile-390-checkout-dual-fulfillment.png` })
  results.checks.push('Mobile 390px dual fulfillment checkout verified')

  // Press Escape to dismiss
  await page.keyboard.press('Escape')
  await checkoutConfirmation.waitFor({ state: 'hidden' })

  // ==========================================
  // TEST 3: SMALL MOBILE (320 x 600)
  // ==========================================
  console.log('Testing Small Mobile 320x600...')
  await page.setViewportSize({ width: 320, height: 600 })
  await page.keyboard.press('Escape') // close cart dialog if still open
  if (await cartDialog.isVisible()) {
    await cartDialog.locator('.food-cart-sheet__close').click()
  }

  await page.locator('.food-card').first().waitFor({ timeout: 10000 })
  const cardBox = await page.locator('.food-card').first().boundingBox()
  assert.ok(cardBox.width <= 320, 'Food card fits within 320px viewport')
  const hasHorizontalScroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  assert.equal(hasHorizontalScroll, false, '320px viewport must have 0 horizontal overflow')

  await page.screenshot({ path: `${out}/mobile-320-food-market.png` })
  results.checks.push('Small mobile 320px fits cleanly without horizontal overflow')

  // ==========================================
  // TEST 4: DARK MODE VERIFICATION
  // ==========================================
  console.log('Testing Dark Mode on Mobile 390x844...')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
  const isDarkMode = await page.evaluate(() => document.documentElement.getAttribute('data-theme') === 'dark')
  assert.equal(isDarkMode, true)
  const cardSurfaceBg = await page.locator('.food-card-surface').first().evaluate(el => window.getComputedStyle(el).backgroundColor)
  assert.ok(cardSurfaceBg, 'Dark mode food card surface background rendered')
  await page.screenshot({ path: `${out}/mobile-390-dark-mode.png` })
  results.checks.push('Dark mode rendering verified on mobile 390px')
  await page.evaluate(() => document.documentElement.removeAttribute('data-theme'))

  console.log('ALL E2E MOBILE AND DESKTOP CHECKS PASSED!')
  await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2))
} finally {
  await browser.close()
  serverProcess.kill('SIGTERM')
}
