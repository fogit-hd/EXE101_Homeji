import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { reactDomModule } from './helpers/react-dom-module.mjs'

// --- 1. PWA Offline Status Banner / Indicator ---
const networkContextUrl = reactDomModule(fileURLToPath(new URL('../src/contexts/NetworkStatusContext.tsx', import.meta.url)), {
  '../hooks/useBrandIntroComplete': 'data:text/javascript;base64,' + Buffer.from('export const useBrandIntroComplete=()=>true').toString('base64'),
  './NetworkStatusContext.logic': 'data:text/javascript;base64,' + Buffer.from('export const reconnectListeners=new Set(); export const NetworkStatusContext=null').toString('base64'),
  '../components/NetworkStatusBanner.css': 'data:text/javascript;base64,' + Buffer.from('export default {}').toString('base64'),
})
const { NetworkStatusBanner } = await import(networkContextUrl)

test('PWA offline status indicator displays expected Vietnamese guidance when offline', () => {
  // Offline banner
  const offlineEl = NetworkStatusBanner({
    status: 'offline',
    showRestored: false,
    brandIntroComplete: true,
  })
  assert.ok(offlineEl, 'offline banner element should be rendered')
  assert.equal(offlineEl.props.className, 'network-banner network-banner--offline')
  assert.equal(offlineEl.props.role, 'status')
  assert.equal(offlineEl.props['aria-live'], 'polite')
  assert.equal(offlineEl.props.children[1].props.children, 'Bạn đang ngoại tuyến. Dữ liệu phòng đã được lưu để duyệt tiếp.')

  // Reconnecting banner
  const reconnectingEl = NetworkStatusBanner({
    status: 'reconnecting',
    showRestored: false,
    brandIntroComplete: true,
  })
  assert.ok(reconnectingEl)
  assert.equal(reconnectingEl.props.className, 'network-banner network-banner--reconnecting')
  assert.equal(reconnectingEl.props.children[1].props.children, 'Đang kết nối lại mạng…')

  // Restored banner
  const restoredEl = NetworkStatusBanner({
    status: 'online',
    showRestored: true,
    brandIntroComplete: true,
  })
  assert.ok(restoredEl, 'restored banner element should be rendered')
  assert.equal(restoredEl.props.className, 'network-banner network-banner--restored')
  assert.equal(restoredEl.props.children[1].props.children, 'Đã có mạng trở lại. Tiếp tục sử dụng bình thường.')

  // Normal online state should render nothing
  const onlineEl = NetworkStatusBanner({
    status: 'online',
    showRestored: false,
    brandIntroComplete: true,
  })
  assert.equal(onlineEl, null)

  // Brand intro incomplete should suppress banner
  const introPendingEl = NetworkStatusBanner({
    status: 'offline',
    showRestored: false,
    brandIntroComplete: false,
  })
  assert.equal(introPendingEl, null)
})

// --- 2. Vietnamese Font Optimization in index.html ---
test('Be Vietnam Pro font loading is optimized with preload and non-blocking media="print"', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  assert.match(
    html,
    /<link[^>]+rel="preload"[^>]+as="style"[^>]+href="https:\/\/fonts\.googleapis\.com\/css2\?family=Be\+Vietnam\+Pro/,
    'preloads Be Vietnam Pro CSS for early fetching',
  )
  assert.match(
    html,
    /<link[^>]+rel="stylesheet"[^>]+href="https:\/\/fonts\.googleapis\.com\/css2\?family=Be\+Vietnam\+Pro[^>]+media="print"[^>]+onload="this\.media='all'"/,
    'uses non-render-blocking media="print" pattern with onload swap',
  )
  assert.match(
    html,
    /<noscript>[\s\S]*?<link[^>]+rel="stylesheet"[^>]+href="https:\/\/fonts\.googleapis\.com\/css2\?family=Be\+Vietnam\+Pro/,
    'retains noscript fallback',
  )
})

// --- 3. Mobile Form Keyboards in EditRentalPostPage.tsx ---
test('EditRentalPostPage specifies mobile inputMode="decimal" on area and "tel" on phone/contact inputs', () => {
  const code = readFileSync(new URL('../src/pages/EditRentalPostPage.tsx', import.meta.url), 'utf8')
  assert.match(
    code,
    /<input[^>]+id="rental-area"[^>]+inputMode="decimal"/,
    'area input has inputMode="decimal"',
  )
  assert.match(
    code,
    /<input[^>]+id="owner-contact"[^>]+inputMode="tel"/,
    'owner contact input has inputMode="tel"',
  )
})

