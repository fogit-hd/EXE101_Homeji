import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
const base = process.env.HOMEJI_TEST_BASE_URL || 'http://127.0.0.1:5202'
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local fixture only')
const out = 'output/verification/verified-owner-map'
await mkdir(out, { recursive: true })
await writeFile(out + '/index.html', '<!doctype html><html lang="vi"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
await writeFile(out + '/scene.tsx', `import React from 'react';import{createRoot}from'react-dom/client';import{MemoryRouter}from'react-router-dom';import{MapListingsWorkspace}from'/src/components/map/listings/MapListingsWorkspace.tsx';import'/src/index.css';import'/src/ui-consistency.css';import'/src/liquid-glass.css';import'/src/components/theme/dark-theme.css';import'/src/product-ui.css';import'/src/glass-controls.css';import'/src/content-surfaces.css';import'/src/workspace-readability.css';import'/src/home-refinement.css';const q=new URLSearchParams(location.search);const post={id:'room',type:1,title:'Phòng trống · 54 m²',price:6000000,area:54,address:'12 đường số 8, Linh Trung, Thủ Đức',latitude:10.8,longitude:106.7,thumbnailPath:'/landing/bloom-hero-bg2.jpg',isOwnerPremium:q.get('premium')!=='false',isOwnerVerified:q.get('verified')==='true',ownerBadge:'Premium'};createRoot(document.getElementById('root')).render(<MemoryRouter initialEntries={['/?section=listings&view='+q.get('view')]}><div style={{height:'100dvh'}}><MapListingsWorkspace posts={[post]} selectedListingId="room" hoveredListingId={null} loading={false} error="" mapNode={<div style={{height:'100%',background:'#cadfda'}}/>} onHoverListing={()=>{}} onLeaveListing={()=>{}} onSelectListing={()=>{}} onOpenRoomDetail={()=>{}} onResetFilters={()=>{}}/></div></MemoryRouter>);`)
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1100, height: 900 }, reducedMotion: 'reduce' })
const errors = []; page.on('pageerror', e => errors.push(e.message))
try {
  await page.goto(base + '/' + out + '/index.html?view=map&verified=true')
  const badge = page.locator('.map-listings__preview .premium-badge')
  await badge.waitFor()
  const decoration = await badge.locator('.premium-stars').evaluate(e => { const s = getComputedStyle(e); return { border: s.borderTopWidth, padding: s.paddingTop, background: s.backgroundColor } })
  assert.deepEqual(decoration, { border: '0px', padding: '0px', background: 'rgba(0, 0, 0, 0)' }, 'Premium decoration must not become an opaque empty tag covering the label')
  assert.ok(await badge.evaluate(e => getComputedStyle(e).backgroundImage.includes('gradient')), 'Premium label must keep its own readable background')
  for (const width of [1100, 390, 320]) for (const theme of ['light', 'dark']) for (const view of ['map', 'list']) for (const verified of [true, false]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(`${base}/${out}/index.html?view=${view}&verified=${verified}`)
    await page.evaluate(t => document.documentElement.dataset.theme = t, theme)
    const scope = page.locator(view === 'map' ? '.map-listings__preview' : '.map-listings__card')
    await scope.waitFor()
    assert.equal(await scope.getByText('Chủ nhà đã xác minh', { exact: true }).count(), Number(verified))
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal page overflow')
    if (verified && view === 'map') await page.screenshot({ path: `${out}/${theme}-${width}.png`, fullPage: true })
  }
  await page.goto(`${base}/${out}/index.html?view=map&verified=true&premium=false`)
  const nonPremium = page.locator('.map-listings__preview')
  await nonPremium.waitFor()
  assert.equal(await nonPremium.getByText('Chủ nhà đã xác minh', { exact: true }).isVisible(), true)
  assert.equal(await nonPremium.locator('.premium-badge').count(), 0, 'Owner verification must not depend on buying Premium')
  const ring = nonPremium.locator('.verified-owner-badge__ring')
  await page.waitForFunction(() => [...document.querySelectorAll('.map-listings__preview .verified-owner-badge__ring')].every(img => img.complete && img.naturalWidth > 0))
  assert.deepEqual(await ring.evaluateAll(images => images.map(img => getComputedStyle(img).animationName)), ['none', 'none', 'none', 'none'], 'Reduced motion must keep the ring static')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  const frames = await ring.evaluateAll(images => {
    const animations = images.map(img => img.getAnimations()[0])
    const timings = animations.map(animation => ({ duration: animation.effect.getTiming().duration, iterations: animation.effect.getTiming().iterations }))
    const visible = [100, 500, 900, 1300].map(time => {
      animations.forEach(animation => { animation.pause(); animation.currentTime = time })
      return images.map(img => getComputedStyle(img).opacity)
    })
    animations.forEach(animation => animation.finish())
    return { timings, visible, stopped: images.map(img => getComputedStyle(img).opacity) }
  })
  assert.ok(frames.timings.every(timing => timing.duration === 1600 && timing.iterations === 2), 'Animation must stop after two cycles')
  assert.deepEqual(frames.visible, [['1', '0', '0', '0'], ['0', '1', '0', '0'], ['0', '0', '1', '0'], ['0', '0', '0', '1']])
  assert.deepEqual(frames.stopped, ['1', '0', '0', '0'])
  await page.evaluate(() => document.documentElement.dataset.theme = 'light')
  await nonPremium.screenshot({ path: out + '/badge-preview.png' })
  assert.deepEqual(errors, [])
  console.log('PASS: Premium label stays visible; verified owners independently appear on map/list cards in light/dark and 320–1100px; unverified accounts get no badge')
} finally { await browser.close() }
