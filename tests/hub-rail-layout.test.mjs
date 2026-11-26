import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'
import React, { act } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { reactDomModule } from './helpers/react-dom-module.mjs'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = (rel) => path.join(rootDir, 'src', rel)

const { PromoBanner } = await import(
  reactDomModule(src('components/hub/PromoBanner.tsx'))
)
const { getPromoSlidesForRole } = await import(
  reactDomModule(src('components/hub/promoBannerSlides.ts'))
)
const { HubBodySkeleton, HubSkeleton } = await import(
  reactDomModule(src('components/skeletons/PageSkeletons.tsx'))
)

test('PromoBanner filters slides by UserRole, ties artIndex to slide, and keeps all 8 slides when role is omitted', () => {
  const guestDefault = getPromoSlidesForRole(undefined)
  assert.equal(guestDefault.length, 8)
  assert.equal(guestDefault[0].cta, 'Mời bạn & nhận quà')
  assert.equal(guestDefault[4].cta, 'Hỏi AI ngay')

  const renterSlides = getPromoSlidesForRole(1)
  assert.ok(renterSlides.some((s) => s.cta === 'Thử ngay'))
  assert.ok(renterSlides.some((s) => s.cta === 'Đặt lịch ngay'))
  assert.ok(!renterSlides.some((s) => s.cta === 'Quản lý tin'), 'Renters should not see Landlord management slide')

  const landlordSlides = getPromoSlidesForRole(2)
  assert.equal(landlordSlides[0].cta, 'Quản lý tin')
  assert.equal(landlordSlides[0].artIndex, 6)
  assert.ok(landlordSlides.some((s) => s.cta === 'Xem các gói'))
  assert.ok(!landlordSlides.some((s) => s.cta === 'Thử ngay'), 'Landlords should not see Roommate finder slide')
  assert.ok(!landlordSlides.some((s) => s.cta === 'Đặt lịch ngay'), 'Landlords should not see Renter viewing booking slide')

  const adminSlides = getPromoSlidesForRole(3)
  assert.equal(adminSlides[0].cta, 'Mở quản trị')
  assert.equal(adminSlides[0].to, '/admin')
  assert.ok(!adminSlides.some((s) => s.cta === 'Xem voucher'), 'Admin should not see consumer voucher slide')

  const landlordHtml = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(PromoBanner, { variant: 'rail', role: 2 }),
    ),
  )
  assert.ok(landlordHtml.includes('hub-promo--rail'))
  assert.ok(landlordHtml.includes('Quản lý tin'))
  assert.ok(landlordHtml.includes('hb-s6'), 'Filtered slide 6 must still render artIndex 6 (hb-s6)')

  const adminHtml = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(PromoBanner, { variant: 'rail', role: 3 }),
    ),
  )
  assert.ok(adminHtml.includes('Quản trị &amp; duyệt tin'))
  assert.ok(adminHtml.includes('/admin'))
})

test('HubSkeleton and HubBodySkeleton match the 2-column (4 rooms left | promo + market rail right) layout', () => {
  const bodyHtml = renderToStaticMarkup(React.createElement(HubBodySkeleton))
  assert.ok(bodyHtml.includes('sk-hub__main'))
  assert.ok(bodyHtml.includes('sk-hub__rooms-grid'))
  assert.ok(bodyHtml.includes('sk-hub__rail'))
  assert.ok(bodyHtml.includes('sk-hub__promo-rail'))
  assert.equal((bodyHtml.match(/padding:14px/g) || []).length, 4, 'Must render 4 room card skeletons in 2x2 grid')

  const routeHtml = renderToStaticMarkup(React.createElement(HubSkeleton))
  assert.ok(routeHtml.includes('sk-hub__main'))
  assert.ok(!routeHtml.includes('sk-hub__hero'), 'HubSkeleton should no longer render full-width hero skeleton')
})