// --- 4. Cloudinary Image srcSet and Lazy Loading in MapListingsWorkspace ---
test('MapListingsWorkspace optimizes thumbnails with lazy loading, async decoding, responsive srcSet and sizes', async () => {
  const code = readFileSync(new URL('../src/components/map/listings/MapListingsWorkspace.tsx', import.meta.url), 'utf8')
  assert.match(code, /srcSet=\{listingThumbSrcSet\(view\.thumbnailUrl\)\}/)
  assert.match(code, /sizes="\(max-width: 640px\) 100vw, 320px"/)
  assert.match(code, /loading="lazy"/)
  assert.match(code, /decoding="async"/)

  const { listingThumbSrcSet } = await import('../src/lib/cloudinaryImage.ts')
  const cldUrl = 'https://res.cloudinary.com/dv4y7cdpi/image/upload/v1/posts/photo.jpg'
  const srcSet = listingThumbSrcSet(cldUrl)
  assert.ok(srcSet)
  assert.match(srcSet, /c_limit,w_240\/.*posts\/photo\.jpg 240w/)
  assert.match(srcSet, /c_limit,w_480\/.*posts\/photo\.jpg 480w/)
  assert.match(srcSet, /c_limit,w_800\/.*posts\/photo\.jpg 800w/)
})

// --- 5. Location Shortcuts for Major Universities & Hubs in Thu Duc / Q.9 ---
test('MapListingsWorkspace includes fast location filter chips for Thu Duc / Q9 universities and hubs', () => {
  const code = readFileSync(new URL('../src/components/map/listings/MapListingsWorkspace.tsx', import.meta.url), 'utf8')
  assert.match(code, /'hub-ktx-dhqg'/)
  assert.match(code, /KTX ĐHQG/)
  assert.match(code, /'hub-spkt'/)
  assert.match(code, /Sư phạm Kỹ thuật/)
  assert.match(code, /'hub-fpt'/)
  assert.match(code, /ĐH FPT/)
  assert.match(code, /'hub-bx-mientay-dong'/)
  assert.match(code, /Bến xe Miền Đông mới/)
  assert.match(code, /matchesKeyword/, 'uses case-insensitive keyword matcher')
  assert.match(code, /minPrice: readDraft\(priceDraft\.min\)/, 'preserves price drafts when selecting hub in popover')
})

// --- 6. Pull to Refresh on Mobile Listings Panel ---
test('MapListingsWorkspace implements touch-based pull-to-refresh on mobile feed', () => {
  const code = readFileSync(new URL('../src/components/map/listings/MapListingsWorkspace.tsx', import.meta.url), 'utf8')
  assert.match(code, /onTouchStart=\{handleTouchStart\}/)
  assert.match(code, /onTouchMove=\{handleTouchMove\}/)
  assert.match(code, /onTouchEnd=\{handleTouchEnd\}/)
  assert.match(code, /map-listings__pull-indicator/)
  assert.match(code, /isAtScrollTop/, 'verifies container and window scroll positions')
  assert.match(code, /window\.scrollY/, 'verifies document-level scroll before pulling')
  assert.match(code, /Kéo để làm mới/)
  assert.match(code, /Thả để làm mới/)
  assert.match(code, /Đang làm mới/)

  const css = readFileSync(new URL('../src/components/map/listings/MapListingsWorkspace.css', import.meta.url), 'utf8')
  assert.match(css, /overscroll-behavior-y:\s*contain/, 'prevents rubber-band scroll interference')
})

// --- 7. Prefilled Contact Message when reaching out to landlords ---
test('RoomDetailModal and MapPlaceDetailPanel provide prefilled greeting templates for landlord inquiries', () => {
  const modalCode = readFileSync(new URL('../src/components/map/listings/RoomDetailModal.tsx', import.meta.url), 'utf8')
  assert.match(modalCode, /Chào bạn,.*hiện còn trống không ạ\?/)
  assert.match(modalCode, /room-detail__greeting-chip/)
  assert.match(modalCode, /Phòng này hiện còn trống không ạ\?/)
  assert.match(modalCode, /Chào bạn, mình quan tâm đến phòng này trên Homeji/, 'provides clean fallback when title is missing')

  const panelCode = readFileSync(new URL('../src/components/map/MapPlaceDetailPanel.tsx', import.meta.url), 'utf8')
  assert.match(panelCode, /Chào bạn,.*hiện còn trống không ạ\?/)
  assert.match(panelCode, /map-detail-panel__greeting-chip/, 'provides greeting chips on map place panel')
  assert.match(panelCode, /Chào bạn, mình quan tâm đến phòng này trên Homeji/, 'provides clean fallback when title is missing')
})
