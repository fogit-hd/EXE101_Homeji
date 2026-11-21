import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const base = new URL(process.env.HOMEJI_TEST_BASE_URL || 'http://127.0.0.1:5542')
assert.ok(['localhost', '127.0.0.1'].includes(base.hostname))
const admin = '11111111-1111-4111-8111-111111111111'
const browser = await chromium.launch({ headless: true, channel: 'msedge' })

const snapshotPayload = {
  checkedAt: '2026-11-21T02:00:00Z',
  publisherConfigured: true,
  analyticsConfigured: false,
  telemetryConfigured: true,
  pendingSample: 1000,
  retryingInSample: 7,
  sampleLimited: true,
  publicationDays: [{ date: '2026-11-21', count: 3 }],
  overview: {
    status: 'attention',
    headline: '2 đầu việc cần quản trị viên chú ý',
    summary: 'Hệ thống vẫn đang chạy ổn định; hiện có 5 mục chờ người duyệt/đối soát và 14 người đang kết nối trực tiếp.',
    actionRequiredCount: 2,
    pendingQueueTotal: 5,
    onlineUsersCount: 14,
    operatingMode: 'postgresql_native',
    operatingModeLabel: 'Đồng bộ nội bộ qua cơ sở dữ liệu (PostgreSQL)',
  },
  actions: [
    {
      id: 'pending-withdrawals',
      severity: 'high',
      title: '2 yêu cầu rút tiền đang chờ xử lý (lâu nhất 2 ngày)',
      userImpact: 'Người dùng đang đợi nhận tiền từ ví Homeji chuyển về tài khoản ngân hàng của họ.',
      whatToDo: 'Mở mục Rút tiền để đối chiếu thông tin ngân hàng, chuyển khoản và nhập mã giao dịch xác nhận.',
      targetSection: 'withdrawals',
      actionLabel: 'Xử lý Rút tiền',
      count: 2,
      oldestAt: '2026-11-19T02:00:00Z',
    },
    {
      id: 'ai-flagged-listings',
      severity: 'medium',
      title: '3 tin đăng cần quản trị viên xem lại kết quả AI',
      userImpact: 'Các tin này được AI đánh dấu cần người kiểm tra lại trước khi kết luận.',
      whatToDo: 'Mở mục AI kiểm tra tin để xem đoạn trích bằng chứng và chọn Giữ tin / Khôi phục hoặc Ẩn tin.',
      targetSection: 'aiReviews',
      actionLabel: 'Mở AI kiểm tra tin',
      count: 3,
      oldestAt: null,
    },
  ],
  services: [
    {
      key: 'core_api',
      title: 'Máy chủ & Cơ sở dữ liệu',
      status: 'ok',
      statusLabel: 'Hoạt động tốt',
      userImpact: 'Người dùng truy cập Homeji, tìm phòng và lưu dữ liệu bình thường.',
      adminGuidance: 'Không cần thao tác.',
      targetSection: null,
      actionLabel: null,
      metrics: [
        { label: 'Kết nối dữ liệu', value: 'Ổn định', hint: null },
        { label: 'Tác vụ nền tự động', value: 'Đang chạy', hint: null },
      ],
    },
    {
      key: 'listing_publishing',
      title: 'Tin phòng & Hàng chờ duyệt',
      status: 'ok',
      statusLabel: 'Hoạt động tốt',
      userImpact: 'Đang có 28 tin phòng thật hiển thị trên bản đồ cho người thuê; 0 tin mới đang chờ duyệt.',
      adminGuidance: 'Hàng chờ đang sạch; tin mới duyệt sẽ lên bản đồ bình thường.',
      targetSection: 'posts',
      actionLabel: 'Xem Tin chờ duyệt',
      metrics: [
        { label: 'Tin đang hiển thị', value: '28', hint: null },
        { label: 'Tin chờ duyệt', value: '0', hint: null },
      ],
    },
    {
      key: 'ai_moderation',
      title: 'AI tìm phòng & Kiểm duyệt tự động',
      status: 'attention',
      statusLabel: 'Cần chú ý',
      userImpact: 'AI đã rà soát tin mới và gắn cờ 3 tin cần quản trị viên quyết định.',
      adminGuidance: 'Mở mục AI kiểm tra tin để xử lý 3 tin đang chờ người duyệt.',
      targetSection: 'aiReviews',
      actionLabel: 'Mở AI kiểm tra tin',
      metrics: [
        { label: 'Kết nối Gemini', value: 'Sẵn sàng', hint: null },
        { label: 'Tin cần người xem lại', value: '3', hint: null },
      ],
    },
    {
      key: 'payments_wallet',
      title: 'Thanh toán, Ví & Chợ sinh viên',
      status: 'attention',
      statusLabel: 'Cần chú ý',
      userImpact: 'Người dùng đang thanh toán qua MoMo, PayPal (Live); trong 24 giờ qua có 4 giao dịch thành công.',
      adminGuidance: 'Cần vào mục Rút tiền để chuyển khoản và xác nhận 2 yêu cầu đang chờ.',
      targetSection: 'withdrawals',
      actionLabel: 'Xử lý Rút tiền',
      metrics: [
        { label: 'Cổng thanh toán', value: 'MoMo, PayPal (Live)', hint: null },
        { label: 'Yêu cầu rút tiền chờ', value: '2', hint: null },
      ],
    },
    {
      key: 'emails_reminders',
      title: 'Email biên nhận & Nhắc lịch hẹn',
      status: 'ok',
      statusLabel: 'Hoạt động tốt',
      userImpact: 'Email biên nhận giao dịch, nhắc lịch xem phòng và báo cáo Excel hoạt động bình thường.',
      adminGuidance: 'Không cần thao tác.',
      targetSection: 'exports',
      actionLabel: 'Mở Báo cáo Excel',
      metrics: [
        { label: 'Kênh gửi email', value: 'Brevo (Sẵn sàng)', hint: 'Email biên nhận tự động: Bật' },
        { label: 'Nhắc lịch hẹn quá hạn', value: '0', hint: null },
      ],
    },
    {
      key: 'realtime_maintenance',
      title: 'Kết nối trực tiếp & Bảo trì',
      status: 'attention',
      statusLabel: 'Đang bật banner bảo trì',
      userImpact: 'Có 14 người đang kết nối trực tiếp và toàn bộ người dùng đang thấy banner bảo trì.',
      adminGuidance: 'Vào mục Bảo trì nếu cần cập nhật nội dung hoặc giờ kết thúc bảo trì.',
      targetSection: 'maintenance',
      actionLabel: 'Quản lý Bảo trì',
      metrics: [
        { label: 'Đang kết nối trực tiếp', value: '14', hint: null },
        { label: 'Banner bảo trì', value: 'Đang hiển thị', hint: null },
      ],
    },
  ],
  operationalPulse: [
    {
      date: '2026-11-21',
      newUsers: 6,
      newListings: 4,
      publishedRentals: 3,
      paidTransactions: 4,
      marketplaceOrders: 5,
      newReports: 1,
    },
  ],
  maintenance: {
    isActive: true,
    title: 'Nâng cấp định kỳ ban đêm',
    message: 'Hệ thống vẫn phục vụ bình thường trong khi đồng bộ chỉ mục tìm kiếm.',
    scheduledStartAt: '2026-11-21T16:00:00Z',
    scheduledEndAt: '2026-11-21T18:00:00Z',
    expiresAt: '2026-11-22T18:00:00Z',
  },
  diagnostics: {
    backgroundJobsEnabled: true,
    kafkaBrokerConfigured: false,
    outboxWorkerEnabled: true,
    kafkaAnalyticsWorkerEnabled: false,
    telemetryEnabled: true,
    otlpExporterConfigured: false,
    emailProvider: 'Brevo',
    emailDeliveryReady: true,
    receiptEmailEnabled: true,
    geminiConfigured: true,
    momoConfigured: true,
    payOsConfigured: false,
    payPalConfigured: true,
    payPalMode: 'Live',
    outboxPendingCount: 1000,
    outboxRetryingCount: 7,
    outboxSampleLimited: true,
    oldestPendingOutboxAt: '2026-11-21T01:45:00Z',
  },
}

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' })
  page.setDefaultTimeout(12_000)
  page.on('pageerror', error => console.error('Browser error', error.message))
  await page.addInitScript(id => {
    localStorage.setItem('homeji_access_token', 'fixture')
    localStorage.setItem('homeji_user_id', id)
    localStorage.setItem('homeji_analytics_consent_v1', 'rejected')
    sessionStorage.setItem('hj-intro-seen', '1')
  }, admin)

  let requests = 0
  await page.route('**/*', route => {
    const url = new URL(route.request().url())
    if (url.pathname === '/api/profile/me') {
      return route.fulfill({ json: { id: admin, displayName: 'Admin fixture', role: 3, onboardingCompleted: true } })
    }
    if (url.pathname === '/api/admin/platform') {
      requests++
      return requests === 2
        ? route.fulfill({ status: 503, json: { detail: 'Fixture outage' } })
        : route.fulfill({ json: snapshotPayload })
    }
    if (url.pathname === '/api/subscriptions/me') return route.fulfill({ json: { tier: 1, isPremium: false } })
    if (url.pathname === '/api/search-interests') {
      return route.fulfill({ json: { settings: { enabled: false }, suggestions: [], following: [], rooms: [] } })
    }
    if (url.pathname.startsWith('/hubs/')) return route.fulfill({ status: 503, body: '' })
    if (url.pathname.startsWith('/api/')) return route.fulfill({ json: [] })
    return url.origin === base.origin ? route.continue() : route.abort()
  })

  await page.goto(new URL('/admin/platform', base).href)
  const skip = page.getByRole('button', { name: 'Bỏ qua', exact: true })
  if (await skip.isVisible()) await skip.click()
  await page.locator('.admin-nav').waitFor().catch(async error => {
    console.error(page.url(), (await page.locator('body').innerText()).slice(0, 350))
    throw error
  })

  const link = page.getByRole('navigation', { name: 'Mục quản trị' })
    .getByRole('link', { name: 'Vận hành hệ thống', exact: true })
  assert.equal(await link.getAttribute('aria-current'), 'page')
  await page.getByRole('heading', { level: 1, name: 'Vận hành hệ thống' }).waitFor()

  // Tầng 1: Hero Verdict Banner + 4 KPIs + Active Maintenance Banner
  await page.getByRole('heading', { level: 2, name: '2 đầu việc cần quản trị viên chú ý' }).waitFor()
  await page.getByText(/hiện có 5 mục chờ người duyệt\/đối soát/).waitFor()
  await page.locator('.admin-platform-kpis').getByText('Đồng bộ nội bộ qua cơ sở dữ liệu (PostgreSQL)').waitFor()
  const maintenanceRegion = page.getByRole('region', { name: 'Banner bảo trì đang hiển thị' })
  await maintenanceRegion.getByText(/Nâng cấp định kỳ ban đêm/).waitFor()
  assert.equal(await maintenanceRegion.getByRole('link', { name: 'Quản lý Bảo trì' }).getAttribute('href'), '/admin/maintenance')

  // Tầng 2: Priority Action Center
  const actionsList = page.locator('.admin-platform-actions')
  await actionsList.getByText('Ảnh hưởng người dùng').first().waitFor()
  await actionsList.getByText('Việc bạn nên làm').first().waitFor()
  await actionsList.getByText(/^Chờ /).first().waitFor()
  assert.equal(await actionsList.getByRole('link', { name: /Xử lý Rút tiền/ }).getAttribute('href'), '/admin/withdrawals')
  assert.equal(await actionsList.getByRole('link', { name: /Mở AI kiểm tra tin/ }).getAttribute('href'), '/admin/ai-reviews')

  // Tầng 3: All 6 user-journey Service Pillars
  const servicesSection = page.locator('.admin-platform-services')
  for (const title of [
    'Máy chủ & Cơ sở dữ liệu',
    'Tin phòng & Hàng chờ duyệt',
    'AI tìm phòng & Kiểm duyệt tự động',
    'Thanh toán, Ví & Chợ sinh viên',
    'Email biên nhận & Nhắc lịch hẹn',
    'Kết nối trực tiếp & Bảo trì',
  ]) {
    await servicesSection.getByRole('heading', { level: 3, name: title, exact: true }).waitFor()
  }

  // Tầng 4: 7-Day Operational Pulse
  await page.locator('.admin-platform-pulse-totals').getByText('Đơn chợ sinh viên').waitFor()
  await page.getByRole('table').getByRole('cell', { name: '5', exact: true }).waitFor()

  // Tầng 5: Progressive Disclosure Diagnostics (<details>)
  const diagnosticsToggle = page.locator('.admin-platform-diagnostics > summary')
  assert.equal(await page.locator('.admin-platform-diagnostics').getAttribute('open'), null)
  await diagnosticsToggle.click()
  assert.equal(await page.locator('.admin-platform-queue strong').first().textContent(), '1.000+')
  await page.locator('.admin-platform-diag-grid').getByText('Đồng bộ PostgreSQL nội bộ').waitFor()
  const grafana = page.getByRole('link', { name: 'Mở Grafana (tab mới)' })
  if (await grafana.isVisible()) assert.equal(await grafana.getAttribute('rel'), 'noopener noreferrer')

  // Refresh outage & recovery while keeping rendered data
  await page.getByRole('button', { name: 'Làm mới' }).click()
  await page.getByText(/Không làm mới được/).waitFor()
  await page.getByRole('table').getByRole('cell', { name: '5', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Làm mới' }).click()
  await page.getByText(/Không làm mới được/).waitFor({ state: 'hidden' })

  // Narrow viewport 320px check with <details> open and closed
  await page.setViewportSize({ width: 320, height: 900 })
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
  await diagnosticsToggle.click()
  assert.equal(await page.locator('.admin-platform-diagnostics').getAttribute('open'), null)
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))

  console.log('PASS admin navigation, status, refresh recovery and narrow viewport')
} finally {
  await browser.close()
}
