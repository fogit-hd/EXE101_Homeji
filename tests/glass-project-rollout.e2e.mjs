import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'

const { chromium } = createRequire(import.meta.url)(process.env.HOMEJI_PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.HOMEJI_TEST_BASE_URL || 'http://127.0.0.1:5513'
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local fixtures only')
const out = 'output/verification/glass-project-rollout'
await mkdir(out, { recursive: true })
await writeFile(`${out}/index.html`, '<!doctype html><html lang="vi" data-theme="light"><meta charset="utf-8"><div id="root"></div><script type="module" src="./probe.tsx"></script></html>')
await writeFile(`${out}/probe.tsx`, `
import React,{useState}from'react';import{createRoot}from'react-dom/client';
import{LiquidGlassEffects}from'/src/components/ui/LiquidGlassEffects.tsx';import{ChoicePicker}from'/src/components/ui/ChoicePicker.tsx';
import'/src/index.css';import'/src/liquid-glass.css';import'/src/components/theme/dark-theme.css';import'/src/glass-controls.css';
function Probe(){const[dense,setDense]=useState(false);const[excluded,setExcluded]=useState(false);return <><LiquidGlassEffects/><main style={{maxWidth:720,padding:24,margin:'auto',display:'grid',gap:18}}>
<h1>Điều khiển Homeji</h1><div role="toolbar" aria-label="Thanh công cụ thử"><button onClick={()=>setDense(v=>!v)}>Đổi nội dung</button><button onClick={()=>setExcluded(v=>!v)}>Đổi ngoại lệ</button></div>
<button id="changing-control">{dense?<p>Thông tin nhiều dòng cần giữ phẳng.</p>:'Tiếp tục'}</button>
<form id="native-form" data-glass-exclude={excluded?'':undefined} style={{display:'grid',gap:14}} onSubmit={e=>{e.preventDefault();document.body.dataset.submitted=JSON.stringify(Object.fromEntries(new FormData(e.currentTarget)))}}>
<label>Họ tên <input name="name" required aria-label="Họ tên thử" style={{padding:12,width:'100%'}}/></label>
<label>Email <input name="email" type="email" required aria-label="Email thử" style={{padding:12,width:'100%'}}/></label>
<label>Ghi chú <textarea name="note" aria-label="Ghi chú thử" style={{padding:12,width:'100%',height:84}}/></label>
<label><input name="consent" type="checkbox" required/> Tôi đồng ý</label>
<label><input name="intent" type="radio" value="room" required/> Tìm phòng</label><label><input name="intent" type="radio" value="friend"/> Tìm bạn</label>
<label><input type="checkbox" disabled/> Tùy chọn đang khóa</label><button type="submit">Gửi thử</button></form>
<label>Trạng thái <input readOnly value="Giữ rõ thông tin"/></label>
<ChoicePicker aria-label="Chọn khu vực thử" defaultValue="a">{['a','b','c','d','e','f','g'].map(v=><option key={v} value={v}>Khu vực {v}</option>)}</ChoicePicker>
<button className="marketplace-card__main" id="content-card"><h3>Sản phẩm và thông tin giữ phẳng</h3><p>Chi tiết sản phẩm không bị phủ kính.</p></button>
</main></>};createRoot(document.getElementById('root')).render(<Probe/>);
`)
const browser = await chromium.launch({ headless: true, executablePath: process.env.HOMEJI_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const page = await browser.newPage({ viewport: { width: 1000, height: 1050 } })
const errors = []
page.on('pageerror', e => errors.push(e.message))
try {
  await page.goto(`${base}/${out}/index.html`)
  await page.locator('input[name="email"][data-glass-field]').waitFor()
  assert.equal(await page.locator('#content-card').getAttribute('data-glass-control'), null)
  assert.equal(await page.locator('input[readonly]').getAttribute('data-glass-control'), null)
  assert.ok(await page.locator('[role="toolbar"]').getAttribute('data-glass-surface') !== null)
  await page.locator('[role="toolbar"]').evaluate(e => { e.id = 'former-toolbar'; e.removeAttribute('role') })
  await page.waitForFunction(() => !document.querySelector('#former-toolbar').hasAttribute('data-glass-control'))
  await page.locator('#former-toolbar').evaluate(e => e.setAttribute('role', 'toolbar'))
  await page.waitForFunction(() => document.querySelector('#former-toolbar').hasAttribute('data-glass-surface'))
  const check = page.locator('input[name="consent"]')
  await check.focus(); await page.keyboard.press('Space'); assert.equal(await check.isChecked(), true)
  await page.getByRole('radio', { name: 'Tìm phòng', exact: true }).check()
  await page.getByRole('radio', { name: 'Tìm bạn', exact: true }).check()
  assert.equal(await page.getByRole('radio', { name: 'Tìm phòng', exact: true }).isChecked(), false)
  assert.equal(await page.locator('input[disabled]').isDisabled(), true)
  assert.equal(await page.locator('#native-form').evaluate(e => e.checkValidity()), false)
  await page.getByRole('textbox', { name: 'Họ tên thử' }).fill('Nguyễn Văn An')
  await page.getByRole('textbox', { name: 'Email thử' }).fill('an@example.com')
  await page.getByRole('textbox', { name: 'Ghi chú thử' }).fill('Nội dung giữ nguyên nét.')
  await page.getByRole('button', { name: 'Đổi nội dung', exact: true }).click()
  await page.locator('#changing-control[data-glass-content]').waitFor()
  assert.equal(await page.locator('#changing-control').getAttribute('data-glass-control'), null)
  await page.getByRole('button', { name: 'Đổi nội dung', exact: true }).click()
  await page.locator('#changing-control[data-glass-control]').waitFor()
  await page.getByRole('button', { name: 'Đổi ngoại lệ', exact: true }).click()
  await page.waitForFunction(() => !document.querySelector('input[name="name"]').hasAttribute('data-glass-control'))
  assert.equal(await check.isChecked(), true)
  await page.getByRole('button', { name: 'Đổi ngoại lệ', exact: true }).click()
  await page.locator('input[name="name"][data-glass-field]').waitFor()
  assert.equal(await page.getByRole('textbox', { name: 'Họ tên thử' }).inputValue(), 'Nguyễn Văn An')
  await page.getByRole('button', { name: 'Gửi thử', exact: true }).click()
  await page.waitForFunction(() => Boolean(document.body.dataset.submitted))
  const data = JSON.parse(await page.locator('body').getAttribute('data-submitted'))
  assert.deepEqual(data, { name: 'Nguyễn Văn An', email: 'an@example.com', note: 'Nội dung giữ nguyên nét.', consent: 'on', intent: 'friend' })
  await page.getByRole('combobox', { name: 'Chọn khu vực thử', exact: true }).click()
  await page.locator('.choice-picker__panel[data-glass-surface]').waitFor()
  await page.getByRole('option', { name: 'Khu vực d', exact: true }).click()
  assert.match(await page.getByRole('combobox', { name: 'Chọn khu vực thử', exact: true }).innerText(), /Khu vực d/)
  for (const theme of ['light', 'dark']) for (const width of [1000, 390]) {
    await page.setViewportSize({ width, height: 1050 })
    await page.evaluate(t => { document.documentElement.dataset.theme = t }, theme)
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await page.screenshot({ path: `${out}/controls-${theme}-${width}.png`, fullPage: true })
  }
  await page.emulateMedia({ forcedColors: 'active' })
  assert.equal(await check.evaluate(e => getComputedStyle(e).appearance), 'auto')
  assert.deepEqual(errors, [])
  console.log('PASS: native editing/validation/FormData, checkbox keyboard, radio grouping, disabled state, dynamic exclusions/content, portaled picker, light/dark mobile and forced colors')
} finally { await browser.close() }

