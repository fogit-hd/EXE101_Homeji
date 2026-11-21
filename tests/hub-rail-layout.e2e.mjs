import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { darkTextIssues } from './helpers/darkReadability.mjs'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.HOMEJI_PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.HOMEJI_TEST_BASE_URL || 'http://127.0.0.1:5529'
if (!['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) {
  throw new Error('Local fixtures only')
}

const outDir = 'output/verification/hub-rail-layout'
await mkdir(outDir, { recursive: true })

const userId = '11111111-1111-4111-8111-111111111111'
const stamp = '2026-11-20T08:00:00Z'
const svgPhoto = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#14532d"/><stop offset="100%" stop-color="#0ea5e9"/></linearGradient></defs><rect width="320" height="200" fill="url(#g)"/><circle cx="250" cy="52" r="24" fill="#fde68a" opacity=".8"/><rect x="28" y="110" width="264" height="62" rx="12" fill="rgba(255,255,255,.18)"/></svg>',
)}`

const rentalItems = [
  {
    id: '22222222-2222-4222-8222-222222222201',
    ownerId: userId,
    ownerRole: 2,
    type: 1,
    status: 3,
    title: 'Phòng studio ban công thoáng mát gần ĐH Bách Khoa',
    description: 'Full nội thất, khóa vân tay, giờ giấc tự do.',
    price: 3800000,
    deposit: 3800000,
    area: 28,
    address: 'Linh Trung, Thủ Đức, TP.HCM',
    latitude: 10.87,
    longitude: 106.8,
    maxOccupants: 2,
    availableSlots: 2,
    amenities: ['WIFI', 'AIR_CONDITIONER'],
    thumbnailPath: svgPhoto,
    media: [{ id: 'm1', url: svgPhoto, type: 1, sortOrder: 0 }],
    createdAt: stamp,
    updatedAt: stamp,
    viewCount: 320,
    saveCount: 18,
    isOwnerPremium: true,
  },
  {
    id: '22222222-2222-4222-8222-222222222202',
    ownerId: userId,
    ownerRole: 2,
    type: 2,
    status: 3,
    title: 'Căn hộ mini 1PN có máy giặt riêng và bếp từ',
    description: 'Hẻm xe hơi yên tĩnh, gần trạm Metro.',
    price: 5200000,
    deposit: 5200000,
    area: 34,
    address: 'Bình Thọ, Thủ Đức, TP.HCM',
    latitude: 10.85,
    longitude: 106.76,
    maxOccupants: 3,
    availableSlots: 2,
    amenities: ['WIFI', 'WASHING_MACHINE'],
    thumbnailPath: svgPhoto,
    media: [{ id: 'm2', url: svgPhoto, type: 1, sortOrder: 0 }],
    createdAt: stamp,
    updatedAt: stamp,
    viewCount: 280,
    saveCount: 14,
    isOwnerPremium: true,
  },
  {
    id: '22222222-2222-4222-8222-222222222203',
    ownerId: '33333333-3333-4333-8333-333333333303',
    ownerRole: 2,
    type: 1,
    status: 3,
    title: 'Trọ sinh viên có gác lửng sạch sẽ, để xe miễn phí',
    description: 'Khu dân cư an ninh, wifi tốc độ cao.',
    price: 2600000,
    deposit: 2600000,
    area: 22,
    address: 'Tăng Nhơn Phú A, Thủ Đức, TP.HCM',
    latitude: 10.84,
    longitude: 106.78,
    maxOccupants: 2,
    availableSlots: 1,
    amenities: ['WIFI'],
    thumbnailPath: svgPhoto,
    media: [{ id: 'm3', url: svgPhoto, type: 1, sortOrder: 0 }],
    createdAt: stamp,
    updatedAt: stamp,
    viewCount: 110,
    saveCount: 5,
    isOwnerPremium: false,
  },
  {
    id: '22222222-2222-4222-8222-222222222204',
    ownerId: '33333333-3333-4333-8333-333333333304',
    ownerRole: 2,
    type: 1,
    status: 3,
    title: 'Phòng trọ mới sơn sửa gần Làng Đại học Quốc gia',
    description: 'Cửa sổ lớn đón nắng, không chung chủ.',
    price: 2900000,
    deposit: 2900000,
    area: 24,
    address: 'Đông Hòa, Dĩ An, Bình Dương',
    latitude: 10.88,
    longitude: 106.79,
    maxOccupants: 2,
    availableSlots: 2,
    amenities: ['WIFI', 'PARKING'],
    thumbnailPath: null,
    media: [],
    createdAt: stamp,
    updatedAt: stamp,
    viewCount: 75,
    saveCount: 4,
    isOwnerPremium: false,
  },
]

const marketItems = [
  {
    id: 'mkt-food-1',
    sellerId: 'seller-food',
    sellerDisplayName: 'Bếp Nhà Vy',
    listingType: 2,
    status: 1,
    title: 'Cơm gà xối mỡ sốt mắm tỏi nóng giòn',
    description: 'Nấu mới mỗi buổi trưa, giao tận cổng trọ.',
    category: 'Cơm trưa',
    price: 38000,
    address: 'Linh Trung, Thủ Đức',
    latitude: 10.87,
    longitude: 106.8,
    mediaUrls: [svgPhoto],
    availableQuantity: 8,
    reservedQuantity: 0,
    preparationMinutes: 15,
    unit: 'phần',
    createdAt: stamp,
  },
  {
    id: 'mkt-goods-1',
    sellerId: 'seller-goods',
    sellerDisplayName: 'Minh Khoa',
    listingType: 1,
    status: 1,
    title: 'Bàn học gỗ ép kèm kệ sách nhỏ gọn còn mới 95%',
    description: 'Dùng 4 tháng, chuyển trọ nên nhượng lại.',
    category: 'Nội thất',
    condition: 'Như mới',
    price: 280000,
    address: 'Bình Thọ, Thủ Đức',
    latitude: 10.85,
    longitude: 106.76,
    mediaUrls: [svgPhoto],
    availableQuantity: 1,
    reservedQuantity: 0,
    unit: 'cái',
    createdAt: stamp,
  },
  {
    id: 'mkt-food-2',
    sellerId: 'seller-food-2',
    sellerDisplayName: 'Tiệm Chè Cô Hai',
    listingType: 2,
    status: 1,
    title: 'Trà tắc mật ong + bánh flan caramen',
    description: 'Ít ngọt, phù hợp sinh viên học khuya.',
    category: 'Đồ uống',
    price: 22000,
    address: 'Linh Xuân, Thủ Đức',
    latitude: 10.88,
    longitude: 106.77,
    mediaUrls: [],
    availableQuantity: 10,
    reservedQuantity: 0,
    preparationMinutes: 10,
    unit: 'combo',
    createdAt: stamp,
  },
  {
    id: 'mkt-goods-2',
    sellerId: 'seller-goods-2',
    sellerDisplayName: 'Lan Anh',
    listingType: 1,
    status: 1,
    title: 'Quạt đứng Senko chạy êm ít hao điện',
    description: 'Hoạt động ổn định cả 3 tốc độ.',
    category: 'Gia dụng',
    condition: 'Đã sử dụng',
    price: 160000,
    address: 'Hiệp Phú, Thủ Đức',
    latitude: 10.84,
    longitude: 106.78,
    mediaUrls: [],
    availableQuantity: 1,
    reservedQuantity: 0,
    unit: 'cái',
    createdAt: stamp,
  },
]

const futureAppointment = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.HOMEJI_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
})

async function setupContext({ width, height, theme, role }) {
  const rentalRequests = []
  const marketRequests = []
  const errors = []

  const context = await browser.newContext({
    viewport: { width, height },
    reducedMotion: 'reduce',
    colorScheme: theme,
  })

  await context.addInitScript(
    ({ id, mode }) => {
      localStorage.setItem('homeji_access_token', 'hub-rail-e2e-fixture')
      localStorage.setItem('homeji_user_id', id)
      localStorage.setItem('homeji_theme', mode)
      localStorage.setItem('homeji_analytics_consent_v1', 'rejected')
      localStorage.setItem(
        'homeji:map-search-recent',
        JSON.stringify([
          { keyword: 'Thủ Đức' },
          { keyword: 'Gần ĐH Quốc gia' },
          { keyword: 'Phòng có ban công' },
        ]),
      )
      sessionStorage.setItem('hj-intro-seen', '1')
    },
    { id: userId, mode: theme },
  )

  await context.route('**/*', async route => {
    const req = route.request()
    const u = new URL(req.url())
    if (u.origin !== new URL(base).origin) return route.abort()
    if (u.pathname.startsWith('/hubs/')) return route.fulfill({ status: 503, body: '' })
    if (!u.pathname.startsWith('/api/')) return route.continue()

    if (u.pathname === '/api/profile/me') {
      return route.fulfill({
        json: {
          id: userId,
          displayName: 'Nguyễn Minh Anh',
          email: 'hub-e2e@example.test',
          phoneNumber: '0900000000',
          role,
          onboardingCompleted: true,
          isPremium: role !== 1,
          landlordVerificationStatus: role === 2 ? 2 : 0,
        },
      })
    }
    if (u.pathname === '/api/rental-posts') {
      rentalRequests.push(u.search)
      return route.fulfill({ json: rentalItems })
    }
    if (u.pathname === '/api/marketplace-posts') {
      marketRequests.push(u.search)
      return route.fulfill({ json: marketItems })
    }
    if (u.pathname === '/api/viewing-appointments') {
      return route.fulfill({
        json: [
          {
            id: 'appt-1',
            rentalPostId: rentalItems[0].id,
            rentalPostTitle: rentalItems[0].title,
            scheduledAt: futureAppointment,
            status: 1,
            note: 'Hẹn tại cổng chính',
          },
        ],
      })
    }
    if (u.pathname === '/api/notifications') {
      return route.fulfill({
        json: [
          {
            id: 'notif-1',
            type: 11,
            title: 'Phòng bạn lưu vừa cập nhật',
            message: 'Phòng studio ban công thoáng mát vẫn còn trống.',
            isRead: false,
            createdAt: stamp,
          },
        ],
      })
    }
    if (u.pathname === '/api/search-interests') {
      return route.fulfill({
        json: {
          settings: { enabled: true, emailEnabled: false, aiEnabled: false },
          newSavedListingsCount: 2,
          following: [],
          suggestions: [],
          rooms: [],
        },
      })
    }
    if (u.pathname === '/api/conversations') {
      return route.fulfill({
        json: [
          {
            id: 'conv-1',
            otherParticipantId: 'owner-1',
            otherParticipantName: 'Chủ trọ Minh Tâm',
            otherParticipantAvatarPath: null,
            rentalPostTitle: rentalItems[0].title,
            lastMessage: 'Chiều nay 4h bạn ghé xem phòng nhé',
            updatedAt: stamp,
            unreadCount: 1,
          },
        ],
      })
    }
    if (u.pathname === '/api/saved-posts') {
      return route.fulfill({ json: role === 1 ? [rentalItems[1]] : [] })
    }
    if (/^\/api\/saved-posts\/[^/]+\/roommate-candidates$/.test(u.pathname)) {
      return route.fulfill({
        json: [
          {
            userId: 'cand-1',
            displayName: 'Hoàng Nam',
            preferredArea: 'Linh Trung, Thủ Đức',
            matchScore: 88,
          },
        ],
      })
    }
    if (u.pathname === '/api/roommate-invitations/mine') {
      return route.fulfill({ json: [] })
    }
    if (u.pathname === '/api/wallet') {
      return route.fulfill({ json: { userId, balance: 350000, isActivated: true } })
    }
    if (u.pathname === '/api/subscriptions/me') {
      return route.fulfill({ json: { tier: role !== 1 ? 2 : 1, isPremium: role !== 1, packageCode: role !== 1 ? 'premium' : 'free' } })
    }
    if (u.pathname === '/api/chatbot/popup-config') {
      return route.fulfill({ json: { enabled: false } })
    }
    if (u.pathname === '/api/admin/analytics/product') {
      return route.fulfill({ status: 503, json: { message: 'Analytics mocked off' } })
    }
    return route.fulfill({ json: [] })
  })

  const page = await context.newPage()
  page.on('pageerror', err => errors.push(err.message))
  await page.goto(`${base}/`)
  await page.locator('.hub-rooms > ul > li').first().waitFor({ state: 'visible', timeout: 15000 })
  await page.locator('.hub-market > ul > li').first().waitFor({ state: 'visible', timeout: 15000 })
  const skip = page.getByRole('button', { name: 'Bỏ qua', exact: true })
  if (await skip.isVisible().catch(() => false)) await skip.click().catch(() => {})
  await page.locator('.hj-intro').waitFor({ state: 'hidden', timeout: 15000 })
  await page.waitForTimeout(650)
  await page.evaluate(() => window.scrollTo(0, 0))

  return { context, page, rentalRequests, marketRequests, errors }
}

const summary = []

try {
  // 1. Desktop 1440x950 Light (Role 1 = Renter)
  {
    const { context, page, rentalRequests, marketRequests, errors } = await setupContext({
      width: 1440,
      height: 950,
      theme: 'light',
      role: 1,
    })
    assert.deepEqual(errors, [], 'Desktop light must have 0 pageerrors')
    assert.ok(rentalRequests.some(q => q.includes('pageSize=4')), `Expected rental pageSize=4, got: ${JSON.stringify(rentalRequests)}`)
    assert.ok(
      !rentalRequests.some(q => decodeURIComponent(q).includes('Thủ Đức')),
      `HomePage must NOT call loadPosts() with recent keyword on Hub: ${JSON.stringify(rentalRequests)}`,
    )
    assert.ok(marketRequests.some(q => q.includes('pageSize=4')), `Expected market pageSize=4, got: ${JSON.stringify(marketRequests)}`)

    const geom = await page.evaluate(() => {
      const box = sel => {
        const el = document.querySelector(sel)
        if (!el) return null
        const r = el.getBoundingClientRect()
        return { x: r.left, y: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }
      }
      const rooms = [...document.querySelectorAll('.hub-rooms > ul > li')].map(el => {
        const r = el.getBoundingClientRect()
        return { x: r.left, y: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }
      })
      const promoRect = box('.hub-promo--rail')
      const promoInteractive = [...document.querySelectorAll('.hub-promo--rail .hub-promo__cta, .hub-promo--rail .hub-promo__arrows button, .hub-promo--rail .hub-promo__dots')].map(el => {
        const r = el.getBoundingClientRect()
        return { left: r.left, top: r.top, right: r.right, bottom: r.bottom }
      })
      const promoCopy = [...document.querySelectorAll('.hub-promo--rail .hub-promo__eyebrow, .hub-promo--rail .hub-promo__copy h2, .hub-promo--rail .hub-promo__copy p')].map(el => {
        const r = el.getBoundingClientRect()
        return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, text: el.textContent?.trim() }
      })
      const overlaps = []
      for (const a of promoInteractive) {
        for (const b of promoCopy) {
          if (a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1) {
            overlaps.push({ a, b })
          }
        }
      }
      const promoDotTexts = []
      return {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        mainDisplay: getComputedStyle(document.querySelector('.hub-main')).display,
        welcome: box('.hub-welcome'),
        search: box('.hub-search'),
        main: box('.hub-main'),
        roomsSection: box('.hub-rooms'),
        rail: box('.hub-rail'),
        promo: promoRect,
        railMarket: box('.hub-rail .hub-market'),
        communityMarketCount: document.querySelectorAll('.hub-community .hub-market').length,
        update: box('.hub-update'),
        viewings: box('.hub-viewings'),
        community: box('.hub-community'),
        rooms,
        premiumLinkCount: document.querySelectorAll('.hub-rooms li a.premium-listing').length,
        premiumBadgeCount: document.querySelectorAll('.hub-rooms .premium-badge').length,
        marketCount: document.querySelectorAll('.hub-rail .hub-market li a').length,
        foodBadges: [...document.querySelectorAll('.hub-rail .hub-market li .hub-market__kind')].filter(el => el.textContent?.trim() === 'Đồ ăn').length,
        goodsBadges: [...document.querySelectorAll('.hub-rail .hub-market li .hub-market__kind')].filter(el => el.textContent?.trim() === 'Đồ cũ').length,
        marketImgs: document.querySelectorAll('.hub-rail .hub-market li .hub-market__thumb img').length,
        fallbackIcons: document.querySelectorAll('.hub-rail .hub-market li .hub-market__thumb-fallback svg').length,
        promoDotsCount: document.querySelectorAll('.hub-promo--rail .hub-promo__dots button').length,
        promoOverlaps: overlaps,
        promoOutOfBounds: promoInteractive.filter(r => r.right > promoRect.right + 1 || r.bottom > promoRect.bottom + 1),
        promoEyebrowsAfterInit: promoDotTexts,
      }
    })

    assert.ok(geom.scrollWidth <= geom.clientWidth, 'No horizontal overflow at 1440px')
    assert.equal(geom.mainDisplay, 'grid')
    assert.ok(geom.welcome && geom.search && geom.main && geom.update && geom.viewings && geom.community, 'All Hub blocks rendered')
    assert.ok(geom.welcome.bottom <= geom.search.y + 4, 'Welcome above recent bar')
    assert.ok(geom.search.height <= 85, `Recent bar must stay compact 1 line, got height=${geom.search.height}`)
    assert.ok(geom.search.bottom <= geom.main.y + 4, 'Recent bar above 2-col main')
    assert.ok(geom.main.bottom <= geom.update.y + 4, '2-col main above saved alert banner')
    assert.ok(geom.update.bottom <= geom.viewings.y + 4, 'Saved alert above viewings')
    assert.ok(geom.roomsSection.right < geom.rail.x, 'Rooms column on LEFT of right utility rail')
    assert.ok(geom.rail.width >= 318 && geom.rail.width <= 362, `Rail width expected 320..360px, got ${geom.rail.width}`)
    assert.ok(geom.roomsSection.width > geom.rail.width * 1.9, 'Left rooms column ~68-72% vs right rail')
    assert.equal(geom.rooms.length, 4, 'Expected 4 rooms')
    assert.ok(Math.abs(geom.rooms[0].y - geom.rooms[1].y) <= 3, 'Rooms row 1 side-by-side')
    assert.ok(geom.rooms[2].y > geom.rooms[0].bottom - 4 && Math.abs(geom.rooms[2].y - geom.rooms[3].y) <= 3, 'Rooms row 2 side-by-side (2x2)')
    assert.equal(geom.premiumLinkCount, 2, 'VIP rooms keep gold .premium-listing border')
    assert.equal(geom.premiumBadgeCount, 2, 'VIP rooms show PremiumBadge')
    assert.ok(geom.promo && geom.railMarket && geom.promo.bottom <= geom.railMarket.y + 4, 'PromoBanner sits above Chợ Homeji inside rail')
    assert.equal(geom.communityMarketCount, 0, 'No duplicate .hub-market in lower community grid')
    assert.equal(geom.marketCount, 4, 'Expected 4 market items in rail')
    assert.equal(geom.foodBadges, 2)
    assert.equal(geom.goodsBadges, 2)
    assert.equal(geom.marketImgs, 2)
    assert.equal(geom.fallbackIcons, 4)
    assert.equal(geom.promoDotsCount, 7, 'Renter sees 7 promo slides')
    assert.deepEqual(geom.promoOverlaps, [], 'No text/button overlap in rail PromoBanner')
    assert.deepEqual(geom.promoOutOfBounds, [], 'No clipped controls in rail PromoBanner')

    // Click each dot on Renter role to confirm no Landlord/Admin slides appear
    const renterTitles = []
    for (let i = 0; i < geom.promoDotsCount; i++) {
      await page.locator('.hub-promo--rail .hub-promo__dots button').nth(i).click()
      renterTitles.push(
        await page
          .locator(`.hub-promo--rail .hub-promo__slide[aria-label="${i + 1} / ${geom.promoDotsCount}"] .hub-promo__eyebrow`)
          .innerText(),
      )
    }
    assert.ok(!renterTitles.some(t => /QUẢN LÝ TIN|BẢNG ĐIỀU HÀNH|QUẢN TRỊ/i.test(t)), `Renter should not see landlord/admin slides: ${JSON.stringify(renterTitles)}`)

    await page.locator('.hub-promo--rail .hub-promo__dots button').nth(0).click()
    await page.waitForTimeout(550)
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: `${outDir}/desktop-1440-light.png`, fullPage: true })
    summary.push({ check: 'desktop-1440-light-renter', status: 'PASS', railWidth: Math.round(geom.rail.width), roomsWidth: Math.round(geom.roomsSection.width), renterTitles })
    await context.close()
  }

  // 2. Desktop 1440x950 Dark (Role 1) + darkTextIssues check
  {
    const { context, page, errors } = await setupContext({ width: 1440, height: 950, theme: 'dark', role: 1 })
    assert.deepEqual(errors, [])
    const issues = (await darkTextIssues(page)).filter(item => !item.uncertain)
    const uncertain = await darkTextIssues(page)
    await page.screenshot({ path: `${outDir}/desktop-1440-dark.png`, fullPage: true })
    assert.deepEqual(issues, [], `Dark readability issues: ${JSON.stringify(issues)}`)
    summary.push({ check: 'desktop-1440-dark', status: 'PASS', solidContrastIssues: issues.length, gradientUncertainCount: uncertain.length })
    await context.close()
  }

  // 3. Role filtering checks (Landlord role=2 & Admin role=3)
  for (const [role, expectedText] of [[2, /QUẢN LÝ TIN/i], [3, /BẢNG ĐIỀU HÀNH/i]]) {
    const { context, page, errors } = await setupContext({ width: 1440, height: 950, theme: 'light', role })
    assert.deepEqual(errors, [])
    const dots = await page.locator('.hub-promo--rail .hub-promo__dots button').count()
    const eyebrows = []
    for (let i = 0; i < dots; i++) {
      await page.locator('.hub-promo--rail .hub-promo__dots button').nth(i).click()
      eyebrows.push(
        await page
          .locator(`.hub-promo--rail .hub-promo__slide[aria-label="${i + 1} / ${dots}"] .hub-promo__eyebrow`)
          .innerText(),
      )
    }
    assert.ok(eyebrows.some(t => expectedText.test(t)), `Role ${role} must include ${expectedText}; got ${JSON.stringify(eyebrows)}`)
    summary.push({ check: `role-${role}-slides`, status: 'PASS', eyebrows })
    await context.close()
  }

  // 4. Tablet boundary 1100x900 & Tablet stacked 900x950
  for (const [label, width, height] of [['desktop-1100-light', 1100, 900], ['tablet-900-light', 900, 950]]) {
    const { context, page, errors } = await setupContext({ width, height, theme: 'light', role: 1 })
    assert.deepEqual(errors, [])
    const layout = await page.evaluate(() => {
      const r = document.querySelector('.hub-rooms').getBoundingClientRect()
      const rail = document.querySelector('.hub-rail').getBoundingClientRect()
      const promo = document.querySelector('.hub-promo--rail').getBoundingClientRect()
      const market = document.querySelector('.hub-rail .hub-market').getBoundingClientRect()
      return {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        roomsRight: r.right,
        railLeft: rail.left,
        roomsBottom: r.bottom,
        railTop: rail.top,
        promoRight: promo.right,
        marketLeft: market.left,
      }
    })
    assert.ok(layout.scrollWidth <= layout.clientWidth, `Horizontal overflow on ${label}`)
    if (width >= 1025) {
      assert.ok(layout.roomsRight < layout.railLeft, `Expected side-by-side at ${width}px`)
    } else {
      assert.ok(layout.roomsBottom <= layout.railTop + 4, `Expected rooms above stacked rail at ${width}px`)
      assert.ok(layout.promoRight < layout.marketLeft, `Expected promo & market 2-column inside rail at ${width}px`)
    }
    await page.screenshot({ path: `${outDir}/${label}.png`, fullPage: true })
    summary.push({ check: label, status: 'PASS', layout })
    await context.close()
  }

  // 5. Mobile 390x844 Light & Dark
  for (const theme of ['light', 'dark']) {
    const { context, page, errors } = await setupContext({ width: 390, height: 844, theme, role: 1 })
    assert.deepEqual(errors, [])
    const mobile = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('.hub-rooms li a')]
      const photoOverlaps = cards
        .map(card => {
          const photo = card.querySelector('.hub-room__photo')?.getBoundingClientRect()
          const copy = card.querySelector('.hub-room__copy')?.getBoundingClientRect()
          if (!photo || !copy) return null
          const overlaps = photo.left < copy.right - 2 && photo.right > copy.left + 2 && photo.top < copy.bottom - 2 && photo.bottom > copy.top + 2
          return overlaps ? { photo, copy } : null
        })
        .filter(Boolean)
      const promoRect = document.querySelector('.hub-promo--rail')?.getBoundingClientRect()
      return {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        photoOverlaps,
        roomsCount: cards.length,
        marketCount: document.querySelectorAll('.hub-rail .hub-market li a').length,
        promoWidth: promoRect?.width ?? 0,
        promoHeight: promoRect?.height ?? 0,
      }
    })
    assert.ok(mobile.scrollWidth <= mobile.clientWidth, `Mobile horizontal overflow (${theme})`)
    assert.deepEqual(mobile.photoOverlaps, [], `Mobile photo must not overlap room copy (${theme})`)
    assert.equal(mobile.roomsCount, 4)
    assert.equal(mobile.marketCount, 4)
    assert.ok(mobile.promoWidth >= 300 && mobile.promoHeight >= 240, `Mobile PromoBanner must span full width, got ${mobile.promoWidth}x${mobile.promoHeight}`)
    if (theme === 'dark') {
      const issues = (await darkTextIssues(page)).filter(item => !item.uncertain)
      assert.deepEqual(issues, [], `Mobile dark contrast issues: ${JSON.stringify(issues)}`)
    }
    await page.screenshot({ path: `${outDir}/mobile-390-${theme}.png`, fullPage: true })
    summary.push({ check: `mobile-390-${theme}`, status: 'PASS', mobile })
    await context.close()
  }

  await writeFile(`${outDir}/summary.json`, JSON.stringify(summary, null, 2))
  console.log(`PASS: ${summary.length} hub-rail layout & responsive/dark E2E checks passed; screenshots saved to ${outDir}.`)
} finally {
  await browser.close()
}
