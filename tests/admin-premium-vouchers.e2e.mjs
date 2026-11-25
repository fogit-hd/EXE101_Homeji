import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'

const base = process.env.HOMEJI_TEST_BASE_URL || 'http://127.0.0.1:5541'
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local voucher fixtures only')
const output = 'output/verification/admin-premium-vouchers'
await mkdir(output, { recursive: true })
await writeFile(output + '/index.html', '<html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
await writeFile(output + '/scene.tsx', `
  import { createRoot } from 'react-dom/client'
  import { MemoryRouter, Route, Routes } from 'react-router-dom'
  import { ThemeSync } from '/src/components/ThemeSync.tsx'
  import { ToastProvider } from '/src/components/toast/ToastProvider.tsx'
  import { AdminModerationPage } from '/src/pages/AdminModerationPage.tsx'
  import '/src/index.css'
  createRoot(document.getElementById('root')).render(
    <MemoryRouter initialEntries={['/admin/pricing']}>
      <ThemeSync><ToastProvider><Routes><Route path="/admin/:section?" element={<AdminModerationPage />} /></Routes></ToastProvider></ThemeSync>
    </MemoryRouter>
  )
`)

const browser = await chromium.launch({ headless: true, channel: 'msedge' })
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, timezoneId: 'UTC' })
  const errors = []
  const requests = []
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(() => {
    localStorage.setItem('homeji_access_token', 'fixture')
    localStorage.setItem('homeji_user_id', 'me')
  })
  await page.route('**/src/contexts/AuthContext.tsx*', route => route.fulfill({
    contentType: 'application/javascript',
    body: 'export const useAuth=()=>({profile:{displayName:"Admin fixture",role:3},isAuthenticated:true});',
  }))
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname
    if (!path.startsWith('/api/')) return route.continue()
    if (path === '/api/subscriptions/packages') return route.fulfill({ json: [
      { code: 'BASIC', name: 'Standard', tier: 1, price: 0 },
      { code: 'PREMIUM_MONTHLY', name: 'Gói Trải Nghiệm', tier: 2, price: 99000, durationDays: 30 },
      { code: 'PREMIUM_6MONTHS', name: 'Gói An Tâm', tier: 2, price: 450000, durationDays: 180 },
    ] })
    if (path === '/api/admin/premium-vouchers') {
      const voucher = route.request().postDataJSON()
      requests.push(voucher)
      if (requests.length > 1) return route.fulfill({
        status: 400, json: { errors: { code: ['Mã voucher đã tồn tại. Hãy chọn mã khác.'] } },
      })
      return route.fulfill({ status: 201, json: { ...voucher, code: voucher.code.toLowerCase() } })
    }
    return route.fulfill({ json: [] })
  })

  await page.goto(base + '/' + output + '/index.html')
  await page.getByRole('button', { name: 'Danh mục' }).click()
  await page.getByRole('link', { name: 'Voucher Premium', exact: true }).click()
  const panel = page.getByRole('region', { name: 'Voucher Premium' })
  const packages = panel.getByLabel('Gói áp dụng')
  await packages.selectOption('PREMIUM_6MONTHS')
  assert.equal(await packages.locator('option[value="BASIC"]').count(), 0)
  assert.equal(await panel.locator('form').evaluate(form => form.scrollWidth <= form.clientWidth), true)
  await panel.getByLabel('Mã voucher').fill('SinhVien30')
  await panel.getByLabel('Phần trăm giảm').fill('30')
  await panel.getByLabel(/Hạn sử dụng/).fill('2099-01-02T18:30')
  const create = panel.getByRole('button', { name: 'Tạo voucher' })
  await create.click()
  await panel.getByText('Đã tạo mã sinhvien30 giảm 30% cho Gói An Tâm.').waitFor()
  assert.deepEqual(requests, [{
    code: 'SinhVien30', packageCode: 'PREMIUM_6MONTHS', discountPercent: 30, expiresAt: '2099-01-02T11:30:00.000Z',
  }])
  await panel.getByLabel('Mã voucher').fill('sinhvien30')
  await create.click()
  await panel.getByRole('alert').filter({ hasText: 'Mã voucher đã tồn tại.' }).waitFor()
  assert.deepEqual(errors, [])
  console.log('PASS mobile admin navigation, voucher creation, Vietnam expiry time and duplicate code feedback')
} finally {
  await browser.close()
}
