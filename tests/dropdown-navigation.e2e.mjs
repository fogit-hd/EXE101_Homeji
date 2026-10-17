import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'

const { chromium } = createRequire(import.meta.url)(process.env.HOMEJI_PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.HOMEJI_GLASS_TEST_URL || 'http://127.0.0.1:5493'
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local fixtures only')
const out = new URL('../output/verification/liquid-glass/', import.meta.url)
await mkdir(out, { recursive: true })
await writeFile(new URL('navigation.html', out), '<!doctype html><html lang="vi"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="./navigation.tsx"></script></body></html>')
await writeFile(new URL('navigation.tsx', out), `
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import {AuthProvider} from '/src/contexts/AuthContext.tsx';
import {MapOmnibox} from '/src/components/map/MapOmnibox.tsx';
import {AddressAutocomplete} from '/src/components/map/AddressAutocomplete.tsx';
import '/src/index.css'; import '/src/liquid-glass.css';
function Fixture(){const [query,setQuery]=useState(''),[picked,setPicked]=useState(''),[address,setAddress]=useState('');return <>
<MapOmnibox query={query} onQueryChange={setQuery} onSearch={value=>setPicked('search:'+value)} onPickSuggestion={item=>setPicked(item.id)} schools={[{id:'fixture-fpt',label:'Đại học FPT',keyword:'FPT',focus:{lat:10.84,lng:106.8}}]} districtId="" wardId="" schoolId="" amenities={[]} selectedAmenities={[]} onToggleAmenity={()=>{}} minPrice="" maxPrice="" onMinPriceChange={()=>{}} onMaxPriceChange={()=>{}} onApplyPrice={()=>{}} onReset={()=>{}} hideAppNav/>
<main style={{padding:24,paddingTop:300,maxWidth:600}}><output data-testid="picked">{picked}</output><label htmlFor="address">Địa chỉ</label><AddressAutocomplete id="address" value={address} onChange={setAddress} onPlaceSelect={()=>{}}/><button type="button">Tiếp tục</button></main></>}
createRoot(document.getElementById('root')).render(<MemoryRouter><AuthProvider><Fixture/></AuthProvider></MemoryRouter>);
`)
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
const result = { checks: [], errors: [] }
page.on('pageerror', error => result.errors.push(error.message))
await page.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort())
try {
  await page.goto(base + '/output/verification/liquid-glass/navigation.html')
  const input = page.getByRole('combobox', { name: 'Tìm kiếm trên Homeji Maps' })
  await input.fill('FPT')
  const option = page.getByRole('option', { name: /Đại học FPT/ })
  await option.waitFor()
  const optionIndex = (await page.getByRole('option').evaluateAll(elements => elements.map(e => e.id))).indexOf(await option.getAttribute('id'))
  for (let index = 0; index <= optionIndex; index++) await input.press('ArrowDown')
  assert.equal(await input.getAttribute('aria-activedescendant'), await option.getAttribute('id'))
  assert.equal(await input.evaluate(e => e === document.activeElement), true)
  await input.press('Enter')
  assert.match(await page.getByTestId('picked').textContent(), /fixture-fpt/)
  assert.equal(await input.getAttribute('aria-expanded'), 'false')
  await input.fill('khongtimthay-fixture')
  await input.press('Enter')
  assert.equal(await page.getByTestId('picked').textContent(), 'search:khongtimthay-fixture')
  result.checks.push('Map keyboard selection retains input focus and preserves free-text Enter search')
  await input.click()
  await input.press('Escape')
  assert.equal(await input.getAttribute('aria-expanded'), 'false')
  assert.equal(await page.locator('.gmaps-omnibox__dropdown').getAttribute('inert'), '')
  result.checks.push('Closed map suggestions and advanced actions are inert')
  const address = page.getByRole('combobox', { name: 'Địa chỉ', exact: true })
  await address.fill('12 Test')
  await page.getByRole('listbox', { name: 'Gợi ý địa chỉ' }).waitFor()
  await address.press('Escape')
  assert.equal(await page.getByRole('listbox', { name: 'Gợi ý địa chỉ' }).count(), 0)
  assert.equal(await address.evaluate(e => e === document.activeElement), true)
  result.checks.push('Address empty-state dismissal works without a Google service connection')
  await page.screenshot({ path: new URL('map-keyboard.png', out).pathname.slice(1), animations: 'disabled' })
  assert.deepEqual(result.errors, [])
  await writeFile(new URL('navigation-results.json', out), JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result, null, 2))
} finally { await browser.close() }
