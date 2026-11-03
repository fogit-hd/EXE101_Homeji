import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'

const base = process.env.HOMEJI_TEST_BASE_URL || 'http://127.0.0.1:5544'
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local fixtures only')
const out = 'output/verification/agent-context-flow'
await mkdir(out, { recursive: true })
await writeFile(out + '/index.html', '<html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
await writeFile(out + '/scene.tsx', `import React from'react';import{createRoot}from'react-dom/client';import{MemoryRouter}from'react-router-dom';import{MapChatbot}from'/src/components/map/MapChatbot.tsx';import'/src/index.css';import'/src/components/theme/dark-theme.css';createRoot(document.getElementById('root')).render(<MemoryRouter><MapChatbot/></MemoryRouter>);`)
const browser = await chromium.launch({ headless: true, channel: 'msedge' })
try {
  for (const width of [1366, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 844 }, reducedMotion: width === 390 ? 'reduce' : 'no-preference' })
    const requests = [], errors = []
    let approvals = 0
    page.on('pageerror', e => errors.push(e.message))
    await page.addInitScript(() => localStorage.setItem('homeji_access_token', 'fixture'))
    await page.route('**/src/contexts/AuthContext.tsx*', r => r.fulfill({ contentType: 'application/javascript', body: 'export const useAuth=()=>({isAuthenticated:true,needsProfileSetup:false,profile:{id:"me"}})' }))
    await page.route('**/src/contexts/AuthModalContext.logic.tsx*', r => r.fulfill({ contentType: 'application/javascript', body: 'export const useAuthModal=()=>({openAuthModal:()=>{},isOpen:false})' }))
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname
      if (!path.startsWith('/api/')) return route.continue()
      if (path === '/api/subscriptions/me') return route.fulfill({ json: { isPremium: true, premiumExpiresAt: '2099-01-01T00:00:00Z' } })
      if (path === '/api/chatbot/popup-config') return route.fulfill({ json: { enabled: true, greeting: 'Chào bạn', suggestedPrompts: [] } })
      if (path.endsWith('/confirm')) { approvals++; return route.fulfill({ json: { postId: 'published-fixture' } }) }
      if (path === '/api/chatbot/messages') {
        const body = route.request().postDataJSON(), now = new Date().toISOString()
        requests.push(body)
        const turn = requests.length
        await new Promise(resolve => setTimeout(resolve, turn === 1 ? 1500 : 700))
        if (body.message === 'thử lỗi kết nối') return route.fulfill({ status: 503, json: { message: 'Không kết nối được' } })
        return route.fulfill({ json: {
          conversationId: 'chat', userMessage: { id: 'user-' + turn, sender: 1, content: body.message, createdAt: now },
          assistantMessage: { id: 'assistant-' + turn, sender: 2, content: 'Bản nháp đang chờ bạn duyệt; chưa đăng bài.', createdAt: now }, actions: [], agentRequested: true,
          agentDraft: { id: turn === 1 ? 'draft-1' : 'draft-2', images: ['/landing/bloom-hero-bg2.jpg'], expiresAt: '2099-01-01T00:00:00Z', publishedPostId: null,
            details: { kind: 'secondHand', title: 'Ghế da', description: turn === 1 ? 'Ghế trong ảnh' : 'Ghế da mới, kích thước 500 mm × 200 mm.', price: 500000, condition: turn === 1 ? 'Đã sử dụng' : 'Mới', category: 'Nội thất', address: 'Lê Văn Việt, Thủ Đức', latitude: 10.84, longitude: 106.8 } }
        } })
      }
      return route.fulfill({ json: [] })
    })
    await page.goto(base + '/' + out + '/index.html')
    await page.locator('#homeji-ai-conversation').waitFor({ state: 'attached' })
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('homeji-ai:toggle', { detail: { open: true, anchor: null } })))
    await page.evaluate(dark => document.documentElement.dataset.theme = dark ? 'dark' : 'light', width === 390)
    const chat = page.getByRole('textbox', { name: 'Nhập tin nhắn cho Homeji' })
    await page.locator('input[type=file]').setInputFiles('public/landing/bloom-hero-bg2.jpg')
    await page.getByRole('img', { name: /bloom-hero/ }).waitFor()
    await chat.fill('đăng pas lại cái ghế giá 500k'); await chat.press('Enter')
    const thinking = page.locator('.homeji-assistant__thinking')
    await thinking.waitFor()
    assert.equal(await thinking.getAttribute('role'), 'status')
    assert.equal(await thinking.evaluate(e => getComputedStyle(e).borderRadius), '999px')
    assert.equal(await thinking.evaluate(e => Boolean(e.closest('.map-chatbot__body'))), false, 'Popup stays outside the scrollable transcript')
    const popupBox = await thinking.boundingBox(), inputBox = await chat.boundingBox()
    assert.ok(popupBox.y + popupBox.height < inputBox.y, 'Popup must not cover composer')
    const animation = await thinking.evaluate(e => getComputedStyle(e).animationName)
    assert.equal(animation === 'none', width === 390, 'Reduced motion preference is respected')
    const before = await thinking.boundingBox()
    await page.locator('.map-chatbot__body').evaluate(e => e.scrollTop = 0)
    const after = await thinking.boundingBox()
    assert.ok(Math.abs(before.y - after.y) < 4, 'Scrolling transcript does not move popup')
    await page.screenshot({ path: out + '/thinking-' + width + '.png' })
    const workspace = page.getByRole('complementary', { name: 'Bản nháp đang duyệt' })
    await workspace.waitFor()
    assert.equal(await thinking.count(), 0, 'Thinking capsule disappears when the response arrives')
    assert.equal(requests[0].attachments.length, 1)
    assert.equal(approvals, 0)
    for (const [index, text] of ['1. tình trạng mới, kick thước 500mm*200mm, chất liệu da', '1'].entries()) {
      await workspace.getByRole('button', { name: 'Về hội thoại', exact: true }).click()
      await chat.fill(text); await chat.press('Enter'); await workspace.waitFor()
      assert.equal(requests[index + 1].agentDraftId, index === 0 ? 'draft-1' : 'draft-2')
      assert.equal(requests[index + 1].postingAgent, true)
      assert.equal(requests[index + 1].attachments?.length ?? 0, 0)
      assert.ok(requests[index + 1].sessionMessages.length <= 6)
      assert.equal(approvals, 0, 'A numeric reply must never publish')
    }
    assert.equal(await workspace.getByLabel('Giá bán (đ)').inputValue(), '500.000')
    await page.screenshot({ path: out + '/' + width + '.png' })
    await workspace.getByRole('button', { name: 'Xác nhận đăng bài', exact: true }).click()
    await workspace.getByText('Đã đăng lên Chợ đồ', { exact: true }).waitFor()
    assert.equal(approvals, 1)
    await workspace.getByRole('button', { name: 'Về hội thoại', exact: true }).click()
    await chat.fill('hỏi về giá'); await chat.press('Enter'); await thinking.waitFor()
    await page.getByRole('button', { name: 'Dừng chờ', exact: true }).click()
    await thinking.waitFor({ state: 'detached' })
    assert.equal(await chat.isEditable(), true)
    await chat.fill('thử lỗi kết nối'); await chat.press('Enter'); await thinking.waitFor()
    await thinking.waitFor({ state: 'detached' })
    assert.equal(await chat.isEditable(), true)
    assert.deepEqual(errors, [])
    await page.close()
  }
  console.log('PASS desktop/mobile: image -> real draft contract -> contextual revision -> numeric reply stays pending -> explicit approval only. API responses mocked; no production post.')
} finally { await browser.close() }
