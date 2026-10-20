import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { copyFile, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const { chromium } = createRequire(import.meta.url)(process.env.HOMEJI_PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.HOMEJI_TEST_BASE_URL || 'http://127.0.0.1:5515'
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local calibration only')
const out = 'output/verification/glass-reference-calibration'
await mkdir(out, { recursive: true })
const referenceDir = process.env.HOMEJI_GLASS_REFERENCE_DIR
if (referenceDir) {
  const sources = {
    'reference-type.jpg': '1792475131209_265465183805796900_4329010459808657816_2b3f06eea4d2366741839313d464cd97.jpg',
    'reference-switch.jpg': '1792475131200_265465183805796900_4329010459808657816_2719911d9115e285b54b21c506173909.jpg',
    'reference-color.jpg': '1792475131242_265465183805796900_4329010459808657816_8be9a666e74c61cd747883e5b7c03ab6.jpg',
  }
  for (const [destination, source] of Object.entries(sources)) await copyFile(join(referenceDir, source), `${out}/${destination}`)
}
await writeFile(`${out}/index.html`, '<!doctype html><html lang="vi" data-theme="light"><meta charset="utf-8"><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
await writeFile(`${out}/scene.tsx`, `
import React,{useState}from'react';import{createRoot}from'react-dom/client';import{LiquidGlassEffects}from'/src/components/ui/LiquidGlassEffects.tsx';import'/src/index.css';import'/src/liquid-glass.css';import'/src/components/theme/dark-theme.css';import'/src/glass-controls.css';import'./scene.css';
const Search=()=> <div className="cal-toolbar"><button className="cal-menu" aria-label="Danh mục"><svg viewBox="0 0 32 32"><path d="M5 10h22M7 16h18M10 22h12"/></svg></button><div className="cal-search hj-search__field"><svg viewBox="0 0 32 32"><circle cx="13" cy="13" r="8"/><path d="m19 19 8 8"/></svg><input aria-label="Tìm kiếm mô phỏng" placeholder="Tìm kiếm"/></div></div>;
function Scene(){const[on,setOn]=useState(true);return <><LiquidGlassEffects/><main className="cal-main"><h1>Đối chiếu cảnh kính</h1><p>Trái: ảnh người dùng cung cấp. Phải: giao diện thật với bộ kính Homeji. Nền chữ và dải màu được dựng lại bằng HTML/CSS.</p><div className="cal-grid"><h2>Ảnh mẫu</h2><h2>Mô phỏng Homeji</h2><div className="cal-reference cal-type-ref">${referenceDir ? '<img src="./reference-type.jpg"/>' : '<p>Chưa cung cấp thư mục ảnh mẫu</p>'}</div><section className="cal-type"><div className="cal-paper"><h3>Chào mừng đến Apple Park</h3></div><Search/></section><div className="cal-reference cal-color-ref">${referenceDir ? '<img src="./reference-color.jpg"/>' : ''}</div><section className="cal-color"><div className="cal-ribbons"/><Search/></section><div className="cal-reference cal-switch-ref">${referenceDir ? '<img src="./reference-switch.jpg"/>' : ''}</div><section className="cal-switch"><div className="cal-switch-paper"/><span className="cal-track" style={{background:on?'#22c94a':'#b9c4bf'}}/><button className="cal-knob" role="switch" aria-label="Công tắc mô phỏng" aria-checked={on} onClick={()=>setOn(v=>!v)}/></section></div><section className="cal-probes"><div className="cal-bend" style={{width:240,height:80,position:"relative",background:"linear-gradient(45deg,#111 50%,#eee 50%)"}}><button aria-label="Đo độ uốn nền" style={{position:"absolute",inset:0,width:"100%",height:"100%",padding:0}}/></div><h2>Cùng chiều cao: đầu bo phải giữ cùng hình dạng</h2><div className="cal-probe" style={{width:240}}><button aria-label="Kính ngắn"/></div><div className="cal-probe" style={{width:600}}><button aria-label="Kính dài"/></div></section></main></>};createRoot(document.getElementById('root')).render(<Scene/>);
`)
await writeFile(`${out}/scene.css`, `
html,body{margin:0}.cal-main{padding:28px;background:#f2f1f7;--glass-ink:#111;font-family:Arial,sans-serif;color:#172e34}.cal-main h1{font-size:26px;margin:0 0 8px}.cal-main>p{font-size:13px;margin:0 0 22px}.cal-grid{display:grid;grid-template-columns:660px 660px;gap:12px 24px;align-items:center}.cal-grid>h2{font-size:16px;margin:0}.cal-grid>section,.cal-reference{position:relative;overflow:hidden;width:660px;height:244.5px;background:#f2f1f7}.cal-reference img{display:block;width:660px;height:auto}.cal-type .cal-paper{position:absolute;inset:71px 30px 55px;background:#e8e4df;border-radius:0 0 50px 50px;overflow:hidden}.cal-type h3{position:absolute;left:25px;top:40px;margin:0;white-space:nowrap;font:600 42px/1.2 Arial;color:#080808}.cal-toolbar{position:absolute;left:64px;right:59px;top:86px;height:72px;display:flex;gap:16px}.cal-toolbar button{height:72px;padding:0;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-sizing:border-box}.cal-menu{width:72px}.cal-menu svg{width:40px;height:40px}.cal-toolbar svg{fill:none;stroke:#111;stroke-width:2.3;stroke-linecap:round}.cal-search{height:72px;display:flex;align-items:center;box-sizing:border-box;flex-shrink:0;width:448px;gap:14px;justify-content:flex-start!important;padding-inline:20px!important;font:400 25px Arial;color:#6b6c68!important}.cal-search svg{width:30px;height:30px;flex-shrink:0}.cal-search input{font:400 25px Arial;padding:0;min-width:0;width:100%;color:#6b6c68!important}.cal-grid>.cal-color-ref,.cal-grid>.cal-color{height:160px}.cal-color-ref img{position:absolute;top:-665px}.cal-color{background:#8cc3e9!important}.cal-color .cal-toolbar{top:60px}.cal-ribbons{position:absolute;inset:0;background:radial-gradient(ellipse 660px 500px at -120px 250px,#111a25 0 40%,#a4cf57 40% 43%,#3b2b3b 43% 47%,#eb91a8 47% 51%,#371d42 51% 55%,#df5299 55% 60%,#201527 60% 65%,#7660b7 65% 71%,#92d3e5 71% 76%,#147db2 76% 85%,#079fe3 85% 100%,transparent 100%)}.cal-grid>.cal-switch-ref,.cal-grid>.cal-switch{height:197px}.cal-switch-ref img{width:241px;margin:auto}.cal-switch-paper{position:absolute;left:209.5px;top:0;width:211px;height:109.5px;background:white}.cal-track{position:absolute;left:296px;top:49.5px;width:92px;height:42px;border-radius:99px}.cal-knob{position:absolute;left:324.5px;top:40px;width:88px;height:58px;padding:0;transition:transform 350ms cubic-bezier(.2,.8,.2,1)}.cal-knob[aria-checked=false]{transform:translateX(-35px)}.cal-probes{margin-top:18px}.cal-probes h2{font-size:15px}.cal-probe{position:relative;height:80px;margin-bottom:12px;background:repeating-linear-gradient(90deg,#315a52 0 3px,#ede9e3 3px 16px)}:is(html:root #root,html:root body) .cal-probes .cal-probe button{background:none;box-shadow:none;border-color:transparent;position:absolute;inset:0;width:100%;height:100%;padding:0}
`)
const browser = await chromium.launch({ headless: true, executablePath: process.env.HOMEJI_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const page = await browser.newPage({ viewport: { width: 1400, height: 1200 }, reducedMotion: 'reduce' })
await page.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort())
try {
  await page.goto(`${base}/${out}/index.html`)
  await page.waitForFunction(() => document.querySelector('.cal-search')?.style.getPropertyValue('--glass-lens-filter').includes('url('))
  await page.evaluate(() => document.fonts.ready)
  if (process.env.HOMEJI_GLASS_DEPTH_MULTIPLIER) {
    const multiplier = Number(process.env.HOMEJI_GLASS_DEPTH_MULTIPLIER)
    if (!Number.isFinite(multiplier) || multiplier < .5 || multiplier > 2) throw Error('Invalid calibration depth multiplier')
    await page.evaluate(multiplier => document.querySelectorAll('filter:not([id*="bead"]):not([id*="surface"]) feDisplacementMap').forEach(e => e.setAttribute('scale', String(Number(e.getAttribute('scale')) * multiplier))), multiplier)
  }
  await page.screenshot({ path: `${out}/${process.env.HOMEJI_GLASS_CALIBRATION_LABEL || 'current'}-comparison.png`, fullPage: true })
  const crops = []
  for (const probe of await page.locator('.cal-probe').all()) {
    const box = await probe.boundingBox()
    await probe.scrollIntoViewIfNeeded()
    const positioned = await probe.boundingBox()
    crops.push((await page.screenshot({ clip: { x: positioned.x, y: positioned.y, width: 40, height: box.height } })).toString('base64'))
  }
  const error = await page.evaluate(async images => {
    const pixels = []
    for (const data of images) { const image = new Image(); image.src = 'data:image/png;base64,' + data; await image.decode(); const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height; const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0); pixels.push(ctx.getImageData(0, 0, canvas.width, canvas.height).data) }
    return pixels[0].reduce((sum, value, index) => sum + Math.abs(value - pixels[1][index]), 0) / pixels[0].length
  }, crops)
  await writeFile(`${out}/geometry-result.json`, JSON.stringify({ capMeanPixelError: error, referencesProvided: !!referenceDir }, null, 2))
  assert.ok(error < 1, `Changing width must not stretch the same-height cap: pixel error ${error.toFixed(2)}`)
  const bend = page.getByRole('button', { name: 'Đo độ uốn nền', exact: true })
  const curved = (await bend.screenshot()).toString('base64')
  const originalScale = await bend.evaluate(element => {
    const id = element.style.getPropertyValue('--glass-lens-filter').match(/#([^"\)]+)/)[1]
    const warp = document.getElementById(id).querySelector('feDisplacementMap')
    const scale = warp.getAttribute('scale'); warp.setAttribute('scale', '0'); return { id, scale }
  })
  const unbent = (await bend.screenshot()).toString('base64')
  await page.evaluate(({ id, scale }) => document.getElementById(id).querySelector('feDisplacementMap').setAttribute('scale', scale), originalScale)
  const offsets = await page.evaluate(async images => {
    const boundaries = []
    for (const data of images) {
      const image = new Image(); image.src = 'data:image/png;base64,' + data; await image.decode()
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height
      const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0)
      const { data: pixels } = ctx.getImageData(0, 0, canvas.width, canvas.height)
      boundaries.push([8, 72].map(y => {
        const row = Array.from({ length: 120 }, (_, i) => pixels[(y * canvas.width + i + 60) * 4])
        const midpoint = (Math.min(...row) + Math.max(...row)) / 2
        return row.findIndex(value => value > midpoint)
      }))
    }
    return boundaries[0].map((x, i) => x - boundaries[1][i])
  }, [curved, unbent])
  assert.ok(offsets[0] * offsets[1] < 0 && offsets.every(value => Math.abs(value) >= 3), `Upper/lower shoulders must visibly bend opposite ways: ${offsets}`)
  await writeFile(`${out}/geometry-result.json`, JSON.stringify({ capMeanPixelError: error, shoulderPixelOffsets: offsets, referencesProvided: !!referenceDir }, null, 2))
  const toggle = page.getByRole('switch')
  await toggle.click(); assert.equal(await toggle.getAttribute('aria-checked'), 'false')
  console.log(`PASS same-height cap geometry (${error.toFixed(3)} mean pixel error), native switch. Comparison is a visual calibration aid, not a claim of pixel identity with the reference.`)
} finally { await browser.close() }
