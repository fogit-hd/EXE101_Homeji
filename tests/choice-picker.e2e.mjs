import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'

const { chromium } = createRequire(import.meta.url)(process.env.HOMEJI_PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.HOMEJI_GLASS_TEST_URL || 'http://127.0.0.1:5493'
if (!['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) throw Error('Use a local test server')
const out = new URL('../output/verification/liquid-glass/', import.meta.url)
await mkdir(out, { recursive: true })
await writeFile(new URL('fixture.html', out), '<!doctype html><html lang="vi"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>#root{background:transparent!important}body{background:radial-gradient(ellipse at 10% 20%,#8cd4d8,transparent 52%),radial-gradient(ellipse at 90% 70%,#e3bca3,transparent 55%),#e1edf2!important}html[data-theme=dark] body{background:radial-gradient(ellipse at 0% 0%,#265967,transparent 60%),#0f2430!important}</style></head><body><div id="root"></div><script type="module" src="./fixture.tsx"></script></body></html>')
await writeFile(new URL('fixture.tsx', out), `
import React, {useState} from 'react'
import {createRoot} from 'react-dom/client'
import {ChoicePicker} from '/src/components/ui/ChoicePicker.tsx'
import {LiquidGlassEffects} from '/src/components/ui/LiquidGlassEffects.tsx'
import {InteractionMotion} from '/src/components/motion/InteractionMotion.tsx'
import {ScheduleDateTimePicker} from '/src/components/ScheduleDateTimePicker.tsx'
import '/src/index.css'
import '/src/liquid-glass.css'
function Fixture(){
 const [value,setValue]=useState(''),[disabled,setDisabled]=useState(false),[changes,setChanges]=useState(0),[submitted,setSubmitted]=useState(''),[date,setDate]=useState('')
 return <><LiquidGlassEffects/><InteractionMotion/><main style={{maxWidth:940,margin:'auto',padding:24}}>
 <div style={{position:'fixed',inset:0,zIndex:-1,background:'radial-gradient(ellipse at 15% 25%,#80d5d9 0,transparent 45%),radial-gradient(ellipse at 90% 60%,#e7ad88 0,transparent 45%),linear-gradient(135deg,#f8fbfb,#cbdfe9)'}}/>
 <p style={{fontSize:11,letterSpacing:3}}>HOMEJI / KIỂM THỬ THÀNH PHẦN</p><h1>Chọn nhẹ nhàng.<br/>Nhìn xuyên từng lớp kính.</h1>
 <form onSubmit={e=>{e.preventDefault();setSubmitted(String(new FormData(e.currentTarget).get('school')))}} style={{display:'grid',gap:18,maxWidth:400,marginTop:30}}>
 <label htmlFor="school">Trường học</label><ChoicePicker id="school" name="school" value={value} required disabled={disabled} onChange={e=>{setValue(e.currentTarget.value);setChanges(n=>n+1)}}>
 <option value="">Chọn trường học</option><optgroup label="Đại học"><option value="fpt">Đại học FPT</option><option value="uel">Đại học Kinh tế – Luật</option><option value="blocked" disabled>Trường ngừng nhận hồ sơ</option></optgroup>
 <optgroup label="Khu vực"><option value="thuduc">Thủ Đức</option><option value="q9">Quận 9</option></optgroup><optgroup label="Chưa mở" disabled><option value="blocked-group">Không thể chọn</option></optgroup>
 {Array.from({length:16},(_,i)=><option key={i} value={'school-'+i}>Trường học số {i+1}</option>)}</ChoicePicker>
 <div style={{display:'flex',gap:10}}><button className="btn btn-primary" type="submit">Lưu lựa chọn</button><button className="btn btn-secondary" type="button" onClick={()=>setDisabled(v=>!v)}>Bật / tắt</button></div>
 <output data-testid="state">{value}|{changes}|{submitted}</output>
 </form>
 <form style={{maxWidth:400,marginTop:24}}><label>Khoảng giá<ChoicePicker name="price" defaultValue="2"><option value="1">Dưới 2 triệu</option><option value="2">2–5 triệu</option><option value="3">Trên 5 triệu</option></ChoicePicker></label><button type="reset" className="btn btn-secondary" style={{marginTop:12}}>Khôi phục</button></form>
 <div style={{maxWidth:400,marginTop:24}}><ScheduleDateTimePicker label="Lịch xem phòng" value={date} onChange={setDate}/></div>
 <div style={{height:460}}/><label htmlFor="edge">Lựa chọn sát cuối trang</label><div style={{maxWidth:400,overflow:'hidden',transform:'translateZ(0)'}}><ChoicePicker id="edge" defaultValue="a"><option value="a">A</option><option value="b">B</option></ChoicePicker></div>
 </main></>
}
createRoot(document.getElementById('root')).render(<Fixture/>);
`)

const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const page = await context.newPage()
const results = { checks: [], responsive: [], errors: [] }
page.on('pageerror', error => results.errors.push(error.message))
await context.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort())
const check = name => results.checks.push(name)
const dialog = () => page.locator('.choice-picker__panel[role=dialog]')
const open = async name => { await page.getByRole('combobox', { name, exact: true }).click(); await dialog().waitFor() }
try {
  await page.goto(base + '/output/verification/liquid-glass/fixture.html')
  await page.getByRole('button', { name: 'Lưu lựa chọn', exact: true }).click()
  await page.getByRole('alert').waitFor()
  assert.equal(await page.getByTestId('state').textContent(), '|0|')
  check('Required native validation blocks submission and focuses visible trigger')

  await open('Trường học')
  await dialog().getByRole('combobox').fill('thu duc')
  assert.equal(await dialog().getByRole('option').count(), 1)
  await dialog().getByRole('combobox').press('Enter')
  assert.equal(await page.getByTestId('state').textContent(), 'thuduc|1|')
  await page.getByRole('button', { name: 'Lưu lựa chọn', exact: true }).click()
  assert.equal(await page.getByTestId('state').textContent(), 'thuduc|1|thuduc')
  check('Vietnamese accent-insensitive search, one real change event, native FormData')

  await open('Trường học')
  await dialog().getByRole('combobox').fill('zzzz')
  await page.getByText('Không có lựa chọn phù hợp. Thử từ khóa khác.', { exact: true }).waitFor()
  await dialog().getByRole('combobox').fill('')
  assert.equal(await dialog().getByRole('option', { name: 'Không thể chọn', exact: true }).isDisabled(), true)
  await dialog().getByRole('combobox').press('Home')
  await dialog().getByRole('combobox').press('ArrowDown')
  await dialog().getByRole('combobox').press('Enter')
  assert.equal(await page.getByTestId('state').textContent(), 'fpt|2|thuduc')
  assert.equal(await page.getByRole('combobox', { name: 'Trường học', exact: true }).evaluate(e => e === document.activeElement), true)
  check('Empty results, disabled optgroup, keyboard selection, focus restoration')

  await open('Trường học')
  await dialog().getByRole('combobox').press('Escape')
  assert.equal(await dialog().count(), 0)
  await open('Trường học')
  await dialog().getByRole('combobox').press('Tab')
  assert.equal(await dialog().count(), 0)
  assert.equal(await page.getByRole('button', { name: 'Lưu lựa chọn', exact: true }).evaluate(e => e === document.activeElement), true)
  check('Escape restores focus; Tab closes and continues to next form control')

  await page.getByRole('button', { name: 'Bật / tắt', exact: true }).click()
  assert.equal(await page.getByRole('combobox', { name: 'Trường học', exact: true }).isDisabled(), true)
  await page.getByRole('button', { name: 'Bật / tắt', exact: true }).click()
  await open('Khoảng giá')
  await dialog().getByRole('option', { name: 'Trên 5 triệu', exact: true }).click()
  assert.match(await page.locator('select[name="price"]').inputValue(), /3/)
  await page.getByRole('button', { name: 'Khôi phục', exact: true }).click()
  assert.equal(await page.locator('select[name="price"]').inputValue(), '2')
  check('Disabled trigger and uncontrolled form reset preserve native behavior')

  await page.getByRole('button', { name: /Chọn ngày|Lịch xem phòng/ }).first().click()
  await open('Giờ')
  await dialog().getByRole('option', { name: '14', exact: true }).click()
  assert.equal(await page.locator('.schedule-dt__panel').count(), 1)
  assert.equal(await page.getByRole('combobox', { name: 'Giờ', exact: true }).textContent(), '14')
  check('Nested calendar stays open when using a portaled picker')
  await page.keyboard.press('Escape')

  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.getByRole('combobox', { name: 'Lựa chọn sát cuối trang', exact: true }).scrollIntoViewIfNeeded()
  await open('Lựa chọn sát cuối trang')
  let edge = await dialog().boundingBox()
  assert.ok(edge.x >= 0 && edge.y >= 0 && edge.y + edge.height <= 1001)
  assert.equal(await dialog().evaluate(e => !e.closest('main')), true)
  await page.locator('.choice-picker__scrim').click({ position: { x: 5, y: 5 } })
  assert.equal(await dialog().count(), 0)
  check('Portaled panel escapes transformed clipping ancestors; outside click dismisses')

  await page.getByRole('button', { name: 'Lưu lựa chọn', exact: true }).scrollIntoViewIfNeeded()
  await page.getByRole('button', { name: 'Lưu lựa chọn', exact: true }).hover()
  await page.waitForFunction(() => !!document.querySelector('button[type="submit"]').style.getPropertyValue('--glass-x'))
  const optical = await page.getByRole('button', { name: 'Lưu lựa chọn', exact: true }).evaluate(e => getComputedStyle(e).backdropFilter)
  assert.match(optical, /homeji-liquid-lens/)
  check('Hovered action uses the local SVG optical filter and pointer highlight')

  for (const [width, height, theme] of [[1440,1000,'light'], [320,740,'light'], [390,844,'dark'], [768,560,'light']]) {
    await page.setViewportSize({ width, height })
    await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme)
    await page.getByRole('combobox', { name: 'Trường học', exact: true }).scrollIntoViewIfNeeded()
    await open('Trường học')
    const rect = await dialog().boundingBox()
    assert.ok(rect.x >= 0 && rect.x + rect.width <= width + 1 && rect.y >= 0 && rect.y + rect.height <= height + 1, JSON.stringify(rect))
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    await page.screenshot({ path: new URL('picker-' + width + '-' + theme + '.png', out).pathname.slice(1), animations: 'disabled' })
    results.responsive.push({ width, height, theme, rect })
    await page.keyboard.press('Escape')
  }
  await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active' })
  await open('Trường học')
  assert.equal(await dialog().evaluate(e => getComputedStyle(e).animationName), 'none')
  await page.keyboard.press('Escape')
  assert.equal(results.errors.length, 0, results.errors.join('\n'))
  check('Reduced motion and Windows forced colors remain operable')
  await writeFile(new URL('choice-picker-results.json', out), JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
} finally { await browser.close() }
