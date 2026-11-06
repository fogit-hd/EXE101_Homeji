import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'

const base = process.env.HOMEJI_TEST_BASE_URL || 'http://127.0.0.1:5541'
if (!['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) throw new Error('Local fixture only')
const out = 'output/verification/landing-discovery'
await mkdir(out, { recursive: true })
await writeFile(`${out}/index.html`, '<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
await writeFile(`${out}/scene.tsx`, `
import React from'react';import{createRoot}from'react-dom/client';import{MemoryRouter}from'react-router-dom';import{GuestListingPreview}from'/src/components/landing/GuestListingPreview.tsx';
import'/src/index.css';import'/src/ui-consistency.css';import'/src/product-ui.css';import'/src/content-surfaces.css';import'/src/components/theme/dark-theme.css';
createRoot(document.getElementById('root')).render(<MemoryRouter><GuestListingPreview/></MemoryRouter>);`)
const posts = Array.from({ length: 5 }, (_, i) => ({ id: `native-${i}`, title: ['Phòng có cửa sổ gần trường', 'Tìm bạn ở ghép tại Linh Trung', 'Phòng riêng có góc bếp', 'Căn hộ hai phòng ngủ', 'Phòng có ban công'][i], price: [2500000, 1800000, 4000000, 6500000, 5200000][i], area: 20 + i * 5, address: 'Linh Trung, Thủ Đức, TP. Hồ Chí Minh', type: i === 1 ? 2 : 1, maxOccupants: 2, ownerDisplayName: 'Người đăng kiểm thử', descriptionExcerpt: 'Không gian riêng để học tập và sinh hoạt, thông tin theo người đăng.', thumbnailPath: `/fixture-room-${i}.svg`, isSynthetic: false }))
const sources = Array.from({ length: 20 }, (_, i) => ({ id: `source-${i}`, source: i % 2 ? 'mogi' : 'phongtro123', sourceId: String(i), sourceUrl: i % 2 ? `https://mogi.vn/test-${i}` : `https://phongtro123.com/test-${i}.html`, title: `Phòng tham khảo ${i + 1} có cửa sổ`, address: 'Đường Kha Vạn Cân, Thủ Đức, TP. Hồ Chí Minh', price: 1500000 + i % 8 * 750000, area: 18 + i, district: 'thu-duc', imageUrls: [`https://pt123.cdn.static123.com/fixture-${i}.jpg`, `https://cloud.mogi.vn/fixture-${i}.jpg`], collectedAt: '2026-10-31T10:00:00Z' }))
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const checks = []
try {
  for (const [width, theme, partial] of [[1440, 'light', false], [390, 'dark', false], [320, 'light', true]]) {
    const context = await browser.newContext({ viewport: { width, height: 950 }, reducedMotion: 'reduce' })
    const requests = []
    await context.addInitScript(theme => { document.addEventListener('DOMContentLoaded', () => { document.documentElement.dataset.theme = theme }, { once: true }) }, theme)
    await context.route('**/*', route => {
      const url = new URL(route.request().url())
      if (url.pathname.startsWith('/api/')) {
        requests.push(url)
        if (url.pathname === '/api/rental-source-listings') return route.fulfill({ json: sources })
        if (url.pathname.startsWith('/api/rental-source-listings/')) return route.fulfill({ json: sources.find(item => url.pathname.endsWith(item.id)) })
        if (partial) return route.fulfill({ status: 503, json: { title: 'Fixture unavailable' } })
        return route.fulfill({ json: [...posts, { ...posts[0], id: 'synthetic', isSynthetic: true }] })
      }
      if (url.hostname === 'pt123.cdn.static123.com' || url.hostname === 'cloud.mogi.vn' || url.pathname.startsWith('/fixture-room-')) {
        const index = Number(url.pathname.match(/\d+/)?.[0] ?? 0)
        return route.fulfill({ contentType: 'image/svg+xml', body: `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="375"><rect width="600" height="375" fill="${index % 2 ? '#d7c2a7' : '#b8cec6'}"/><rect x="365" y="45" width="150" height="160" fill="#f5faf4"/><path d="M440 45v160m-75-80h150" stroke="#7fa99b" stroke-width="5"/><path d="M75 225h310v100H75z" fill="#f7eee0"/><path d="M90 210h110v45H90zm130 0h110v45H220z" fill="#8ba99c"/><path d="M45 325h510" stroke="#a58f75" stroke-width="8"/></svg>` })
      }
      return url.origin === new URL(base).origin ? route.continue() : route.abort()
    })
    const page = await context.newPage(), errors = []
    await page.route('**/src/contexts/AuthContext.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const useAuth=()=>({isAuthenticated:false,isLoading:false,profile:null})' }))
    await page.route('**/src/contexts/AuthModalContext.logic.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const useAuthModal=()=>({openAuthModal:()=>{}})' }))
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(`${base}/${out}/index.html`)
    const cards = page.locator('.guest-preview__card')
    await page.waitForFunction(() => document.querySelectorAll('.guest-preview__card').length === 8)
    const sourceRequest = requests.find(url => url.pathname === '/api/rental-source-listings')
    assert.equal(sourceRequest.searchParams.get('pageSize'), '50')
    assert.equal(sourceRequest.searchParams.has('district'), false)
    assert.ok(await page.getByText(/Phongtro123/).count())
    assert.equal(await page.getByText('synthetic', { exact: true }).count(), 0)
    if (partial) await page.getByRole('alert').waitFor()
    await page.getByRole('button', { name: 'Xem thêm 8 phòng', exact: true }).click()
    assert.equal(await cards.count(), 16)
    await page.getByRole('button', { name: 'Dưới 3 triệu', exact: true }).click()
    const expected = [...(partial ? [] : posts), ...sources].filter(p => p.price > 0 && p.price < 3000000).length
    await page.getByRole('status').filter({ hasText: `${expected} phòng` }).waitFor()
    assert.equal(await cards.count(), Math.min(8, expected))
    await page.getByRole('button', { name: 'Tất cả', exact: true }).click()
    await page.getByRole('button', { name: /^Xem tin phòng: / }).first().click()
    const dialog = page.getByRole('dialog')
    await dialog.waitFor()
    await dialog.locator('.room-detail__gallery').waitFor()
    await page.keyboard.press('Escape')
    await dialog.waitFor({ state: 'hidden' })
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
    if (width > 1200) {
      const positions = await cards.evaluateAll(elements => elements.map(e => e.getBoundingClientRect().top))
      assert.equal(new Set(positions).size, 4, 'Desktop starts with four rows of two cards')
    }
    await page.screenshot({ path: `${out}/${width}-${theme}.png`, fullPage: true })
    assert.deepEqual(errors, [])
    checks.push({ width, theme, partial, initialCards: 8, budgetFilter: true, sourceDetail: true })
    await context.close()
  }
  await writeFile(`${out}/results.json`, JSON.stringify(checks, null, 2))
  console.log(JSON.stringify(checks, null, 2))
} finally { await browser.close() }
