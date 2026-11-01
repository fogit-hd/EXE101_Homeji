import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'
const base = process.env.HOMEJI_TEST_BASE_URL || 'http://127.0.0.1:5541'
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local entitlement fixtures only')
const out = 'output/verification/agent-mode'; await mkdir(out, { recursive: true })
await writeFile(out + '/index.html', '<html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
await writeFile(out + '/scene.tsx', `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{AgentModeSwitch}from'/src/components/ai/AgentModeSwitch.tsx';import'/src/index.css';function Scene(){const[active,setActive]=useState(false),[busy,setBusy]=useState(false);return <div className="homeji-assistant" style={{maxWidth:440,margin:'30px auto',background:'white',borderRadius:20}}><AgentModeSwitch active={active} busy={busy} enabled authenticated={!location.search.includes('guest')} onChange={value=>{setActive(value);document.body.dataset.active=String(value)}} onUpgrade={()=>document.body.dataset.upgrade='yes'}/><button onClick={()=>setBusy(value=>!value)}>Simulate work</button></div>}createRoot(document.getElementById('root')).render(<Scene/>);`)
const browser = await chromium.launch({ headless: true, channel: 'msedge' })
const page = await browser.newPage({ viewport: { width: 1100, height: 650 }, reducedMotion: 'no-preference' })
let kind = 'basic', calls = 0
const errors = []; page.on('pageerror', error => errors.push(error.message))
await page.addInitScript(() => localStorage.setItem('homeji_access_token', 'fixture'))
await page.route('**/api/subscriptions/me', route => {
  calls++
  return route.fulfill(kind === 'error' ? { status: 503, json: { detail: 'Fixture unavailable' } } : { json: { isPremium: kind !== 'basic', premiumExpiresAt: kind === 'expiring' ? new Date(Date.now() + 2000).toISOString() : '2099-01-01T00:00:00Z' } })
})
const agent = page.getByRole('button', { name: 'Agent · Premium', exact: true })
const chat = page.getByRole('button', { name: 'Chat', exact: true })
try {
  await page.goto(base + '/' + out + '/index.html'); await page.getByRole('button', { name: 'Mở khóa', exact: true }).waitFor()
  assert.equal(await agent.isDisabled(), true); await agent.evaluate(button => button.click())
  assert.equal(await agent.getAttribute('aria-pressed'), 'false')
  await page.getByRole('button', { name: 'Mở khóa', exact: true }).click(); assert.equal(await page.locator('body').getAttribute('data-upgrade'), 'yes')
  await page.screenshot({ path: out + '/basic-locked.png' })
  kind = 'premium'; await page.reload(); await page.waitForFunction(() => !document.querySelector('[aria-label="Agent · Premium"]').disabled)
  await agent.click(); assert.equal(await agent.getAttribute('aria-pressed'), 'true')
  assert.equal(await chat.getAttribute('aria-pressed'), 'false')
  await page.getByRole('button', { name: 'Simulate work' }).click(); assert.equal(await agent.isDisabled(), true); assert.equal(await chat.isDisabled(), true)
  assert.equal(await page.locator('.agent-mode-switch__status i').first().evaluate(element => getComputedStyle(element).animationName), 'agent-mode-pulse')
  await page.emulateMedia({ reducedMotion: 'reduce' }); assert.equal(await page.locator('.agent-mode-switch__status i').first().evaluate(element => getComputedStyle(element).animationName), 'none')
  await page.getByRole('button', { name: 'Simulate work' }).click()
  for (const width of [1100, 390, 320]) {
    await page.setViewportSize({ width, height: 650 }); await page.screenshot({ path: out + '/premium-active-' + width + '.png' })
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  }
  await chat.click(); assert.equal(await chat.getAttribute('aria-pressed'), 'true')
  kind = 'error'; await page.reload(); await page.getByRole('button', { name: 'Thử lại', exact: true }).waitFor(); assert.equal(await agent.isDisabled(), true)
  kind = 'premium'; await page.getByRole('button', { name: 'Thử lại', exact: true }).click(); await page.waitForFunction(() => !document.querySelector('[aria-label="Agent · Premium"]').disabled)
  kind = 'expiring'; await page.reload(); await page.waitForFunction(() => !document.querySelector('[aria-label="Agent · Premium"]').disabled); await agent.click()
  await page.waitForFunction(() => document.querySelector('[aria-label="Agent · Premium"]').disabled && document.querySelector('[aria-label="Agent · Premium"]').getAttribute('aria-pressed') === 'false', { timeout: 6000 })
  const beforeGuest = calls; await page.goto(base + '/' + out + '/index.html?guest'); await page.getByRole('button', { name: 'Mở khóa', exact: true }).waitFor(); assert.equal(calls, beforeGuest); assert.equal(await agent.isDisabled(), true)
  assert.deepEqual(errors, []); console.log('PASS Basic/guest lock, Premium activation, busy lock, expiry downgrade, error retry, animation/reduced motion and 320–1100 layout')
} finally { await browser.close() }
