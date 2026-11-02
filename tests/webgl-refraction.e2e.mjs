import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'
const base = process.env.HOMEJI_TEST_BASE_URL || 'http://127.0.0.1:5541'
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local optical fixture only')
const out = 'output/verification/webgl-refraction'
await mkdir(out, { recursive: true })
await writeFile(out + '/index.html', '<html lang="vi"><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="utf-8"><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
await writeFile(out + '/scene.tsx', `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{MotionTabs}from'/src/components/motion/MotionTabs.tsx';import{LiquidGlassEffects}from'/src/components/ui/LiquidGlassEffects.tsx';import'/src/index.css';import'/src/liquid-glass.css';import'/src/glass-controls.css';import'/src/components/theme/dark-theme.css';document.documentElement.dataset.theme=new URLSearchParams(location.search).get('theme')||'light';function Scene(){const[value,setValue]=useState('shop');return <main style={{padding:24}}><h1>Kính WebGL · Chợ Homeji</h1><MotionTabs webglGlass value={value} onChange={setValue} label="Chợ Homeji" items={[{id:'shopping',label:'Mua sắm'},{id:'purchases',label:'Đơn mua'},{id:'shop',label:'Quản lý cửa hàng'},{id:'wallet',label:'Ví Homeji'}]}/><p role="status">{value}</p><LiquidGlassEffects/></main>}createRoot(document.getElementById('root')).render(<Scene/>);`)
const browser = await chromium.launch({ headless: true, channel: 'msedge' })
const results = []
try {
  for (const [width, theme] of [[1280, 'light'], [1280, 'dark'], [390, 'light'], [320, 'dark']]) {
    const page = await browser.newPage({ viewport: { width, height: 700 }, reducedMotion: 'reduce' })
    const errors = []; page.on('pageerror', error => errors.push(error.message))
    await page.goto(base + '/' + out + '/index.html?theme=' + theme)
    const rail = page.getByRole('tablist', { name: 'Chợ Homeji' })
    await rail.locator('canvas').waitFor()
    await page.waitForFunction(() => document.querySelector('.liquid-tabs')?.dataset.glassRenderer === 'webgl-refraction')
    const optics = await rail.evaluate(root => {
      const lens = root.querySelector('.liquid-tabs__lens'), canvas = root.querySelector('canvas')
      const gl = canvas.getContext('webgl'), program = gl.getParameter(gl.CURRENT_PROGRAM)
      const strength = gl.getUniformLocation(program, 'strength')
      const render = value => { gl.uniform1f(strength, value); gl.drawArrays(gl.TRIANGLES, 0, 6); const pixels = new Uint8Array(canvas.width * canvas.height * 4); gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels); return pixels }
      const flat = render(0), refracted = render(1)
      let changed = 0, maxDifference = 0
      for (let i = 0; i < flat.length; i += 4) { const difference = Math.abs(flat[i] - refracted[i]) + Math.abs(flat[i + 1] - refracted[i + 1]) + Math.abs(flat[i + 2] - refracted[i + 2]); if (difference > 12) changed++; maxDifference = Math.max(maxDifference, difference) }
      return { changed, maxDifference, error: gl.getError(), backingPixels: canvas.width * canvas.height, backdrop: getComputedStyle(lens).backdropFilter, filter: getComputedStyle(lens).filter, svgFilter: lens.style.getPropertyValue('--glass-lens-filter') }
    })
    assert.equal(optics.error, 0); assert.ok(optics.changed > 30, JSON.stringify(optics)); assert.ok(optics.maxDifference > 20)
    assert.equal(optics.backdrop, 'none'); assert.equal(optics.filter, 'none'); assert.equal(optics.svgFilter, '')
    assert.ok(optics.backingPixels <= 2048 * 256)
    await page.getByRole('tab', { name: 'Ví Homeji', exact: true }).click()
    assert.equal(await page.getByRole('tab', { name: 'Ví Homeji' }).getAttribute('aria-selected'), 'true')
    await page.getByRole('tab', { name: 'Ví Homeji' }).press('ArrowLeft')
    assert.equal(await page.getByRole('tab', { name: 'Quản lý cửa hàng' }).getAttribute('aria-selected'), 'true')
    await page.waitForTimeout(800)
    await page.screenshot({ path: `${out}/${theme}-${width}.png` })
    await rail.locator('canvas').evaluate(canvas => canvas.getContext('webgl').getExtension('WEBGL_lose_context').loseContext())
    await page.waitForFunction(() => document.querySelector('.liquid-tabs')?.dataset.glassRenderer === 'fallback')
    assert.equal(await page.getByRole('tab', { name: 'Quản lý cửa hàng' }).evaluate(button => getComputedStyle(button).opacity), '1')
    await page.getByRole('tab', { name: 'Đơn mua' }).click()
    assert.equal(await page.getByRole('tab', { name: 'Đơn mua' }).getAttribute('aria-selected'), 'true')
    assert.deepEqual(errors, []); results.push({ width, theme, ...optics, contextLossFallback: true, keyboardAndPointer: true })
    await page.close()
  }
  console.log(JSON.stringify(results, null, 2))
} finally { await writeFile(out + '/results.json', JSON.stringify(results, null, 2)); await browser.close() }
