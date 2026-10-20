import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'

const { chromium } = createRequire(import.meta.url)(process.env.HOMEJI_PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.HOMEJI_TEST_BASE_URL || 'http://127.0.0.1:5515'
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local fixture only')
const out = 'output/verification/glass-material-standard'
await mkdir(out, { recursive: true })
await writeFile(`${out}/index.html`, '<!doctype html><html lang="vi" data-theme="light"><meta charset="utf-8"><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
await writeFile(`${out}/scene.tsx`, `
import React,{useState}from'react';import{createRoot}from'react-dom/client';import{LiquidTabList}from'/src/components/ui/LiquidTabList.tsx';import{LiquidGlassEffects}from'/src/components/ui/LiquidGlassEffects.tsx';import'/src/index.css';import'/src/liquid-glass.css';import'/src/glass-controls.css';
function Scene(){const[on,setOn]=useState(false),[tab,setTab]=useState(0);return <><LiquidGlassEffects/><main style={{padding:32,background:'var(--surface-muted)',minHeight:'100dvh'}}><h1>Bộ kính dùng chung</h1><div style={{display:'flex',gap:16,alignItems:'center'}}><button type="button" className="sample-action">Thao tác</button><button type="button" className="hj-menu-trigger">Danh mục</button><div className="hj-search__field" style={{padding:12}}><input aria-label="Tìm kiếm"/></div><button type="button" className="sample-bead" role="switch" aria-label="Công tắc" aria-checked={on} onClick={()=>setOn(v=>!v)} style={{width:70,height:44}}/></div><LiquidTabList aria-label="Quản lý số dư">{['Nạp tiền','Rút tiền','Lịch sử'].map((name,i)=><button key={name} type="button" role="tab" aria-selected={tab===i} onClick={()=>setTab(i)}>{name}</button>)}</LiquidTabList><div data-glass-exclude=""><button className="excluded-child" style={{background:'#fff',borderRadius:4}}>Ảnh phòng</button></div></main></>};createRoot(document.getElementById('root')).render(<Scene/>);
`)
const browser = await chromium.launch({ headless: true, executablePath: process.env.HOMEJI_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const page = await browser.newPage({ viewport: { width: 1000, height: 500 }, reducedMotion: 'reduce' })
await page.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort())
try {
  await page.goto(`${base}/${out}/index.html`)
  await page.waitForFunction(() => document.querySelector('.liquid-tabs__lens')?.style.getPropertyValue('--glass-lens-filter').includes('url('))
  const material = () => page.evaluate(() => ['.sample-action','.hj-menu-trigger','.hj-search__field','.liquid-tabs__lens','.sample-bead'].map(selector => {
    const e=document.querySelector(selector),s=getComputedStyle(e)
    return { selector,fill:s.backgroundColor,shadow:s.boxShadow,filter:s.backdropFilter,profile:e.dataset.glassProfile }
  }))
  for (const theme of ['light','dark']) {
    await page.evaluate(theme => document.documentElement.dataset.theme=theme,theme)
    const values=await material()
    assert.equal(new Set(values.map(v=>v.fill)).size,1,`${theme}: all clear faces use the same tint`)
    assert.equal(new Set(values.slice(0,4).map(v=>v.shadow)).size,1,`${theme}: buttons, category, search and tab share edge/shadow`)
    assert.ok(values.every(v=>v.filter.includes('url(')),`${theme}: all shapes use the common refraction engine`)
    const before=values[0].fill
    await page.evaluate(()=>document.documentElement.style.setProperty('--glass-clear-fill','rgba(255,255,255,.07)'))
    const changed=await material()
    assert.ok(changed.every(v=>v.fill!==before),'One material edit reaches every clear control type')
    assert.equal(new Set(changed.map(v=>v.fill)).size,1)
    await page.evaluate(()=>document.documentElement.style.removeProperty('--glass-clear-fill'))
  }
  const excluded=page.locator('.excluded-child')
  assert.equal(await excluded.getAttribute('data-glass-control'),null)
  assert.deepEqual(await excluded.evaluate(e=>{const s=getComputedStyle(e);return[s.backdropFilter,s.backgroundImage,s.borderRadius]}),['none','none','4px'],'Exclusion applies to descendant buttons in both registrar and legacy CSS')
  await page.getByRole('textbox',{name:'Tìm kiếm',exact:true}).fill('phòng Thủ Đức')
  assert.equal(await page.getByRole('textbox').inputValue(),'phòng Thủ Đức')
  await page.getByRole('switch').click()
  assert.equal(await page.getByRole('switch').getAttribute('aria-checked'),'true')
  await page.emulateMedia({forcedColors:'active'})
  assert.ok((await material()).every(v=>v.filter==='none'),'All shapes have a readable forced-colors fallback')
  console.log('PASS: one material edit updates buttons/category/search/tabs/switch; sharp native input, subtree exclusions and contrast fallback')
} finally { await browser.close() }
