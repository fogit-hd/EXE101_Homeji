import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { performance } from 'node:perf_hooks'
import { setTimeout as delay } from 'node:timers/promises'
import { chromium, devices } from 'playwright'

const base = process.env.HOMEJI_TEST_BASE_URL || 'http://127.0.0.1:5541'
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(base).hostname), 'Local fixtures only')
const output = 'output/verification/chat-ai-load'
await mkdir(output, { recursive: true })
await writeFile(output + '/index.html', '<!doctype html><html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
await writeFile(output + '/scene.tsx', [
  "import React from 'react'",
  "import {createRoot} from 'react-dom/client'",
  "import {MemoryRouter} from 'react-router-dom'",
  "import {ChatbotProvider} from '/src/contexts/ChatbotContext.tsx'",
  "import {ToastProvider} from '/src/components/toast/ToastProvider.tsx'",
  "import {toggleHomejiAi} from '/src/lib/homejiAiLauncher.ts'",
  "import '/src/index.css'",
  "createRoot(document.getElementById('root')).render(<MemoryRouter><ToastProvider><ChatbotProvider><button data-homeji-ai-trigger='' onClick={event=>toggleHomejiAi(event.currentTarget)}>Mở Homeji AI</button></ChatbotProvider></ToastProvider></MemoryRouter>)",
].join('\n'))

const browser = await chromium.launch({ headless: true, channel: 'msedge' })
try {
  const context = await browser.newContext({ ...devices['Pixel 7'] })
  await context.addInitScript(() => {
    localStorage.setItem('homeji_access_token', 'fixture')
    localStorage.setItem('homeji_user_id', 'me')
  })
  await context.route('**/src/contexts/AuthContext.tsx*', route => route.fulfill({
    contentType: 'application/javascript',
    body: 'export const useAuth=()=>({isAuthenticated:true,profile:{id:"me",role:1,displayName:"Fixture"}})',
  }))
  await context.route('**/src/contexts/AuthModalContext.logic.tsx*', route => route.fulfill({
    contentType: 'application/javascript',
    body: 'export const useAuthModal=()=>({isOpen:false,openAuthModal:()=>{}})',
  }))
  let sessionReads = 0
  let releaseSession
  const sessionReady = new Promise(resolve => { releaseSession = resolve })
  let turns = 0
  const createdAt = '2026-11-25T12:00:00Z'
  await context.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (!path.startsWith('/api/')) return route.continue()
    if (path === '/api/chatbot/popup-config') {
      await delay(120)
      return route.fulfill({ json: { enabled: true, title: 'Homeji', greeting: 'Chào bạn', suggestedPrompts: [], historyStorageEnabled: false } })
    }
    if (path === '/api/chatbot/agent/session') {
      sessionReads++
      await sessionReady
      return route.fulfill({ json: { sessionId: 'old-session', turns: [{ id: 'old', content: 'Phiên Agent cũ', sender: 2, createdAt }] } })
    }
    if (path === '/api/chatbot/messages') {
      turns++
      const request = route.request().postDataJSON()
      await delay(240)
      return route.fulfill({ json: {
        conversationId: 'fixture',
        userMessage: { id: 'question', conversationId: 'fixture', sender: 1, content: request.message, createdAt },
        assistantMessage: { id: 'answer', conversationId: 'fixture', sender: 2, content: 'Câu trả lời Homeji đã kiểm tra.', createdAt },
        actions: [],
      } })
    }
    return route.fulfill({ json: {} })
  })
  const page = await context.newPage()
  const fetched = new Set()
  const errors = []
  page.on('request', request => fetched.add(new URL(request.url()).pathname))
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(base + '/' + output + '/index.html')
  const trigger = page.getByRole('button', { name: 'Mở Homeji AI' })
  await trigger.waitFor()
  assert.ok(!fetched.has('/src/components/map/MapChatbot.tsx'))
  assert.ok(!fetched.has('/api/chatbot/popup-config'))

  const started = performance.now()
  await trigger.click()
  const input = page.getByRole('textbox', { name: 'Nhập tin nhắn cho Homeji' })
  await input.waitFor()
  const openMs = Math.round(performance.now() - started)
  await page.getByRole('button', { name: 'Đính kèm ảnh' }).waitFor({ state: 'visible' })
  assert.ok(!fetched.has('/src/components/map/AgentDraftWorkspace.tsx'))
  assert.ok(!fetched.has('/src/components/ai/AiSearchReview.tsx'))
  await input.fill('Homeji giúp gì được cho mình?')
  const submitted = performance.now()
  await page.getByRole('button', { name: 'Gửi', exact: true }).click()
  await page.getByText('Câu trả lời Homeji đã kiểm tra.', { exact: true }).waitFor()
  const replyMs = Math.round(performance.now() - submitted)

  releaseSession()
  await delay(150)
  assert.equal(await page.getByText('Phiên Agent cũ', { exact: true }).count(), 0)
  assert.equal(sessionReads, 1)
  assert.equal(turns, 1)
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ openMs, replyMs, sessionReads, model: 'fixture' }))
} finally {
  await browser.close()
}
