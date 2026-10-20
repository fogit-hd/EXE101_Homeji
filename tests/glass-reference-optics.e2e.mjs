import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'

const { chromium } = createRequire(import.meta.url)(process.env.HOMEJI_PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.HOMEJI_TEST_BASE_URL || 'http://127.0.0.1:5511'
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local fixture only')
const out = 'output/verification/glass-reference-optics'
await mkdir(out, { recursive: true })
await writeFile(`${out}/index.html`, '<!doctype html><html lang="vi" data-theme="light"><meta charset="utf-8"><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
await writeFile(`${out}/scene.tsx`, `
import React,{useState} from 'react';import{createRoot}from'react-dom/client';
import{LiquidGlassEffects}from'/src/components/ui/LiquidGlassEffects.tsx';
import{LiquidTabList}from'/src/components/ui/LiquidTabList.tsx';
import'/src/index.css';import'/src/liquid-glass.css';import'/src/components/theme/dark-theme.css';import'/src/glass-controls.css';
import './scene.css';
function Toolbar({id}){return <div className="reference-toolbar"><button className="reference-menu" aria-label="Danh mục">☰</button><button id={id} className="reference-search"><span aria-hidden>⌕</span><span>Tìm kiếm</span></button></div>}
function Scene(){const[tab,setTab]=useState(0);return <><LiquidGlassEffects/><main className="reference-main"><p className="reference-kicker">HOMEJI · KÍNH TRONG</p><h1>Nền uốn qua kính. Chữ trên mặt vẫn rõ.</h1><section className="reference-scene reference-type"><h2>Một nơi để trở về.</h2><p>Căn nhà nhỏ. Những câu chuyện lớn.</p><Toolbar id="type-glass"/></section><section className="reference-scene reference-photo"><img src="/landing/bloom-hero-bg2.jpg" alt=""/><Toolbar id="photo-glass"/></section><section className="reference-scene reference-color"><Toolbar id="color-glass"/></section><LiquidTabList aria-label="Chế độ xem">{['Cơ bản','Lối sống','Tiện ích'].map((name,i)=><button key={name} type="button" role="tab" aria-selected={tab===i} onClick={()=>setTab(i)}>{name}</button>)}</LiquidTabList><div className="reference-proof"><button id="ink-proof"><span>Nét chữ giữ nguyên</span></button></div></main></>};createRoot(document.getElementById('root')).render(<Scene/>);
`)
await writeFile(`${out}/scene.css`, `
.reference-main{max-width:960px;margin:0 auto;padding:40px 24px;background:#f4f3ee;color:#172d35;--glass-ink:#172d35}
.reference-main h1{font-size:30px;line-height:1.3;margin:12px 0 28px}.reference-kicker{font-size:11px;letter-spacing:.16em;color:#536971}
.reference-scene{position:relative;height:240px;border-radius:28px;overflow:hidden;margin-bottom:24px;background:#e6e2db}
.reference-scene h2{position:absolute;left:36px;top:42px;font-size:42px;line-height:1.25;margin:0;color:#182b31}
.reference-scene p{position:absolute;left:36px;top:133px;font-size:32px;line-height:1.3;margin:0;color:#536267}
.reference-scene img{width:100%;height:100%;object-fit:cover}.reference-toolbar{position:absolute;inset:auto 24px 40px;display:flex;gap:14px;align-items:center}
.reference-toolbar button{height:64px;padding:0 24px;font:500 20px/1.2 var(--font-ui);display:flex;align-items:center;gap:14px}
.reference-toolbar .reference-menu{flex:0 0 64px;width:64px;padding:0;justify-content:center;font-size:28px}
.reference-search{flex:1;min-width:0;text-align:left}.reference-search>span:first-child{font-size:34px;color:#172d35}
.reference-color{background:repeating-linear-gradient(125deg,#73bb9f 0 46px,#c3d986 46px 92px,#f1bc70 92px 138px,#e49391 138px 184px,#bba5cf 184px 230px,#7eb4d8 230px 276px)}
.reference-proof{padding:24px;background:white}.reference-proof button{padding:18px 26px;font:600 20px/1.4 var(--font-ui);color:#172d35}
@media(max-width:500px){.reference-main{padding:24px 16px}.reference-main h1{font-size:24px}.reference-scene{height:240px}.reference-scene h2{left:22px;font-size:32px}.reference-scene p{left:22px;font-size:23px}.reference-toolbar{left:16px;right:16px;gap:10px}.reference-toolbar button{height:56px;padding-inline:16px;font-size:17px}.reference-toolbar .reference-menu{flex-basis:56px;width:56px}.reference-toolbar .reference-search{gap:8px}}
`)
const browser = await chromium.launch({ headless: true, executablePath: process.env.HOMEJI_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const page = await browser.newPage({ viewport: { width: 1024, height: 1250 } })
const errors = []
page.on('pageerror', error => errors.push(error.message))
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
async function assertInkPreserved(ink, before, after) {
  const color = await ink.evaluate(e => getComputedStyle(e).color.match(/[\d.]+/g).slice(0, 3).map(Number))
  const result = await page.evaluate(async ({ images, color }) => {
    const masks = []
    for (const data of images) {
      const image = new Image(); image.src = 'data:image/png;base64,' + data; await image.decode()
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height
      const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0)
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data
      masks.push(Array.from({ length: pixels.length / 4 }, (_, i) => color.every((v, c) => Math.abs(pixels[i * 4 + c] - v) <= 1)))
    }
    let union = 0, same = 0
    masks[0].forEach((v, i) => { if (v || masks[1][i]) { union++; if (v && masks[1][i]) same++ } })
    return { opaqueInkPixels: union, overlap: same / union }
  }, { images: [before.toString('base64'), after.toString('base64')], color })
  // Reflection may change background pixels inside the span's rectangle. Check
  // the actual glyph interiors; blurring or warping the label changes this mask.
  assert.ok(result.opaqueInkPixels > 100 && result.overlap >= .995, `Foreground glyphs changed: ${JSON.stringify(result)}`)
}
try {
  await page.goto(`${base}/${out}/index.html`)
  await page.locator('#color-glass[data-glass-control]').waitFor()
  await page.evaluate(() => document.fonts.ready)
  await page.mouse.move(0, 0)
  await page.waitForTimeout(250)
  const color = page.locator('#color-glass')
  const refracted = await color.screenshot({ path: `${out}/refracted-background.png` })
  await color.evaluate(e => e.style.setProperty('--glass-lens-filter', 'saturate(1)'))
  const flat = await color.screenshot({ path: `${out}/flat-background.png` })
  assert.notEqual(hash(refracted), hash(flat), 'Real backdrop pixels must change when the lens displacement is disabled')
  await color.evaluate(e => e.style.removeProperty('--glass-lens-filter'))
  const proof = page.locator('#ink-proof')
  const ink = proof.locator('span')
  const before = await ink.screenshot()
  await proof.evaluate(e => e.style.setProperty('--glass-lens-filter', 'saturate(1)'))
  const after = await ink.screenshot()
  await assertInkPreserved(ink, before, after)
  await proof.evaluate(e => e.style.filter = 'blur(1px)')
  await assert.rejects(assertInkPreserved(ink, before, await ink.screenshot()), /Foreground glyphs changed/, 'The ink check must detect a blurred label')
  await proof.evaluate(e => e.style.removeProperty('filter'))
  await proof.evaluate(e => e.style.removeProperty('--glass-lens-filter'))
  await proof.hover()
  await page.mouse.down()
  await proof.evaluate(async e => { await Promise.all(e.getAnimations().map(animation => animation.finished)) })
  await page.waitForTimeout(300)
  const pressed = await ink.screenshot()
  await proof.evaluate(e => e.style.setProperty('--glass-lens-active-filter', 'saturate(1)'))
  await assertInkPreserved(ink, pressed, await ink.screenshot())
  await proof.evaluate(e => e.style.removeProperty('--glass-lens-active-filter'))
  await page.mouse.up()
  const tabs = page.getByRole('tablist')
  assert.ok(await tabs.evaluate(e => +getComputedStyle(e.querySelector('button')).zIndex > +getComputedStyle(e.querySelector('.liquid-tabs__lens')).zIndex))
  await tabs.evaluate(e => { e.style.backgroundImage = 'repeating-linear-gradient(110deg,#a0c5b5 0 18px,#f1d498 18px 36px,#b9c7e0 36px 54px)' })
  const tabLens = tabs.locator('.liquid-tabs__lens')
  const tabOptical = await tabs.screenshot({ path: `${out}/tab-transmission.png` })
  await tabLens.evaluate(e => e.style.setProperty('--glass-lens-filter', 'saturate(1)'))
  assert.notEqual(hash(tabOptical), hash(await tabs.screenshot()), 'Shared tab lens must refract the scene visible through its rail')
  await tabLens.evaluate(e => e.style.removeProperty('--glass-lens-filter'))
  await tabs.evaluate(e => e.style.removeProperty('background-image'))
  const last = tabs.getByRole('tab', { name: 'Tiện ích', exact: true })
  await last.click()
  assert.equal(await last.getAttribute('aria-selected'), 'true')
  await tabs.getByRole('tab', { name: 'Cơ bản', exact: true }).focus()
  await page.keyboard.press('ArrowRight')
  assert.equal(await tabs.getByRole('tab', { name: 'Lối sống', exact: true }).getAttribute('aria-selected'), 'true')
  for (const width of [1024, 390]) {
    await page.setViewportSize({ width, height: 1250 })
    await page.mouse.move(0, 0)
    await page.waitForTimeout(700)
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await page.screenshot({ path: `${out}/reference-${width}.png`, fullPage: true })
  }
  await page.emulateMedia({ forcedColors: 'active' })
  assert.equal(await tabs.locator('.liquid-tabs__lens').evaluate(e => getComputedStyle(e).backdropFilter), 'none')
  assert.deepEqual(errors, [])
  await writeFile(`${out}/results.json`, JSON.stringify({ checks: ['actual backdrop pixel displacement', 'preserved opaque foreground glyphs', 'ink check rejects a blurred label', 'label plane above lens', 'click and arrow navigation', '1024/390 fit', 'forced-color fallback'], errors }, null, 2))
  console.log('PASS: real refracted backdrop, preserved foreground glyphs, layered tabs, native interaction and accessibility fallback')
} finally { await browser.close() }
