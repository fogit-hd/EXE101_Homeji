import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'
const base = process.env.HOMEJI_TEST_BASE_URL || 'http://127.0.0.1:5541'
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local agent fixtures only')
const out = 'output/verification/agent-posting'; await mkdir(out, { recursive: true })
await writeFile(out + '/index.html', '<html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
await writeFile(out + '/scene.tsx', `import React from'react';import{createRoot}from'react-dom/client';import{MemoryRouter}from'react-router-dom';import{MapChatbot}from'/src/components/map/MapChatbot.tsx';import{PremiumLaunchOffer}from'/src/components/payments/PremiumLaunchOffer.tsx';import'/src/index.css';createRoot(document.getElementById('root')).render(<MemoryRouter>{location.search.includes('banner')?<PremiumLaunchOffer/>:<MapChatbot openRequestToken={1}/>}</MemoryRouter>);`)
const browser = await chromium.launch({ headless: true, channel: 'msedge' })
const page = await browser.newPage({ reducedMotion: 'reduce', viewport: { width: 1200, height: 1000 } })
const requests = [], approvals = [], errors = []; let basic = false, reject = true, awaitingImage = false
const details = { title: 'Ghế sofa', description: 'Ghế sofa như hình, người mua kiểm tra trước khi nhận.', price: 500000, condition: 'Đã sử dụng', category: 'Nội thất', address: 'Lê Văn Việt, Thủ Đức', latitude: 10.84, longitude: 106.8 }
page.on('pageerror', error => errors.push(error.message))
await page.addInitScript(() => { localStorage.setItem('homeji_access_token', 'fixture'); localStorage.setItem('homeji_user_id', 'me') })
await page.route('**/src/contexts/AuthContext.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const useAuth=()=>({isAuthenticated:true,needsProfileSetup:false,profile:{id:"me"}})' }))
await page.route('**/src/contexts/AuthModalContext.logic.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const useAuthModal=()=>({openAuthModal:()=>{},isOpen:false})' }))
await page.route('**/api/**', async route => {
  const path = new URL(route.request().url()).pathname
  if (!path.startsWith('/api/')) return route.continue()
  if (path === '/api/chatbot/popup-config') return route.fulfill({ json: { enabled: true, title: 'Homeji', greeting: 'Gửi ảnh để Homeji soạn bài.', suggestedPrompts: [] } })
  if (path === '/api/subscriptions/me') return route.fulfill({ json: { isPremium: !basic, premiumExpiresAt: !basic ? '2099-11-08T00:00:00Z' : null } })
  if (path === '/api/subscriptions/packages') return route.fulfill({ json: [{ code: 'PREMIUM_MONTHLY', name: 'Gói Trải Nghiệm', price: 49000, originalPrice: 99000, offerEndsAt: '2099-11-08T08:00:00Z', durationDays: 30, tier: 2, benefits: [] }] })
  if (path.endsWith('/confirm')) { approvals.push(route.request().postDataJSON()); await new Promise(resolve => setTimeout(resolve, 200)); return route.fulfill(reject ? { status: 400, json: { detail: 'Vui lòng kiểm tra lại địa chỉ.' } } : { json: { postId: 'posted-id' } }) }
  if (path === '/api/chatbot/messages') {
    const body = route.request().postDataJSON(); requests.push(body)
    const now = new Date().toISOString()
    if (awaitingImage && !body.attachments?.length) return route.fulfill({ json: { conversationId: 'session', userMessage: { id: 'u' + requests.length, sender: 1, content: body.message, createdAt: now }, assistantMessage: { id: 'a' + requests.length, sender: 2, content: 'Gửi ảnh để soạn bản nháp.', createdAt: now }, actions: [], searchUpdate: null, agentRequested: true } })
    return route.fulfill({ json: { conversationId: 'session', userMessage: { id: 'u' + requests.length, sender: 1, content: body.message, createdAt: now }, assistantMessage: { id: 'a' + requests.length, sender: 2, content: basic ? 'AI đăng bài từ ảnh dành cho Premium.' : 'Kiểm tra bản nháp trước khi xác nhận.', createdAt: now }, actions: [], searchUpdate: null, upgradeRequired: basic, agentDraft: basic ? null : { id: 'draft-' + requests.length, details, images: ['/landing/bloom-hero-bg2.jpg'], expiresAt: '2099-11-08T00:00:00Z', publishedPostId: null } } })
  }
  return route.fulfill({ json: [] })
})
try {
  await page.goto(base + '/' + out + '/index.html')
  await page.locator('#homeji-ai-conversation').waitFor({ state: 'attached' })
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('homeji-ai:toggle', { detail: { open: true, anchor: null } })))
  const input = page.getByRole('textbox', { name: 'Nhập tin nhắn cho Homeji' })
  await page.waitForFunction(() => !document.querySelector('[aria-label="Agent · Premium"]').disabled)
  await page.getByRole('button', { name: 'Agent · Premium', exact: true }).click()
  await input.fill('Soạn bài cho ghế trong ảnh giá 500k'); await input.press('Enter')
  await page.getByRole('region', { name: 'Xác nhận bài đăng AI' }).waitFor()
  assert.equal(approvals.length, 0, 'Preview must not publish')
  assert.equal(requests[0].postingAgent, true, 'Selecting Agent routes the request to the protected agent flow')
  await input.fill('Sửa lại mô tả ngắn hơn'); await input.press('Enter')
  await page.locator('.agent-post-preview').nth(1).waitFor()
  assert.equal(requests[1].agentDraftId, 'draft-1')
  assert.ok(requests[1].sessionMessages.length <= 6)
  assert.ok(requests[1].sessionMessages.every(row => row.content.length <= 1000 && !row.attachments && !row.agentDraft))
  assert.equal(await page.locator('.agent-post-preview').first().getByRole('button', { name: 'Xác nhận đăng bài' }).count(), 0)
  const preview = page.locator('.agent-post-preview').last()
  await preview.getByLabel('Giá bán (đ)').fill('550000')
  assert.equal(await preview.getByLabel('Giá bán (đ)').inputValue(), '550.000')
  for (const width of [1200, 390]) {
    await page.setViewportSize({ width, height: 1000 })
    await preview.getByLabel('Tiêu đề').scrollIntoViewIfNeeded()
    await page.screenshot({ path: out + '/preview-' + width + '.png' })
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  }
  const confirm = preview.getByRole('button', { name: 'Xác nhận đăng bài', exact: true })
  await confirm.evaluate(button => { button.click(); button.click() })
  await preview.getByRole('alert').waitFor(); assert.equal(approvals.length, 1)
  assert.equal(approvals[0].price, 550000)
  reject = false; await confirm.click(); await page.getByText('Đã đăng lên Chợ đồ', { exact: true }).waitFor()
  assert.equal(approvals.length, 2); assert.deepEqual(approvals[0], approvals[1])
  assert.match(await page.getByRole('link', { name: 'Xem bài vừa đăng' }).getAttribute('href'), /item=posted-id/)
  awaitingImage = true; await page.reload()
  await page.locator('#homeji-ai-conversation').waitFor({ state: 'attached' })
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('homeji-ai:toggle', { detail: { open: true, anchor: null } })))
  await input.fill('Đăng bán giúp tôi giá 500k'); await input.press('Enter')
  await page.getByText('Gửi ảnh để soạn bản nháp.', { exact: true }).waitFor()
  await page.getByLabel('Chọn ảnh gửi Homeji').setInputFiles('public/brand/homeji-logo2.png')
  await page.getByRole('button', { name: 'Gửi', exact: true }).click()
  await page.locator('.agent-post-preview').waitFor()
  assert.equal(requests.at(-1).postingAgent, true, 'Photo sent after the posting request stays in agent mode')
  assert.equal(requests.at(-1).attachments.length, 1)
  assert.ok(requests.at(-1).sessionMessages.some(row => row.content.includes('500k')))
  awaitingImage = false
  basic = true; await page.reload()
  await page.locator('#homeji-ai-conversation').waitFor({ state: 'attached' })
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('homeji-ai:toggle', { detail: { open: true, anchor: null } })))
  await input.fill('Đăng bán ghế giúp tôi'); await input.press('Enter')
  await page.getByRole('button', { name: 'Khám phá Premium', exact: true }).waitFor()
  assert.equal(await page.locator('.agent-post-preview').count(), 0)
  await page.getByRole('button', { name: 'Tự đăng bài', exact: true }).waitFor()
  for (const width of [1200, 390, 320]) {
    await page.setViewportSize({ width, height: 900 }); await page.goto(base + '/' + out + '/index.html?banner')
    await page.getByRole('complementary', { name: 'Ưu đãi ra mắt Homeji Agent' }).waitFor()
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await page.screenshot({ path: out + '/offer-' + width + '.png' })
  }
  await page.getByRole('button', { name: 'Đóng ưu đãi Premium' }).click(); await page.reload()
  assert.equal(await page.locator('.premium-launch-offer').count(), 0)
  assert.deepEqual(errors, [])
  console.log('PASS preview/edit/approve, duplicate click guard, retry recovery, bounded context, Basic upgrade, responsive offer and dismissal')
} finally { await browser.close() }
