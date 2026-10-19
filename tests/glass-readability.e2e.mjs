import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'

const { chromium } = createRequire(import.meta.url)(process.env.HOMEJI_PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.HOMEJI_GLASS_TEST_URL || 'http://127.0.0.1:5493'
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local fixtures only')
const out = 'output/verification/glass-readability'
await mkdir(out, { recursive: true })
await writeFile(`${out}/probe.html`, '<html><head><meta charset="utf-8"></head><body><div id="root"></div><script type="module" src="./probe.tsx"></script></body></html>')
await writeFile(`${out}/probe.tsx`, `
import React from 'react'; import {createRoot} from 'react-dom/client';
import {LiquidGlassEffects} from '/src/components/ui/LiquidGlassEffects.tsx';
import '/src/index.css'; import '/src/liquid-glass.css';
createRoot(document.getElementById('root')).render(<><LiquidGlassEffects/><main style={{padding:40}}><button style={{padding:20}}>Ví tiền · 3.785.600 đ</button><a role="menuitem" href="#profile">Hồ sơ cá nhân</a></main></>);
`)
const browser = await chromium.launch({headless:true, executablePath:process.env.HOMEJI_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'})
try {
  const page = await browser.newPage({viewport:{width:900,height:500}})
  await page.goto(`${base}/${out}/probe.html`)
  await page.getByRole('button').waitFor()
  await page.waitForTimeout(400)
  const filters = await page.locator('button,[role="menuitem"]').evaluateAll(es => es.map(e => ({
    label:e.textContent, face:e.dataset.glassFace,
    filters:[getComputedStyle(e).backdropFilter,getComputedStyle(e,'::before').backdropFilter,getComputedStyle(e,'::after').backdropFilter]
  })))
  await page.screenshot({path:`${out}/${process.env.GLASS_PHASE || 'after'}-probe.png`})
  await writeFile(`${out}/${process.env.GLASS_PHASE || 'after'}-filters.json`,JSON.stringify(filters,null,2))
  assert.ok(filters.every(e => !e.face && e.filters.every(f => !f.includes('url('))), 'Readable controls must not refract labels or split RGB channels: '+JSON.stringify(filters))
  console.log('PASS: control and menu labels have no optical overlay or SVG displacement')
} finally {await browser.close()}
