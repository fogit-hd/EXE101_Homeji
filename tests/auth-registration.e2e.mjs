import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'

const { chromium } = createRequire(import.meta.url)(process.env.HOMEJI_PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.HOMEJI_AUTH_TEST_URL || 'http://127.0.0.1:5491'
if (!['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) throw new Error('Use an isolated localhost fixture only')
const output = new URL('../output/verification/auth-character/', import.meta.url)
await mkdir(output, { recursive: true })
const browser = await chromium.launch({headless:true, executablePath:process.env.HOMEJI_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const results = { scenarios: [], responsive: [], errors: [] }
const context = await browser.newContext({ viewport: {width:1440,height:1000} })
let requests = [], fail = true, blockModel = false
await context.route('**/*', async route => {
  const url = new URL(route.request().url())
  if (url.origin !== new URL(base).origin) return route.abort()
  if (blockModel && url.pathname.endsWith('RobotExpressive.glb')) return route.abort()
  if (!url.pathname.startsWith('/api/') && !url.pathname.startsWith('/hubs/')) return route.continue()
  if (url.pathname === '/api/account/register') {
    requests.push(route.request().postDataJSON())
    await new Promise(resolve => setTimeout(resolve, 200))
    return route.fulfill({status:fail ? 503 : 200, json:fail ? {message:'Fixture: thử lại sau.'} : {emailConfirmationRequired:true,message:'Vui lòng xác nhận email trước khi đăng nhập.'}})
  }
  return route.fulfill({json:[]})
})
const page = await context.newPage()
page.on('pageerror', error => results.errors.push(error.message))
try {
  await page.goto(base+'/register')
  await page.locator('.auth-character__scene.is-ready').waitFor()
  assert.equal(await page.locator('.auth-city').count(), 0)
  const canvas = page.locator('.auth-character__canvas canvas')
  // No form interaction: the real renderer must advance between frames.
  await page.mouse.move(20, 20)
  const idleA = await canvas.screenshot()
  await page.waitForTimeout(500)
  const idleB = await canvas.screenshot()
  assert.equal(idleA.equals(idleB), false, 'idle animation should run without clicks')
  await page.mouse.move(1200, 600)
  await page.waitForTimeout(350)
  const gaze = await canvas.screenshot()
  assert.equal(idleB.equals(gaze), false, 'pointer motion should update the character without clicks')
  results.scenarios.push('continuous idle animation and pointer following without click')
  if (process.env.HOMEJI_AUTH_CAPTURE === '1') {
    const frames = new URL('frames/', output)
    await mkdir(frames, {recursive:true})
    let frame = 0
    for (const segment of ['idle','pointer','password']) {
      if (segment === 'pointer') await page.mouse.move(20,20)
      if (segment === 'password') await page.getByLabel('Mật khẩu',{exact:true}).click()
      for (let index=0;index<12;index++) {
        if (segment === 'pointer') await page.mouse.move(40+index*100, 200+index*30)
        await page.screenshot({path:new URL(`${String(frame++).padStart(3,'0')}.png`,frames).pathname.replace(/^\/([A-Za-z]:)/,'$1')})
        await page.waitForTimeout(100)
      }
    }
  }
  await page.getByLabel('Họ tên',{exact:true}).fill('Nguyễn Văn An')
  await page.getByLabel('Email',{exact:true}).fill('homeji.fixture@gmail.com')
  await page.getByLabel('Mật khẩu',{exact:true}).fill('Fixture-pass-123')
  await page.getByLabel('Xác nhận mật khẩu',{exact:true}).fill('different-123')
  assert.equal(await page.locator('.auth-character').getAttribute('data-state'), 'password')
  await page.waitForTimeout(350)
  await page.screenshot({path:new URL('desktop-password.png',output).pathname.replace(/^\/([A-Za-z]:)/,'$1')})
  await page.getByRole('button',{name:'Hiện mật khẩu',exact:true}).click()
  assert.equal(await page.locator('.auth-character').getAttribute('data-state'), 'peek')
  await page.getByRole('button',{name:'Đăng ký',exact:true}).click()
  await page.getByRole('alert').filter({hasText:'Mật khẩu xác nhận chưa khớp.'}).waitFor()
  assert.equal(requests.length,0)
  results.scenarios.push('both password inputs trigger concealment; reveal keeps concealment; mismatch blocks API')
  await page.getByLabel('Xác nhận mật khẩu',{exact:true}).fill('Fixture-pass-123')
  await page.getByRole('button',{name:'Đăng ký',exact:true}).click()
  await page.getByRole('alert').waitFor()
  assert.equal(await page.getByLabel('Mật khẩu',{exact:true}).inputValue(),'Fixture-pass-123')
  assert.equal(await page.getByLabel('Xác nhận mật khẩu',{exact:true}).inputValue(),'Fixture-pass-123')
  assert.equal(requests.length,1)
  assert.equal(requests[0].password,'Fixture-pass-123')
  assert.equal(Object.hasOwn(requests[0],'confirmPassword'),false)
  fail=false
  await page.getByRole('button',{name:'Đăng ký',exact:true}).click()
  await page.getByRole('status').filter({hasText:'Vui lòng xác nhận email'}).waitFor()
  assert.equal(requests.length,2)
  results.scenarios.push('API failure preserves draft and retry succeeds against mocked email-confirmation response')
  for (const width of [320,768,1440]) {
    await page.setViewportSize({width,height:900})
    const geometry=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}))
    assert.ok(geometry.scrollWidth<=width,JSON.stringify(geometry))
    results.responsive.push(geometry)
    if(width===320) await page.screenshot({path:new URL('mobile-320.png',output).pathname.replace(/^\/([A-Za-z]:)/,'$1'),fullPage:true})
  }
  blockModel=true
  await page.reload()
  await page.getByLabel('Xác nhận mật khẩu',{exact:true}).waitFor()
  await page.locator('.auth-character__fallback').waitFor()
  results.scenarios.push('form and decorative fallback available when model fails')
  blockModel=false
  await page.emulateMedia({reducedMotion:'reduce'})
  await page.reload()
  await page.locator('.auth-character__scene.is-ready').waitFor()
  await page.mouse.move(0,0)
  const stillLeft=await canvas.screenshot()
  await page.mouse.move(1400,850)
  const stillRight=await canvas.screenshot()
  assert.equal(stillLeft.equals(stillRight),false,'pointer must move gaze even with idle animation disabled')
  await page.getByLabel('Mật khẩu',{exact:true}).fill('Fixture-pass-123')
  assert.equal(await page.locator('.auth-character').getAttribute('data-state'),'password')
  results.scenarios.push('reduced motion retains static password reaction')
  assert.deepEqual(results.errors,[])
  await writeFile(new URL('results.json',output),JSON.stringify(results,null,2))
  console.log(JSON.stringify(results,null,2))
} finally { await browser.close() }