test('AuthenticatedHub fetches 6 rooms + 4 market items, renders 2-column main block above viewings/alerts, and highlights VIP rooms', async () => {
  const calls = []
  const sampleRooms = [1, 2, 3, 4].map((i) => ({
    id: `room-${i}`,
    type: 1,
    title: `Phòng trọ mẫu ${i}`,
    price: 2500000 + i * 300000,
    area: 22 + i,
    address: `Linh Trung, Thủ Đức #${i}`,
    latitude: 10.85,
    longitude: 106.8,
    thumbnailPath: null,
    viewCount: 10 * i,
    saveCount: i,
    isOwnerPremium: i === 1,
  }))
  const sampleMarket = [
    {
      id: 'm1',
      sellerId: 's1',
      sellerDisplayName: 'Bếp Sinh Viên',
      title: 'Cơm gà xối mỡ',
      price: 35000,
      listingType: 2,
      mediaUrls: [],
    },
    {
      id: 'm2',
      sellerId: 's2',
      sellerDisplayName: 'Minh Khôi',
      title: 'Bàn học gỗ gọn',
      price: 180000,
      listingType: 1,
      mediaUrls: [],
    },
  ]
  const apiOverride =
    'data:text/javascript;base64,' +
    Buffer.from(`
      export const UserRole = { Renter: 1, Landlord: 2, Admin: 3 };
      export const RoommateInvitationStatus = { Pending: 1, Accepted: 2, Rejected: 3, Cancelled: 4 };
      export const RentalPostType = { VacantRoom: 1, RoommateShare: 2, RoomTransfer: 3 };
      export const ViewingAppointmentStatus = { Pending: 0, Confirmed: 1, Rejected: 2, Cancelled: 3, Completed: 4 };
      export const NotificationType = { SavedPostChanged: 11, NewMatchingRentalPost: 12 };
      export const MarketplaceListingType = { SecondHand: 1, Food: 2 };
      globalThis.__hubTestCalls = [];
      export const getNotifications = async () => [{ id: 'n1', type: 11, title: 'Tin đã lưu vừa giảm giá', message: 'Giảm 200k', isRead: false, createdAt: '2026-11-20T08:00:00Z', relatedEntityId: null, readAt: null }];
      export const getViewingAppointments = async () => [{ id: 'a1', rentalPostId: 'room-1', rentalPostTitle: 'Phòng trọ mẫu 1', requesterId: 'u1', ownerId: 'o1', scheduledAt: new Date(Date.now() + 3600_000).toISOString(), note: 'Gặp cổng trước', status: 1, createdAt: '2026-11-20T08:00:00Z', updatedAt: '2026-11-20T08:00:00Z' }];
      export const getConversations = async () => [];
      export const getSavedPosts = async () => [];
      export const getMyInvitations = async () => [];
      export const getRoommateCandidates = async () => [];
      export const searchRentalPosts = async (params) => { globalThis.__hubTestCalls.push(['rentals', params]); return ${JSON.stringify(sampleRooms)}; };
      export const searchMarketplacePosts = async (params) => { globalThis.__hubTestCalls.push(['market', params]); return ${JSON.stringify(sampleMarket)}; };
    `).toString('base64')
  const authOverride =
    'data:text/javascript;base64,' +
    Buffer.from(`
      export const useAuth = () => ({ isAuthenticated: true, isLoading: false, needsProfileSetup: false, profile: { id: 'u1', displayName: 'Minh Anh', role: 1 } });
    `).toString('base64')

  const { AuthenticatedHub } = await import(
    reactDomModule(src('components/hub/AuthenticatedHub.tsx'), {
      '../../api': apiOverride,
      '../../contexts/AuthContext': authOverride,
      // The shortlist toggle reads Vite env flags; its own behaviour is tested elsewhere.
      '../ai/RentalConsiderationToggle': 'data:text/javascript;base64,' + Buffer.from('export const RentalConsiderationToggle = () => null').toString('base64'),
    })
  )

  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    pretendToBeVisual: true,
    url: 'https://fixture.local/',
  })
  dom.window.localStorage.setItem(
    'homeji:map-search-recent',
    JSON.stringify([{ keyword: 'Linh Trung' }, { keyword: 'Làng Đại Học' }]),
  )
  const keys = ['window', 'document', 'HTMLElement', 'Element', 'Node', 'Event', 'MouseEvent', 'localStorage']
  const prev = new Map(keys.map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)]))
  for (const k of keys) {
    Object.defineProperty(globalThis, k, {
      configurable: true,
      writable: true,
      value: k === 'window' ? dom.window : dom.window[k],
    })
  }
  const { createRoot } = await import('react-dom/client')
  const root = createRoot(document.getElementById('root'))

  try {
    await act(async () => {
      root.render(React.createElement(MemoryRouter, null, React.createElement(AuthenticatedHub)))
    })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30))
    })

    calls.push(...(globalThis.__hubTestCalls || []))
    assert.deepEqual(
      calls.find(([kind]) => kind === 'rentals')?.[1],
      { pageSize: 6 },
      'AuthenticatedHub must request pageSize: 6 rooms (3-column grid)',
    )
    assert.deepEqual(
      calls.find(([kind]) => kind === 'market')?.[1],
      { pageSize: 4 },
      'AuthenticatedHub must request pageSize: 4 marketplace items',
    )

    const hub = document.querySelector('.hub-home')
    assert.ok(hub)
    const children = [...hub.children].map((el) => el.className.split(' ')[0])
    assert.deepEqual(children, ['hub-welcome', 'hub-find', 'hub-entries', 'hub-search', 'hub-next', 'hub-main', 'hub-update', 'hub-section'])

    const main = hub.querySelector('.hub-main')
    assert.ok(main.querySelector('.hub-rooms'), 'Left column holds rooms')
    assert.ok(main.querySelector('.hub-rail .hub-promo--rail'), 'Right rail holds compact PromoBanner')
    assert.ok(main.querySelector('.hub-rail .hub-market'), 'Right rail holds Chợ Homeji')
    assert.equal(document.querySelectorAll('.hub-community .hub-market').length, 0, 'Chợ Homeji must not duplicate below')

    const roomLinks = [...main.querySelectorAll('.hub-rooms ul li a')]
    assert.equal(roomLinks.length, 4)
    assert.ok(roomLinks[0].classList.contains('premium-listing'))
    assert.ok(roomLinks[0].querySelector('.premium-badge'))
    assert.ok(!roomLinks[1].classList.contains('premium-listing'))

    const marketItems = [...main.querySelectorAll('.hub-market ul li a')]
    assert.equal(marketItems.length, 2)
    assert.ok(marketItems[0].getAttribute('href').includes('market=food&seller=s1&item=m1'))
    assert.ok(marketItems[0].textContent.includes('Đồ ăn'))
    assert.ok(marketItems[1].getAttribute('href').includes('market=browse&seller=s2&item=m2'))
    assert.ok(marketItems[1].textContent.includes('Đồ cũ'))
  } finally {
    await act(async () => root.unmount())
    dom.window.close()
    for (const [k, d] of prev) {
      if (d) Object.defineProperty(globalThis, k, d)
      else delete globalThis[k]
    }
    delete globalThis.__hubTestCalls
  }
})

test('HomePage skips redundant loadPosts() search when viewing AuthenticatedHub', () => {
  const homeSource = readFileSync(src('pages/HomePage.tsx'), 'utf8')
  assert.ok(
    homeSource.includes('useState(() => isExploreView)'),
    'HomePage loading state should default to isExploreView so Hub is not stuck loading',
  )
  assert.ok(
    !homeSource.includes('if (isLoading || isExploreView || !isAuthenticated) return'),
    'HomePage must not fire loadPosts() when !isExploreView (on Hub or FeatureWorkspace)',
  )
})

test('Hub CSS implements 2-column desktop rail layout, 2x2 rooms grid, and responsive fallbacks', () => {
  const refinementCss = readFileSync(src('home-refinement.css'), 'utf8')
  const hubCss = readFileSync(src('components/hub/AuthenticatedHub.css'), 'utf8')
  assert.match(hubCss, /\.hub-main\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*clamp\(320px,\s*28%,\s*360px\)/)
  assert.match(refinementCss, /html:root #root \.hub-main\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*clamp\(320px,\s*28%,\s*360px\)/)
  assert.match(refinementCss, /html:root #root \.hub-rooms > ul\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/)
})
