import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium } from 'playwright'

const base = new URL(process.env.HOMEJI_TEST_BASE_URL || 'http://127.0.0.1:5493')
assert.ok(['localhost', '127.0.0.1'].includes(base.hostname), 'Local fixtures only')
const userId = '11111111-1111-4111-8111-111111111111'
const room = {
  id: '22222222-2222-4222-8222-222222222222', ownerId: 'owner-fixture', type: 1, status: 3,
  title: 'Phòng sáng thoáng gần trường đại học tại Thủ Đức', price: 3500000, area: 26,
  address: 'Linh Trung, Thủ Đức', latitude: 10.85, longitude: 106.8, media: [], amenities: [],
}
const dish = {
  id: 'dish-fixture', sellerId: 'seller-fixture', sellerDisplayName: 'Bếp kiểm thử',
  title: 'Cơm gà xối mỡ', price: 40000, listingType: 2, status: 1, category: 'Cơm nhà', unit: 'phần',
  address: 'Linh Trung, Thủ Đức', availableQuantity: 5, reservedQuantity: 0, mediaUrls: [],
}

async function withFontSize(size, run) {
  const profile = await mkdtemp(join(tmpdir(), 'homeji-ui-scaling-'))
  try {
    await mkdir(join(profile, 'Default'))
    await writeFile(join(profile, 'Default', 'Preferences'), JSON.stringify({
      webkit: { webprefs: { default_font_size: size } },
    }))
    const context = await chromium.launchPersistentContext(profile, {
      channel: 'chrome', viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce',
    })
    try {
      await context.addCookies([{ name: 'homeji_session_hint', value: '1', url: base.origin }])
      await context.addInitScript(() => sessionStorage.setItem('hj-intro-seen', '1'))
      await context.route('**/*', route => {
        const url = new URL(route.request().url())
        if (url.origin !== base.origin) return route.abort()
        if (url.pathname.startsWith('/hubs/')) return route.fulfill({ status: 503 })
        if (!url.pathname.startsWith('/api/')) return route.continue()
        if (url.pathname === '/api/account/session') {
          return route.fulfill({ json: { accessToken: 'fixture', userId } })
        }
        if (url.pathname === '/api/profile/me') {
          return route.fulfill({ json: { id: userId, displayName: 'Nguyễn Văn An', role: 1, onboardingCompleted: true } })
        }
        if (url.pathname === '/api/search-interests') {
          return route.fulfill({ json: { settings: { enabled: false }, following: [], suggestions: [], rooms: [] } })
        }
        if (url.pathname === '/api/rental-posts') return route.fulfill({ json: [room] })
        if (url.pathname === '/api/marketplace-posts') return route.fulfill({ json: [dish] })
        if (url.pathname === '/api/wallet') {
          return route.fulfill({ json: { balance: 350000, totalDeposited: 350000, totalSpent: 0, totalEarned: 0, isActivated: true } })
        }
        if (url.pathname === '/api/chatbot/popup-config') {
          return route.fulfill({ json: { enabled: true, greeting: 'Chào bạn', suggestedPrompts: [] } })
        }
        return route.fulfill({ json: [] })
      })
      const page = context.pages()[0]
      page.setDefaultTimeout(8000)
      const pageErrors = []
      page.on('pageerror', error => pageErrors.push(error.message))
      await run(page)
      assert.deepEqual(pageErrors, [])
    } finally {
      await context.close()
    }
  } finally {
    await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 150 })
  }
}

async function openWorkspace(page) {
  await page.goto(new URL('/?section=listings&view=list', base).href)
  await page.locator('.hj-header').waitFor({ timeout: 10000 })
}

async function fontSize(locator) {
  return locator.evaluate(element => parseFloat(getComputedStyle(element).fontSize), undefined, { timeout: 5000 })
}

async function workspaceFontSizes(page) {
  return {
    root: await fontSize(page.locator('html')),
    menu: await fontSize(page.locator('.hj-menu-trigger span')),
    listingFilter: await fontSize(page.locator('.map-listings__catalog button').first()),
    listingTitle: await fontSize(page.getByText(room.title, { exact: true }).first()),
  }
}

async function setBrowserZoom(page, zoom) {
  const settings = await page.context().newPage()
  try {
    await settings.goto('chrome://settings/appearance')
    assert.equal(await settings.evaluate(scale => new Promise(resolve => {
      chrome.settingsPrivate.setDefaultZoom(scale, resolve)
    }), zoom), true)
  } finally {
    await settings.close()
  }
  await page.waitForFunction(scale => innerWidth === 1280 / scale && devicePixelRatio === scale, zoom)
}

