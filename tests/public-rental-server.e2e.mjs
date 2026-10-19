import assert from 'node:assert/strict'
import http from 'node:http'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdir } from 'node:fs/promises'

const id = '22222222-2222-4222-8222-222222222221'
const post = { id, title: 'Phòng yên tĩnh Thủ Đức', description: 'Có bếp riêng, cửa sổ thoáng.\nThông tin công khai cho kiểm thử.', price: 3000000, area: 25, address: 'Khu vực Thủ Đức', type: 1 }
const fixture = http.createServer((req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname
  res.setHeader('Content-Type', 'application/json')
  if (path === '/api/public/rentals/sitemap') res.end(JSON.stringify({ items: [{ id }], totalPages: 1 }))
  else if (path === `/api/public/rentals/${id}`) res.end(JSON.stringify(post))
  else { res.statusCode = 404; res.end('{}') }
})
fixture.listen(0, '127.0.0.1'); await once(fixture, 'listening')
const reserve = http.createServer(); reserve.listen(0, '127.0.0.1'); await once(reserve, 'listening')
const port = reserve.address().port; await new Promise(resolve => reserve.close(resolve))
const base = `http://127.0.0.1:${port}`
const child = spawn(process.execPath, ['scripts/serve-prod.mjs'], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, PORT: String(port), API_PROXY_TARGET: `http://127.0.0.1:${fixture.address().port}`,
    PUBLIC_SITE_URL: 'https://homeji.example', GOOGLE_SITE_VERIFICATION: 'qa-verification-only-not-a-real-token' } })
let browser
try {
  let ready = false
  for (let i = 0; i < 50; i++) {
    try { ready = (await fetch(`${base}/robots.txt`)).ok } catch { /* Wait for this child only. */ }
    if (ready) break
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  assert.ok(ready, 'production server child started')
  const response = await fetch(`${base}/rentals/${id}`), html = await response.text()
  assert.equal(response.status, 200)
  assert.ok(html.includes(`<h1>${post.title}</h1>`))
  assert.ok(html.includes(`href="https://homeji.example/rentals/${id}"`))
  assert.ok(html.includes('google-site-verification'))
  assert.ok((await (await fetch(base)).text()).includes('qa-verification-only-not-a-real-token'))
  assert.equal((await fetch(`${base}/rentals/00000000-0000-0000-0000-000000000000`)).status, 404)
  assert.ok((await (await fetch(`${base}/sitemap.xml`)).text()).includes('sitemaps/rentals-1.xml'))
  assert.ok((await (await fetch(`${base}/sitemaps/rentals-1.xml`)).text()).includes(`/rentals/${id}`))
  assert.ok((await fetch(`${base}/assets/public-rental-analytics.js`)).headers.get('content-type').includes('javascript'))
  const { chromium } = await import(process.env.HOMEJI_PLAYWRIGHT_MODULE || 'playwright')
  browser = await chromium.launch({ executablePath: process.env.HOMEJI_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
  const page = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } })
  await page.goto(`${base}/rentals/${id}`)
  await page.getByRole('heading', { name: post.title }).waitFor()
  assert.equal(await page.getByRole('link', { name: 'Xem phòng trên bản đồ và đặt lịch' }).getAttribute('href'), `/?post=${id}`)
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
  await mkdir('output/technology-rollout', { recursive: true })
  await page.screenshot({ path: 'output/technology-rollout/public-rental-no-javascript.png', fullPage: true })
  console.log('PASS production Node HTTP + canonical + verification + sitemap + real 404 + mobile HTML without JavaScript; backend responses are local fixtures.')
} finally {
  await browser?.close()
  child.kill()
  await new Promise(resolve => fixture.close(resolve))
}
