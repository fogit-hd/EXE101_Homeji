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

test('admin opens on product overview and retains customer map access', () => {
  assert.match(pageSource, /useState<[^>]*'overview'/)
  assert.match(pageSource, /Tổng quan sản phẩm/)
  assert.match(pageSource, /Mở trải nghiệm khách hàng/)
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
