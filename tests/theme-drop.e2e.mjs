import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
const { chromium } = createRequire(import.meta.url)(process.env.HOMEJI_PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.HOMEJI_THEME_TEST_URL || 'http://127.0.0.1:5498'
if (!['127.0.0.1','localhost'].includes(new URL(base).hostname)) throw Error('Local fixtures only')
const out = new URL('../output/verification/theme-drop/', import.meta.url)
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'light', reducedMotion: 'no-preference' })
const id = '11111111-1111-4111-8111-111111111111'
await context.addInitScript(id => { localStorage.setItem('homeji_access_token','theme-fixture');localStorage.setItem('homeji_user_id',id) }, id)
const fixtureRoute = route => {
  const url = new URL(route.request().url())
  if (url.origin !== new URL(base).origin) return route.abort()
  if (!url.pathname.startsWith('/api/') && !url.pathname.startsWith('/hubs/')) return route.continue()
  if (url.pathname.startsWith('/hubs/')) return route.fulfill({status:503,body:''})
  let json = []
  if (url.pathname === '/api/profile/me') json = {id,displayName:'Nguyễn Văn An',role:1,onboardingCompleted:true,isPremium:false}
  if (url.pathname === '/api/wallet') json = {userId:id,balance:350000,isActivated:true}
  if (url.pathname === '/api/chatbot/popup-config') json = {enabled:false}
  if (url.pathname === '/api/subscriptions/me') json = {tier:1,isPremium:false,packageCode:'free'}
  return route.fulfill({json})
}
await context.route('**/*', fixtureRoute)
const page = await context.newPage()
const result = {checks:[],screens:[],errors:[]}
page.on('pageerror', error => result.errors.push(error.message))
const control = () => page.getByRole('switch', {name:'Chế độ tối',exact:true})
async function settle(theme) {
  await page.waitForFunction(theme => document.documentElement.dataset.theme === theme && !document.documentElement.dataset.themeTransition, theme)
  assert.equal(await control().getAttribute('aria-checked'), String(theme==='dark'))
}
async function skipIntro() { const skip=page.getByRole('button',{name:'Bỏ qua',exact:true});if(await skip.isVisible().catch(()=>false))await skip.click();await page.locator('.hj-intro').waitFor({state:'hidden'}) }
try {
  await page.goto(base+'/?section=profile')
  await skipIntro()
  await control().waitFor()
  await page.getByRole('textbox',{name:'Họ tên',exact:true}).fill('Bản nháp được giữ lại')
  const beforeURL=page.url()
  await control().click()
  await page.locator('.theme-water-drop').waitFor()
  assert.equal(await page.locator('.theme-water-layer').getAttribute('data-target'),'dark')
  assert.equal(await page.locator('.theme-water-drop').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(5, 5, 5)')
  await page.screenshot({path:new URL('black-drop.png',out).pathname.slice(1)})
  await page.waitForFunction(()=>document.documentElement.dataset.themeTransition==='spreading')
  await page.waitForFunction(()=>document.getAnimations().some(a=>a.effect?.getKeyframes().some(k=>k.clipPath?.includes('circle('))))
  const spread = await page.evaluate(()=>{
    const animation=document.getAnimations().find(a=>a.effect?.getKeyframes().some(k=>k.clipPath?.includes('circle(')))
    if(!animation)return null
    const keys=animation.effect.getKeyframes()
    return {keys:keys.map(k=>k.clipPath),duration:animation.effect.getTiming().duration}
  })
  assert.ok(spread?.keys.some(k=>k.includes('circle(')), 'Native whole-document circular reveal is running')
  await page.screenshot({path:new URL('dark-spread.png',out).pathname.slice(1)})
  await settle('dark')
  assert.ok(await page.locator('.profile-section').first().evaluate(e=>getComputedStyle(e).backgroundColor.match(/[0-9]+/g).slice(0,3).reduce((sum,v)=>sum+Number(v),0)<255), 'Product surfaces actually turn dark, not only the root attribute')
  assert.equal(page.url(),beforeURL)
  assert.equal(await page.getByRole('textbox',{name:'Họ tên',exact:true}).inputValue(),'Bản nháp được giữ lại')
  assert.equal(await page.evaluate(()=>localStorage.getItem('homeji_theme')),'dark')
  await page.screenshot({path:new URL('profile-dark.png',out).pathname.slice(1),animations:'disabled'})
  result.checks.push('Black droplet falls, full-document circular dark reveal, URL and form draft preserved')
  await control().click()
  await page.locator('.theme-water-drop').waitFor()
  assert.equal(await page.locator('.theme-water-drop').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 255, 255)')
  await settle('light')
  result.checks.push('White droplet restores light appearance')
  await page.emulateMedia({reducedMotion:'reduce'})
  await control().press('Space')
  await settle('dark')
  assert.equal(await page.locator('.theme-water-layer').count(),0)
  await page.reload();await skipIntro();await settle('dark')
  result.checks.push('Keyboard switch, reduced motion and persisted theme after reload')
  for(const section of ['profile','activities','payments','marketplace']){
    await page.goto(base+'/?section='+section)
    await skipIntro();await control().waitFor();await settle('dark');await page.locator('.page-loading,.hub-loading,.route-loading').waitFor({state:'hidden'}).catch(()=>{});if(section==='profile')await page.getByRole('textbox',{name:'Họ tên',exact:true}).waitFor()
    for(const width of [1440,390,320]){
      await page.setViewportSize({width,height:844})
      const rect=await control().boundingBox()
      assert.ok(rect&&rect.x>=0&&rect.x+rect.width<=width+1,section+': theme control fits '+width)
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,section+': page fits '+width)
      if(width!==390)await page.screenshot({path:new URL(section+'-dark-'+width+'.png',out).pathname.slice(1),animations:'disabled'})
      result.screens.push({section,width})
    }
  }
  await page.setViewportSize({width:1440,height:1000})
  await page.addInitScript(()=>{document.startViewTransition=undefined})
  await page.reload();await skipIntro()
  await page.emulateMedia({reducedMotion:'no-preference'})
  await control().click()
  await page.locator('.theme-water-wave').waitFor()
  assert.equal(await page.locator('.theme-water-layer').getAttribute('data-target'),'light')
  await settle('light')
  result.checks.push('Unsupported View Transition uses a full-screen white water wave fallback')
  assert.deepEqual(result.errors,[])
  await writeFile(new URL('results.json',out),JSON.stringify(result,null,2))
  console.log(JSON.stringify(result,null,2))
} finally {await browser.close()}
