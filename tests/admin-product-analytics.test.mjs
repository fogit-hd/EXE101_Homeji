import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const apiSource = await readFile(new URL('../src/api/index.ts', import.meta.url), 'utf8')
const pageSource = await readFile(
  new URL('../src/pages/AdminModerationPage.tsx', import.meta.url),
  'utf8',
)
const dashboardSource = await readFile(
  new URL('../src/components/admin/AdminAnalyticsDashboard.tsx', import.meta.url),
  'utf8',
)

test('admin analytics reads a dedicated protected product endpoint', () => {
  assert.match(apiSource, /getAdminProductAnalytics/)
  assert.match(apiSource, /\/api\/admin\/analytics\/product/)
  assert.match(apiSource, /params: \{ days \}/)
})

test('admin opens on the operations home, links product analytics and retains customer map access', async () => {
  const sections = await readFile(new URL('../src/components/admin/adminSections.ts', import.meta.url), 'utf8')
  const shell = await readFile(new URL('../src/components/admin/AdminShell.tsx', import.meta.url), 'utf8')
  const home = await readFile(new URL('../src/components/admin/AdminHome.tsx', import.meta.url), 'utf8')
  assert.match(sections, /id: 'home', slug: ''/)
  assert.match(sections, /id: 'analytics', slug: 'analytics'[^\n]+Tổng quan sản phẩm/)
  assert.match(home, /adminSectionPath\('analytics'\)/)
  assert.match(shell, /Xem trang tìm phòng/)
  assert.match(pageSource, /AdminAnalyticsDashboard/)
})

test('dashboard prioritizes map, daily line trend, price evidence and confidence', () => {
  assert.match(dashboardSource, /AdminDemandMap/)
  assert.match(dashboardSource, /AdminTrendChart/)
  assert.match(dashboardSource, /Ưu tiên bản đồ/)
  assert.match(dashboardSource, /Chỉ số cầu/)
  assert.match(dashboardSource, /confidenceLabels/)
  assert.match(dashboardSource, /không tự thay đổi giá/)
})

test('price recommendations remain advisory and never call a price mutation API', () => {
  assert.doesNotMatch(dashboardSource, /update.*price|patch.*price|set.*price/i)
  assert.match(dashboardSource, /Tín hiệu giá chỉ dùng để thử nghiệm có kiểm soát/)
})

test('map and daily trend remain before traffic details, with plain-language evidence', () => {
  assert.ok(dashboardSource.indexOf('<AdminDemandMap') < dashboardSource.indexOf('<AdminTrafficPanel'))
  assert.ok(dashboardSource.indexOf('<AdminTrendChart') < dashboardSource.indexOf('<AdminTrafficPanel'))
  assert.match(dashboardSource, /Số trên ghim là số tin đang hoạt động, không phải số khách/)
  assert.match(dashboardSource, /area\.totalViews/)
  assert.match(dashboardSource, /area\.totalSaves/)
  assert.match(dashboardSource, /100 là mốc tham chiếu/)
  assert.match(dashboardSource, /aria-label="Chú giải tín hiệu giá"/)
})
