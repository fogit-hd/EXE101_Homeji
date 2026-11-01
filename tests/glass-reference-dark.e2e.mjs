import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'
const out = 'output/verification/glass-reference-dark'
const base = process.env.HOMEJI_TEST_BASE_URL || 'http://127.0.0.1:5541'
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local optical fixture only')
await mkdir(out, { recursive: true })
await writeFile(`${out}/index.html`, '<html lang="vi" data-theme="light"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
await writeFile(`${out}/scene.tsx`, `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{LiquidGlassEffects}from'/src/components/ui/LiquidGlassEffects.tsx';import{LiquidTabList}from'/src/components/ui/LiquidTabList.tsx';import{LiquidSwitch}from'/src/components/ui/LiquidSwitch.tsx';${['index.css','ui-consistency.css','ai-spectrum.css','liquid-glass.css','components/theme/dark-theme.css','product-ui.css','glass-controls.css','auth-appearance.css','content-surfaces.css','workspace-readability.css','home-refinement.css'].map(file=>`import'/src/${file}';`).join('')}import'./scene.css';function Scene(){const[tab,setTab]=useState(0),[on,setOn]=useState(true);return <><LiquidGlassEffects/><main><h1>Đối chiếu kính · Homeji</h1>{['paper','color','night'].map(scene=><section className={'sample '+scene} key={scene}><div className="rear">Nền thật · Lê Văn Việt</div><button className="probe" aria-label={'Kính '+scene}><span>Khám phá Homeji</span></button><div className="hj-search__field"><input aria-label={'Tìm '+scene} placeholder="Tìm phòng"/></div><LiquidTabList aria-label={'Tab '+scene} webglGlass>{['Quản lý cửa hàng','Ví Homeji'].map((name,i)=><button role="tab" aria-selected={tab===i} onClick={()=>setTab(i)} key={name}>{name}</button>)}</LiquidTabList><LiquidSwitch checked={on} onChange={setOn} aria-label={'Bật '+scene}/></section>)}</main></>};createRoot(document.getElementById('root')).render(<Scene/>);`)
await writeFile(`${out}/scene.css`, `body{margin:0}main{padding:24px;background:var(--surface-muted);min-height:100vh}h1{font:600 22px var(--font-ui)}.sample{position:relative;margin:16px 0;padding:36px 20px;display:flex;flex-wrap:wrap;gap:18px;align-items:center;border-radius:24px;overflow:hidden}.paper{background:#e8e4df}.color{background:repeating-linear-gradient(115deg,#159acc 0 44px,#e9abda 44px 88px,#f4d790 88px 132px,#8dccac 132px 176px)}.night{background:repeating-linear-gradient(115deg,#294e65 0 44px,#704b6c 44px 88px,#856c42 88px 132px,#3e6856 132px 176px)}.rear{position:absolute;left:30px;top:34px;font:700 44px Arial;white-space:nowrap;color:#171717}.night .rear{color:#dae4e8}.sample button.probe{width:220px;height:64px;padding:12px;position:relative;font:600 15px var(--font-ui)}.hj-search__field{width:220px;padding:18px}.sample .liquid-tabs{width:350px}.sample .liquid-tabs button{padding:16px}.sample .liquid-switch{flex-shrink:0}@media(max-width:500px){main{padding:16px}.sample{padding-inline:14px}.sample .liquid-tabs{max-width:100%}}`)
const browser = await chromium.launch({ headless: true, channel: 'msedge' })
const page = await browser.newPage({ viewport: { width: 1180, height: 900 } })
const errors = [], results = []
page.on('pageerror', error => errors.push(error.message))
await page.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort())
async function pixels(button) {
  const data = (await button.screenshot()).toString('base64')
  return page.evaluate(async base64 => {
    const image = new Image(); image.src = 'data:image/png;base64,' + base64; await image.decode()
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height
    const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0)
    const pixels = ctx.getImageData(0, 0, image.width, image.height).data
    let black = 0, total = 0, luma = 0
    // Bottom interior excludes foreground glyphs and the outer shadow.
    for (let y = Math.floor(image.height * .7); y < image.height - 6; y++) for (let x = 20; x < image.width - 20; x++) {
      const i = (y * image.width + x) * 4
      const value = .2126 * pixels[i] + .7152 * pixels[i + 1] + .0722 * pixels[i + 2]
      if (value < 32) black++
      luma += value; total++
    }
    let greenPixels = 0
    for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 1] > pixels[i] + 40 && pixels[i + 1] > pixels[i + 2] + 30) greenPixels++
    return { blackRatio: black / total, luminance: luma / total, greenPixels }
  }, data)
}
try {
  await page.goto(base + '/' + out + '/index.html')
  await page.locator('.probe[data-glass-control]').first().waitFor()
  for (const width of [1180, 390]) for (const theme of ['light', 'dark']) {
    await page.setViewportSize({ width, height: 900 })
    await page.evaluate(theme => { document.documentElement.dataset.theme = theme }, theme)
    await page.waitForTimeout(250)
    for (const scene of ['paper', 'color', 'night']) {
      const button = page.getByRole('button', { name: 'Kính ' + scene, exact: true })
      const ink = await button.evaluate(element => getComputedStyle(element).color)
      const tone = await button.getAttribute('data-glass-scene')
      assert.equal(tone, scene === 'night' ? 'dark' : 'light')
      assert.equal(ink, scene === 'night' ? 'rgb(240, 247, 250)' : 'rgb(24, 52, 62)')
      const result = await pixels(button)
      results.push({ width, theme, scene, ...result })
      assert.ok(result.blackRatio < .1, `Black glass face: ${JSON.stringify(results.at(-1))}`)
      if (scene === 'paper') assert.ok(result.luminance > 170, `Clear glass must transmit the pale scene even in dark mode: ${JSON.stringify(results.at(-1))}`)
      for (const selector of ['.hj-search__field', '.liquid-tabs__lens', '.liquid-switch__thumb']) {
        const control = page.locator('.' + scene + ' ' + selector)
        const face = await pixels(control)
        results.push({ width, theme, scene, selector, ...face })
        assert.ok(face.blackRatio < .15, `Black optical layer: ${JSON.stringify(results.at(-1))}`)
      }
    }
    await page.screenshot({ path: `${out}/${process.env.HOMEJI_GLASS_PHASE || 'current'}-${theme}-${width}.png`, fullPage: true })
  }
  const toggle = page.getByRole('switch', { name: 'Bật paper', exact: true })
  assert.equal(await toggle.getAttribute('aria-checked'), 'true')
  assert.ok((await pixels(toggle)).greenPixels > 60, 'The glass shell must not erase the green on-state track')
  await toggle.click()
  await page.waitForTimeout(350)
  assert.equal(await toggle.getAttribute('aria-checked'), 'false')
  assert.ok((await pixels(toggle)).greenPixels < 10, 'Off-state must not retain the green track')
  const proof = page.getByRole('button', { name: 'Kính paper', exact: true })
  for (const density of [0, .5, 1]) {
    await page.evaluate(density => document.documentElement.style.setProperty('--glass-density', String(density)), density)
    const face = await pixels(proof)
    assert.ok(face.blackRatio < .1 && face.luminance > 170, `Dark-mode density ${density} must not paint a black face`)
  }
  await proof.evaluate(element => { element.style.setProperty('background', '#000', 'important'); element.style.setProperty('backdrop-filter', 'none', 'important') })
  assert.ok((await pixels(proof)).blackRatio > .9, 'Pixel check must catch an actual black button')
  assert.deepEqual(errors, [])
  console.log('PASS light/dark neutral, colored and night scene transmission; 390/1180; pixel guard detects injected black glass')
} finally {
  await writeFile(`${out}/${process.env.HOMEJI_GLASS_PHASE || 'current'}-results.json`, JSON.stringify({ results, errors }, null, 2))
  await browser.close()
}
