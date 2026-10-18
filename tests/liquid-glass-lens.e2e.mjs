import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'

const { chromium } = createRequire(import.meta.url)(process.env.HOMEJI_PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.HOMEJI_GLASS_TEST_URL || 'http://127.0.0.1:5498'
if (!['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) throw Error('Local fixtures only')
const out = new URL('../output/verification/liquid-lens/', import.meta.url)
await mkdir(out, { recursive: true })
await writeFile(new URL('index.html', out), '<!doctype html><html lang="vi"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="./fixture.tsx"></script></body></html>')
await writeFile(new URL('fixture.tsx', out), `
import React from 'react';import{createRoot}from'react-dom/client';import{LiquidGlassEffects}from'/src/components/ui/LiquidGlassEffects.tsx';import'/src/index.css';import'/src/liquid-glass.css';
const house=<svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m3 11 9-8 9 8M5 9v12h5v-7h4v7h5V9"/></svg>;
createRoot(document.getElementById('root')).render(<><LiquidGlassEffects/><style>{\`
body{margin:0!important;background:#f4f2e9!important}#root{min-height:100vh;background:transparent!important}main{padding:40px;max-width:1200px;margin:auto;font-family:Arial,sans-serif;color:#193b30}h1{font-size:32px;letter-spacing:-1px;margin:8px 0 24px}.scene{position:relative;isolation:isolate;height:350px;border-radius:32px;overflow:hidden;background:#264c3b;display:flex;align-items:center;justify-content:center;gap:24px;--glass-ink:#fff;--glass-tint:rgb(255 255 255/.06);--glass-action:rgb(255 255 255/.06)}.scene::before{content:'';position:absolute;z-index:-1;inset:0;background:repeating-linear-gradient(90deg,transparent 0 45px,rgb(255 255 255/.24) 46px 48px,transparent 49px 96px)}.scene::after{content:'';position:absolute;z-index:-1;width:140%;height:360px;bottom:-190px;left:-20%;border-radius:50%;background:#9cae85;box-shadow:0 -3px 0 rgb(238 236 211/.7)}.scene button{display:flex;align-items:center;justify-content:center;gap:18px;height:80px;padding:0 34px;font-size:26px;font-weight:600;text-shadow:0 1px 5px rgb(0 0 0/.2)}.scene button.icon{width:80px;padding:0;flex-shrink:0}.scene .btn{width:auto;min-width:0;white-space:nowrap}.caption{font-size:13px;margin-top:14px;color:#526d5d}.application{display:flex;gap:16px;align-items:center;padding:32px 0;flex-wrap:wrap}.application button{padding:14px 24px;font-weight:600}.label{font-size:11px;letter-spacing:2px}@media(max-width:600px){main{padding:20px}.scene{gap:14px;height:340px}.scene button{height:64px;font-size:20px;padding:0 22px;gap:12px}.scene button.icon{width:64px}.scene button svg{width:24px}}
\`}</style><main><p className="label">HOMEJI · VẬT LIỆU KÍNH TRONG</p><h1>Ánh sáng đi qua. Viền kính nổi lên.</h1><section className="scene" aria-label="Kính trên nền Homeji"><button className="icon" aria-label="Về mái ấm">{house}</button><button className="btn" type="button">{house}Bắt đầu</button></section><p className="caption">Xanh lá và kem của nền xuyên qua kính. Nút không có màu tím hoặc cyan cố định.</p><div className="application"><button className="btn btn-primary">Đăng tin</button><button className="btn">Lưu lựa chọn</button><button className="btn" disabled>Đang xử lý</button></div></main></>);
`)
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 760 }, reducedMotion: 'reduce' })
const errors = []
page.on('pageerror', error => errors.push(error.message))
try {
  await page.goto(base + '/output/verification/liquid-lens/index.html')
  await page.getByRole('button', { name: 'Bắt đầu', exact: true }).waitFor()
  await page.waitForFunction(() => [...document.images].every(image => image.complete))
  await page.locator('filter feImage').waitFor({ state: 'attached' })
  await page.evaluate(async () => { const image = new Image(); image.src = document.querySelector('feImage').getAttribute('href'); await image.decode() })
  await page.screenshot({ path: new URL('homeji-clear-glass.png', out).pathname.slice(1), animations: 'disabled' })
  const lens = await page.locator('.scene').screenshot({ animations: 'disabled' })
  assert.match(await page.locator('.scene .btn').evaluate(e => getComputedStyle(e).backdropFilter), /homeji-liquid-lens/)
  await page.evaluate(() => document.querySelector('feDisplacementMap').setAttribute('scale', '0'))
  const flat = await page.locator('.scene').screenshot({ animations: 'disabled' })
  assert.notEqual(createHash('sha256').update(lens).digest('hex'), createHash('sha256').update(flat).digest('hex'), 'Changing only lens displacement must change actual backdrop pixels')
  await page.evaluate(() => document.querySelector('feDisplacementMap').setAttribute('scale', '0.18'))
  await page.setViewportSize({ width: 390, height: 844 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await page.screenshot({ path: new URL('homeji-clear-glass-mobile.png', out).pathname.slice(1), animations: 'disabled' })
  await page.emulateMedia({ forcedColors: 'active' })
  assert.equal(await page.locator('.scene .btn').evaluate(e => getComputedStyle(e).backdropFilter), 'none')
  assert.deepEqual(errors, [])
  console.log('PASS: static lens renders different backdrop pixels, mobile fits, forced-colors fallback, no runtime errors')
} finally { await browser.close() }
