import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'

const { chromium } = createRequire(import.meta.url)(process.env.HOMEJI_PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.HOMEJI_TEST_BASE_URL || 'http://127.0.0.1:5515'
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local fixture only')
const out = 'output/verification/glass-clear-chrome'
await mkdir(out, { recursive: true })
await writeFile(`${out}/index.html`, '<!doctype html><html lang="vi" data-theme="light"><meta charset="utf-8"><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
await writeFile(`${out}/scene.tsx`, `
import React,{useState}from'react';import{createRoot}from'react-dom/client';
import{LiquidGlassEffects}from'/src/components/ui/LiquidGlassEffects.tsx';import{LiquidTabList}from'/src/components/ui/LiquidTabList.tsx';
import'/src/index.css';import'/src/components/shell/shell.css';import'/src/liquid-glass.css';import'/src/glass-controls.css';import'./scene.css';
function Scene(){const[tab,setTab]=useState(0);return <><LiquidGlassEffects/><main><div className="search-scene"><div className="hj-search-slot"><form className="hj-search"><div className="hj-search__field"><input aria-label="Tìm kiếm" placeholder="Tìm kiếm"/></div></form></div></div><div className="tabs-scene"><LiquidTabList aria-label="Ví Homeji">{['Nạp tiền','Rút tiền','Lịch sử'].map((label,i)=><button type="button" role="tab" key={label} aria-selected={tab===i} onClick={()=>setTab(i)}>{label}</button>)}</LiquidTabList></div></main></>};createRoot(document.getElementById('root')).render(<Scene/>);
`)
await writeFile(`${out}/scene.css`, `
body{margin:0}main{padding:30px;background:#f2f7f9}.search-scene,.tabs-scene{background:rgb(55,153,115);padding:30px;margin-bottom:30px}.hj-search-slot{margin:0;padding:0;border:0;height:60px}.hj-search__field{height:60px}#root .liquid-tabs{margin:0;width:100%}#root .liquid-tabs>button[role=tab]{flex:1}input{font-size:16px!important}
`)
const browser = await chromium.launch({ headless: true, executablePath: process.env.HOMEJI_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const page = await browser.newPage({ viewport: { width: 900, height: 400 }, reducedMotion: 'reduce' })
const rgbAt = async (buffer, x, y) => page.evaluate(async ({ png, x, y }) => {
  const image = new Image(); image.src = 'data:image/png;base64,' + png; await image.decode()
  const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height
  const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0)
  return [...ctx.getImageData(x, y, 1, 1).data].slice(0, 3)
}, { png: buffer.toString('base64'), x, y })
try {
  await page.goto(`${base}/${out}/index.html`)
  await page.locator('.liquid-tabs__lens[data-glass-profile]').waitFor()
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(200)
  const search = page.locator('.hj-search__field'), lens = page.locator('.liquid-tabs__lens')
  const results = []
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => { document.documentElement.dataset.theme = theme }, theme)
    for (const [name, node, x, y] of [['search', search, 500, 30], ['tab', lens, 60, 14]]) {
      const rgb = await rgbAt(await node.screenshot({ path: `${out}/${theme}-${name}-transmission.png` }), x, y)
      const difference = Math.max(...rgb.map((value, channel) => Math.abs(value - [55, 153, 115][channel])))
      results.push({ theme, name, rgb, difference })
    }
  }
  await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2))
  for (const result of results) assert.ok(result.difference < 35, `${result.name} masks the real background: ${JSON.stringify(result)}`)
  await page.evaluate(() => { document.documentElement.dataset.theme = 'light' })
  // The selected lens must still transmit a patterned scene through its curved rim.
  await page.locator('.tabs-scene').evaluate(e => e.style.background = 'repeating-linear-gradient(105deg,#23774c 0 12px,#bce6cc 12px 24px)')
  const curved = await lens.screenshot()
  const warp = await lens.evaluate(e => {
    const id = e.style.getPropertyValue('--glass-lens-filter').match(/#([^"\)]+)/)[1]
    const node = document.getElementById(id).querySelector('feDisplacementMap')
    const scale = node.getAttribute('scale'); node.setAttribute('scale', '0'); return { id, scale }
  })
  assert.notDeepEqual(curved, await lens.screenshot(), 'Tabs must refract the actual scene behind their rail')
  await page.evaluate(({ id, scale }) => document.getElementById(id).querySelector('feDisplacementMap').setAttribute('scale', scale), warp)
  const withdraw = page.getByRole('tab', { name: 'Rút tiền', exact: true })
  await page.getByRole('tab', { name: 'Nạp tiền', exact: true }).focus(); await page.keyboard.press('ArrowRight')
  assert.equal(await withdraw.getAttribute('aria-selected'), 'true')
  await search.locator('input').fill('Phòng Thủ Đức')
  assert.equal(await search.locator('input').evaluate(e => getComputedStyle(e).filter), 'none')
  await page.emulateMedia({ forcedColors: 'active' })
  assert.equal(await lens.evaluate(e => getComputedStyle(e).backdropFilter), 'none')
  console.log('PASS: clear search/tab transmission, real backdrop displacement, native text/keyboard and fallback')
} finally { await browser.close() }