async function assertFitsViewport(locator) {
  await locator.waitFor({ timeout: 5000 })
  const geometry = await locator.evaluate(async element => {
    await Promise.allSettled(element.getAnimations()
      .filter(animation => Number.isFinite(animation.effect.getComputedTiming().endTime))
      .map(animation => animation.finished))
    const { left, right, top, bottom } = element.getBoundingClientRect()
    return { left, right, top, bottom, width: innerWidth, height: innerHeight }
  })
  assert.ok(
    geometry.left >= -1 && geometry.right <= geometry.width + 1 && geometry.top >= -1 && geometry.bottom <= geometry.height + 1,
    `${locator} needs to fit the viewport: ${JSON.stringify(geometry)}`,
  )
}

async function assertNoPageOverflow(page) {
  const { viewport, documentWidth } = await page.evaluate(() => ({
    viewport: innerWidth, documentWidth: document.documentElement.scrollWidth,
  }))
  assert.ok(documentWidth <= viewport + 1, `Page needs ${documentWidth}px in a ${viewport}px viewport`)
}

async function assertWorkspaceReachable(page) {
  const menu = page.locator('.hj-menu-trigger')
  await assertNoPageOverflow(page)
  await assertFitsViewport(menu)
  await assertFitsViewport(page.locator('.hj-profile'))
  await assertFitsViewport(page.getByRole('button', { name: 'Lọc', exact: true }))
  await menu.click()
  const category = page.locator('.hj-mega').filter({ visible: true })
  await assertFitsViewport(category)
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Lọc', exact: true }).click()
  await assertFitsViewport(page.getByRole('dialog', { name: 'Bộ lọc' }))
  await page.getByRole('button', { name: 'Đóng bộ lọc' }).click()
  const listingTitle = page.getByText(room.title, { exact: true }).first()
  await listingTitle.scrollIntoViewIfNeeded()
  await assertFitsViewport(listingTitle)
  assert.ok(await listingTitle.evaluate(element => element.scrollHeight <= element.clientHeight + 1), 'Listing title remains readable')
}

async function assertMarketplaceReachable(page) {
  await page.goto(new URL('/?section=marketplace&market=food', base).href)
  const sell = page.getByRole('button', { name: 'Đăng bán', exact: true })
  await assertFitsViewport(sell)
  await assertNoPageOverflow(page)
  await page.locator('.food-card__cart-btn').first().click()
  const cart = page.getByRole('button', { name: /^Mở giỏ hàng, 1 món,/ })
  await cart.click()
  const dialog = page.getByRole('dialog', { name: 'Giỏ hàng', exact: true })
  await assertFitsViewport(dialog)
  await dialog.getByRole('textbox', { name: 'Ghi chú cho bếp', exact: true }).fill('Ít cay')
  await page.keyboard.press('Escape')
  await dialog.waitFor({ state: 'hidden' })
  const walletTab = page.getByRole('tab', { name: 'Ví Homeji' })
  await walletTab.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest' }))
  await walletTab.click()
  await page.waitForURL(/market=wallet/)
  await assertNoPageOverflow(page)
  const wallet = page.locator('.wallet-workspace')
  await wallet.waitFor()
  assert.ok(await wallet.evaluate(element => element.scrollWidth <= element.clientWidth + 1), 'Wallet controls fit their panel')
}

let normal
await withFontSize(16, async page => {
  await openWorkspace(page)
  normal = await workspaceFontSizes(page)
  await setBrowserZoom(page, 2)
  await assertWorkspaceReachable(page)
  await openWorkspace(page)
  await setBrowserZoom(page, 4)
  await assertWorkspaceReachable(page)
})

await withFontSize(32, async page => {
  await openWorkspace(page)
  const enlarged = await workspaceFontSizes(page)
  assert.equal(enlarged.root, 32, 'The browser uses the requested default font size')
  for (const [name, size] of Object.entries(normal)) {
    assert.ok(enlarged[name] >= size * 1.9, `${name} should scale with the browser font: ${size}px → ${enlarged[name]}px`)
  }
  await assertWorkspaceReachable(page)
  await openWorkspace(page)
  await page.setViewportSize({ width: 320, height: 740 })
  await assertWorkspaceReachable(page)
  await assertMarketplaceReachable(page)
  await page.goto(new URL('/?section=profile&profileTab=basic', base).href)
  const avatarLabel = page.locator('.profile-account-avatar small')
  await assertFitsViewport(avatarLabel)
  assert.ok(await avatarLabel.evaluate(element => element.scrollWidth <= element.clientWidth + 1), 'Avatar action remains readable')

  await page.setViewportSize({ width: 320, height: 460 })
  await page.getByRole('button', { name: 'Homeji AI', exact: true }).click()
  await assertFitsViewport(page.getByRole('button', { name: 'Đóng Homeji', exact: true }))
  const composer = page.getByRole('textbox', { name: 'Nhập tin nhắn cho Homeji' })
  await assertFitsViewport(composer)
  assert.ok(await fontSize(composer) >= 28, 'The assistant composer follows the browser font size')
  await composer.fill('Tìm phòng ở Thủ Đức')
  assert.equal(await composer.inputValue(), 'Tìm phòng ở Thủ Đức')
})

console.log('PASS: Homeji scales with Chrome font preferences and reflows at 400% browser zoom')
